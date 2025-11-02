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
    console.log("useMessages - fetchMessages called", { friendId, hasUser: !!user });
    if (!friendId || !user) {
      console.log("useMessages - Skipping fetch: friendId or user missing");
      setLoading(false);
      return;
    }

    try {
      // Step 1: Immediately load cached messages (stale data)
      const localMessages = loadMessages(user.id, friendId);
      
      if (localMessages && localMessages.length > 0) {
        console.log("useMessages - Loading cached messages:", localMessages.length, "messages");
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
        console.log("useMessages - Incremental sync since:", sinceTimestamp);
      } else {
        // First sync, fetch all messages (limited)
        url += '&limit=100';
        console.log("useMessages - Full sync (first time)");
      }
      
      console.log("useMessages - Fetching from:", url);
      const response = await apiCall(url);

      if (!response.ok) {
        throw new Error("Failed to fetch messages");
      }

      const data = await response.json();
      console.log("useMessages - Received data:", data);
      
      // Transform messages to match UI format
      const newMessages = (data.messages || []).map((msg) => ({
        id: msg.id,
        text: msg.content,
        sender: msg.sender_id,
        timestamp: new Date(msg.created_at),
        isOwn: msg.sender_id === user?.id,
      }));

      console.log("useMessages - New messages from server:", newMessages.length);
      
      // Step 3: Merge with existing messages (remove duplicates)
      let finalMessages;
      if (localMessages && localMessages.length > 0) {
        finalMessages = mergeMessages(localMessages, newMessages);
        console.log("useMessages - Merged messages:", finalMessages.length);
      } else {
        finalMessages = newMessages;
      }
      
      // Step 4: Update state and cache
      setMessages(finalMessages);
      
      // Save to local storage with updated sync time
      saveMessages(user.id, friendId, finalMessages, true);
      console.log("useMessages - Synced and cached messages");
      
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
      
      // Save to local storage (don't update sync time for optimistic updates)
      if (user && friendId) {
        saveMessages(user.id, friendId, updatedMessages, false);
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
