'use client';

import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { ringtone } from '@/lib/services/ringtone.service';

export type CallStatus = 'idle' | 'calling' | 'incoming' | 'connected';

export interface CallParticipant {
  id: string;
  fullName: string;
  username: string;
  avatarUrl: string | null;
}

interface VoiceCallContextType {
  callStatus: CallStatus;
  remoteUser: CallParticipant | null;
  isMuted: boolean;
  callDuration: number;
  startCall: (target: CallParticipant) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
}

const VoiceCallContext = createContext<VoiceCallContextType | undefined>(undefined);

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
};

const CALL_CHANNEL_NAME = 'chronicle_global_voice_calls';
const CALL_SIGNAL_EVENT = 'call_signal';
const LOCAL_STORAGE_CALL_KEY = 'chronicle_call_signal_bridge';

export function VoiceCallProvider({ children }: { children: React.ReactNode }) {
  const { user } = useApp();
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [remoteUser, setRemoteUser] = useState<CallParticipant | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const activeRoomIdRef = useRef<string | null>(null);
  const callTimerRef = useRef<any>(null);
  const ringTimeoutRef = useRef<any>(null);
  const localBroadcastRef = useRef<BroadcastChannel | null>(null);
  const supabaseChannelRef = useRef<any>(null);
  const iceCandidateQueueRef = useRef<RTCIceCandidateInit[]>([]);

  // Refs for stable access in event listeners
  const userRef = useRef(user);
  userRef.current = user;

  const callStatusRef = useRef(callStatus);
  callStatusRef.current = callStatus;

  const remoteUserRef = useRef(remoteUser);
  remoteUserRef.current = remoteUser;

  // Initialize background audio element & BroadcastChannel
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const audio = new Audio();
      audio.autoplay = true;
      remoteAudioRef.current = audio;

      try {
        localBroadcastRef.current = new BroadcastChannel('chronicle_webrtc_call');
      } catch (e) {
        console.warn('[VoiceCall] BroadcastChannel not supported:', e);
      }
    }

    return () => {
      ringtone.stop();
      localBroadcastRef.current?.close();
    };
  }, []);

  // Full cleanup of media streams, WebRTC, timers, and tones
  const cleanupCall = useCallback(() => {
    ringtone.stop();

    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }

    if (ringTimeoutRef.current) {
      clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (pcRef.current) {
      pcRef.current.onicecandidate = null;
      pcRef.current.ontrack = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }

    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }

    iceCandidateQueueRef.current = [];
    activeRoomIdRef.current = null;
    setCallStatus('idle');
    setRemoteUser(null);
    setIsMuted(false);
    setCallDuration(0);
  }, []);

  // Multi-tier signal dispatcher: Supabase Realtime + BroadcastChannel + LocalStorage Bridge
  const sendSignal = useCallback((roomId: string, payload: any) => {
    const signalData = { roomId, ...payload, _ts: Date.now() };

    // 1. Local BroadcastChannel (instant zero-latency across tabs in same browser profile)
    if (localBroadcastRef.current) {
      try {
        localBroadcastRef.current.postMessage(signalData);
      } catch (e) {
        console.warn('[VoiceCall] Local broadcast error:', e);
      }
    }

    // 2. LocalStorage bridge (storage event across tabs in same origin)
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(LOCAL_STORAGE_CALL_KEY, JSON.stringify(signalData));
      } catch (e) {}
    }

    // 3. Supabase Realtime Broadcast (cross-device, cross-browser, cross-session)
    if (isSupabaseConfigured()) {
      if (supabaseChannelRef.current) {
        supabaseChannelRef.current
          .send({
            type: 'broadcast',
            event: CALL_SIGNAL_EVENT,
            payload: signalData,
          })
          .catch((err: any) => console.warn('[VoiceCall] Supabase send error:', err));
      } else {
        // Fallback: create & subscribe channel then send
        const ch = supabase.channel(CALL_CHANNEL_NAME);
        ch.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            supabaseChannelRef.current = ch;
            ch.send({
              type: 'broadcast',
              event: CALL_SIGNAL_EVENT,
              payload: signalData,
            });
          }
        });
      }
    }
  }, []);

  // Initialize PeerConnection
  const createPeerConnection = useCallback((roomId: string, targetId: string) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Send local ICE candidates to remote peer
    pc.onicecandidate = (event) => {
      if (event.candidate && userRef.current) {
        sendSignal(roomId, {
          type: 'candidate',
          candidate: event.candidate,
          fromId: userRef.current.id,
          toId: targetId,
        });
      }
    };

    // Receive remote audio track
    pc.ontrack = (event) => {
      if (event.streams && event.streams[0] && remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = event.streams[0];
        remoteAudioRef.current.play().catch((e) => console.warn('[VoiceCall] Audio play error:', e));
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.log('[VoiceCall] Connection state:', state);

      if (state === 'connected') {
        ringtone.stop();
        if (ringTimeoutRef.current) {
          clearTimeout(ringTimeoutRef.current);
          ringTimeoutRef.current = null;
        }
        setCallStatus('connected');
        if (!callTimerRef.current) {
          callTimerRef.current = setInterval(() => {
            setCallDuration((prev) => prev + 1);
          }, 1000);
        }
      } else if (state === 'disconnected' || state === 'failed' || state === 'closed') {
        cleanupCall();
      }
    };

    pcRef.current = pc;
    return pc;
  }, [sendSignal, cleanupCall]);

  // Handle incoming signaling packets
  const handleSignal = useCallback(async (data: any) => {
    const currentUser = userRef.current;
    if (!currentUser || !data) return;

    const { type, from, fromId, toId, offer, answer, candidate, roomId } = data;

    // Ignore signals sent by self
    if (from?.id === currentUser.id || fromId === currentUser.id) return;

    // Ignore signals not addressed to current user
    if (toId && toId !== currentUser.id) return;

    console.log('[VoiceCall] Received signal:', type, { fromId: fromId || from?.id, toId, roomId });

    if (type === 'call_request') {
      // Incoming call request
      if (callStatusRef.current !== 'idle') {
        // Current user is already on another call: reject with busy
        sendSignal(roomId, { type: 'call_busy', fromId: currentUser.id, toId: from.id });
        return;
      }

      activeRoomIdRef.current = roomId;
      setRemoteUser(from);
      setCallStatus('incoming');
      ringtone.startIncomingRing();

      // Timeout if not answered in 35 seconds
      if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = setTimeout(() => {
        cleanupCall();
      }, 35000);

      // Prepare peer connection with incoming offer
      const pc = createPeerConnection(roomId, from.id);
      if (offer) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          // Process any early buffered ICE candidates
          for (const c of iceCandidateQueueRef.current) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(c));
            } catch (e) {}
          }
          iceCandidateQueueRef.current = [];
        } catch (e) {
          console.error('[VoiceCall] Failed to setRemoteDescription for offer:', e);
        }
      }
    } else if (type === 'call_accepted') {
      // Remote user answered the call
      if (callStatusRef.current === 'calling' && pcRef.current && answer) {
        ringtone.stop();
        if (ringTimeoutRef.current) {
          clearTimeout(ringTimeoutRef.current);
          ringTimeoutRef.current = null;
        }

        try {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
          // Process any early buffered ICE candidates
          for (const c of iceCandidateQueueRef.current) {
            try {
              await pcRef.current.addIceCandidate(new RTCIceCandidate(c));
            } catch (e) {}
          }
          iceCandidateQueueRef.current = [];

          setCallStatus('connected');
          if (!callTimerRef.current) {
            callTimerRef.current = setInterval(() => {
              setCallDuration((prev) => prev + 1);
            }, 1000);
          }
        } catch (e) {
          console.error('[VoiceCall] Failed to setRemoteDescription for answer:', e);
        }
      }
    } else if (type === 'candidate') {
      // Remote ICE candidate received
      if (candidate) {
        if (pcRef.current && pcRef.current.remoteDescription) {
          try {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            console.warn('[VoiceCall] addIceCandidate error:', e);
          }
        } else {
          iceCandidateQueueRef.current.push(candidate);
        }
      }
    } else if (type === 'call_rejected' || type === 'call_busy' || type === 'call_ended') {
      // Call ended or rejected by remote peer
      cleanupCall();
    }
  }, [createPeerConnection, sendSignal, cleanupCall]);

  // Keep a stable ref to handleSignal to prevent channel re-subscription cycles
  const handleSignalRef = useRef(handleSignal);
  handleSignalRef.current = handleSignal;

  // Supabase Realtime channel subscription (Persistent single channel)
  useEffect(() => {
    if (!user || !isSupabaseConfigured()) return;

    console.log('[VoiceCall] Subscribing to Supabase channel:', CALL_CHANNEL_NAME);
    const channel = supabase.channel(CALL_CHANNEL_NAME);

    channel
      .on('broadcast', { event: CALL_SIGNAL_EVENT }, (payload) => {
        if (payload?.payload) {
          handleSignalRef.current(payload.payload);
        }
      })
      .subscribe((status) => {
        console.log('[VoiceCall] Supabase channel status:', status);
        if (status === 'SUBSCRIBED') {
          supabaseChannelRef.current = channel;
        }
      });

    return () => {
      supabaseChannelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // BroadcastChannel listener (Cross-tab)
  useEffect(() => {
    const bc = localBroadcastRef.current;
    if (!bc) return;

    const onMessage = (e: MessageEvent) => {
      handleSignalRef.current(e.data);
    };

    bc.addEventListener('message', onMessage);
    return () => bc.removeEventListener('message', onMessage);
  }, []);

  // LocalStorage storage event listener (Cross-tab fallback)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onStorage = (e: StorageEvent) => {
      if (e.key === LOCAL_STORAGE_CALL_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          handleSignalRef.current(parsed);
        } catch (err) {}
      }
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Initiate an Outgoing Call
  const startCall = useCallback(async (target: CallParticipant) => {
    const currentUser = userRef.current;
    if (!currentUser || callStatusRef.current !== 'idle') return;

    try {
      // Acquire microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;

      const sortedIds = [currentUser.id, target.id].sort();
      const roomId = `room_${sortedIds.join('_')}`;
      activeRoomIdRef.current = roomId;

      setRemoteUser(target);
      setCallStatus('calling');
      ringtone.startOutgoingTone();

      // Timeout if target does not answer after 35 seconds
      if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = setTimeout(() => {
        cleanupCall();
      }, 35000);

      const pc = createPeerConnection(roomId, target.id);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // Create & set SDP Offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Dispatch call request signal
      sendSignal(roomId, {
        type: 'call_request',
        offer,
        from: {
          id: currentUser.id,
          fullName: currentUser.full_name,
          username: currentUser.username,
          avatarUrl: currentUser.avatar_url || null,
        },
        toId: target.id,
      });
    } catch (err) {
      console.error('[VoiceCall] Failed to start call (Mic access denied or error):', err);
      alert('Tidak dapat mengakses mikrofon. Mohon izinkan mikrofon di browser.');
      cleanupCall();
    }
  }, [createPeerConnection, sendSignal, cleanupCall]);

  // Accept an Incoming Call
  const acceptCall = useCallback(async () => {
    const currentUser = userRef.current;
    const remote = remoteUserRef.current;
    const roomId = activeRoomIdRef.current;
    if (!currentUser || !remote || !roomId) return;

    ringtone.stop();
    if (ringTimeoutRef.current) {
      clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = null;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;

      const pc = pcRef.current || createPeerConnection(roomId, remote.id);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // Create & set SDP Answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      setCallStatus('connected');
      if (!callTimerRef.current) {
        callTimerRef.current = setInterval(() => {
          setCallDuration((prev) => prev + 1);
        }, 1000);
      }

      sendSignal(roomId, {
        type: 'call_accepted',
        answer,
        fromId: currentUser.id,
        toId: remote.id,
      });
    } catch (err) {
      console.error('[VoiceCall] Failed to accept call:', err);
      cleanupCall();
    }
  }, [createPeerConnection, sendSignal, cleanupCall]);

  // Reject Incoming Call
  const rejectCall = useCallback(() => {
    const currentUser = userRef.current;
    const remote = remoteUserRef.current;
    const roomId = activeRoomIdRef.current;

    if (roomId && remote && currentUser) {
      sendSignal(roomId, {
        type: 'call_rejected',
        fromId: currentUser.id,
        toId: remote.id,
      });
    }
    cleanupCall();
  }, [sendSignal, cleanupCall]);

  // End Active or Outgoing Call
  const endCall = useCallback(() => {
    const currentUser = userRef.current;
    const remote = remoteUserRef.current;
    const roomId = activeRoomIdRef.current;

    if (roomId && remote && currentUser) {
      sendSignal(roomId, {
        type: 'call_ended',
        fromId: currentUser.id,
        toId: remote.id,
      });
    }
    cleanupCall();
  }, [sendSignal, cleanupCall]);

  // Toggle Microphone Mute
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }, []);

  return (
    <VoiceCallContext.Provider
      value={{
        callStatus,
        remoteUser,
        isMuted,
        callDuration,
        startCall,
        acceptCall,
        rejectCall,
        endCall,
        toggleMute,
      }}
    >
      {children}
    </VoiceCallContext.Provider>
  );
}

export function useVoiceCall() {
  const ctx = useContext(VoiceCallContext);
  if (!ctx) {
    throw new Error('useVoiceCall must be used within a VoiceCallProvider');
  }
  return ctx;
}
