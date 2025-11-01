"use client";
import { useState, useRef, useEffect, Fragment } from "react";
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
      <div className="flex-1 bg-[#252526] border border-[#3e3e42] rounded-2xl p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 bg-[#2a2d2e] rounded-full flex items-center justify-center mb-4 mx-auto">
            <span className="text-4xl">💬</span>
          </div>
          <h3 className="text-lg font-semibold text-[#d4d4d4] mb-2">
            Select a chat to start messaging
          </h3>
          <p className="text-sm text-[#858585]">
            Choose a conversation from the sidebar to begin chatting
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-[#252526] border border-[#3e3e42] rounded-2xl flex flex-col p-2 min-h-0 relative">
      {/* Top Bar */}
      <div className="absolute top-2 left-2 right-2 z-10 flex items-center justify-between px-4 py-2 border rounded-2xl border-[#3e3e42] bg-[#252526]/85 backdrop-blur-md">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-[#3e3e42] rounded-full flex items-center justify-center mr-3">
            <span className="font-semibold text-[#d4d4d4]">
              {selectedFriend.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h3 className="font-semibold text-[#d4d4d4]">{selectedFriend.name}</h3>
            <p className="text-xs text-[#858585]">UID: {selectedFriend.uid}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button className="p-2 hover:bg-[#3e3e42] rounded-full transition-colors">
            <Phone size={20} className="text-gray-100" />
          </button>
          <button className="p-2 hover:bg-[#3e3e42] rounded-full transition-colors">
            <Video size={20} className="text-gray-100" />
          </button>
          <button className="p-2 hover:bg-[#3e3e42] rounded-full transition-colors">
            <MoreVertical size={20} className="text-gray-100" />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div 
        className="absolute inset-2 overflow-y-auto px-4 pt-20 pb-24"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#3e3e42 transparent'
        }}
      >
        <style jsx>{`
          div::-webkit-scrollbar {
            width: 6px;
          }
          div::-webkit-scrollbar-track {
            background: transparent;
          }
          div::-webkit-scrollbar-thumb {
            background: #3e3e42;
            border-radius: 3px;
          }
          div::-webkit-scrollbar-thumb:hover {
            background: #505050;
          }
        `}</style>
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="text-[#858585]">Loading messages...</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex justify-center items-center h-full">
            <div className="text-[#858585] text-center">
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

            const prevMsg = index > 0 ? messages[index - 1] : null;
            const isSameSender = prevMsg && prevMsg.sender === msg.sender && !showDate;

            return (
              <Fragment key={`${msg.id}-${index}`}>
                {showDate && (
                  <div className="flex justify-center mb-4">
                    <span className="text-xs text-[#858585] bg-[#2a2d2e] px-2 py-1 rounded-full border border-[#3e3e42]">
                      {formatDate(msg.timestamp)}
                    </span>
                  </div>
                )}

                <div
                  className={`flex ${
                    msg.isOwn ? "justify-end" : "justify-start"
                  } ${isSameSender ? "mt-1" : "mt-4"}`}
                >
                  <div
                    className={`flex flex-row gap-2 max-w-xs lg:max-w-md p-2 ${
                      msg.isOwn
                        ? `bg-gray-600 text-white ${isSameSender ? "rounded-xl" : "rounded-tl-xl rounded-bl-xl rounded-br-xl"}`
                        : `bg-[#3e3e42] text-[#d4d4d4] border border-[#505050] ${isSameSender ? "rounded-xl" : "rounded-tr-xl rounded-br-xl rounded-bl-xl"}`
                    }`}
                  >
                    <p className="break-all" style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{msg.text}</p>
                    <p
                      className={`flex items-end text-xs mt-1 ${
                        msg.isOwn ? "text-gray-100" : "text-[#858585]"
                      }`}
                    >
                      {formatTime(msg.timestamp)}
                    </p>
                  </div>
                </div>
              </Fragment>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Area */}
      <div className="absolute bottom-2 left-2 right-2 z-10 p-1 bg-[#252526]">
        <div className="flex-1 bg-[#3c3c3c] rounded-full p-2 flex items-center">
          <button className="p-2 hover:bg-[#262629] rounded-full transition-colors">
            <Paperclip size={20} className="text-gray-100" />
          </button>
          <button className="p-1 hover:bg-[#262629] rounded-full transition-colors mr-2">
            <Smile size={20} className="text-gray-100" />
          </button>

          <textarea
            ref={textAreaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 bg-transparent resize-none outline-none text-sm max-h-[120px] py-1 text-[#d4d4d4] placeholder-[#858585]"
            rows="1"
          />
          
          {message.trim() ? (
            <button
              onClick={handleSendMessage}
              className="p-2 bg-gray-600 text-white rounded-full hover:bg-gray-700 transition-colors"
            >
              <ArrowUp size={20} />
            </button>
          ) : (
            <button
              className={`p-2 rounded-full transition-colors ${
                isRecording
                  ? "bg-red-500 text-white animate-pulse"
                  : "hover:bg-[#262629] text-gray-100"
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
            <span className="text-xs text-red-400 animate-pulse">
              Recording... Release to send
            </span>
          </div>
        )}
      </div>
    </div>
  );
}