'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { Phone, PhoneOff, Mic, MicOff, Volume2 } from 'lucide-react';
import { useVoiceCall } from '@/context/VoiceCallContext';

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

export function VoiceCallModal() {
  const {
    callStatus,
    remoteUser,
    isMuted,
    callDuration,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
  } = useVoiceCall();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || callStatus === 'idle' || !remoteUser) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-4 animate-fade-in select-none">
      {/* Background ambient neon glow based on status */}
      <div
        className={`absolute w-72 h-72 rounded-full blur-[120px] pointer-events-none opacity-25 transition-all duration-700 ${
          callStatus === 'incoming'
            ? 'bg-emerald-500 scale-125 animate-pulse'
            : callStatus === 'connected'
            ? 'bg-sky-500 scale-110'
            : 'bg-white scale-100'
        }`}
      />

      {/* Main Glass Card */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-[#121212]/90 border border-white/20 rounded-[32px] p-8 shadow-[0_30px_90px_rgba(0,0,0,0.95)] flex flex-col items-center text-center relative z-10 space-y-6"
      >
        {/* Status Chip */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-mono">
          {callStatus === 'calling' && (
            <>
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
              <span className="text-white/80">Memanggil...</span>
            </>
          )}
          {callStatus === 'incoming' && (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-emerald-400 font-semibold">Panggilan Masuk</span>
            </>
          )}
          {callStatus === 'connected' && (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-white font-mono">{formatDuration(callDuration)}</span>
            </>
          )}
        </div>

        {/* Avatar with Pulsing Radar Rings */}
        <div className="relative my-2 flex items-center justify-center">
          {/* Radar ripple rings */}
          {callStatus !== 'connected' && (
            <>
              <div
                className={`absolute w-36 h-36 rounded-full border-2 animate-ping pointer-events-none opacity-20 ${
                  callStatus === 'incoming' ? 'border-emerald-400' : 'border-sky-400'
                }`}
                style={{ animationDuration: '2s' }}
              />
              <div
                className={`absolute w-44 h-44 rounded-full border pointer-events-none opacity-10 animate-pulse ${
                  callStatus === 'incoming' ? 'border-emerald-400' : 'border-sky-400'
                }`}
              />
            </>
          )}

          {/* Central Avatar */}
          <div
            className={`relative w-28 h-28 rounded-full overflow-hidden border-4 shadow-2xl transition-all duration-300 flex items-center justify-center bg-[#1e293b] ${
              callStatus === 'incoming'
                ? 'border-emerald-400/80 shadow-[0_0_30px_rgba(52,211,153,0.4)] scale-105'
                : callStatus === 'connected'
                ? 'border-white/30 shadow-[0_0_30px_rgba(255,255,255,0.15)]'
                : 'border-white/20'
            }`}
          >
            {remoteUser.avatarUrl ? (
              <Image
                src={remoteUser.avatarUrl}
                alt={remoteUser.fullName}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-emerald-950 via-[#064e3b] to-teal-800 text-white font-bold text-3xl font-headline select-none">
                {remoteUser.fullName?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
          </div>
        </div>

        {/* User Info */}
        <div className="space-y-1">
          <h3 className="font-headline font-bold text-xl text-white tracking-tight">
            {remoteUser.fullName}
          </h3>
          <p className="text-xs text-on-surface-variant font-mono">@{remoteUser.username}</p>
        </div>

        {/* Connected Audio Soundwave Visualizer */}
        {callStatus === 'connected' && (
          <div className="flex items-center justify-center gap-1.5 h-8 py-1">
            <span className="w-1 bg-sky-400 rounded-full animate-pulse h-3" />
            <span className="w-1 bg-sky-400 rounded-full animate-bounce h-6" style={{ animationDelay: '0.15s' }} />
            <span className="w-1 bg-sky-400 rounded-full animate-pulse h-4" style={{ animationDelay: '0.3s' }} />
            <span className="w-1 bg-sky-400 rounded-full animate-bounce h-7" style={{ animationDelay: '0.45s' }} />
            <span className="w-1 bg-sky-400 rounded-full animate-pulse h-3" style={{ animationDelay: '0.2s' }} />
          </div>
        )}

        {/* Action Controls */}
        <div className="pt-2 w-full flex items-center justify-center gap-6">
          {callStatus === 'incoming' ? (
            /* Incoming Actions: Reject (Red) vs Accept (Green) */
            <>
              <button
                type="button"
                onClick={rejectCall}
                className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-[0_0_25px_rgba(239,68,68,0.5)] transition-all active:scale-90"
                title="Tolak Panggilan"
              >
                <PhoneOff className="w-7 h-7 stroke-[2.2]" />
              </button>

              <button
                type="button"
                onClick={acceptCall}
                className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black flex items-center justify-center shadow-[0_0_30px_rgba(52,211,153,0.6)] transition-all active:scale-90 animate-bounce"
                title="Terima Panggilan"
              >
                <Phone className="w-7 h-7 stroke-[2.4]" />
              </button>
            </>
          ) : callStatus === 'calling' ? (
            /* Outgoing Calling Action: Cancel */
            <button
              type="button"
              onClick={endCall}
              className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-[0_0_25px_rgba(239,68,68,0.5)] transition-all active:scale-90"
              title="Batalkan Panggilan"
            >
              <PhoneOff className="w-7 h-7 stroke-[2.2]" />
            </button>
          ) : (
            /* Connected Actions: Mute Toggle + End Call */
            <div className="flex items-center gap-5">
              <button
                type="button"
                onClick={toggleMute}
                className={`w-14 h-14 rounded-full flex items-center justify-center border transition-all active:scale-90 ${
                  isMuted
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                    : 'bg-white/10 border-white/20 text-white hover:bg-white/15'
                }`}
                title={isMuted ? 'Nyalakan Mikrofon' : 'Bisukan Mikrofon'}
              >
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>

              <button
                type="button"
                onClick={endCall}
                className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.55)] transition-all active:scale-90"
                title="Akhiri Panggilan"
              >
                <PhoneOff className="w-7 h-7 stroke-[2.4]" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

