'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Loader2 } from 'lucide-react';

interface AudioMessagePlayerProps {
  audioUrl: string;
  duration?: number | null;
  isMe?: boolean;
}

export function AudioMessagePlayer({ audioUrl, duration, isMe = false }: AudioMessagePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration || 0);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    const setAudioData = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setAudioDuration(Math.round(audio.duration));
      }
      setIsLoading(false);
    };

    const setAudioTime = () => {
      setCurrentTime(Math.round(audio.currentTime));
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', setAudioData);
    audio.addEventListener('timeupdate', setAudioTime);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('waiting', () => setIsLoading(true));
    audio.addEventListener('playing', () => setIsLoading(false));

    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', setAudioData);
      audio.removeEventListener('timeupdate', setAudioTime);
      audio.removeEventListener('ended', handleEnded);
      audioRef.current = null;
    };
  }, [audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(err => console.warn('Audio playback error:', err));
      setIsPlaying(true);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !audioDuration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = ratio * audioDuration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(Math.round(newTime));
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Generate simulated waveform bars
  const progressRatio = audioDuration > 0 ? currentTime / audioDuration : 0;
  const barHeights = [40, 75, 55, 90, 60, 45, 80, 100, 65, 50, 85, 70, 40, 95, 60, 75, 45, 90, 50, 65];

  return (
    <div className={`flex items-center gap-3 py-1 px-1 max-w-[280px] sm:max-w-[320px] select-none ${isMe ? 'text-black' : 'text-white'}`}>
      {/* Play/Pause Button */}
      <button
        type="button"
        onClick={togglePlay}
        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-90 shadow-md ${
          isMe
            ? 'bg-black text-white hover:bg-black/80'
            : 'bg-white text-black hover:bg-white/90'
        }`}
        title={isPlaying ? 'Pause' : 'Play'}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isPlaying ? (
          <Pause className="w-4 h-4 fill-current" />
        ) : (
          <Play className="w-4 h-4 fill-current ml-0.5" />
        )}
      </button>

      {/* Waveform & Timeline */}
      <div className="flex-1 flex flex-col justify-center gap-1.5 min-w-0">
        {/* Waveform bars */}
        <div
          onClick={handleSeek}
          className="flex items-center gap-[3px] h-6 cursor-pointer group py-1"
          title="Seek"
        >
          {barHeights.map((h, i) => {
            const barRatio = i / barHeights.length;
            const isPlayed = barRatio <= progressRatio;

            return (
              <span
                key={i}
                style={{ height: `${h}%` }}
                className={`w-[3px] rounded-full transition-all duration-150 ${
                  isPlayed
                    ? isMe ? 'bg-black' : 'bg-white'
                    : isMe ? 'bg-black/25' : 'bg-white/25'
                } ${isPlaying && isPlayed ? 'animate-pulse' : ''}`}
              />
            );
          })}
        </div>

        {/* Time indicators */}
        <div className={`flex items-center justify-between text-[11px] font-mono leading-none ${isMe ? 'text-black/70' : 'text-white/60'}`}>
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(audioDuration || 0)}</span>
        </div>
      </div>
    </div>
  );
}
