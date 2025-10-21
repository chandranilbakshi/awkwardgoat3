'use client'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useState, useEffect, useRef } from 'react'

export default function ChatPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isModalClosing, setIsModalClosing] = useState(false)
  const [modalPosition, setModalPosition] = useState({ left: 0, bottom: 0 })
  const buttonRef = useRef(null)

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
              <h2 className="text-xl font-bold mb-4 text-black">Add Friend</h2>

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
      </div>
    </ProtectedRoute>
  )
}
