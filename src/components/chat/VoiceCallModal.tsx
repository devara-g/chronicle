'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { Phone, PhoneOff, Mic, MicOff } from 'lucide-react';
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

  const toastBanner = (
    <div className="fixed top-3 sm:top-5 inset-x-0 z-[99999] pointer-events-none flex justify-center px-3 sm:px-4 select-none animate-fadeIn">
      {/* Dynamic Floating Toast Card (Noir Glass) */}
      <div
        className={`pointer-events-auto w-full max-w-lg bg-[#0c0c0c]/95 backdrop-blur-2xl border rounded-2xl p-3 sm:px-4 sm:py-3 shadow-[0_20px_50px_rgba(0,0,0,0.85)] flex items-center justify-between gap-3 sm:gap-4 transition-all duration-300 ${
          callStatus === 'incoming'
            ? 'border-emerald-500/50 shadow-[0_12px_40px_rgba(16,185,129,0.3)] ring-1 ring-emerald-500/30'
            : callStatus === 'connected'
            ? 'border-white/20 shadow-[0_12px_40px_rgba(255,255,255,0.08)]'
            : 'border-sky-500/40 shadow-[0_12px_40px_rgba(56,189,248,0.25)]'
        }`}
      >
        {/* Left: Avatar with Status Indicator */}
        <div className="relative flex-shrink-0">
          <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-full overflow-hidden border-2 border-white/20 bg-[#1e293b]">
            {remoteUser.avatarUrl ? (
              <Image
                src={remoteUser.avatarUrl}
                alt={remoteUser.fullName}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-emerald-950 via-[#064e3b] to-teal-800 text-white font-bold text-base sm:text-lg font-headline">
                {remoteUser.fullName?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
          </div>

          {/* Mini Status Dot */}
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#0c0c0c] ${
              callStatus === 'incoming'
                ? 'bg-emerald-400 animate-ping'
                : callStatus === 'connected'
                ? 'bg-emerald-500'
                : 'bg-sky-400 animate-pulse'
            }`}
          />
        </div>

        {/* Center: Remote User Info & Call Status */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <div className="flex items-center gap-1.5">
            <h4 className="font-semibold text-sm sm:text-base text-white truncate leading-tight">
              {remoteUser.fullName}
            </h4>
            <span className="text-xs text-white/40 font-mono truncate hidden sm:inline">
              @{remoteUser.username}
            </span>
          </div>

          <div className="flex items-center gap-2 mt-0.5">
            {callStatus === 'calling' && (
              <div className="flex items-center gap-1.5 text-xs text-sky-400 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" />
                <span>Memanggil...</span>
              </div>
            )}
            {callStatus === 'incoming' && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>Panggilan Masuk</span>
              </div>
            )}
            {callStatus === 'connected' && (
              <div className="flex items-center gap-2 text-xs text-white/90 font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="font-semibold">{formatDuration(callDuration)}</span>
                </div>
                <div className="flex items-center gap-0.5 h-3">
                  <span className="w-0.5 bg-emerald-400 rounded-full animate-pulse h-2" />
                  <span
                    className="w-0.5 bg-emerald-400 rounded-full animate-bounce h-3"
                    style={{ animationDelay: '0.15s' }}
                  />
                  <span
                    className="w-0.5 bg-emerald-400 rounded-full animate-pulse h-2.5"
                    style={{ animationDelay: '0.3s' }}
                  />
                  <span
                    className="w-0.5 bg-emerald-400 rounded-full animate-bounce h-3.5"
                    style={{ animationDelay: '0.45s' }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {callStatus === 'incoming' ? (
            /* Incoming Actions: Reject (Red) vs Accept (Green) */
            <>
              <button
                type="button"
                onClick={rejectCall}
                className="w-10 h-10 rounded-full bg-red-500/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 flex items-center justify-center transition active:scale-90"
                title="Tolak Panggilan"
              >
                <PhoneOff className="w-4 h-4 stroke-[2.2]" />
              </button>

              <button
                type="button"
                onClick={acceptCall}
                className="px-3.5 h-10 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs flex items-center gap-1.5 shadow-[0_0_20px_rgba(52,211,153,0.5)] transition active:scale-95 animate-pulse"
                title="Terima Panggilan"
              >
                <Phone className="w-4 h-4 stroke-[2.5]" />
                <span className="hidden sm:inline">Terima</span>
              </button>
            </>
          ) : callStatus === 'calling' ? (
            /* Outgoing Action: Cancel Call */
            <button
              type="button"
              onClick={endCall}
              className="px-3.5 h-10 rounded-full bg-red-600/90 hover:bg-red-500 text-white font-medium text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(239,68,68,0.4)] transition active:scale-95"
              title="Batalkan Panggilan"
            >
              <PhoneOff className="w-4 h-4 stroke-[2.2]" />
              <span className="hidden sm:inline">Batalkan</span>
            </button>
          ) : (
            /* Connected Actions: Toggle Mute + End Call */
            <>
              <button
                type="button"
                onClick={toggleMute}
                className={`w-10 h-10 rounded-full flex items-center justify-center border transition active:scale-95 ${
                  isMuted
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                    : 'bg-white/10 border-white/20 text-white hover:bg-white/15'
                }`}
                title={isMuted ? 'Nyalakan Mikrofon' : 'Bisukan Mikrofon'}
              >
                {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={endCall}
                className="w-10 h-10 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-[0_0_15px_rgba(239,68,68,0.4)] transition active:scale-95"
                title="Akhiri Panggilan"
              >
                <PhoneOff className="w-4 h-4 stroke-[2.2]" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(toastBanner, document.body);
}
