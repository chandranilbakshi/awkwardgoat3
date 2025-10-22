"use client";
import { useState, useEffect } from "react";
import { X, Copy, Check, Clipboard, SendHorizonal, ChevronLeft } from "lucide-react";

export default function AddFriendModal({
  isOpen,
  isClosing,
  onClose,
  position,
  userUid,
}) {
  const [showCopied, setShowCopied] = useState(false);
  const [view, setView] = useState("main"); // 'main' or 'search'
  const [searchUID, setSearchUID] = useState("");
  const [searchResults, setSearchResults] = useState([]); // Array to support up to 2 users
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Reset view when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setView("main");
      setSearchUID("");
      setSearchResults([]);
      setSearchError("");
      setSuccessMessage("");
    }
  }, [isOpen]);

  // Debounced search with 500ms delay
  useEffect(() => {
    if (view !== "search" || searchUID.length !== 8) {
      setSearchResults([]);
      setSearchError("");
      return;
    }

    setIsSearching(true);
    setSearchError("");

    const timer = setTimeout(async () => {
      try {
        const accessToken = localStorage.getItem("access_token");

        const response = await fetch(
          `http://localhost:8080/api/user/search-by-uid/${searchUID}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        const data = await response.json();

        if (response.ok && data.exists) {
          // Check if user is already in results (to support searching multiple users)
          const alreadyAdded = searchResults.some(
            (u) => u.uid === data.user.uid
          );
          if (!alreadyAdded && searchResults.length < 2) {
            setSearchResults((prev) => [...prev, data.user]);
          }
          setSearchError("");
        } else {
          setSearchError(data.error || "User does not exist");
        }
      } catch (error) {
        console.error("Search error:", error);
        setSearchError("Failed to search user");
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchUID, view]);

  const handleCopyUid = async () => {
    if (userUid) {
      try {
        await navigator.clipboard.writeText(userUid.toString());
        setShowCopied(true);
        setTimeout(() => setShowCopied(false), 2000);
      } catch (err) {
        console.error("Failed to copy UID:", err);
      }
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setSearchUID(text.trim());
    } catch (err) {
      console.error("Failed to paste:", err);
    }
  };

  const handleSendRequestClick = () => {
    setView("search");
  };

  const handleBack = () => {
    setView("main");
    setSearchUID("");
    setSearchResults([]);
    setSearchError("");
    setSuccessMessage("");
  };

  const handleSendFriendRequest = async (receiverID) => {
    try {
      const accessToken = localStorage.getItem("access_token");

      const response = await fetch(
        "http://localhost:8080/api/friends/send-request",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ receiver_id: receiverID }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage("Friend request sent!");
        setSearchResults([]);
        setSearchUID("");

        // Show success message for 2 seconds then go back to main
        setTimeout(() => {
          setSuccessMessage("");
          setView("main");
        }, 2000);
      } else {
        setSearchError(data.error || "Failed to send friend request");
      }
    } catch (error) {
      console.error("Error sending friend request:", error);
      setSearchError("Failed to send friend request");
    }
  };

  const handleViewRequests = () => {
    console.log("View Friend Requests clicked");
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop - transparent overlay for click outside */}
      <div className="fixed inset-0 z-40 animate-fadeIn" onClick={onClose} />

      {/* Modal - positioned absolutely with slide-up/down animation */}
      <div
        className={`fixed bg-white border-2 border-black rounded-2xl w-[280px] p-5 pt-4 shadow-2xl z-50 ${
          isClosing ? "animate-slideDown" : "animate-slideUp"
        }`}
        style={{
          left: `${position.left - 28}px`,
          bottom: `${position.bottom}px`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between mb-4">
          {/* Title */}
          <h2 className="text-xl font-bold text-black">
            {view === "main" ? "Add Friend" : "Search Friend"}
          </h2>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="text-xl hover:scale-110 transition-transform cursor-pointer"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Main View */}
        {view === "main" && (
          <>
            {/* Your ID Section */}
            {userUid && (
              <div className="flex flex-row items-center justify-between mb-4 p-3 bg-gray-50 border border-gray-300 rounded-lg">
                <div className="text-xs text-gray-600">Your ID</div>
                <div className="flex items-center">
                  <span className="text-lg font-mono font-bold text-black">
                    {userUid.toString().padStart(8, "0")}
                  </span>
                  <button
                    onClick={handleCopyUid}
                    className="ml-2 cursor-pointer"
                  >
                    {showCopied ? <Check size={18} /> : <Copy size={18} />}
                  </button>
                  </div>
              </div>
            )}

            {/* Option 1: Send Friend Request */}
            <button
              onClick={handleSendRequestClick}
              className="w-full h-[70px] border-2 border-black rounded-[10px] p-3 hover:bg-gray-100 transition-colors text-left"
            >
              <div className="font-bold text-[15px] text-black">
                Send Friend Request
              </div>
              <div className="text-[13px] text-gray-600">
                Search by 8-digit ID
              </div>
            </button>

            {/* Option 2: View Friend Requests */}
            <button
              onClick={handleViewRequests}
              className="w-full h-[70px] border-2 border-black rounded-[10px] p-3 hover:bg-gray-100 transition-colors text-left mt-3"
            >
              <div className="font-bold text-[15px] text-black">
                Friend Requests
              </div>
              <div className="text-[13px] text-gray-600">
                View pending requests
              </div>
            </button>
          </>
        )}

        {/* Search View */}
        {view === "search" && (
          <>
            {/* Back Button */}
            <button
              onClick={handleBack}
              className="mb-3 text-sm text-gray-600 hover:text-black flex items-center"
            >
              <ChevronLeft size={20} />
              Back
            </button>

            {/* Search Input */}
            <div className="mb-4">
              <label className="block text-xs text-gray-600 mb-2">
                Enter 8-digit ID
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchUID}
                  onChange={(e) =>
                    setSearchUID(e.target.value.replace(/\D/g, "").slice(0, 8))
                  }
                  placeholder="_ _ _ _ _ _ _ _"
                  className="w-full px-3 py-2 pr-10 border-2 border-black rounded-lg font-mono text-center focus:outline-none focus:ring-2 focus:ring-gray-400"
                  maxLength={8}
                />
                <button
                  onClick={handlePaste}
                  className="absolute right-2 top-1/2 -translate-y-1/2 pr-2 cursor-pointer"
                >
                  <Clipboard size={18} />
                </button>
              </div>
            </div>

            {/* Success Message */}
            {successMessage && (
              <div className="mb-3 p-3 bg-green-50 border border-green-300 rounded-lg">
                <p className="text-sm text-green-700 font-semibold">
                  {successMessage}
                </p>
              </div>
            )}

            {/* Error Message */}
            {searchError && !successMessage && (
              <div className="mb-3 p-3 bg-red-50 border border-red-300 rounded-lg">
                <p className="text-sm text-red-600">{searchError}</p>
              </div>
            )}

            {/* Loading State */}
            {isSearching && (
              <div className="text-center py-4">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-black"></div>
              </div>
            )}

            {/* Search Results */}
            {searchResults.length > 0 && !successMessage && (
              <div className="space-y-2">
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 bg-gray-50 border border-gray-300 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-gray-600">
                        {user.name}
                      </div>
                    </div>
                    <button
                      onClick={() => handleSendFriendRequest(user.id)}
                      className="mr-1 cursor-pointer"
                    >
                      <SendHorizonal size={20} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Help Text */}
            {searchResults.length === 0 &&
              !isSearching &&
              !searchError &&
              searchUID.length < 8 && (
                <div className="text-center py-4">
                  <p className="text-xs text-gray-500">
                    Enter an 8-digit ID to search
                  </p>
                </div>
              )}
          </>
        )}
      </div>
    </>
  );
}
