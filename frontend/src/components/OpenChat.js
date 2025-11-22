"use client";
import { useState, useRef, useEffect, Fragment, useCallback, useMemo } from "react";
import {
  Phone,
  Video,
  MoreVertical,
  Smile,
  Paperclip,
  Mic,
  ArrowUp,
  ArrowLeft,
} from "lucide-react";
import { useMessages } from "@/hooks/useMessages";
import { useAuth } from "@/contexts/AuthContext";

export default function OpenChat({ selectedFriend, onClose, isMobile, onStartCall, sendWSMessage, addMessageHandler, callState }) {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef(null);
  const textAreaRef = useRef(null);

  // Messages
  const { messages, addMessage, loading } = useMessages(selectedFriend?.fid);

  // Listen for incoming WebSocket messages (chat only, signaling handled globally)
  useEffect(() => {
    if (!selectedFriend) return;

    const removeHandler = addMessageHandler((incomingMessage) => {
      const messageType = incomingMessage.type;
      const messagePayload = incomingMessage.payload || incomingMessage;

      // Only handle chat messages here (signaling is handled globally)
      if (messageType === "chat") {
        // Handle chat messages
        const actualMessage = messagePayload;
        
        const isForThisConversation =
          (actualMessage.user_id_1 === user?.id &&
            actualMessage.user_id_2 === selectedFriend.fid) ||
          (actualMessage.user_id_1 === selectedFriend.fid &&
            actualMessage.user_id_2 === user?.id);

        if (isForThisConversation) {
          const newMsg = {
            id: actualMessage.id || `ws-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            text: actualMessage.content,
            sender: actualMessage.sender_id,
            timestamp: new Date(actualMessage.created_at),
            isOwn: actualMessage.sender_id === user?.id,
          };
          addMessage(newMsg);
        }
      } else if (!messageType) {
        // Backward compatibility for unwrapped messages
        const actualMessage = messagePayload;
        
        const isForThisConversation =
          (actualMessage.user_id_1 === user?.id &&
            actualMessage.user_id_2 === selectedFriend.fid) ||
          (actualMessage.user_id_1 === selectedFriend.fid &&
            actualMessage.user_id_2 === user?.id);

        if (isForThisConversation) {
          const newMsg = {
            id: actualMessage.id || `ws-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            text: actualMessage.content,
            sender: actualMessage.sender_id,
            timestamp: new Date(actualMessage.created_at),
            isOwn: actualMessage.sender_id === user?.id,
          };
          addMessage(newMsg);
        }
      }
    });

    return removeHandler;
  }, [selectedFriend, addMessageHandler, addMessage, user?.id]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Memoize handlers to prevent recreation on every render
  const handleSendMessage = useCallback(() => {
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

    // Wrap message in WebSocketMessage format expected by backend
    const wrappedMessage = {
      type: "chat",
      payload: messageData,
    };

    // Send via WebSocket
    const sent = sendWSMessage(wrappedMessage);
    
    if (sent) {
      // Optimistically add to UI with a unique ID
      // Use timestamp + random string to ensure uniqueness even for rapid messages
      const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newMessage = {
        id: uniqueId,
        text: message.trim(),
        sender: user.id,
        timestamp: new Date(),
        isOwn: true,
      };
      addMessage(newMessage);
      setMessage("");
    }
  }, [message, selectedFriend, user, sendWSMessage, addMessage]);

  const handleKeyPress = useCallback((e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  // Auto-resize textarea - using requestAnimationFrame to batch DOM updates
  useEffect(() => {
    const resizeTextarea = () => {
      if (textAreaRef.current) {
        textAreaRef.current.style.height = "auto";
        textAreaRef.current.style.height =
          Math.min(textAreaRef.current.scrollHeight, 120) + "px";
      }
    };

    // Use requestAnimationFrame to batch DOM updates and improve performance
    const rafId = requestAnimationFrame(resizeTextarea);
    
    return () => cancelAnimationFrame(rafId);
  }, [message]);

  // Memoize formatting functions to prevent recreation on every render
  const formatTime = useCallback((timestamp) => {
    return new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(timestamp);
  }, []);

  const formatDate = useCallback((timestamp) => {
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
  }, []);

  // Memoize processed messages to avoid recalculating formatting on every render
  const processedMessages = useMemo(() => {
    return messages.map((msg, index) => {
      const formattedDate = formatDate(msg.timestamp);
      const formattedTime = formatTime(msg.timestamp);
      
      const showDate =
        index === 0 ||
        formatDate(messages[index - 1].timestamp) !== formattedDate;

      const prevMsg = index > 0 ? messages[index - 1] : null;
      const isSameSender = prevMsg && prevMsg.sender === msg.sender && !showDate;

      return {
        ...msg,
        formattedDate,
        formattedTime,
        showDate,
        isSameSender,
      };
    });
  }, [messages, formatDate, formatTime]);

  // Handle call button click - memoized to prevent recreation
  const handleCallClick = useCallback(() => {
    if (selectedFriend && onStartCall) {
      onStartCall(selectedFriend);
    }
  }, [selectedFriend, onStartCall]);

  if (!selectedFriend) {
    return (
      <div className="hidden md:flex flex-1 bg-[#252526] border border-[#3e3e42] rounded-2xl p-4 items-center justify-center">
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

  // Mobile Layout
  if (isMobile) {
    return (
      <div className="fixed inset-0 bg-[#252526] flex flex-col z-10">
        {/* Call Status Strip - Only show when call is active */}
        {callState && callState !== "idle" && (
          <div 
            onClick={onClose}
            className="fixed top-16 left-0 right-0 bg-green-600 hover:bg-green-700 cursor-pointer transition-colors z-30 px-4 py-0.5 flex items-center justify-center"
          >
            <span className="text-white flex items-center gap-1 text-sm font-medium"><ArrowLeft size={20} /> Go back to call</span>
          </div>
        )}

        {/* Mobile Messages Area - Full height, scrolls under header */}
        <div 
          className={`absolute inset-0 overflow-y-auto px-4 pb-24 ${
            callState && callState !== "idle" ? "pt-28" : "pt-20"
          }`}
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: '#3e3e42 transparent'
          }}
        >
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
            processedMessages.map((msg, index) => (
              <Fragment key={`${msg.id}-${index}`}>
                {msg.showDate && (
                  <div className="flex justify-center my-3">
                    <span className="text-xs text-[#858585] bg-[#2a2d2e] px-2 py-1 rounded-full border border-[#3e3e42]">
                      {msg.formattedDate}
                    </span>
                  </div>
                )}
                <div
                  className={`flex ${
                    msg.isOwn ? 'justify-end' : 'justify-start'
                  } ${msg.isSameSender ? 'mt-1' : 'mt-3'}`}
                >
                  <div
                  className={`flex flex-row gap-2 max-w-xs lg:max-w-md p-2 ${
                    msg.isOwn
                      ? `bg-gray-600 text-white ${msg.isSameSender ? "rounded-xl" : "rounded-tl-xl rounded-bl-xl rounded-br-xl"}`
                      : `bg-[#3e3e42] text-[#d4d4d4] border border-[#505050] ${msg.isSameSender ? "rounded-xl" : "rounded-tr-xl rounded-br-xl rounded-bl-xl"}`
                  }`}
                >
                    <p className="break-all" style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{msg.text}</p>
                  <p
                    className={`flex items-end text-xs mt-1 ${
                      msg.isOwn ? "text-gray-100" : "text-[#858585]"
                    }`}
                  >
                    {msg.formattedTime}
                  </p>
                  </div>
                </div>
              </Fragment>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Mobile Top Bar - Fixed on top with blur */}
        <div className="fixed top-0 left-0 right-0 flex items-center justify-between p-3 border-b border-[#3e3e42] bg-[#252526]/85 backdrop-blur-md z-20">
          <div className="flex items-center">
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#3e3e42] rounded-full transition-colors mr-2"
              aria-label="Back to chats"
            >
              <ArrowLeft size={20} className="text-gray-100" />
            </button>
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
            <button 
              onClick={handleCallClick}
              className="p-2 hover:bg-[#3e3e42] rounded-full transition-colors"
            >
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

        {/* Mobile Input Bar - Fixed at bottom */}
        <div className="fixed bottom-0 left-0 right-0 p-3 pt-0 bg-[#252526]/85 backdrop-blur-md">
          <div className="flex items-center bg-[#3c3c3c] rounded-full p-2">
            <button className="p-2 hover:bg-[#262629] rounded-full transition-colors">
              <Paperclip size={20} className="text-gray-100" />
            </button>
            <button className="p-2 hover:bg-[#262629] rounded-full transition-colors mr-2">
              <Smile size={20} className="text-gray-100" />
            </button>

            <textarea
              ref={textAreaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="flex-1 bg-transparent resize-none outline-none max-h-[120px] text-[#d4d4d4] placeholder-[#858585]"
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
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'hover:bg-[#262629] text-gray-100'
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
            <div className="text-center mt-1">
              <span className="text-xs text-red-400 animate-pulse">
                Recording... Release to send
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Desktop Layout
  return (
  <div className="flex-1 bg-[#252526] border border-[#3e3e42] rounded-2xl flex flex-col p-2 min-h-0 relative">
    {/* Desktop Top Bar */}
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
        <button 
          onClick={handleCallClick}
          className="p-2 hover:bg-[#3e3e42] rounded-full transition-colors"
        >
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

    {/* Desktop Messages Area */}
    <div
      className="flex-1 overflow-y-auto px-4 py-20"
      style={{
        scrollbarWidth: 'thin',
        scrollbarColor: '#3e3e42 transparent',
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
        processedMessages.map((msg, index) => (
          <Fragment key={`${msg.id}-${index}`}>
            {msg.showDate && (
              <div className="flex justify-center my-3">
                <span className="text-xs text-[#858585] bg-[#2a2d2e] px-2 py-1 rounded-full border border-[#3e3e42]">
                  {msg.formattedDate}
                </span>
              </div>
            )}
            <div
              className={`flex ${
                msg.isOwn ? 'justify-end' : 'justify-start'
              } ${msg.isSameSender ? 'mt-1' : 'mt-4'}`}
            >
              <div
                className={`flex flex-row gap-2 max-w-xs lg:max-w-md p-2 ${
                    msg.isOwn
                      ? `bg-gray-600 text-white ${msg.isSameSender ? "rounded-xl" : "rounded-tl-xl rounded-bl-xl rounded-br-xl"}`
                      : `bg-[#3e3e42] text-[#d4d4d4] border border-[#505050] ${msg.isSameSender ? "rounded-xl" : "rounded-tr-xl rounded-br-xl rounded-bl-xl"}`
                  }`}
              >
                <p className="break-all" style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{msg.text}</p>
                <p
                    className={`flex items-end text-xs mt-1 ${
                      msg.isOwn ? "text-gray-100" : "text-[#858585]"
                    }`}
                  >
                    {msg.formattedTime}
                  </p>
              </div>
            </div>
          </Fragment>
        ))
      )}
      <div ref={messagesEndRef} />
    </div>

    {/* Desktop Input Bar */}
    <div className="px-2 pb-2">
      <div className="flex items-center bg-[#3c3c3c] rounded-full p-2">
        <button className="p-2 hover:bg-[#262629] rounded-full transition-colors">
          <Paperclip size={20} className="text-gray-100" />
        </button>
        <button className="p-2 hover:bg-[#262629] rounded-full transition-colors mr-2">
          <Smile size={20} className="text-gray-100" />
        </button>

        <textarea
          ref={textAreaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
          className="flex-1 resize-none outline-none max-h-[120px] text-[#d4d4d4] placeholder-[#858585]"
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
                ? 'bg-red-500 text-white animate-pulse'
                : 'hover:bg-[#262629] text-gray-100'
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
        <div className="text-center mt-1">
          <span className="text-xs text-red-400 animate-pulse">
            Recording... Release to send
          </span>
        </div>
      )}
    </div>
  </div>
);

}