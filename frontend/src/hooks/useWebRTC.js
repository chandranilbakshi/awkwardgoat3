"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

export function useWebRTC(sendWSMessage) {
  const { user } = useAuth();
  
  // State
  const [callState, setCallState] = useState("idle"); // idle, calling, ringing, active, ended
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

  // WebRTC configuration with Google's STUN server
  const peerConnectionConfig = {
    iceServers: [
      {
        urls: "stun:stun.l.google.com:19302",
      },
    ],
  };

  // Start call duration timer
  const startCallTimer = useCallback(() => {
    callStartTimeRef.current = Date.now();
    durationIntervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - callStartTimeRef.current) / 1000);
      setCallDuration(elapsed);
    }, 1000);
  }, []);

  // Stop call duration timer
  const stopCallTimer = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    setCallDuration(0);
    callStartTimeRef.current = null;
  }, []);

  // Initialize peer connection
  const initializePeerConnection = useCallback((targetUser) => {
    if (peerConnectionRef.current) {
      return peerConnectionRef.current;
    }

    const pc = new RTCPeerConnection(peerConnectionConfig);

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && targetUser) {
        console.log("📡 Sending ICE candidate");
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
      console.log("🎵 Received remote audio track");
      remoteStreamRef.current = event.streams[0];
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = event.streams[0];
      }
    };

    // Handle connection state changes
    pc.oniceconnectionstatechange = () => {
      console.log("🔌 ICE Connection State:", pc.iceConnectionState);
      
      if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
        setCallState("active");
        startCallTimer();
        showToast("Call connected!", "success");
      } else if (pc.iceConnectionState === "failed") {
        showToast("Connection failed. Please try again.", "error");
        endCall();
      } else if (pc.iceConnectionState === "disconnected") {
        showToast("Call disconnected", "info");
        endCall();
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [user, sendWSMessage, startCallTimer]);

  // Get microphone access
  const getLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true,
        video: false 
      });
      localStreamRef.current = stream;
      return stream;
    } catch (error) {
      console.error("❌ Microphone access error:", error);
      if (error.name === "NotAllowedError") {
        showToast("Microphone access denied. Please allow microphone access in your browser settings.", "error");
      } else if (error.name === "NotFoundError") {
        showToast("No microphone found. Please connect a microphone.", "error");
      } else {
        showToast("Failed to access microphone. Please try again.", "error");
      }
      throw error;
    }
  }, []);

  // Start call (caller side)
  const startCall = useCallback(async (friend) => {
    try {
      console.log("📞 Starting call to:", friend.name);
      setOtherUser(friend);
      setCallState("calling");
      showToast(`Calling ${friend.name}...`, "info");

      // Get microphone access
      const stream = await getLocalStream();

      // Initialize peer connection
      const pc = initializePeerConnection();

      // Add audio tracks
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Send offer to backend
      sendWSMessage({
        type: "call-offer",
        payload: {
          call_type: 0, // Audio
          sdp_type: 0, // Offer
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
  }, [user, getLocalStream, initializePeerConnection, sendWSMessage]);

  // Answer call (callee side)
  const answerCall = useCallback(async () => {
    try {
      if (!pendingOfferRef.current) {
        console.error("No pending offer to answer");
        return;
      }

      console.log("✅ Answering call");
      setCallState("active");
      showToast("Connecting...", "info");

      const offer = pendingOfferRef.current;
      
      // Get microphone access
      const stream = await getLocalStream();

      // Initialize peer connection
      const pc = initializePeerConnection({ id: offer.sender_id, name: otherUser?.name });

      // Add audio tracks
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Set remote description (the offer)
      await pc.setRemoteDescription(
        new RTCSessionDescription({
          type: "offer",
          sdp: offer.sdp_string,
        })
      );

      // Process queued ICE candidates
      while (iceCandidateQueueRef.current.length > 0) {
        const candidate = iceCandidateQueueRef.current.shift();
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }

      // Create answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Send answer to backend
      sendWSMessage({
        type: "call-answer",
        payload: {
          call_type: 0, // Audio
          sdp_type: 1, // Answer
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
      showToast("Failed to answer call", "error");
      endCall();
    }
  }, [user, getLocalStream, initializePeerConnection, sendWSMessage]);

  // Decline call
  const declineCall = useCallback(() => {
    console.log("❌ Call declined");
    showToast("Call declined", "info");
    pendingOfferRef.current = null;
    setCallState("idle");
    setOtherUser(null);
    cleanup();
  }, []);

  // End call
  const endCall = useCallback(() => {
    console.log("📴 Ending call");
    showToast("Call ended", "info");
    stopCallTimer();
    setCallState("idle");
    setOtherUser(null);
    pendingOfferRef.current = null;
    cleanup();
  }, [stopCallTimer]);

  // Cleanup resources
  const cleanup = useCallback(() => {
    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
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

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
        showToast(audioTrack.enabled ? "Microphone on" : "Microphone muted", "info");
      }
    }
  }, []);

  // Handle incoming offer
  const handleIncomingOffer = useCallback(async (payload) => {
    console.log("📞 Incoming call from:", payload.sender_id);
    
    // Fetch sender's name from backend
    let senderName = "Unknown User";
    try {
      const accessToken = localStorage.getItem("access_token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/user/get-name?id=${payload.sender_id}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
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
    showToast(`Incoming call from ${senderName}...`, "info");
  }, []);

  // Handle incoming answer
  const handleIncomingAnswer = useCallback(async (payload) => {
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

      // Process queued ICE candidates
      while (iceCandidateQueueRef.current.length > 0) {
        const candidate = iceCandidateQueueRef.current.shift();
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      }

      console.log("✅ Answer processed successfully");
    } catch (error) {
      console.error("❌ Error processing answer:", error);
      showToast("Failed to establish connection", "error");
      endCall();
    }
  }, [endCall]);

  // Handle incoming ICE candidate
  const handleIncomingIceCandidate = useCallback(async (payload) => {
    console.log("📡 Received ICE candidate");

    const candidate = {
      candidate: payload.candidate,
      sdpMid: payload.sdpMid,
      sdpMLineIndex: payload.sdpIndex,
    };

    if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription) {
      try {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error("❌ Error adding ICE candidate:", error);
      }
    } else {
      // Queue candidate if remote description not set yet
      iceCandidateQueueRef.current.push(candidate);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
      stopCallTimer();
    };
  }, [cleanup, stopCallTimer]);

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

// Toast notification helper
function showToast(message, type = "info") {
  // Create toast element
  const toast = document.createElement("div");
  toast.className = `fixed top-4 right-4 z-[9999] px-4 py-3 rounded-lg shadow-lg text-white font-medium animate-slideUp ${
    type === "error"
      ? "bg-red-600"
      : type === "success"
      ? "bg-green-600"
      : "bg-blue-600"
  }`;
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  // Remove after 3 seconds
  setTimeout(() => {
    toast.classList.add("animate-slideDown");
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 250);
  }, 3000);
}
