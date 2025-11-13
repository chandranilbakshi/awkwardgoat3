"use client";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useApi } from "@/hooks/useApi";
import { 
  loadMessages, 
  saveMessages,
  getLastSyncTime,
  updateLastSyncTime,
  mergeMessages
} from "@/utils/chatStorage";

export function useMessages(friendId) {
  const { user } = useAuth();
  const { apiCall } = useApi();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Fetch message history with stale-while-revalidate pattern
  const fetchMessages = useCallback(async () => {
    if (!friendId || !user) {
      setLoading(false);
      return;
    }

    try {
      // Step 1: Immediately load cached messages (stale data)
      const localMessages = loadMessages(user.id, friendId);
      
      if (localMessages && localMessages.length > 0) {
        setMessages(localMessages);
        setLoading(false); // Stop loading spinner, show cached data
      } else {
        setLoading(true); // No cache, show loading
      }
      
      // Step 2: Background sync - fetch new messages from server
      setIsSyncing(true);
      const lastSync = getLastSyncTime(user.id, friendId);
      
      // Build URL with optional 'since' parameter for incremental sync
      let url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/messages/history?friend_id=${friendId}`;
      
      if (lastSync) {
        // Fetch only messages newer than last sync
        const sinceTimestamp = lastSync.toISOString();
        url += `&since=${encodeURIComponent(sinceTimestamp)}`;
      } else {
        // First sync, fetch all messages (limited)
        url += '&limit=100';
      }
      
      const response = await apiCall(url);

      if (!response.ok) {
        throw new Error("Failed to fetch messages");
      }

      const data = await response.json();
      
      // Transform messages to match UI format
      const newMessages = (data.messages || []).map((msg) => ({
        id: msg.id,
        text: msg.content,
        sender: msg.sender_id,
        timestamp: new Date(msg.created_at),
        isOwn: msg.sender_id === user?.id,
      }));
      
      // Step 3: Merge with existing messages (remove duplicates)
      let finalMessages;
      if (localMessages && localMessages.length > 0) {
        finalMessages = mergeMessages(localMessages, newMessages);
      } else {
        finalMessages = newMessages;
      }
      
      // Step 4: Update state and cache
      setMessages(finalMessages);
      
      // Save to local storage (without updating sync time here)
      saveMessages(user.id, friendId, finalMessages, false);
      
      // Update sync time based on the latest message timestamp
      // This ensures we don't re-fetch messages we already have
      if (finalMessages.length > 0) {
        const latestMessage = finalMessages[finalMessages.length - 1];
        updateLastSyncTime(user.id, friendId, latestMessage.timestamp);
      } else {
        // No messages yet, update sync time to now
        updateLastSyncTime(user.id, friendId, new Date());
      }
      
      setError(null);
    } catch (err) {
      console.error("Error fetching messages:", err);
      setError(err.message);
      // Keep showing cached messages even if sync fails
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  }, [friendId, user, apiCall]);

  // Add a new message to the list (optimistic update)
  const addMessage = useCallback((message) => {
    setMessages((prev) => {
      const updatedMessages = mergeMessages(prev, [message]);
      
      // Save to local storage and update sync time to the message's timestamp
      // This prevents re-fetching this message from the server on next sync
      if (user && friendId) {
        saveMessages(user.id, friendId, updatedMessages, false);
        
        // Update sync time to this message's timestamp (or latest message if older)
        const latestMessage = updatedMessages[updatedMessages.length - 1];
        if (latestMessage) {
          updateLastSyncTime(user.id, friendId, latestMessage.timestamp);
        }
      }
      
      return updatedMessages;
    });
  }, [user, friendId]);

  // Clear messages
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  return {
    messages,
    loading,
    error,
    isSyncing,
    addMessage,
    clearMessages,
    refetch: fetchMessages,
  };
}
