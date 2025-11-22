"use client";
import dynamic from 'next/dynamic';

const AddFriendModal = dynamic(() => import('@/components/AddFriendModal'), {
  ssr: false,
});

const CallModal = dynamic(() => import('@/components/CallModal'), {
  ssr: false,
});

const OpenChat = dynamic(() => import('@/components/OpenChat'), {
  ssr: false,
});

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import { Ellipsis, Plus } from "lucide-react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useWebRTC } from "@/hooks/useWebRTC";

export default function ChatPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalClosing, setIsModalClosing] = useState(false);
  const [modalPosition, setModalPosition] = useState({ left: 0, bottom: 0 });
  const [showNamePopup, setShowNamePopup] = useState(false);
  const [fullName, setFullName] = useState("");
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [isCheckingProfile, setIsCheckingProfile] = useState(true);
  const [userUid, setUserUid] = useState(null);
  const [leftPanelWidth, setLeftPanelWidth] = useState(400); // Initial width in pixels
  const [isResizing, setIsResizing] = useState(false);
  const [friends, setFriends] = useState([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [friendsError, setFriendsError] = useState("");
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const buttonRef = useRef(null);
  const containerRef = useRef(null);
  const router = useRouter();
  const { user, loading } = useAuth();
  const { apiCall } = useApi();

  // WebSocket and WebRTC for global call handling (must be called before any conditional returns)
  const { sendMessage: sendWSMessage, addMessageHandler } = useWebSocket();
  const {
    callState,
    otherUser,
    isMuted,
    callDuration,
    remoteAudioRef,
    startCall,
    answerCall,
    declineCall,
    endCall,
    toggleMute,
    handleIncomingOffer,
    handleIncomingAnswer,
    handleIncomingIceCandidate,
  } = useWebRTC(sendWSMessage);

  // Detect mobile view
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Function to load friends list
  const loadFriends = useCallback(async () => {
    if (!user) return;

    setIsLoadingFriends(true);
    setFriendsError("");

    try {
      const response = await apiCall(
        `${
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"
        }/api/friends/list`
      );
      const data = await response.json();

      if (response.ok) {
        setFriends(data.friends || []);
      } else {
        setFriendsError(data.error || "Failed to load friends");
      }
    } catch (error) {
      console.error("Error loading friends:", error);
      setFriendsError("Failed to load friends");
    } finally {
      setIsLoadingFriends(false);
    }
  }, [user, apiCall]);

  // Handle call initiation from OpenChat
  const handleStartCall = useCallback(
    (friend) => {
      startCall({
        id: friend.fid,
        name: friend.name,
      });
    },
    [startCall]
  );

  // Redirect to signup if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push("/signup");
    }
  }, [user, loading, router]);

  // Check if user profile exists on mount
  useEffect(() => {
    const checkUserProfile = async () => {
      if (!user || loading) {
        setIsCheckingProfile(false);
        return;
      }

      try {
        // Check if user profile exists via backend using API interceptor
        const response = await apiCall(
          `${
            process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"
          }/api/user/check-profile`
        );

        if (response.ok) {
          const data = await response.json();

          if (!data.exists) {
            // No profile found, show name popup
            setShowNamePopup(true);
            document.body.style.overflow = "hidden";
          } else if (data.uid) {
            // Profile exists, store the UID
            setUserUid(data.uid);
          }
        }
      } catch (error) {
        console.error("Error checking user profile:", error);
      } finally {
        setIsCheckingProfile(false);
      }
    };

    checkUserProfile();
  }, [user, loading, apiCall]);

  // Load friends when userUid is set
  useEffect(() => {
    if (userUid) {
      loadFriends();
    }
  }, [userUid, loadFriends]);

  // Global WebSocket handler for call signaling
  useEffect(() => {
    if (!user) return;

    const removeHandler = addMessageHandler((incomingMessage) => {
      const messageType = incomingMessage.type;
      const messagePayload = incomingMessage.payload || incomingMessage;

      // Handle WebRTC signaling messages globally
      if (messageType === "call-offer") {
        handleIncomingOffer(messagePayload);
      } else if (messageType === "call-answer") {
        handleIncomingAnswer(messagePayload);
      } else if (messageType === "ice-candidate") {
        handleIncomingIceCandidate(messagePayload);
      } else if (messageType === "call-error") {
        const { reason, receiver_id } = messagePayload;
        if (reason === "user_offline") {
          toast.error("User is offline");
        } else if (reason === "user_busy") {
          toast.error("User is busy on another call");
        } else if (reason === "delivery_failed") {
          toast.error("Failed to reach user");
        }
      } else if (messageType === "call-end") {
        // Other party ended the call
        endCall();
      }
      // Chat messages will be handled by OpenChat component through the passed addMessageHandler
    });

    return removeHandler;
  }, [
    user,
    addMessageHandler,
    handleIncomingOffer,
    handleIncomingAnswer,
    handleIncomingIceCandidate,
  ]);

  // ESC key handler
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape" && isModalOpen) {
        closeModal();
      }
    };

    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "unset"; // Cleanup on unmount
    };
  }, [isModalOpen]);

  // Resize handler
  const handleMouseMove = useCallback(
    (e) => {
      if (!isResizing || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = e.clientX - containerRect.left;
      const minWidth = 250;
      const maxWidth = 600;

      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setLeftPanelWidth(newWidth);
      }
    },
    [isResizing]
  );

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  // Don't render anything while loading or if not authenticated
  if (loading || !user) {
    return (
      <div className="fixed inset-0 bg-[#1e1e1e] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-400 mb-4"></div>
          <p className="text-[#858585]">Loading...</p>
        </div>
      </div>
    );
  }

  const handleNameSubmit = async (e) => {
    e.preventDefault();

    if (!fullName.trim()) {
      setProfileError("Please enter your full name");
      return;
    }

    setIsCreatingProfile(true);
    setProfileError("");

    try {
      // Call backend to create profile using API interceptor
      const response = await apiCall(
        `${
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"
        }/api/user/create-profile`,
        {
          method: "POST",
          body: JSON.stringify({ name: fullName.trim() }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create profile");
      }

      // Success! Close popup and allow user to continue
      setShowNamePopup(false);
      document.body.style.overflow = "unset";

      // Store UID and load friends
      if (data.profile && data.profile.uid) {
        setUserUid(data.profile.uid);
        loadFriends();
      }

      // Optionally store profile data locally
      localStorage.setItem("user_profile", JSON.stringify(data.profile));
    } catch (error) {
      console.error("Error creating profile:", error);
      setProfileError(
        error.message || "Failed to create profile. Please try again."
      );
    } finally {
      setIsCreatingProfile(false);
    }
  };

  const openModal = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setModalPosition({
        left: rect.left + rect.width / 2,
        bottom: window.innerHeight - rect.top + 16,
      });
    }
    setIsModalClosing(false);
    setIsModalOpen(true);
    document.body.style.overflow = "hidden";
  };

  const closeModal = () => {
    setIsModalClosing(true);
    setTimeout(() => {
      setIsModalOpen(false);
      setIsModalClosing(false);
      document.body.style.overflow = "unset";
    }, 250); // Match animation duration
  };

  // Resize handler
  const handleMouseDown = (e) => {
    setIsResizing(true);
    e.preventDefault();
  };

  return (
    <div className="container h-screen bg-[#1e1e1e] md:p-1 flex mx-auto">
      <div
        ref={containerRef}
        className="md:flex w-full relative h-full overflow-hidden"
      >
        <div className="flex flex-col h-full gap-1">
          {/* Global Call Modal */}
          <CallModal
            callState={callState}
            otherUser={otherUser}
            isMuted={isMuted}
            callDuration={callDuration}
            onAnswer={answerCall}
            onDecline={declineCall}
            onEndCall={endCall}
            onToggleMute={toggleMute}
            remoteAudioRef={remoteAudioRef}
          />
          {/* Chat List Box */}
          <div
            className={`bg-[#252526] border border-[#3e3e42] md:rounded-2xl p-4 flex flex-col h-full transition-transform duration-300 ${
              isMobile && selectedFriend ? "hidden" : "flex"
            }`}
            style={{
              width: !isMobile ? `${leftPanelWidth}px` : "100%",
              minWidth: !isMobile ? "300px" : "auto",
            }}
          >
            <h2 className="text-xl font-bold text-[#d4d4d4] mb-4">Chats</h2>

            {/* Friends List */}
            <div className="flex-1 overflow-y-auto">
              {isLoadingFriends ? (
                <div className="flex items-center justify-center py-8">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400"></div>
                  <span className="ml-2 text-sm text-[#858585]">
                    Loading friends...
                  </span>
                </div>
              ) : friendsError ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-sm text-red-400">{friendsError}</p>
                </div>
              ) : friends.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-sm text-[#858585]">
                    No friends yet. Add some friends to start chatting!
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {friends.map((friend, index) => (
                    <div
                      key={friend.id || index}
                      onClick={() => setSelectedFriend(friend)}
                      className={`p-3 rounded-xl cursor-pointer transition-colors border ${
                        selectedFriend?.uid === friend.uid
                          ? "bg-gray-600 text-white border-gray-600"
                          : "bg-[#2a2d2e] hover:bg-[#3e3e42] border-[#3e3e42] hover:border-[#505050]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3
                            className={`font-semibold ${
                              selectedFriend?.uid === friend.uid
                                ? "text-white"
                                : "text-[#d4d4d4]"
                            }`}
                          >
                            {friend.name}
                          </h3>
                          <p
                            className={`text-xs ${
                              selectedFriend?.uid === friend.uid
                                ? "text-gray-100"
                                : "text-[#858585]"
                            }`}
                          >
                            UID: {friend.uid}
                          </p>
                        </div>
                        <Ellipsis
                          size={18}
                          className={`${
                            selectedFriend?.uid === friend.uid
                              ? "text-white"
                              : "text-gray-100"
                          }`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Floating + button - no blur */}
            <button
              ref={buttonRef}
              onClick={openModal}
              className={`absolute bottom-4 left-4 w-13 h-13 bg-gray-600 text-white rounded-full flex items-center justify-center text-3xl font-light shadow-lg hover:scale-105 hover:shadow-xl hover:bg-gray-700 transition-all duration-300 cursor-pointer ${
                isModalOpen ? "rotate-45" : "rotate-0"
              }`}
              aria-label="Add new chat"
            >
              <Plus size={32} />
            </button>
          </div>
        </div>

        {/* Resizable Divider - Hidden on mobile */}
        <div
          onMouseDown={handleMouseDown}
          className={`hidden md:block w-1 hover:w-2 bg-transparent hover:bg-[#3e3e42] cursor-col-resize transition-all ${
            isResizing ? "w-2 bg-[#505050]" : ""
          }`}
          style={{ minWidth: "4px" }}
        />

        {/* Active Chat Box */}
        <OpenChat
          selectedFriend={selectedFriend}
          onClose={() => setSelectedFriend(null)}
          isMobile={isMobile}
          onStartCall={handleStartCall}
          sendWSMessage={sendWSMessage}
          addMessageHandler={addMessageHandler}
          callState={callState}
        />
      </div>

      {/* Add Friend Modal */}
      <AddFriendModal
        isOpen={isModalOpen}
        isClosing={isModalClosing}
        onClose={closeModal}
        position={modalPosition}
        userUid={userUid}
      />

      {/* Name Input Popup - Blocking Modal */}
      {showNamePopup && (
        <div className="fixed inset-0 backdrop-blur-xs flex items-center justify-center z-[100] bg-black/50">
          <div className="bg-[#252526] border border-[#3e3e42] rounded-2xl w-[400px] p-8 shadow-[0_0_50px_rgba(0,0,0,0.8)]">
            <h2 className="text-2xl font-bold mb-2 text-[#d4d4d4]">Welcome!</h2>
            <p className="text-sm text-[#858585] mb-6">
              Please enter your full name to continue
            </p>

            <form onSubmit={handleNameSubmit}>
              <div className="mb-4">
                <label
                  htmlFor="fullName"
                  className="block text-sm font-medium text-[#d4d4d4] mb-2"
                >
                  Full Name
                </label>
                <input
                  type="text"
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={isCreatingProfile}
                  className="w-full px-4 py-3 border-2 border-[#3e3e42] bg-[#3c3c3c] text-[#d4d4d4] rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:bg-[#2a2d2e] disabled:cursor-not-allowed placeholder-[#858585]"
                  placeholder="Enter your full name"
                  autoFocus
                  required
                />
              </div>

              {profileError && (
                <div className="mb-4 p-3 bg-red-900/30 border border-red-700/50 rounded-lg">
                  <p className="text-sm text-red-400">{profileError}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isCreatingProfile}
                className="w-full py-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-colors disabled:bg-[#3e3e42] disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isCreatingProfile ? (
                  <>
                    <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Creating Profile...
                  </>
                ) : (
                  "Continue"
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Loading Screen while checking profile */}
      {isCheckingProfile && (
        <div className="fixed inset-0 bg-[#1e1e1e] flex items-center justify-center z-[99]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-400 mb-4"></div>
            <p className="text-[#858585]">Loading...</p>
          </div>
        </div>
      )}
    </div>
  );
}
