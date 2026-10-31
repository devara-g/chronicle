'use client';

import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { useApp } from '@/context/AppContext';

export interface TrackInfo {
  title: string;
  artist: string;
  previewUrl: string;
  coverUrl?: string | null;
}

interface MusicContextType {
  currentTrack: TrackInfo | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  playTrack: (track: TrackInfo) => void;
  pauseTrack: () => void;
  resumeTrack: () => void;
  togglePlay: () => void;
  stopTrack: () => void;
  seekTrack: (ratio: number) => void;
  playAmbient: (type: 'rain' | 'cyber' | 'lofi') => void;
}

const MusicContext = createContext<MusicContextType | undefined>(undefined);

const AMBIENT_PRESETS = {
  rain: {
    title: 'Midnight Rain on Glass',
    artist: 'Noir Soundscape',
    previewUrl: 'https://cdn.freesound.org/previews/253/253886_4091566-lq.mp3',
    coverUrl: null,
  },
  cyber: {
    title: 'Cyberpunk Neon Drift',
    artist: 'Synthetic Pulse',
    previewUrl: 'https://cdn.freesound.org/previews/567/567258_5674468-lq.mp3',
    coverUrl: null,
  },
  lofi: {
    title: 'Obsidian Coffee & Jazz',
    artist: 'Lofi Chronicles',
    previewUrl: 'https://cdn.freesound.org/previews/415/415511_5121236-lq.mp3',
    coverUrl: null,
  },
};

export function MusicProvider({ children }: { children: React.ReactNode }) {
  const { user } = useApp();
  const [currentTrack, setCurrentTrack] = useState<TrackInfo | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize Audio element
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const audio = new Audio();
      audioRef.current = audio;

      const onTimeUpdate = () => {
        if (audio.duration && !isNaN(audio.duration)) {
          setProgress(audio.currentTime / audio.duration);
        }
      };

      const onLoadedMetadata = () => {
        if (audio.duration && !isNaN(audio.duration)) {
          setDuration(Math.round(audio.duration));
        }
      };

      const onEnded = () => {
        setIsPlaying(false);
        setProgress(0);
      };

      audio.addEventListener('timeupdate', onTimeUpdate);
      audio.addEventListener('loadedmetadata', onLoadedMetadata);
      audio.addEventListener('ended', onEnded);

      return () => {
        audio.pause();
        audio.removeEventListener('timeupdate', onTimeUpdate);
        audio.removeEventListener('loadedmetadata', onLoadedMetadata);
        audio.removeEventListener('ended', onEnded);
        audioRef.current = null;
      };
    }
  }, []);

  // Broadcast current listening track to friends
  const broadcastListeningStatus = useCallback((track: TrackInfo | null) => {
    if (typeof window !== 'undefined' && user) {
      try {
        const payload = {
          userId: user.id,
          username: user.username,
          track: track,
          timestamp: Date.now(),
        };
        localStorage.setItem(`chronicle_listening_${user.id}`, JSON.stringify(payload));
        window.dispatchEvent(new Event('chronicle_listening_updated'));

        if (isSupabaseConfigured()) {
          const ch = supabase.channel('global_listening_feed');
          ch.send({
            type: 'broadcast',
            event: 'user_listening',
            payload,
          });
        }
      } catch (e) {}
    }
  }, [user]);

  const playTrack = useCallback((track: TrackInfo) => {
    if (!audioRef.current) return;

    if (currentTrack?.previewUrl === track.previewUrl && isPlaying) {
      return;
    }

    audioRef.current.src = track.previewUrl;
    audioRef.current.volume = 0.85;
    audioRef.current
      .play()
      .then(() => {
        setCurrentTrack(track);
        setIsPlaying(true);
        broadcastListeningStatus(track);
      })
      .catch((err) => {
        console.warn('[MusicContext] Play error:', err);
      });
  }, [currentTrack, isPlaying, broadcastListeningStatus]);

  const pauseTrack = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const resumeTrack = useCallback(() => {
    if (audioRef.current && currentTrack) {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {});
    }
  }, [currentTrack]);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pauseTrack();
    } else {
      resumeTrack();
    }
  }, [isPlaying, pauseTrack, resumeTrack]);

  const stopTrack = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    setCurrentTrack(null);
    setIsPlaying(false);
    setProgress(0);
    broadcastListeningStatus(null);
  }, [broadcastListeningStatus]);

  const seekTrack = useCallback((ratio: number) => {
    if (audioRef.current && audioRef.current.duration) {
      audioRef.current.currentTime = ratio * audioRef.current.duration;
      setProgress(ratio);
    }
  }, []);

  const playAmbient = useCallback((type: 'rain' | 'cyber' | 'lofi') => {
    const preset = AMBIENT_PRESETS[type];
    if (preset) {
      playTrack(preset);
    }
  }, [playTrack]);

  return (
    <MusicContext.Provider
      value={{
        currentTrack,
        isPlaying,
        progress,
        duration,
        playTrack,
        pauseTrack,
        resumeTrack,
        togglePlay,
        stopTrack,
        seekTrack,
        playAmbient,
      }}
    >
      {children}
    </MusicContext.Provider>
  );
}

export function useMusic() {
  const ctx = useContext(MusicContext);
  if (!ctx) {
    throw new Error('useMusic must be used within a MusicProvider');
  }
  return ctx;
}

