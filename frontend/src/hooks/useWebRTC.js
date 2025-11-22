"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useApi } from "@/hooks/useApi";

export function useWebRTC(sendWSMessage) {
  const { user } = useAuth();
  const { apiCall } = useApi();

  // State
  const [callState, setCallState] = useState("idle");
  const [otherUser, setOtherUser] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  // Refs
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const iceCandidateQueueRef = useRef([]);
  const pendingOfferRef = useRef(null);
  const callStartTimeRef = useRef(null);
  const durationIntervalRef = useRef(null);
  const wakeLockRef = useRef(null);

  const peerConnectionConfig = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      {
        urls: "turns:zibro.live:443?transport=tcp",
        username: process.env.NEXT_PUBLIC_TURN_USERNAME,
        credential: process.env.NEXT_PUBLIC_TURN_CREDENTIALS,
      },
      {
        urls: "turn:zibro.live:3478?transport=tcp",
        username: process.env.NEXT_PUBLIC_TURN_USERNAME,
        credential: process.env.NEXT_PUBLIC_TURN_CREDENTIALS,
      },
    ],
  };

  // ============================================
  // WAKE LOCK API - Keeps screen on during call
  // ============================================
  const requestWakeLock = useCallback(async () => {
    // Check if Wake Lock API is supported
    if (!("wakeLock" in navigator)) {
      console.log("⚠️ Wake Lock API not supported on this browser");
      toast("Wake Lock not supported. Screen may turn off during call.");
      return;
    }

    try {
      console.log("🔒 Requesting Wake Lock...");
      
      // Request a screen wake lock
      wakeLockRef.current = await navigator.wakeLock.request("screen");
      
      console.log("✅ Wake Lock acquired! Screen will stay on during call.");
      toast.success("Screen will stay on during call");

      // Listen for wake lock release (happens when screen is manually locked or tab changes)
      wakeLockRef.current.addEventListener("release", () => {
        console.log("🔓 Wake Lock released");
      });

    } catch (error) {
      console.error("❌ Failed to acquire Wake Lock:", error);
      
      if (error.name === "NotAllowedError") {
        toast.error("Unable to keep screen on. Please keep app active.");
      } else {
        toast("Screen may turn off during call");
      }
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        console.log("🔓 Releasing Wake Lock...");
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        console.log("✅ Wake Lock released successfully");
      } catch (error) {
        console.error("❌ Error releasing Wake Lock:", error);
      }
    }
  }, []);

  // Re-acquire wake lock if page becomes visible again
  const handleVisibilityChange = useCallback(async () => {
    if (document.visibilityState === "visible" && callState === "active") {
      console.log("📱 Page became visible, re-acquiring Wake Lock...");
      await requestWakeLock();
    } else if (document.visibilityState === "hidden") {
      console.log("📱 Page became hidden");
    }
  }, [callState, requestWakeLock]);

  // ============================================
  // CALL DURATION TIMER
  // ============================================
  const startCallTimer = useCallback(() => {
    callStartTimeRef.current = Date.now();
    durationIntervalRef.current = setInterval(() => {
      const elapsed = Math.floor(
        (Date.now() - callStartTimeRef.current) / 1000
      );
      setCallDuration(elapsed);
    }, 1000);
  }, []);

  const stopCallTimer = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    setCallDuration(0);
    callStartTimeRef.current = null;
  }, []);

  // ============================================
  // PEER CONNECTION INITIALIZATION
  // ============================================
  const initializePeerConnection = useCallback(
    (targetUser) => {
      if (peerConnectionRef.current) {
        return peerConnectionRef.current;
      }

      console.log("🔗 Initializing peer connection");
      const pc = new RTCPeerConnection(peerConnectionConfig);

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && targetUser) {
          console.log("🧊 ICE Candidate Type:", event.candidate.type);
          sendWSMessage({
            type: "ice-candidate",
            payload: {
              sender_id: user.id,
              receiver_id: targetUser.id,
              candidate: event.candidate.candidate,
              sdpMid: event.candidate.sdpMid,
              sdpIndex: event.candidate.sdpMLineIndex,
            },
          });
        }
      };

      // Handle remote track
      pc.ontrack = (event) => {
        console.log("🎵 Remote audio track received");
        remoteStreamRef.current = event.streams[0];
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = event.streams[0];
        }
      };

      // Handle ICE connection state changes
      pc.oniceconnectionstatechange = () => {
        console.log("🔌 ICE Connection State:", pc.iceConnectionState);
        
        if (
          pc.iceConnectionState === "connected" ||
          pc.iceConnectionState === "completed"
        ) {
          setCallState("active");
          startCallTimer();
          
          // Request Wake Lock when call is connected
          requestWakeLock();
          
          toast.success("Call connected!");
        } else if (pc.iceConnectionState === "failed") {
          console.error("❌ ICE connection failed");
          toast.error("Connection failed. Please try again.");
          endCall();
        } else if (pc.iceConnectionState === "disconnected") {
          console.log("⚠️ ICE connection disconnected");
          toast("Call disconnected");
          endCall();
        }
      };

      // Additional connection state monitoring
      pc.onconnectionstatechange = () => {
        console.log("🔗 Connection State:", pc.connectionState);
      };

      peerConnectionRef.current = pc;
      return pc;
    },
    [user, sendWSMessage, startCallTimer, requestWakeLock]
  );

  // ============================================
  // GET LOCAL STREAM
  // ============================================
  const getLocalStream = useCallback(async () => {
    try {
      console.log("🎤 Requesting microphone access");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      
      localStreamRef.current = stream;
      console.log("✅ Microphone access granted");
      
      // Log audio track status
      stream.getAudioTracks().forEach((track, index) => {
        console.log(`🎤 Audio Track ${index}:`, {
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
          label: track.label,
        });
      });
      
      return stream;
    } catch (error) {
      console.error("❌ Microphone access error:", error);
      if (error.name === "NotAllowedError") {
        toast.error(
          "Microphone access denied. Please allow microphone access in your browser settings."
        );
      } else if (error.name === "NotFoundError") {
        toast.error("No microphone found. Please connect a microphone.");
      } else {
        toast.error("Failed to access microphone. Please try again.");
      }
      throw error;
    }
  }, []);

  // ============================================
  // START CALL
  // ============================================
  const startCall = useCallback(
    async (friend) => {
      try {
        console.log("📞 Starting call to:", friend.name);
        setOtherUser(friend);
        setCallState("calling");
        toast(`Calling ${friend.name}...`);

        const stream = await getLocalStream();
        const pc = initializePeerConnection(friend);
        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        sendWSMessage({
          type: "call-offer",
          payload: {
            call_type: 0,
            sdp_type: 0,
            sender_id: user.id,
            receiver_id: friend.id,
            sdp_string: offer.sdp,
            time: new Date().toISOString(),
          },
        });
        console.log("✅ Call offer sent");
      } catch (error) {
        console.error("❌ Error starting call:", error);
        setCallState("idle");
        cleanup();
      }
    },
    [user, getLocalStream, initializePeerConnection, sendWSMessage]
  );

  // ============================================
  // ANSWER CALL
  // ============================================
  const answerCall = useCallback(async () => {
    try {
      if (!pendingOfferRef.current) {
        console.error("No pending offer to answer");
        return;
      }

      console.log("✅ Answering call");
      setCallState("active");
      toast("Connecting...");

      const offer = pendingOfferRef.current;
      const stream = await getLocalStream();
      const pc = initializePeerConnection({
        id: offer.sender_id,
        name: otherUser?.name,
      });

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      await pc.setRemoteDescription(
        new RTCSessionDescription({
          type: "offer",
          sdp: offer.sdp_string,
        })
      );

      while (iceCandidateQueueRef.current.length > 0) {
        const candidate = iceCandidateQueueRef.current.shift();
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      sendWSMessage({
        type: "call-answer",
        payload: {
          call_type: 0,
          sdp_type: 1,
          sender_id: user.id,
          receiver_id: offer.sender_id,
          sdp_string: answer.sdp,
          time: new Date().toISOString(),
        },
      });

      pendingOfferRef.current = null;
      console.log("✅ Call answer sent");
    } catch (error) {
      console.error("❌ Error answering call:", error);
      toast.error("Failed to answer call");
      endCall();
    }
  }, [user, getLocalStream, initializePeerConnection, sendWSMessage, otherUser]);

  // ============================================
  // DECLINE CALL
  // ============================================
  const declineCall = useCallback(() => {
    console.log("❌ Call declined");
    toast("Call declined");
    pendingOfferRef.current = null;
    setCallState("idle");
    setOtherUser(null);
    cleanup();
  }, []);

  // ============================================
  // END CALL
  // ============================================
  const endCall = useCallback(() => {
    console.log("📴 Ending call");
    toast("Call ended");
    stopCallTimer();
    releaseWakeLock();
    setCallState("idle");
    setOtherUser(null);
    pendingOfferRef.current = null;
    cleanup();
  }, [stopCallTimer, releaseWakeLock]);

  // ============================================
  // CLEANUP
  // ============================================
  const cleanup = useCallback(() => {
    console.log("🧹 Cleaning up resources");
    
    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        track.stop();
        console.log("🛑 Stopped track:", track.kind);
      });
      localStreamRef.current = null;
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
      console.log("🔌 Peer connection closed");
    }

    // Clear remote stream
    remoteStreamRef.current = null;
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }

    // Clear ICE candidate queue
    iceCandidateQueueRef.current = [];

    setIsMuted(false);
  }, []);

  // ============================================
  // TOGGLE MUTE
  // ============================================
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
        console.log("🎤 Mute toggled:", !audioTrack.enabled);
        toast(audioTrack.enabled ? "Microphone on" : "Microphone muted");
      }
    }
  }, []);

  // ============================================
  // HANDLE INCOMING OFFER
  // ============================================
  const handleIncomingOffer = useCallback(
    async (payload) => {
      console.log("📞 Incoming call from:", payload.sender_id);

      let senderName = "Unknown User";
      try {
        const response = await apiCall(
          `${
            process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"
          }/api/user/get-name?id=${payload.sender_id}`
        );

        if (response.ok) {
          const data = await response.json();
          if (data.exists && data.name) {
            senderName = data.name;
          }
        }
      } catch (error) {
        console.error("Error fetching sender name:", error);
      }

      const sender = {
        id: payload.sender_id,
        name: senderName,
      };

      pendingOfferRef.current = payload;
      setOtherUser(sender);
      setCallState("ringing");
      toast(`Incoming call from ${senderName}...`, { 
        duration: 30000, // Show for 30 seconds for incoming call
      });
    },
    [apiCall]
  );

  // ============================================
  // HANDLE INCOMING ANSWER
  // ============================================
  const handleIncomingAnswer = useCallback(
    async (payload) => {
      console.log("✅ Received call answer");

      if (!peerConnectionRef.current) {
        console.error("No peer connection to set answer");
        return;
      }

      try {
        await peerConnectionRef.current.setRemoteDescription(
          new RTCSessionDescription({
            type: "answer",
            sdp: payload.sdp_string,
          })
        );

        while (iceCandidateQueueRef.current.length > 0) {
          const candidate = iceCandidateQueueRef.current.shift();
          await peerConnectionRef.current.addIceCandidate(
            new RTCIceCandidate(candidate)
          );
        }

        console.log("✅ Answer processed successfully");
      } catch (error) {
        console.error("❌ Error processing answer:", error);
        toast.error("Failed to establish connection");
        endCall();
      }
    },
    [endCall]
  );

  // ============================================
  // HANDLE INCOMING ICE CANDIDATE
  // ============================================
  const handleIncomingIceCandidate = useCallback(async (payload) => {
    const candidate = {
      candidate: payload.candidate,
      sdpMid: payload.sdpMid,
      sdpMLineIndex: payload.sdpIndex,
    };

    if (
      peerConnectionRef.current &&
      peerConnectionRef.current.remoteDescription
    ) {
      try {
        await peerConnectionRef.current.addIceCandidate(
          new RTCIceCandidate(candidate)
        );
        console.log("🧊 ICE candidate added");
      } catch (error) {
        console.error("Error adding ICE candidate:", error);
      }
    } else {
      iceCandidateQueueRef.current.push(candidate);
      console.log("🧊 ICE candidate queued");
    }
  }, []);

  // ============================================
  // EFFECT: Setup visibility listener
  // ============================================
  useEffect(() => {
    console.log("👀 Setting up visibility change listener");
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      console.log("👀 Removing visibility change listener");
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [handleVisibilityChange]);

  // ============================================
  // EFFECT: Cleanup on unmount
  // ============================================
  useEffect(() => {
    return () => {
      console.log("🧹 Component unmounting, cleaning up");
      cleanup();
      stopCallTimer();
      releaseWakeLock();
    };
  }, [cleanup, stopCallTimer, releaseWakeLock]);

  return {
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
  };
}