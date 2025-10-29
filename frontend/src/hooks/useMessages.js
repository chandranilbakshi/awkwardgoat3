"use client";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useApi } from "@/hooks/useApi";
import { 
  loadMessages, 
  saveMessages
} from "@/utils/chatStorage";

export function useMessages(friendId) {
  const { user } = useAuth();
  const { apiCall } = useApi();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch message history
  const fetchMessages = useCallback(async () => {
    console.log("useMessages - fetchMessages called", { friendId, hasUser: !!user });
    if (!friendId || !user) {
      console.log("useMessages - Skipping fetch: friendId or user missing");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Check if we have local messages for this conversation
      const localMessages = loadMessages(user.id, friendId);
      
      if (localMessages && localMessages.length > 0) {
        // Load from local storage
        console.log("useMessages - Loading from local storage:", localMessages.length, "messages");
        setMessages(localMessages);
        setError(null);
        setLoading(false);
        return;
      }
      
      // No local messages, fetch from database (first time on this device)
      console.log("useMessages - No local messages, fetching from database");
      const url = `http://localhost:8080/api/messages/history?friend_id=${friendId}&limit=50`;
      console.log("useMessages - Fetching from:", url);
      
      const response = await apiCall(url);

      if (!response.ok) {
        throw new Error("Failed to fetch messages");
      }

      const data = await response.json();
      console.log("useMessages - Received data:", data);
      
      // Transform messages to match UI format
      const transformedMessages = (data.messages || []).map((msg) => ({
        id: msg.id,
        text: msg.content,
        sender: msg.sender_id,
        timestamp: new Date(msg.created_at),
        isOwn: msg.sender_id === user?.id,
      }));

      console.log("useMessages - Transformed messages:", transformedMessages);
      setMessages(transformedMessages);
      
      // Save to local storage for future use
      if (transformedMessages.length > 0) {
        saveMessages(user.id, friendId, transformedMessages);
        console.log("useMessages - Saved messages to local storage");
      }
      
      setError(null);
    } catch (err) {
      console.error("Error fetching messages:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [friendId, user, apiCall]);

  // Add a new message to the list
  const addMessage = useCallback((message) => {
    setMessages((prev) => {
      const updatedMessages = [...prev, message];
      
      // Save to local storage whenever a new message is added
      if (user && friendId) {
        saveMessages(user.id, friendId, updatedMessages);
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
    addMessage,
    clearMessages,
    refetch: fetchMessages,
  };
}
