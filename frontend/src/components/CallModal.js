"use client";
import { Phone, PhoneOff, Mic, MicOff } from "lucide-react";

export default function CallModal({
  callState,
  otherUser,
  isMuted,
  callDuration,
  onAnswer,
  onDecline,
  onEndCall,
  onToggleMute,
  remoteAudioRef,
}) {
  if (callState === "idle") return null;

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] animate-fadeIn" />

      {/* Modal */}
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
        <div className="bg-[#252526] border border-[#3e3e42] rounded-3xl shadow-2xl w-full max-w-md animate-scaleIn">
          {/* Header */}
          <div className="p-6 text-center">
            {/* User Avatar */}
            <div className="w-24 h-24 bg-gradient-to-br from-gray-600 to-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl font-bold text-white">
                {otherUser?.name?.charAt(0).toUpperCase() || "U"}
              </span>
            </div>

            {/* User Name */}
            <h3 className="text-2xl font-semibold text-[#d4d4d4] mb-2">
              {otherUser?.name || "Unknown User"}
            </h3>

            {/* Call Status */}
            <div className="space-y-1">
              {callState === "ringing" && (
                <p className="text-[#858585] animate-pulse">Incoming call...</p>
              )}
              {callState === "calling" && (
                <p className="text-[#858585] animate-pulse">Calling...</p>
              )}
              {callState === "active" && (
                <p className="text-green-400 font-mono text-lg">
                  {formatDuration(callDuration)}
                </p>
              )}
            </div>
          </div>

          {/* Call Controls */}
          <div className="p-6 pt-0">
            {/* Active Call Controls */}
            {callState === "active" && (
              <div className="flex items-center justify-center gap-4 mb-4">
                {/* Mute Button */}
                <button
                  onClick={onToggleMute}
                  className={`p-4 rounded-full transition-all duration-200 ${
                    isMuted
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-[#3e3e42] hover:bg-[#505050]"
                  }`}
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? (
                    <MicOff size={24} className="text-white" />
                  ) : (
                    <Mic size={24} className="text-gray-100" />
                  )}
                </button>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-center gap-4">
              {/* Incoming Call: Answer & Decline */}
              {callState === "ringing" && (
                <>
                  <button
                    onClick={onDecline}
                    className="p-5 rounded-full bg-red-600 hover:bg-red-700 active:bg-red-800 transition-all duration-200 transform hover:scale-110 active:scale-95 shadow-lg"
                    title="Decline"
                  >
                    <PhoneOff size={28} className="text-white" />
                  </button>

                  <button
                    onClick={onAnswer}
                    className="p-5 rounded-full bg-green-600 hover:bg-green-700 active:bg-green-800 transition-all duration-200 transform hover:scale-110 active:scale-95 shadow-lg animate-pulse"
                    title="Answer"
                  >
                    <Phone size={28} className="text-white" />
                  </button>
                </>
              )}

              {/* Outgoing/Active Call: End Button */}
              {(callState === "calling" || callState === "active") && (
                <button
                  onClick={onEndCall}
                  className="p-5 rounded-full bg-red-600 hover:bg-red-700 active:bg-red-800 transition-all duration-200 transform hover:scale-110 active:scale-95 shadow-lg"
                  title="End Call"
                >
                  <PhoneOff size={28} className="text-white" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Hidden audio element for remote stream */}
      <audio ref={remoteAudioRef} autoPlay playsInline />
    </>
  );
}
