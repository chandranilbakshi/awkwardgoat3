'use client'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'

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
  const [showCopied, setShowCopied] = useState(false)
  const buttonRef = useRef(null)
  const { user } = useAuth()

  // Check if user profile exists on mount
  useEffect(() => {
    const checkUserProfile = async () => {
      if (!user) {
        setIsCheckingProfile(false)
        return
      }

      try {
        const accessToken = localStorage.getItem('access_token')
        
        if (!accessToken) {
          setIsCheckingProfile(false)
          return
        }

        // Check if user profile exists via backend
        const response = await fetch('http://localhost:8080/api/user/check-profile', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        })

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
  }, [user])

  const handleNameSubmit = async (e) => {
    e.preventDefault()
    
    if (!fullName.trim()) {
      setProfileError('Please enter your full name')
      return
    }

    setIsCreatingProfile(true)
    setProfileError('')

    try {
      const accessToken = localStorage.getItem('access_token')
      
      if (!accessToken) {
        setProfileError('Authentication error. Please log in again.')
        setIsCreatingProfile(false)
        return
      }

      // Call backend to create profile
      const response = await fetch('http://localhost:8080/api/user/create-profile', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: fullName.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create profile')
      }

      // Success! Close popup and allow user to continue
      setShowNamePopup(false)
      document.body.style.overflow = 'unset'
      
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

  const handleCopyUid = async () => {
    if (userUid) {
      try {
        await navigator.clipboard.writeText(userUid.toString())
        setShowCopied(true)
        setTimeout(() => setShowCopied(false), 2000)
      } catch (err) {
        console.error('Failed to copy UID:', err)
      }
    }
  }

  const handleSendRequest = () => {
    console.log('Send Friend Request clicked')
  }

  const handleViewRequests = () => {
    console.log('View Friend Requests clicked')
  }

  return (
    <ProtectedRoute>
      <div className="container min-h-screen bg-white p-1 flex mx-auto">
        <div className="flex w-full gap-2">
          {/* Chat List Box */}
          <div className="relative w-100 bg-white border border-black rounded-2xl p-4 flex flex-col">
            <h2 className="text-xl font-bold text-black mb-4">Chats</h2>
            
            {/* Empty state */}
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm text-gray-600">No conversations yet</p>
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

          {/* Active Chat Box */}
          <div className="flex-1 bg-white border border-black rounded-2xl p-4 flex items-center justify-center">
            <p className="text-sm text-gray-600">Select a chat to start messaging</p>
          </div>
        </div>

        {/* Add Friend Modal - outside blurred container */}
        {isModalOpen && (
          <>
            {/* Backdrop - transparent overlay for click outside */}
            <div 
              className="fixed inset-0 z-40 animate-fadeIn"
              onClick={closeModal}
            />
            
            {/* Modal - positioned absolutely with slide-up/down animation */}
            <div 
              className={`fixed bg-white border-2 border-black rounded-xl w-[280px] p-6 shadow-2xl z-50 ${isModalClosing ? 'animate-slideDown' : 'animate-slideUp'}`}
              style={{ 
                left: `${modalPosition.left - 28}px`,
                bottom: `${modalPosition.bottom}px`
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button 
                onClick={closeModal}
                className="absolute top-2 right-2 text-xl text-black hover:scale-110 transition-transform cursor-pointer"
                aria-label="Close modal"
              >
                ×
              </button>

              {/* Title */}
              <h2 className="text-xl font-bold mb-3 text-black">Add Friend</h2>

              {/* Your ID Section */}
              {userUid && (
                <div className="mb-4 p-3 bg-gray-50 border border-gray-300 rounded-lg">
                  <div className="text-xs text-gray-600 mb-1">Your ID</div>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-mono font-bold text-black">{userUid.toString().padStart(8, '0')}</span>
                    <button
                      onClick={handleCopyUid}
                      className="ml-2 px-3 py-1 bg-black text-white text-xs rounded hover:bg-gray-800 transition-colors"
                    >
                      {showCopied ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              )}

              {/* Option 1: Send Friend Request */}
              <button 
                onClick={handleSendRequest}
                className="w-full h-[70px] border-2 border-black rounded-[10px] p-3 hover:bg-gray-100 transition-colors text-left"
              >
                <div className="font-bold text-[15px] text-black">Send Friend Request</div>
                <div className="text-[13px] text-gray-600">Search by 8-digit ID</div>
              </button>

              {/* Option 2: View Friend Requests */}
              <button 
                onClick={handleViewRequests}
                className="w-full h-[70px] border-2 border-black rounded-[10px] p-3 hover:bg-gray-100 transition-colors text-left mt-3"
              >
                <div className="font-bold text-[15px] text-black">Friend Requests</div>
                <div className="text-[13px] text-gray-600">View pending requests</div>
              </button>
            </div>
          </>
        )}

        {/* Name Input Popup - Blocking Modal */}
        {showNamePopup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
            <div className="bg-white border-2 border-black rounded-2xl w-[400px] p-8 shadow-2xl">
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
    </ProtectedRoute>
  )
}
