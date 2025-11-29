"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useApi } from "@/hooks/useApi";

// ============================================
// SINGLETON AUDIO ELEMENTS (created once, reused)
// ============================================
let outgoingAudio = null;
let incomingAudio = null;

const getOutgoingAudio = () => {
  if (!outgoingAudio) {
    try {
      outgoingAudio = new Audio("/hangouts_outgoing.mp3");
      outgoingAudio.preload = "auto";
      outgoingAudio.loop = true;
      
      outgoingAudio.onerror = () => {
        console.error("❌ Failed to load outgoing ringtone");
      };
    } catch (error) {
      console.error("❌ Error creating outgoing audio:", error);
    }
  }
  return outgoingAudio;
};

const getIncomingAudio = () => {
  if (!incomingAudio) {
    try {
      incomingAudio = new Audio("/marimba_soft.mp3");
      incomingAudio.preload = "auto";
      incomingAudio.loop = true;
      
      incomingAudio.onerror = () => {
        console.error("❌ Failed to load incoming ringtone");
      };
    } catch (error) {
      console.error("❌ Error creating incoming audio:", error);
    }
  }
  return incomingAudio;
};

// Optional: Export for global cleanup (e.g., on logout)
export const cleanupAudioResources = () => {
  if (outgoingAudio) {
    outgoingAudio.pause();
    outgoingAudio.src = "";
    outgoingAudio = null;
  }
  if (incomingAudio) {
    incomingAudio.pause();
    incomingAudio.src = "";
    incomingAudio = null;
  }
};

// ============================================
// HOOK
// ============================================
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

  // ============================================
  // RINGTONE MANAGEMENT
  // ============================================
  const handlePlayError = useCallback((error, vibratePattern = [200, 100, 200]) => {
    if (error.name === "NotAllowedError") {
      console.log("🔇 Autoplay blocked (browser policy)");
      if ('vibrate' in navigator) {
        navigator.vibrate(vibratePattern);
      }
    } else {
      console.error("❌ Error playing ringtone:", error);
    }
  }, []);

  const playOutgoingRingtone = useCallback(() => {
    try {
      const audio = getOutgoingAudio();
      if (audio) {
        audio.currentTime = 0;
        audio.play().catch((err) => handlePlayError(err, [200, 100, 200, 100, 200]));
        console.log("🔊 Playing outgoing ringtone");
      }
    } catch (error) {
      console.error("❌ Error in playOutgoingRingtone:", error);
    }
  }, [handlePlayError]);

  const playIncomingRingtone = useCallback(() => {
    try {
      const audio = getIncomingAudio();
      if (audio) {
        audio.currentTime = 0;
        audio.play().catch((err) => handlePlayError(err, [400, 200, 400, 200, 400]));
        console.log("🔊 Playing incoming ringtone");
      }
    } catch (error) {
      console.error("❌ Error in playIncomingRingtone:", error);
    }
  }, [handlePlayError]);

  const stopAllRingtones = useCallback(() => {
    try {
      const outgoing = getOutgoingAudio();
      const incoming = getIncomingAudio();
      
      if (outgoing) {
        outgoing.pause();
        outgoing.currentTime = 0;
      }
      if (incoming) {
        incoming.pause();
        incoming.currentTime = 0;
      }
      
      console.log("🔇 Stopped all ringtones");
    } catch (error) {
      console.error("❌ Error stopping ringtones:", error);
    }
  }, []);

  // ============================================
  // WAKE LOCK
  // ============================================
  const requestWakeLock = useCallback(async () => {
    if (!("wakeLock" in navigator)) {
      console.log("⚠️ Wake Lock API not supported");
      return;
    }

    try {
      wakeLockRef.current = await navigator.wakeLock.request("screen");
      console.log("✅ Wake Lock acquired");
      
      wakeLockRef.current.addEventListener("release", () => {
        console.log("🔓 Wake Lock released");
      });
    } catch (error) {
      console.error("❌ Failed to acquire Wake Lock:", error);
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        console.log("✅ Wake Lock released");
      } catch (error) {
        console.error("❌ Error releasing Wake Lock:", error);
      }
    }
  }, []);

  const handleVisibilityChange = useCallback(async () => {
    if (document.visibilityState === "visible" && callState === "active") {
      await requestWakeLock();
    }
  }, [callState, requestWakeLock]);

  // ============================================
  // CALL TIMER
  // ============================================
  const startCallTimer = useCallback(() => {
    callStartTimeRef.current = Date.now();
    durationIntervalRef.current = setInterval(() => {
      setCallDuration(Math.floor((Date.now() - callStartTimeRef.current) / 1000));
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
  // CLEANUP
  // ============================================
  const cleanup = useCallback(() => {
    console.log("🧹 Cleaning up resources");
    
    stopAllRingtones();
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    remoteStreamRef.current = null;
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }

    iceCandidateQueueRef.current = [];
    setIsMuted(false);
  }, [stopAllRingtones]);

  // ============================================
  // END CALL
  // ============================================
  const endCall = useCallback(() => {
    console.log("📴 Ending call");
    toast("Call ended");
    
    // Send call-end message to backend
    if (otherUser && user) {
      sendWSMessage({
        type: "call-end",
        payload: {
          sender_id: user.id,
          receiver_id: otherUser.id,
        },
      });
    }
    
    stopCallTimer();
    releaseWakeLock();
    setCallState("idle");
    setOtherUser(null);
    pendingOfferRef.current = null;
    cleanup();
  }, [stopCallTimer, releaseWakeLock, cleanup, otherUser, user, sendWSMessage]);

  // ============================================
  // PEER CONNECTION
  // ============================================
  const initializePeerConnection = useCallback(
    (targetUser) => {
      if (peerConnectionRef.current) return peerConnectionRef.current;

      const pc = new RTCPeerConnection({
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
      });

      pc.onicecandidate = (event) => {
        if (event.candidate && targetUser) {
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

      pc.ontrack = (event) => {
        console.log("🎵 Remote audio track received");
        remoteStreamRef.current = event.streams[0];
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = event.streams[0];
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
          stopAllRingtones();
          setCallState("active");
          startCallTimer();
          requestWakeLock();
          toast.success("Call connected!");
        } else if (pc.iceConnectionState === "failed") {
          toast.error("Connection failed");
          endCall();
        } else if (pc.iceConnectionState === "disconnected") {
          toast("Call disconnected");
          endCall();
        }
      };

      peerConnectionRef.current = pc;
      return pc;
    },
    [user, sendWSMessage, startCallTimer, requestWakeLock, endCall, stopAllRingtones]
  );

  // ============================================
  // GET LOCAL STREAM
  // ============================================
  const getLocalStream = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: false,
    });
    localStreamRef.current = stream;
    return stream;
  }, []);

  // ============================================
  // START CALL
  // ============================================
  const startCall = useCallback(
    async (friend) => {
      try {
        setOtherUser(friend);
        setCallState("calling");
        toast(`Calling ${friend.name}...`);

        playOutgoingRingtone();

        const stream = await getLocalStream();
        const pc = initializePeerConnection(friend);
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

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
      } catch (error) {
        console.error("❌ Error starting call:", error);
        setCallState("idle");
        cleanup();
      }
    },
    [user, getLocalStream, initializePeerConnection, sendWSMessage, playOutgoingRingtone, cleanup]
  );

  // ============================================
  // ANSWER CALL
  // ============================================
  const answerCall = useCallback(async () => {
    if (!pendingOfferRef.current) return;

    stopAllRingtones();
    setCallState("active");
    toast("Connecting...");

    const offer = pendingOfferRef.current;
    const stream = await getLocalStream();
    const pc = initializePeerConnection({ id: offer.sender_id, name: otherUser?.name });

    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    await pc.setRemoteDescription(new RTCSessionDescription({ type: "offer", sdp: offer.sdp_string }));

    while (iceCandidateQueueRef.current.length > 0) {
      await pc.addIceCandidate(new RTCIceCandidate(iceCandidateQueueRef.current.shift()));
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
  }, [user, getLocalStream, initializePeerConnection, sendWSMessage, otherUser, stopAllRingtones]);

  const declineCall = useCallback(() => {
    toast("Call declined");
    
    // Send call-end message to backend
    if (otherUser && user) {
      sendWSMessage({
        type: "call-end",
        payload: {
          sender_id: user.id,
          receiver_id: otherUser.id,
        },
      });
    }
    
    pendingOfferRef.current = null;
    setCallState("idle");
    setOtherUser(null);
    cleanup();
  }, [cleanup, otherUser, user, sendWSMessage]);

  // ============================================
  // TOGGLE MUTE
  // ============================================
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
        toast(audioTrack.enabled ? "Microphone on" : "Microphone muted");
      }
    }
  }, []);

  // ============================================
  // INCOMING OFFER
  // ============================================
  const handleIncomingOffer = useCallback(
    async (payload) => {
      let senderName = "Unknown User";
      try {
        const response = await apiCall(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"}/api/user/get-name?id=${payload.sender_id}`
        );
        if (response.ok) {
          const data = await response.json();
          if (data.exists && data.name) senderName = data.name;
        }
      } catch (error) {
        console.error("Error fetching sender name:", error);
      }

      pendingOfferRef.current = payload;
      setOtherUser({ id: payload.sender_id, name: senderName });
      setCallState("ringing");
      playIncomingRingtone();
      toast(`Incoming call from ${senderName}...`, { duration: 30000 });
    },
    [apiCall, playIncomingRingtone]
  );

  // ============================================
  // INCOMING ANSWER
  // ============================================
  const handleIncomingAnswer = useCallback(
    async (payload) => {
      if (!peerConnectionRef.current) return;

      await peerConnectionRef.current.setRemoteDescription(
        new RTCSessionDescription({ type: "answer", sdp: payload.sdp_string })
      );

      while (iceCandidateQueueRef.current.length > 0) {
        await peerConnectionRef.current.addIceCandidate(
          new RTCIceCandidate(iceCandidateQueueRef.current.shift())
        );
      }
    },
    []
  );

  // ============================================
  // ICE CANDIDATE
  // ============================================
  const handleIncomingIceCandidate = useCallback(async (payload) => {
    const candidate = {
      candidate: payload.candidate,
      sdpMid: payload.sdpMid,
      sdpMLineIndex: payload.sdpIndex,
    };

    if (peerConnectionRef.current?.remoteDescription) {
      await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
    } else {
      iceCandidateQueueRef.current.push(candidate);
    }
  }, []);

  // ============================================
  // EFFECTS
  // ============================================
  useEffect(() => {
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [handleVisibilityChange]);

  useEffect(() => {
    return () => {
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