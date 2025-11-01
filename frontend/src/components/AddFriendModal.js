"use client";
import { useState, useEffect, useCallback } from "react";
import { X, Copy, Check, Clipboard, SendHorizonal, ChevronLeft } from "lucide-react";
import { useApi } from "@/hooks/useApi";

export default function AddFriendModal({
  isOpen,
  isClosing,
  onClose,
  position,
  userUid,
}) {
  const [showCopied, setShowCopied] = useState(false);
  const [view, setView] = useState("main"); // 'main', 'search', or 'view'
  const [searchUID, setSearchUID] = useState("");
  const [searchResults, setSearchResults] = useState([]); // Array to support up to 2 users
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  
  // Friend Requests View State
  const [activeTab, setActiveTab] = useState("received"); // 'sent' or 'received'
  const [statusFilter, setStatusFilter] = useState("pending"); // 'pending', 'accepted', 'rejected'
  const [requests, setRequests] = useState([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [requestsOffset, setRequestsOffset] = useState(0);
  const [hasMoreRequests, setHasMoreRequests] = useState(true);

  const { apiCall } = useApi();

  // Reset view when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setView("main");
      setSearchUID("");
      setSearchResults([]);
      setSearchError("");
      setSuccessMessage("");
      setActiveTab("received");
      setStatusFilter("pending");
      setRequests([]);
      setRequestsOffset(0);
      setHasMoreRequests(true);
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
        const response = await apiCall(
          `http://localhost:8080/api/user/search-by-uid/${searchUID}`
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
      const response = await apiCall(
        "http://localhost:8080/api/friends/send-request",
        {
          method: "POST",
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
    setView("view");
    fetchRequests(0, true); // Fetch initial requests
  };

  // Fetch friend requests
  const fetchRequests = useCallback(async (offset = 0, reset = false) => {
    setIsLoadingRequests(true);
    try {
      const type = activeTab; // 'sent' or 'received'
      const status = statusFilter; // 'pending', 'accepted', 'rejected'
      
      const response = await apiCall(
        `http://localhost:8080/api/friends/requests?type=${type}&status=${status}&offset=${offset}&limit=5`
      );

      const data = await response.json();

      if (response.ok) {
        const newRequests = data[activeTab] || [];
        
        if (reset) {
          setRequests(newRequests);
        } else {
          setRequests((prev) => [...prev, ...newRequests]);
        }
        
        // Check if there are more requests to load
        setHasMoreRequests(newRequests.length === 5);
        setRequestsOffset(offset);
      } else {
        console.error("Failed to fetch requests:", data.error);
      }
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      setIsLoadingRequests(false);
    }
  }, [activeTab, statusFilter, apiCall]);

  // Refetch requests when tab or status filter changes
  useEffect(() => {
    if (view === "view") {
      setRequestsOffset(0);
      fetchRequests(0, true);
    }
  }, [activeTab, statusFilter, view, fetchRequests]);

  const handleLoadMore = () => {
    const newOffset = requestsOffset + 5;
    fetchRequests(newOffset, false);
  };

  // Handle managing friend requests (accept/reject)
  const handleManageFriendRequest = async (requestId, status) => {
    try {
      const response = await apiCall(
        "http://localhost:8080/api/friends/manage-request",
        {
          method: "PUT",
          body: JSON.stringify({
            request_id: requestId,
            status: status, // "accepted" or "rejected"
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        // Refresh the requests list to reflect the changes
        fetchRequests(0, true);
        
        // Show success message (optional)
        console.log(`Friend request ${status} successfully`);
      } else {
        console.error("Failed to manage friend request:", data.error);
        // You could add error state handling here if needed
      }
    } catch (error) {
      console.error("Error managing friend request:", error);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop - transparent overlay for click outside */}
      <div className="fixed inset-0 z-40 animate-fadeIn bg-black/50" onClick={onClose} />

      {/* Modal - positioned absolutely with slide-up/down animation */}
      <div
        className={`fixed bg-[#252526] border-2 border-[#3e3e42] rounded-2xl w-[280px] p-5 pt-4 shadow-2xl z-50 ${
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
          <h2 className="text-xl font-bold text-[#d4d4d4]">
            {view === "main" ? "Add Friend" : view === "search" ? "Search Friend" : "Friend Requests"}
          </h2>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="text-xl hover:scale-110 transition-transform cursor-pointer text-gray-100"
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
              <div className="flex flex-row items-center justify-between mb-4 p-3 bg-[#4A5565] border border-[#3e3e42] rounded-lg">
                <div className="text-xs text-[#aaaaaa]">Your ID</div>
                <div className="flex items-center">
                  <span className="text-lg font-mono font-bold text-[#d4d4d4]">
                    {userUid.toString().padStart(8, "0")}
                  </span>
                  <button
                    onClick={handleCopyUid}
                    className="ml-2 cursor-pointer text-gray-100"
                  >
                    {showCopied ? <Check size={18} /> : <Copy size={18} />}
                  </button>
                  </div>
              </div>
            )}

            {/* Option 1: Send Friend Request */}
            <button
              onClick={handleSendRequestClick}
              className="w-full h-[70px] border-2 border-[#3e3e42] rounded-[10px] p-3 hover:bg-[#3e3e42] transition-colors text-left"
            >
              <div className="font-bold text-[15px] text-[#d4d4d4]">
                Send Friend Request
              </div>
              <div className="text-[13px] text-[#858585]">
                Search by 8-digit ID
              </div>
            </button>

            {/* Option 2: View Friend Requests */}
            <button
              onClick={handleViewRequests}
              className="w-full h-[70px] border-2 border-[#3e3e42] rounded-[10px] p-3 hover:bg-[#3e3e42] transition-colors text-left mt-3"
            >
              <div className="font-bold text-[15px] text-[#d4d4d4]">
                Friend Requests
              </div>
              <div className="text-[13px] text-[#858585]">
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
              className="mb-3 text-sm text-gray-100 hover:text-white flex items-center"
            >
              <ChevronLeft size={20} />
              Back
            </button>

            {/* Search Input */}
            <div className="mb-4">
              <label className="block text-xs text-[#858585] mb-2">
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
                  className="w-full px-3 py-2 pr-10 border-2 border-[#3e3e42] bg-[#3c3c3c] text-[#d4d4d4] rounded-lg font-mono text-center focus:outline-none focus:ring-2 focus:ring-gray-500 placeholder-[#858585]"
                  maxLength={8}
                />
                <button
                  onClick={handlePaste}
                  className="absolute right-2 top-1/2 -translate-y-1/2 pr-2 cursor-pointer text-gray-100"
                >
                  <Clipboard size={18} />
                </button>
              </div>
            </div>

            {/* Success Message */}
            {successMessage && (
              <div className="mb-3 p-3 bg-green-900/30 border border-green-700/50 rounded-lg">
                <p className="text-sm text-green-400 font-semibold">
                  {successMessage}
                </p>
              </div>
            )}

            {/* Error Message */}
            {searchError && !successMessage && (
              <div className="mb-3 p-3 bg-red-900/30 border border-red-700/50 rounded-lg">
                <p className="text-sm text-red-400">{searchError}</p>
              </div>
            )}

            {/* Loading State */}
            {isSearching && (
              <div className="text-center py-4">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400"></div>
              </div>
            )}

            {/* Search Results */}
            {searchResults.length > 0 && !successMessage && (
              <div className="space-y-2">
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 bg-[#2a2d2e] border border-[#3e3e42] rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-[#d4d4d4]">
                        {user.name}
                      </div>
                    </div>
                    <button
                      onClick={() => handleSendFriendRequest(user.id)}
                      className="mr-1 cursor-pointer text-gray-100"
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
                  <p className="text-xs text-[#858585]">
                    Enter an 8-digit ID to search
                  </p>
                </div>
              )}
          </>
        )}

        {/* View Requests View */}
        {view === "view" && (
          <>
            {/* Back Button */}
            <button
              onClick={handleBack}
              className="mb-3 text-sm text-gray-100 hover:text-white flex items-center"
            >
              <ChevronLeft size={20} />
              Back
            </button>

            {/* Tabs and Status Filter */}
            <div className="flex justify-between items-center mb-4">
              {/* Tabs */}
              <div className="flex gap-4">
                <button
                  onClick={() => setActiveTab("received")}
                  className={`text-sm font-semibold pb-1 transition-colors ${
                    activeTab === "received"
                      ? "text-[#d4d4d4] border-b-2 border-gray-400"
                      : "text-[#858585] hover:text-[#d4d4d4]"
                  }`}
                >
                  Received
                </button>
                <button
                  onClick={() => setActiveTab("sent")}
                  className={`text-sm font-semibold pb-1 transition-colors ${
                    activeTab === "sent"
                      ? "text-[#d4d4d4] border-b-2 border-gray-400"
                      : "text-[#858585] hover:text-[#d4d4d4]"
                  }`}
                >
                  Sent
                </button>
              </div>

              {/* Status Dropdown */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs rounded bg-[#3c3c3c] text-[#d4d4d4] border border-[#3e3e42] px-2 py-1"
              >
                <option value="pending">Pending</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {/* Requests List */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {isLoadingRequests && requestsOffset === 0 ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400"></div>
                </div>
              ) : requests.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-[#858585]">No requests found</p>
                </div>
              ) : (
                <>
                  {requests.map((request) => (
                    <div
                      key={request.id}
                      className="p-3 bg-[#2a2d2e] border border-[#3e3e42] rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-[#d4d4d4]">
                            {request.user_name}
                          </div>
                        </div>
                        
                        {/* Status Badge */}
                        <span
                          className={`text-xs px-2 py-1 rounded-full font-semibold ${
                            request.status === "pending"
                              ? "bg-yellow-900/30 text-yellow-400 border border-yellow-700/50"
                              : request.status === "accepted"
                              ? "bg-green-900/30 text-green-400 border border-green-700/50"
                              : "bg-red-900/30 text-red-400 border border-red-700/50"
                          }`}
                        >
                          {request.status.charAt(0).toUpperCase() +
                            request.status.slice(1)}
                        </span>
                      </div>

                      {/* Action Buttons - Only show for pending received requests */}
                      {activeTab === "received" &&
                        request.status === "pending" && (
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => {
                                handleManageFriendRequest(request.id, "accepted");
                              }}
                              className="flex-1 px-3 py-1.5 bg-gray-600 text-white text-xs font-semibold rounded hover:bg-gray-700 transition-colors flex items-center justify-center gap-1"
                            >
                              <Check size={15} /> Accept
                            </button>
                            <button
                              onClick={() => {
                                handleManageFriendRequest(request.id, "rejected");
                              }}
                              className="flex-1 px-3 py-1.5 border border-[#3e3e42] text-gray-100 text-xs font-semibold rounded hover:bg-[#3e3e42] transition-colors flex items-center justify-center gap-1"
                            >
                              <X size={15} /> Reject
                            </button>
                          </div>
                        )}
                    </div>
                  ))}

                  {/* Load More Button */}
                  {hasMoreRequests && (
                    <button
                      onClick={handleLoadMore}
                      disabled={isLoadingRequests}
                      className="w-full py-2 text-sm text-gray-100 hover:text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoadingRequests ? "Loading..." : "Load More"}
                    </button>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
