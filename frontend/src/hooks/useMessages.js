"use client";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useApi } from "@/hooks/useApi";

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
      const url = `http://localhost:8080/api/messages/history?friend_id=${friendId}&limit=100`;
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
    setMessages((prev) => [...prev, message]);
  }, []);

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
