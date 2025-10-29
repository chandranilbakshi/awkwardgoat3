"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";

export function useWebSocket() {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  
  // Refs for persistent connection state
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const messageHandlersRef = useRef(new Set());
  const isConnectingRef = useRef(false);
  const userIdRef = useRef(null);

  // Exponential backoff calculation (1s, 2s, 4s, 8s, 16s, max 30s)
  const getReconnectDelay = useCallback(() => {
    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
    return delay;
  }, []);

  const connect = useCallback(() => {
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
    const wsUrl = `ws://localhost:8080/ws?user_id=${userIdRef.current}`;
    console.log(`🔌 Connecting to WebSocket (Attempt ${reconnectAttemptsRef.current + 1})...`);

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("✅ WebSocket connected successfully");
        setIsConnected(true);
        isConnectingRef.current = false;
        reconnectAttemptsRef.current = 0; // Reset backoff on success

        // Clear any pending reconnection attempts
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          setLastMessage(message);

          // Call all registered message handlers
          messageHandlersRef.current.forEach((handler) => {
            try {
              handler(message);
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

      ws.onclose = (event) => {
        isConnectingRef.current = false;
        setIsConnected(false);

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
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error("❌ Error creating WebSocket:", error);
      isConnectingRef.current = false;
    }
  }, [getReconnectDelay]);

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