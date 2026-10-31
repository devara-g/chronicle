'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Play, Pause, X, Music, CloudRain, Disc, Waves, Sparkles } from 'lucide-react';
import { useMusic } from '@/context/MusicContext';

export function FloatingMusicBar() {
  const { currentTrack, isPlaying, progress, togglePlay, stopTrack, playAmbient, seekTrack } = useMusic();
  const [isAmbientMenuOpen, setIsAmbientMenuOpen] = useState(false);

  if (!currentTrack) {
    // Tombol kecil di pojok bawah untuk menyalakan ambient noir music
    return (
      <div className="fixed bottom-20 md:bottom-6 right-4 md:right-8 z-40">
        <button
          type="button"
          onClick={() => setIsAmbientMenuOpen(!isAmbientMenuOpen)}
          className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-xl text-white flex items-center justify-center shadow-2xl transition-all active:scale-95 group"
          title="Ambient Noir Soundscape"
        >
          <CloudRain className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
        </button>

        {/* Ambient Selector Menu */}
        {isAmbientMenuOpen && (
          <div className="absolute bottom-14 right-0 w-56 bg-[#0c0c0c]/95 border border-white/15 rounded-2xl p-2 shadow-[0_20px_50px_rgba(0,0,0,0.9)] backdrop-blur-2xl flex flex-col gap-1 select-none animate-fadeIn">
            <div className="px-3 py-1.5 text-[11px] font-mono text-white/50 border-b border-white/10 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <span>Ambient Noir Sound</span>
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
                <p className="text-[10px] text-white/50 font-mono">Suara Hujan Malam</p>
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
                <p className="font-semibold leading-tight">Cyberpunk Neon</p>
                <p className="text-[10px] text-white/50 font-mono">Synthwave Pulse</p>
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
                <p className="text-[10px] text-white/50 font-mono">Relaxed Jazz Noir</p>
              </div>
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 md:right-8 z-40 select-none animate-fadeIn">
      {/* Floating Glass Pill Player */}
      <div className="bg-[#0a0a0a]/95 border border-white/20 rounded-full px-3.5 py-2 shadow-[0_20px_60px_rgba(0,0,0,0.9)] backdrop-blur-2xl flex items-center gap-3.5 max-w-[340px] sm:max-w-[400px]">
        {/* Disc / Cover Image */}
        <div className="relative w-9 h-9 rounded-full overflow-hidden border border-white/30 bg-[#161616] shrink-0 shadow-md">
          {currentTrack.coverUrl ? (
            <Image
              src={currentTrack.coverUrl}
              alt={currentTrack.title}
              fill
              className={`object-cover ${isPlaying ? 'animate-spin' : ''}`}
              style={{ animationDuration: '8s' }}
            />
          ) : (
            <div
              className={`w-full h-full flex items-center justify-center bg-gradient-to-tr from-emerald-950 to-teal-800 text-emerald-400 ${
                isPlaying ? 'animate-spin' : ''
              }`}
              style={{ animationDuration: '8s' }}
            >
              <Disc className="w-5 h-5" />
            </div>
          )}
        </div>

        {/* Track Title & Artist */}
        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <h4 className="font-semibold text-xs text-white truncate leading-tight">
              {currentTrack.title}
            </h4>
          </div>
          <p className="text-[11px] text-white/50 font-mono truncate">{currentTrack.artist}</p>

          {/* Progress bar line */}
          <div
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const ratio = (e.clientX - rect.left) / rect.width;
              seekTrack(Math.max(0, Math.min(1, ratio)));
            }}
            className="w-full h-1 bg-white/10 rounded-full mt-1.5 overflow-hidden cursor-pointer"
          >
            <div
              style={{ width: `${progress * 100}%` }}
              className="h-full bg-emerald-400 transition-all duration-100"
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
            className="w-7 h-7 rounded-full hover:bg-white/10 text-white/50 hover:text-white flex items-center justify-center transition"
            title="Tutup Musik"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

