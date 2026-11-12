'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Play, Pause, X, Music, CloudRain, Disc } from 'lucide-react';
import { useMusic } from '@/context/MusicContext';

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export function FloatingMusicBar() {
  const {
    currentTrack,
    isPlaying,
    progress,
    currentTime,
    duration,
    currentLyricLine,
    togglePlay,
    stopTrack,
    playAmbient,
    seekTrack,
  } = useMusic();
  const [isAmbientMenuOpen, setIsAmbientMenuOpen] = useState(false);

  if (!currentTrack) {
    // Discreet ambient noir button in bottom right
    return (
      <div className="fixed bottom-20 md:bottom-6 right-4 md:right-8 z-40">
        <button
          type="button"
          onClick={() => setIsAmbientMenuOpen(!isAmbientMenuOpen)}
          className="w-11 h-11 rounded-full bg-white/[0.07] hover:bg-white/[0.14] border border-white/15 backdrop-blur-xl text-white flex items-center justify-center shadow-2xl transition-all active:scale-95 group"
          title="Ambient Soundscape"
        >
          <CloudRain className="w-5 h-5 text-white/80 group-hover:text-white transition-colors" />
        </button>

        {/* Ambient Selector Menu */}
        {isAmbientMenuOpen && (
          <div className="absolute bottom-14 right-0 w-56 liquid-glass-card rounded-2xl p-2 shadow-[0_20px_50px_rgba(0,0,0,0.9)] flex flex-col gap-1 select-none animate-fade-in">
            <div className="px-3 py-1.5 text-[11px] font-mono text-white/50 border-b border-white/10 flex items-center gap-1.5">
              <Disc className="w-3.5 h-3.5 text-white/70" />
              <span>Ambient Soundscape</span>
            </div>

            <button
              onClick={() => {
                playAmbient('rain');
                setIsAmbientMenuOpen(false);
              }}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-white hover:bg-white/10 transition text-left"
            >
              <CloudRain className="w-4 h-4 text-sky-400" />
              <div>
                <p className="font-semibold leading-tight">Rain on Glass</p>
                <p className="text-[10px] text-white/50 font-mono">Noir Rain Drift</p>
              </div>
            </button>

            <button
              onClick={() => {
                playAmbient('cyber');
                setIsAmbientMenuOpen(false);
              }}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-white hover:bg-white/10 transition text-left"
            >
              <Disc className="w-4 h-4 text-emerald-400" />
              <div>
                <p className="font-semibold leading-tight">Cyber City</p>
                <p className="text-[10px] text-white/50 font-mono">Analog Synthesizer</p>
              </div>
            </button>

            <button
              onClick={() => {
                playAmbient('lofi');
                setIsAmbientMenuOpen(false);
              }}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-white hover:bg-white/10 transition text-left"
            >
              <Music className="w-4 h-4 text-amber-400" />
              <div>
                <p className="font-semibold leading-tight">Lofi Coffee Lounge</p>
                <p className="text-[10px] text-white/50 font-mono">Warm Midnight Rhodes</p>
              </div>
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 md:right-8 z-40 select-none animate-fade-in">
      {/* Floating Glass Pill Player */}
      <div className="liquid-glass-card rounded-2xl px-3.5 py-2.5 flex items-center gap-3.5 max-w-[340px] sm:max-w-[420px] relative overflow-hidden">
        {/* Subtle top glare */}
        <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />

        {/* Cover Artwork */}
        <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-white/20 bg-neutral-900 shrink-0 shadow-md">
          {currentTrack.coverUrl ? (
            <Image
              src={currentTrack.coverUrl}
              alt={currentTrack.title}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-white/5 text-white/70">
              <Disc className="w-5 h-5" />
            </div>
          )}
        </div>

        {/* Track Info & Synced Lyrics */}
        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center justify-between gap-1">
            <h4 className="font-semibold text-xs text-white truncate leading-tight">
              {currentTrack.title}
            </h4>
            <span className="text-[9px] font-mono text-white/40 shrink-0">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* Active Synced Lyric line or Artist */}
          {currentLyricLine ? (
            <p className="text-[11px] text-sky-400 font-medium truncate animate-fade-in flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse shrink-0" />
              <span>{currentLyricLine.text}</span>
            </p>
          ) : (
            <p className="text-[11px] text-white/50 font-mono truncate">{currentTrack.artist}</p>
          )}

          {/* Progress bar line */}
          <div
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const ratio = (e.clientX - rect.left) / rect.width;
              seekTrack(Math.max(0, Math.min(1, ratio)));
            }}
            className="w-full h-1 bg-white/10 rounded-full mt-1.5 overflow-hidden cursor-pointer group"
          >
            <div
              style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
              className="h-full bg-white group-hover:bg-sky-400 transition-all duration-100"
            />
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={togglePlay}
            className="w-8 h-8 rounded-full bg-white text-black hover:bg-white/90 flex items-center justify-center transition active:scale-90 shadow-md"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-3.5 h-3.5 fill-current" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={stopTrack}
            className="w-7 h-7 rounded-full hover:bg-white/10 text-white/40 hover:text-white flex items-center justify-center transition"
            title="Tutup Player"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
