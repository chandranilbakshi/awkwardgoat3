"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";

export function useWebSocket() {
  const { user, refreshSession, logout } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  
  // Refs for persistent connection state
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const messageHandlersRef = useRef(new Set());
  const isConnectingRef = useRef(false);
  const userIdRef = useRef(null);
  const tokenRefreshAttemptedRef = useRef(false);

  // Exponential backoff calculation (1s, 2s, 4s, 8s, 16s, max 30s)
  // Using a function instead of useMemo since the value depends on a ref that changes
  const getReconnectDelay = useCallback(() => {
    return Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
  }, []);

  const connect = useCallback(async () => {
    // Guard: Don't connect if no user
    if (!userIdRef.current) {
      console.log("⏸️ No user ID, skipping connection");
      return;
    }

    // Guard: Prevent multiple simultaneous connections
    if (isConnectingRef.current) {
      console.log("⏸️ Already connecting, skipping...");
      return;
    }

    // Guard: Don't reconnect if already connected
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log("✅ Already connected, skipping...");
      return;
    }

    // Guard: Don't interrupt ongoing connection attempt
    if (wsRef.current?.readyState === WebSocket.CONNECTING) {
      console.log("⏸️ Connection in progress, skipping...");
      return;
    }

    // Mark as connecting
    isConnectingRef.current = true;
    
    // Get current access token
    const accessToken = localStorage.getItem('access_token');
    
    if (!accessToken) {
      console.error("❌ No access token available");
      isConnectingRef.current = false;
      logout();
      return;
    }
    
    const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080'}/ws?token=${encodeURIComponent(accessToken)}`;
    console.log(`🔌 Connecting to WebSocket (Attempt ${reconnectAttemptsRef.current + 1})...`);

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("✅ WebSocket connected successfully");
        setIsConnected(true);
        isConnectingRef.current = false;
        reconnectAttemptsRef.current = 0; // Reset backoff on success
        tokenRefreshAttemptedRef.current = false; // Reset token refresh flag

        // Clear any pending reconnection attempts
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          // Check if it's a wrapped message or raw message
          let messageType = message.type;
          let messagePayload = message;
          
          // If it has a type field and payload, it's wrapped
          if (message.type && message.payload) {
            messageType = message.type;
            messagePayload = message.payload;
          }
          
          setLastMessage({ type: messageType, payload: messagePayload });

          // Call all registered message handlers with both type and payload
          messageHandlersRef.current.forEach((handler) => {
            try {
              handler({ type: messageType, payload: messagePayload });
            } catch (error) {
              console.error("Error in message handler:", error);
            }
          });
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      ws.onerror = (error) => {
        // Only log meaningful errors
        if (ws.readyState === WebSocket.CONNECTING) {
          console.error("❌ Failed to connect to WebSocket");
        }
        isConnectingRef.current = false;
      };

      ws.onclose = async (event) => {
        isConnectingRef.current = false;
        setIsConnected(false);

        // Check if close was due to authentication failure (code 1008 = Policy Violation, or 1002 = Protocol Error)
        // Backend sends 401 which translates to close code 1002 or 1008
        const isAuthError = event.code === 1002 || event.code === 1008 || event.code === 1006;
        
        if (isAuthError && !tokenRefreshAttemptedRef.current && userIdRef.current) {
          console.log("🔄 WebSocket auth failed, attempting token refresh...");
          tokenRefreshAttemptedRef.current = true;
          
          try {
            const refreshSuccess = await refreshSession();
            
            if (refreshSuccess) {
              console.log("✅ Token refreshed, reconnecting WebSocket...");
              // Reset reconnect attempts for fresh start with new token
              reconnectAttemptsRef.current = 0;
              
              // Reconnect with new token immediately
              setTimeout(() => connect(), 500);
            } else {
              console.error("❌ Token refresh failed, logging out...");
              logout();
            }
          } catch (error) {
            console.error("❌ Error during token refresh:", error);
            logout();
          }
          return;
        }

        // Only reconnect if we have a user and it wasn't a clean close
        if (userIdRef.current && event.code !== 1000) {
          const delay = getReconnectDelay();
          console.log(`⚠️ WebSocket closed (Code: ${event.code}). Reconnecting in ${delay}ms...`);
          
          reconnectAttemptsRef.current += 1;
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else if (event.code === 1000) {
          console.log("👋 WebSocket closed cleanly");
          tokenRefreshAttemptedRef.current = false; // Reset on clean close
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error("❌ Error creating WebSocket:", error);
      isConnectingRef.current = false;
    }
  }, [getReconnectDelay, refreshSession, logout]);

  const disconnect = useCallback(() => {
    console.log("🔌 Disconnecting WebSocket...");
    
    // Clear reconnection timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Close WebSocket connection
    if (wsRef.current) {
      // Remove event listeners to prevent reconnection on close
      wsRef.current.onclose = null;
      wsRef.current.close(1000, "Client disconnect");
      wsRef.current = null;
    }

    // Reset state
    isConnectingRef.current = false;
    reconnectAttemptsRef.current = 0;
    tokenRefreshAttemptedRef.current = false;
    setIsConnected(false);
  }, []);

  const sendMessage = useCallback((message) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    console.warn("⚠️ Cannot send message: WebSocket not connected");
    return false;
  }, []);

  const addMessageHandler = useCallback((handler) => {
    messageHandlersRef.current.add(handler);
    return () => {
      messageHandlersRef.current.delete(handler);
    };
  }, []);

  // Main effect: Connect when user changes
  useEffect(() => {
    // Extract stable user ID string (not object reference)
    const userId = user?.id;

    // If user changed, update ref
    if (userId !== userIdRef.current) {
      console.log("👤 User changed:", userId);
      
      // Disconnect old connection
      if (userIdRef.current) {
        disconnect();
      }

      // Update user ref
      userIdRef.current = userId;

      // Connect with new user
      if (userId) {
        // Small delay to ensure cleanup completes
        setTimeout(() => connect(), 100);
      }
    }

    // Cleanup on unmount
    return () => {
      disconnect();
      userIdRef.current = null;
    };
  }, [user?.id, connect, disconnect]);

  return {
    isConnected,
    lastMessage,
    sendMessage,
    addMessageHandler,
    connect,
    disconnect,
  };
}