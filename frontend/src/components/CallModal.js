"use client";
import { useMemo } from "react";
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

  const formattedDuration = useMemo(() => {
    const mins = Math.floor(callDuration / 60);
    const secs = callDuration % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, [callDuration]);

  return (
    <>
      {/* Modal */}
        <div className="bg-[#252526] border border-[#3e3e42] md:rounded-2xl shadow-2xl w-full max-w-md">
          {/* Header */}
          <div className="p-4 text-center flex justify-between">
            {/* Call Status */}
            <div className="space-y-1 flex flex-col items-start">
              {callState === "ringing" && (
                <p className="text-[#858585] animate-pulse">Incoming call...</p>
              )}
              {callState === "calling" && (
                <p className="text-[#858585] animate-pulse">Calling...</p>
              )}
              {callState === "active" && (
                <p className="text-green-400 font-mono text-sm">
                  {formattedDuration}
                </p>
              )}

              {/* User Name */}
              <h3 className="text-3xl font-semibold text-[#d4d4d4] mb-2">
                {otherUser?.name || "Unknown User"}
              </h3>
            </div>

            {/* User Avatar */}
            <div className="w-15 h-15 bg-[#3e3e42] rounded-full flex items-center justify-center">
              <span className="text-2xl font-bold text-white">
                {otherUser?.name?.charAt(0).toUpperCase() || "U"}
              </span>
            </div>
          </div>

          {/* Call Controls */}
          <div className="p-4 pt-0">
            {/* Action Buttons */}
            <div className="flex items-center justify-center gap-2">
              {/* Incoming Call: Answer & Decline */}
              {callState === "ringing" && (
                <>
                  <button
                    onClick={onDecline}
                    className="p-2 w-full rounded-full justify-center flex gap-3 bg-red-600 hover:bg-red-700 active:bg-red-800 transition-all duration-200 shadow-lg"
                    title="Decline"
                  >
                    <PhoneOff size={24} className="text-white" /> Decline
                  </button>

                  <button
                    onClick={onAnswer}
                    className="p-2 w-full rounded-full justify-center flex gap-3 bg-green-600 hover:bg-green-700 active:bg-green-800 transition-all duration-200 shadow-lg animate-pulse text-white"
                    title="Answer"
                  >
                    <Phone size={24} /> Answer
                  </button>
                </>
              )}

              {/* Active Call: Mute & End */}
              {callState === "active" && (
                <>
                  <button
                    onClick={onToggleMute}
                    className={`p-2 rounded-full transition-all duration-200 shadow-lg ${
                      isMuted
                        ? "bg-red-600 hover:bg-red-700 active:bg-red-800"
                        : "bg-[#3e3e42] hover:bg-[#505050] active:bg-[#606060]"
                    }`}
                    title={isMuted ? "Unmute" : "Mute"}
                  >
                    {isMuted ? (
                      <MicOff size={24} className="text-white" />
                    ) : (
                      <Mic size={24} className="text-gray-100" />
                    )}
                  </button>

                  <button
                    onClick={onEndCall}
                    className="p-2 w-full rounded-full justify-center flex gap-3 bg-red-600 hover:bg-red-700 active:bg-red-800 transition-all duration-200 shadow-lg"
                    title="End Call"
                  >
                    <PhoneOff size={24} className="text-white" /> Hang Up
                  </button>
                </>
              )}

              {/* Outgoing Call: End Button */}
              {callState === "calling" && (
                <button
                  onClick={onEndCall}
                  className="p-2 w-full rounded-full justify-center flex gap-3 bg-red-600 hover:bg-red-700 active:bg-red-800 transition-all duration-200 shadow-lg"
                  title="End Call"
                >
                  <PhoneOff size={24} className="text-white" /> Hang Up
                </button>
              )}
            </div>
          </div>
        </div>

      {/* Hidden audio element for remote stream */}
      <audio ref={remoteAudioRef} autoPlay playsInline />
    </>
  );
}
