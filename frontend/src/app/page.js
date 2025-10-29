'use client'
import AddFriendModal from '@/components/AddFriendModal'
import OpenChat from '@/components/OpenChat'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useApi } from '@/hooks/useApi'
import { Ellipsis } from 'lucide-react';

export default function ChatPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isModalClosing, setIsModalClosing] = useState(false)
  const [modalPosition, setModalPosition] = useState({ left: 0, bottom: 0 })
  const [showNamePopup, setShowNamePopup] = useState(false)
  const [fullName, setFullName] = useState('')
  const [isCreatingProfile, setIsCreatingProfile] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [isCheckingProfile, setIsCheckingProfile] = useState(true)
  const [userUid, setUserUid] = useState(null)
  const [leftPanelWidth, setLeftPanelWidth] = useState(400) // Initial width in pixels
  const [isResizing, setIsResizing] = useState(false)
  const [friends, setFriends] = useState([])
  const [isLoadingFriends, setIsLoadingFriends] = useState(false)
  const [friendsError, setFriendsError] = useState('')
  const [selectedFriend, setSelectedFriend] = useState(null)
  const buttonRef = useRef(null)
  const containerRef = useRef(null)
  const router = useRouter()
  const { user, loading } = useAuth()
  const { apiCall } = useApi()

  // Function to load friends list
  const loadFriends = useCallback(async () => {
    if (!user) return

    setIsLoadingFriends(true)
    setFriendsError('')

    try {
      const response = await apiCall('http://localhost:8080/api/friends/list')
      const data = await response.json()

      if (response.ok) {
        setFriends(data.friends || [])
      } else {
        setFriendsError(data.error || 'Failed to load friends')
      }
    } catch (error) {
      console.error('Error loading friends:', error)
      setFriendsError('Failed to load friends')
    } finally {
      setIsLoadingFriends(false)
    }
  }, [user, apiCall])

  // Redirect to signup if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/signup')
    }
  }, [user, loading, router])

  // Check if user profile exists on mount
  useEffect(() => {
    const checkUserProfile = async () => {
      if (!user || loading) {
        setIsCheckingProfile(false)
        return
      }

      try {
        // Check if user profile exists via backend using API interceptor
        const response = await apiCall('http://localhost:8080/api/user/check-profile')

        if (response.ok) {
          const data = await response.json()
          
          if (!data.exists) {
            // No profile found, show name popup
            setShowNamePopup(true)
            document.body.style.overflow = 'hidden'
          } else if (data.uid) {
            // Profile exists, store the UID
            setUserUid(data.uid)
          }
        }
      } catch (error) {
        console.error('Error checking user profile:', error)
      } finally {
        setIsCheckingProfile(false)
      }
    }

    checkUserProfile()
  }, [user, loading, apiCall])

  // Load friends when userUid is set
  useEffect(() => {
    if (userUid) {
      loadFriends()
    }
  }, [userUid, loadFriends])

  // ESC key handler
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && isModalOpen) {
        closeModal()
      }
    }
    
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = 'unset' // Cleanup on unmount
    }
  }, [isModalOpen])

  // Resize handler
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing || !containerRef.current) return
      
      const containerRect = containerRef.current.getBoundingClientRect()
      const newWidth = e.clientX - containerRect.left
      
      // Set min and max widths (e.g., 250px to 600px)
      const minWidth = 250
      const maxWidth = 600
      
      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setLeftPanelWidth(newWidth)
      }
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing])

  // Don't render anything while loading or if not authenticated
  if (loading || !user) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-black mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  const handleNameSubmit = async (e) => {
    e.preventDefault()
    
    if (!fullName.trim()) {
      setProfileError('Please enter your full name')
      return
    }

    setIsCreatingProfile(true)
    setProfileError('')

    try {
      // Call backend to create profile using API interceptor
      const response = await apiCall('http://localhost:8080/api/user/create-profile', {
        method: 'POST',
        body: JSON.stringify({ name: fullName.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create profile')
      }

      // Success! Close popup and allow user to continue
      setShowNamePopup(false)
      document.body.style.overflow = 'unset'
      
      // Store UID and load friends
      if (data.profile && data.profile.uid) {
        setUserUid(data.profile.uid)
        loadFriends()
      }
      
      // Optionally store profile data locally
      localStorage.setItem('user_profile', JSON.stringify(data.profile))
      
    } catch (error) {
      console.error('Error creating profile:', error)
      setProfileError(error.message || 'Failed to create profile. Please try again.')
    } finally {
      setIsCreatingProfile(false)
    }
  }

  const openModal = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setModalPosition({
        left: rect.left + rect.width / 2,
        bottom: window.innerHeight - rect.top + 16
      })
    }
    setIsModalClosing(false)
    setIsModalOpen(true)
    document.body.style.overflow = 'hidden'
  }

  const closeModal = () => {
    setIsModalClosing(true)
    setTimeout(() => {
      setIsModalOpen(false)
      setIsModalClosing(false)
      document.body.style.overflow = 'unset'
    }, 250) // Match animation duration
  }

  // Resize handler
  const handleMouseDown = (e) => {
    setIsResizing(true)
    e.preventDefault()
  }

  return (
      <div className="container h-screen bg-white p-1 flex mx-auto">
        <div ref={containerRef} className="flex w-full relative h-full">
          {/* Chat List Box */}
          <div 
            className="bg-white border border-black rounded-2xl p-4 flex flex-col h-full"
            style={{ width: `${leftPanelWidth}px`, minWidth: '300px' }}
          >
            <h2 className="text-xl font-bold text-black mb-4">Chats</h2>
            
            {/* Friends List */}
            <div className="flex-1 overflow-y-auto">
              {isLoadingFriends ? (
                <div className="flex items-center justify-center py-8">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-black"></div>
                  <span className="ml-2 text-sm text-gray-600">Loading friends...</span>
                </div>
              ) : friendsError ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-sm text-red-600">{friendsError}</p>
                </div>
              ) : friends.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-sm text-gray-600">No friends yet. Add some friends to start chatting!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {friends.map((friend, index) => (
                    <div
                      key={friend.id || index}
                      onClick={() => setSelectedFriend(friend)}
                      className={`p-3 rounded-xl cursor-pointer transition-colors border ${
                        selectedFriend?.uid === friend.uid
                          ? 'bg-black text-white border-black'
                          : 'bg-gray-50 hover:bg-gray-100 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className={`font-semibold ${
                            selectedFriend?.uid === friend.uid ? 'text-white' : 'text-black'
                          }`}>{friend.name}</h3>
                          <p className={`text-xs ${
                            selectedFriend?.uid === friend.uid ? 'text-gray-300' : 'text-gray-500'
                          }`}>UID: {friend.uid}</p>
                        </div>
                        <Ellipsis size={18} className={`${
                          selectedFriend?.uid === friend.uid ? 'text-gray-300' : 'text-gray-600'
                        }`} />
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
              className={`absolute bottom-4 left w-14 h-14 bg-black text-white rounded-full flex items-center justify-center text-3xl font-light shadow-lg hover:scale-105 hover:shadow-xl transition-all duration-300 cursor-pointer ${isModalOpen ? 'rotate-45' : 'rotate-0'}`}
              aria-label="Add new chat"
            >
              +
            </button>
          </div>

          {/* Resizable Divider */}
          <div
            onMouseDown={handleMouseDown}
            className={`w-1 hover:w-2 bg-transparent hover:bg-gray-300 cursor-col-resize transition-all ${isResizing ? 'w-2 bg-gray-400' : ''}`}
            style={{ minWidth: '4px' }}
          />

          {/* Active Chat Box */}
          <OpenChat 
            selectedFriend={selectedFriend}
            onClose={() => setSelectedFriend(null)}
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
          <div className="fixed inset-0 backdrop-blur-xs flex items-center justify-center z-[100]">
            <div className="bg-white rounded-2xl w-[400px] p-8 shadow-[0_0_50px_rgba(80,80,80,0.5)]">
              <h2 className="text-2xl font-bold mb-2 text-black">Welcome!</h2>
              <p className="text-sm text-gray-600 mb-6">Please enter your full name to continue</p>
              
              <form onSubmit={handleNameSubmit}>
                <div className="mb-4">
                  <label htmlFor="fullName" className="block text-sm font-medium text-black mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={isCreatingProfile}
                    className="w-full px-4 py-3 border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="Enter your full name"
                    autoFocus
                    required
                  />
                </div>

                {profileError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{profileError}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isCreatingProfile}
                  className="w-full py-3 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isCreatingProfile ? (
                    <>
                      <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Creating Profile...
                    </>
                  ) : (
                    'Continue'
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Loading Screen while checking profile */}
        {isCheckingProfile && (
          <div className="fixed inset-0 bg-white flex items-center justify-center z-[99]">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-black mb-4"></div>
              <p className="text-gray-600">Loading...</p>
            </div>
          </div>
        )}
      </div>
  )
}
