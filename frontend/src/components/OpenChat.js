"use client";
import { useState, useRef, useEffect } from "react";
import {
  Phone,
  Video,
  MoreVertical,
  Smile,
  Paperclip,
  Mic,
  ArrowUp,
} from "lucide-react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useMessages } from "@/hooks/useMessages";
import { useAuth } from "@/contexts/AuthContext";

export default function OpenChat({ selectedFriend, onClose }) {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef(null);
  const textAreaRef = useRef(null);

  // WebSocket and messages
  const { sendMessage: sendWSMessage, addMessageHandler } = useWebSocket();
  const { messages, addMessage, loading } = useMessages(selectedFriend?.fid);

  // Debug logging
  useEffect(() => {
    console.log("OpenChat - selectedFriend:", selectedFriend);
    console.log("OpenChat - selectedFriend?.fid:", selectedFriend?.fid);
  }, [selectedFriend]);

  // Listen for incoming WebSocket messages
  useEffect(() => {
    if (!selectedFriend) return;

    const removeHandler = addMessageHandler((incomingMessage) => {
      // Only add message if it's for this conversation
      const isForThisConversation =
        (incomingMessage.user_id_1 === user?.id &&
          incomingMessage.user_id_2 === selectedFriend.fid) ||
        (incomingMessage.user_id_1 === selectedFriend.fid &&
          incomingMessage.user_id_2 === user?.id);

      if (isForThisConversation) {
        const newMsg = {
          id: incomingMessage.id,
          text: incomingMessage.content,
          sender: incomingMessage.sender_id,
          timestamp: new Date(incomingMessage.created_at),
          isOwn: incomingMessage.sender_id === user?.id,
        };
        addMessage(newMsg);
      }
    });

    return removeHandler;
  }, [selectedFriend, addMessageHandler, addMessage, user?.id]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textAreaRef.current) {
      textAreaRef.current.style.height = "auto";
      textAreaRef.current.style.height =
        Math.min(textAreaRef.current.scrollHeight, 120) + "px";
    }
  }, [message]);

  const handleSendMessage = () => {
    if (!message.trim() || !selectedFriend || !user) return;

    // Sort user IDs to ensure consistency
    const userIds = [user.id, selectedFriend.fid].sort();

    // Create message object
    const messageData = {
      user_id_1: userIds[0],
      user_id_2: userIds[1],
      sender_id: user.id,
      content: message.trim(),
      created_at: new Date().toISOString(),
    };

    // Send via WebSocket
    const sent = sendWSMessage(messageData);
    
    if (sent) {
      // Optimistically add to UI
      const newMessage = {
        id: Date.now().toString(),
        text: message.trim(),
        sender: user.id,
        timestamp: new Date(),
        isOwn: true,
      };
      addMessage(newMessage);
      setMessage("");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp) => {
    return new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(timestamp);
  };

  const formatDate = (timestamp) => {
    const today = new Date();
    const messageDate = new Date(timestamp);

    if (messageDate.toDateString() === today.toDateString()) {
      return "Today";
    }

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (messageDate.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    }

    return messageDate.toLocaleDateString();
  };

  if (!selectedFriend) {
    return (
      <div className="flex-1 bg-white border border-black rounded-2xl p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4 mx-auto">
            <span className="text-4xl">💬</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Select a chat to start messaging
          </h3>
          <p className="text-sm text-gray-600">
            Choose a conversation from the sidebar to begin chatting
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-white border border-black rounded-2xl flex flex-col p-2 min-h-0 relative">
      {/* Top Bar */}
      <div className="absolute top-2 left-2 right-2 z-10 flex items-center justify-between px-4 py-2 border rounded-2xl border-gray-200 bg-white/80 backdrop-blur-md">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center mr-3">
            <span className="font-semibold">
              {selectedFriend.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h3 className="font-semibold text-black">{selectedFriend.name}</h3>
            <p className="text-xs text-gray-500">UID: {selectedFriend.uid}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <Phone size={20} className="text-gray-600" />
          </button>
          <button className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <Video size={20} className="text-gray-600" />
          </button>
          <button className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <MoreVertical size={20} className="text-gray-600" />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="absolute inset-2 overflow-y-auto px-4 pt-20 pb-24 space-y-4">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="text-gray-500">Loading messages...</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex justify-center items-center h-full">
            <div className="text-gray-500 text-center">
              <p>No messages yet</p>
              <p className="text-sm">Send a message to start the conversation</p>
            </div>
          </div>
        ) : (
          messages.map((msg, index) => {
          const showDate =
            index === 0 ||
            formatDate(messages[index - 1].timestamp) !==
              formatDate(msg.timestamp);

          return (
            <>
              {showDate && (
                <div key={`date-${msg.id}`} className="flex justify-center mb-4">
                  <span className="text-xs text-gray-500 bg-white px-3 py-1 rounded-full border">
                    {formatDate(msg.timestamp)}
                  </span>
                </div>
              )}

              <div
                key={msg.id}
                className={`flex ${
                  msg.isOwn ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-xl ${
                    msg.isOwn
                      ? "bg-black text-white rounded-br-none"
                      : "bg-gray-200 text-black border border-gray-200 rounded-bl-none"
                  }`}
                >
                  <p className="text-sm">{msg.text}</p>
                  <p
                    className={`text-xs mt-1 ${
                      msg.isOwn ? "text-gray-300" : "text-gray-500"
                    }`}
                  >
                    {formatTime(msg.timestamp)}
                  </p>
                </div>
              </div>
            </>
          );
        }))
        }
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Area */}
      <div className="absolute bottom-2 left-2 right-2 z-10 p-1 pt-0 bg-white">
        <div className="flex-1 bg-gray-100 rounded-full p-2 flex items-center">
          <button className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <Paperclip size={20} className="text-gray-600" />
          </button>
          <button className="p-1 hover:bg-gray-200 rounded-full transition-colors mr-2">
            <Smile size={20} className="text-gray-600" />
          </button>

          <textarea
            ref={textAreaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 bg-transparent resize-none outline-none text-sm max-h-[120px] py-1"
            rows="1"
          />
          
          {message.trim() ? (
            <button
              onClick={handleSendMessage}
              className="p-2 bg-black text-white rounded-full hover:bg-gray-800 transition-colors"
            >
              <ArrowUp size={20} />
            </button>
          ) : (
            <button
              className={`p-2 rounded-full transition-colors ${
                isRecording
                  ? "bg-red-500 text-white animate-pulse"
                  : "hover:bg-gray-100 text-gray-600"
              }`}
              onMouseDown={() => setIsRecording(true)}
              onMouseUp={() => setIsRecording(false)}
              onMouseLeave={() => setIsRecording(false)}
            >
              <Mic size={20} />
            </button>
          )}
        </div>

        {isRecording && (
          <div className="mt-2 text-center">
            <span className="text-xs text-red-500 animate-pulse">
              Recording... Release to send
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
