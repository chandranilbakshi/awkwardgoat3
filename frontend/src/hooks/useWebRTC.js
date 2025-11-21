"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useApi } from "@/hooks/useApi";

// Debug: Log environment variables on module load
console.log("🔧 [WebRTC] Environment Variables:");
console.log("  NEXT_PUBLIC_API_URL:", process.env.NEXT_PUBLIC_API_URL);
console.log("  NEXT_PUBLIC_WS_URL:", process.env.NEXT_PUBLIC_WS_URL);
console.log("  NEXT_PUBLIC_TURN_USERNAME:", process.env.NEXT_PUBLIC_TURN_USERNAME);
console.log("  NEXT_PUBLIC_TURN_CREDENTIALS:", process.env.NEXT_PUBLIC_TURN_CREDENTIALS);

export function useWebRTC(sendWSMessage) {
  const { user } = useAuth();
  const { apiCall } = useApi();

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

const peerConnectionConfig = {
  iceServers: [
    // 1. STUN for direct P2P (fastest possible)
    { urls: "stun:stun.l.google.com:19302" },

    // // Try UDP first
    // {
    //   urls: "turns:zibro.live:443?transport=udp",
    //   username: process.env.NEXT_PUBLIC_TURN_USERNAME,
    //   credential: process.env.NEXT_PUBLIC_TURN_CREDENTIALS,
    // },

    // Fallback: TURN over TLS
    {
      urls: "turns:zibro.live:443?transport=tcp",
      username: process.env.NEXT_PUBLIC_TURN_USERNAME,
      credential: process.env.NEXT_PUBLIC_TURN_CREDENTIALS,
    },

    // First: TURN over TCP (port 3478)
    {
      urls: "turn:zibro.live:3478?transport=tcp",
      username: process.env.NEXT_PUBLIC_TURN_USERNAME,
      credential: process.env.NEXT_PUBLIC_TURN_CREDENTIALS,
    },

  ],

  // Force TURN usage only (no STUN or direct)
  // iceTransportPolicy: "relay"
};


// Debug: Log peer connection config
console.log("🔧 [WebRTC] Peer Connection Config:", JSON.stringify(peerConnectionConfig, null, 2));

  // Start call duration timer
  const startCallTimer = useCallback(() => {
    callStartTimeRef.current = Date.now();
    durationIntervalRef.current = setInterval(() => {
      const elapsed = Math.floor(
        (Date.now() - callStartTimeRef.current) / 1000
      );
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
  const initializePeerConnection = useCallback(
    (targetUser) => {
      if (peerConnectionRef.current) {
        return peerConnectionRef.current;
      }

      const pc = new RTCPeerConnection(peerConnectionConfig);

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('🧊 ICE Candidate:', event.candidate.candidate);
          console.log('🧊 ICE Candidate Type:', event.candidate.type);
          console.log('🧊 ICE Candidate Protocol:', event.candidate.protocol);
        }
        if (event.candidate && targetUser) {
          console.log("📡 Sending ICE candidate to:", targetUser.id);
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
        console.log("🎵 Remote stream ID:", event.streams[0]?.id);
        console.log("🎵 Track kind:", event.track.kind);
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
          showToast("Call connected!", "success");
        } else if (pc.iceConnectionState === "failed") {
          showToast("Connection failed. Please try again.", "error");
          endCall();
        } else if (pc.iceConnectionState === "disconnected") {
          showToast("Call disconnected", "info");
          endCall();
        }
      };

      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        console.log("🔗 Connection State:", pc.connectionState);
      };

      // Handle ICE gathering state changes
      pc.onicegatheringstatechange = () => {
        console.log("🌐 ICE Gathering State:", pc.iceGatheringState);
      };

      // Handle signaling state changes
      pc.onsignalingstatechange = () => {
        console.log("📶 Signaling State:", pc.signalingState);
      };

      peerConnectionRef.current = pc;
      return pc;
    },
    [user, sendWSMessage, startCallTimer]
  );

  // Get microphone access
  const getLocalStream = useCallback(async () => {
    console.log("⏱️ [getLocalStream] Starting microphone access...");
    const startTime = performance.now();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      const duration = (performance.now() - startTime).toFixed(2);
      console.log(`✅ [getLocalStream] Microphone access granted in ${duration}ms`);
      localStreamRef.current = stream;
      return stream;
    } catch (error) {
      console.error("❌ Microphone access error:", error);
      if (error.name === "NotAllowedError") {
        showToast(
          "Microphone access denied. Please allow microphone access in your browser settings.",
          "error"
        );
      } else if (error.name === "NotFoundError") {
        showToast("No microphone found. Please connect a microphone.", "error");
      } else {
        showToast("Failed to access microphone. Please try again.", "error");
      }
      throw error;
    }
  }, []);

  // Start call (caller side)
  const startCall = useCallback(
    async (friend) => {
      const callStartTime = performance.now();
      try {
        console.log("📞 [startCall] Starting call to:", friend.name);
        setOtherUser(friend);
        setCallState("calling");
        showToast(`Calling ${friend.name}...`, "info");

        // Get microphone access
        console.log("⏱️ [startCall] Step 1: Getting microphone access...");
        const streamStart = performance.now();
        const stream = await getLocalStream();
        console.log(`✅ [startCall] Step 1 done in ${(performance.now() - streamStart).toFixed(2)}ms`);

        // Initialize peer connection
        console.log("⏱️ [startCall] Step 2: Initializing peer connection...");
        const pcStart = performance.now();
        const pc = initializePeerConnection(friend);
        console.log(`✅ [startCall] Step 2 done in ${(performance.now() - pcStart).toFixed(2)}ms`);

        // Add audio tracks
        console.log("⏱️ [startCall] Step 3: Adding audio tracks...");
        const trackStart = performance.now();
        stream.getTracks().forEach((track) => {
          console.log(`  Adding track: ${track.kind}, enabled: ${track.enabled}`);
          pc.addTrack(track, stream);
        });
        console.log(`✅ [startCall] Step 3 done in ${(performance.now() - trackStart).toFixed(2)}ms`);

        // Create offer
        console.log("⏱️ [startCall] Step 4: Creating SDP offer...");
        const offerStart = performance.now();
        const offer = await pc.createOffer();
        console.log(`✅ [startCall] Step 4a: Offer created in ${(performance.now() - offerStart).toFixed(2)}ms`);
        
        const setLocalStart = performance.now();
        await pc.setLocalDescription(offer);
        console.log(`✅ [startCall] Step 4b: Local description set in ${(performance.now() - setLocalStart).toFixed(2)}ms`);

        // Send offer to backend
        console.log("⏱️ [startCall] Step 5: Sending offer via WebSocket...");
        const sendStart = performance.now();
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
        console.log(`✅ [startCall] Step 5 done in ${(performance.now() - sendStart).toFixed(2)}ms`);

        const totalTime = (performance.now() - callStartTime).toFixed(2);
        console.log(`🎯 [startCall] TOTAL TIME: ${totalTime}ms`);
      } catch (error) {
        console.error("❌ Error starting call:", error);
        setCallState("idle");
        cleanup();
      }
    },
    [user, getLocalStream, initializePeerConnection, sendWSMessage]
  );

  // Answer call (callee side)
  const answerCall = useCallback(async () => {
    const answerStartTime = performance.now();
    try {
      if (!pendingOfferRef.current) {
        console.error("❌ [answerCall] No pending offer to answer");
        return;
      }

      console.log("📞 [answerCall] Answering call...");
      setCallState("active");
      showToast("Connecting...", "info");

      const offer = pendingOfferRef.current;

      // Get microphone access
      console.log("⏱️ [answerCall] Step 1: Getting microphone access...");
      const streamStart = performance.now();
      const stream = await getLocalStream();
      console.log(`✅ [answerCall] Step 1 done in ${(performance.now() - streamStart).toFixed(2)}ms`);

      // Initialize peer connection
      console.log("⏱️ [answerCall] Step 2: Initializing peer connection...");
      const pcStart = performance.now();
      const pc = initializePeerConnection({
        id: offer.sender_id,
        name: otherUser?.name,
      });
      console.log(`✅ [answerCall] Step 2 done in ${(performance.now() - pcStart).toFixed(2)}ms`);

      // Add audio tracks
      console.log("⏱️ [answerCall] Step 3: Adding audio tracks...");
      const trackStart = performance.now();
      stream.getTracks().forEach((track) => {
        console.log(`  Adding track: ${track.kind}, enabled: ${track.enabled}`);
        pc.addTrack(track, stream);
      });
      console.log(`✅ [answerCall] Step 3 done in ${(performance.now() - trackStart).toFixed(2)}ms`);

      // Set remote description (the offer)
      console.log("⏱️ [answerCall] Step 4: Setting remote description...");
      const remoteDescStart = performance.now();
      await pc.setRemoteDescription(
        new RTCSessionDescription({
          type: "offer",
          sdp: offer.sdp_string,
        })
      );
      console.log(`✅ [answerCall] Step 4 done in ${(performance.now() - remoteDescStart).toFixed(2)}ms`);

      // Process queued ICE candidates
      console.log("⏱️ [answerCall] Step 5: Processing ${iceCandidateQueueRef.current.length} queued ICE candidates...");
      const iceStart = performance.now();
      while (iceCandidateQueueRef.current.length > 0) {
        const candidate = iceCandidateQueueRef.current.shift();
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
      console.log(`✅ [answerCall] Step 5 done in ${(performance.now() - iceStart).toFixed(2)}ms`);

      // Create answer
      console.log("⏱️ [answerCall] Step 6: Creating SDP answer...");
      const answerOfferStart = performance.now();
      const answer = await pc.createAnswer();
      console.log(`✅ [answerCall] Step 6a: Answer created in ${(performance.now() - answerOfferStart).toFixed(2)}ms`);
      
      const setLocalStart = performance.now();
      await pc.setLocalDescription(answer);
      console.log(`✅ [answerCall] Step 6b: Local description set in ${(performance.now() - setLocalStart).toFixed(2)}ms`);

      // Send answer to backend
      console.log("⏱️ [answerCall] Step 7: Sending answer via WebSocket...");
      const sendStart = performance.now();
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
      console.log(`✅ [answerCall] Step 7 done in ${(performance.now() - sendStart).toFixed(2)}ms`);

      pendingOfferRef.current = null;
      const totalTime = (performance.now() - answerStartTime).toFixed(2);
      console.log(`🎯 [answerCall] TOTAL TIME: ${totalTime}ms`);
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
        showToast(
          audioTrack.enabled ? "Microphone on" : "Microphone muted",
          "info"
        );
      }
    }
  }, []);

  // Handle incoming offer
  const handleIncomingOffer = useCallback(
    async (payload) => {
      const offerStart = performance.now();
      console.log("📞 [handleIncomingOffer] Incoming call from:", payload.sender_id);

      // Fetch sender's name from backend
      let senderName = "Unknown User";
      try {
        console.log("⏱️ [handleIncomingOffer] Fetching sender name from backend...");
        const apiStart = performance.now();
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
        console.log(`✅ [handleIncomingOffer] Sender name fetched in ${(performance.now() - apiStart).toFixed(2)}ms: ${senderName}`);
      } catch (error) {
        console.error("❌ [handleIncomingOffer] Error fetching sender name:", error);
      }

      const sender = {
        id: payload.sender_id,
        name: senderName,
      };

      pendingOfferRef.current = payload;
      setOtherUser(sender);
      setCallState("ringing");
      showToast(`Incoming call from ${senderName}...`, "info");
    },
    [apiCall]
  );

  // Handle incoming answer
  const handleIncomingAnswer = useCallback(
    async (payload) => {
      const handleStart = performance.now();
      console.log("📥 [handleIncomingAnswer] Received call answer");

      if (!peerConnectionRef.current) {
        console.error("❌ [handleIncomingAnswer] No peer connection to set answer");
        return;
      }

      try {
        console.log("⏱️ [handleIncomingAnswer] Setting remote description...");
        const setRemoteStart = performance.now();
        await peerConnectionRef.current.setRemoteDescription(
          new RTCSessionDescription({
            type: "answer",
            sdp: payload.sdp_string,
          })
        );
        console.log(`✅ [handleIncomingAnswer] Remote description set in ${(performance.now() - setRemoteStart).toFixed(2)}ms`);

        // Process queued ICE candidates
        const queuedCount = iceCandidateQueueRef.current.length;
        console.log(`⏱️ [handleIncomingAnswer] Processing ${queuedCount} queued ICE candidates...`);
        const iceStart = performance.now();
        while (iceCandidateQueueRef.current.length > 0) {
          const candidate = iceCandidateQueueRef.current.shift();
          await peerConnectionRef.current.addIceCandidate(
            new RTCIceCandidate(candidate)
          );
        }
        console.log(`✅ [handleIncomingAnswer] ICE candidates processed in ${(performance.now() - iceStart).toFixed(2)}ms`);

        const totalTime = (performance.now() - handleStart).toFixed(2);
        console.log(`🎯 [handleIncomingAnswer] TOTAL TIME: ${totalTime}ms`);
      } catch (error) {
        console.error("❌ Error processing answer:", error);
        showToast("Failed to establish connection", "error");
        endCall();
      }
    },
    [endCall]
  );

  // Handle incoming ICE candidate
  const handleIncomingIceCandidate = useCallback(async (payload) => {
    const iceStart = performance.now();
    console.log("📡 [handleIncomingIceCandidate] Received ICE candidate");
    console.log(`  Candidate: ${payload.candidate}`);

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
        console.log("⏱️ [handleIncomingIceCandidate] Adding ICE candidate to peer connection...");
        await peerConnectionRef.current.addIceCandidate(
          new RTCIceCandidate(candidate)
        );
        const duration = (performance.now() - iceStart).toFixed(2);
        console.log(`✅ [handleIncomingIceCandidate] ICE candidate added in ${duration}ms`);
      } catch (error) {
        console.error("❌ [handleIncomingIceCandidate] Error adding ICE candidate:", error);
      }
    } else {
      // Queue candidate if remote description not set yet
      console.log(`⚠️ [handleIncomingIceCandidate] Queuing candidate (no remote description yet). Queue size: ${iceCandidateQueueRef.current.length + 1}`);
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