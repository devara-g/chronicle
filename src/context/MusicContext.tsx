'use client';

import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { useApp } from '@/context/AppContext';
import { MusicService, SyncedLyricLine } from '@/lib/services/music.service';

export interface TrackInfo {
  title: string;
  artist: string;
  previewUrl: string;
  coverUrl?: string | null;
  duration?: number;
  startTime?: number;
  source?: 'youtube' | 'deezer' | 'itunes' | 'local';
  lyricSnippet?: string;
}

interface MusicContextType {
  currentTrack: TrackInfo | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  currentTime: number;
  lyrics: SyncedLyricLine[];
  currentLyricLine: SyncedLyricLine | null;
  isLoadingAudio: boolean;
  playTrack: (track: TrackInfo, options?: { autoLyrics?: boolean; startTime?: number }) => void;
  pauseTrack: () => void;
  resumeTrack: () => void;
  togglePlay: () => void;
  stopTrack: () => void;
  seekTrack: (ratio: number) => void;
  seekToTime: (seconds: number) => void;
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
  const [currentTime, setCurrentTime] = useState(0);
  const [lyrics, setLyrics] = useState<SyncedLyricLine[]>([]);
  const [currentLyricLine, setCurrentLyricLine] = useState<SyncedLyricLine | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize Audio element
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const audio = new Audio();
      audioRef.current = audio;

      const onTimeUpdate = () => {
        const cur = audio.currentTime;
        setCurrentTime(cur);
        if (audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
          setProgress(cur / audio.duration);
        }
      };

      const onLoadedMetadata = () => {
        setIsLoadingAudio(false);
        if (audio.duration && !isNaN(audio.duration)) {
          setDuration(Math.round(audio.duration));
        }
      };

      const onWaiting = () => {
        setIsLoadingAudio(true);
      };

      const onCanPlay = () => {
        setIsLoadingAudio(false);
      };

      const onEnded = () => {
        setIsPlaying(false);
        setProgress(0);
        setCurrentTime(0);
      };

      audio.addEventListener('timeupdate', onTimeUpdate);
      audio.addEventListener('loadedmetadata', onLoadedMetadata);
      audio.addEventListener('waiting', onWaiting);
      audio.addEventListener('canplay', onCanPlay);
      audio.addEventListener('ended', onEnded);

      return () => {
        audio.pause();
        audio.removeEventListener('timeupdate', onTimeUpdate);
        audio.removeEventListener('loadedmetadata', onLoadedMetadata);
        audio.removeEventListener('waiting', onWaiting);
        audio.removeEventListener('canplay', onCanPlay);
        audio.removeEventListener('ended', onEnded);
        audioRef.current = null;
      };
    }
  }, []);

  // Update active synced lyric line based on currentTime
  useEffect(() => {
    if (lyrics.length === 0) {
      setCurrentLyricLine(null);
      return;
    }

    // Find the latest line with time <= currentTime
    let activeLine: SyncedLyricLine | null = null;
    for (let i = 0; i < lyrics.length; i++) {
      if (lyrics[i].time <= currentTime + 0.3) {
        activeLine = lyrics[i];
      } else {
        break;
      }
    }
    setCurrentLyricLine(activeLine);
  }, [currentTime, lyrics]);

  // Broadcast current listening track to friends
  const broadcastListeningStatus = useCallback(
    (track: TrackInfo | null) => {
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
        } catch {}
      }
    },
    [user]
  );

  const playTrack = useCallback(
    (track: TrackInfo, options?: { autoLyrics?: boolean; startTime?: number }) => {
      if (!audioRef.current) return;

      const isSameTrack = currentTrack?.previewUrl === track.previewUrl;
      if (isSameTrack && isPlaying) {
        return;
      }

      setIsLoadingAudio(true);
      audioRef.current.src = track.previewUrl;
      audioRef.current.volume = 0.88;

      if (options?.startTime !== undefined && options.startTime > 0) {
        audioRef.current.currentTime = options.startTime;
      } else if (track.startTime !== undefined && track.startTime > 0) {
        audioRef.current.currentTime = track.startTime;
      }

      audioRef.current
        .play()
        .then(() => {
          setCurrentTrack(track);
          setIsPlaying(true);
          setIsLoadingAudio(false);
          broadcastListeningStatus(track);
        })
        .catch((err) => {
          console.warn('[MusicContext] Play error:', err);
          setIsLoadingAudio(false);
        });

      // Optionally fetch lyrics
      if (options?.autoLyrics !== false) {
        MusicService.getLyrics(track.title, track.artist).then((data) => {
          if (data.found && data.lines.length > 0) {
            setLyrics(data.lines);
          } else {
            setLyrics([]);
          }
        });
      }
    },
    [currentTrack, isPlaying, broadcastListeningStatus]
  );

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
    setCurrentTime(0);
    setLyrics([]);
    setCurrentLyricLine(null);
    broadcastListeningStatus(null);
  }, [broadcastListeningStatus]);

  const seekTrack = useCallback((ratio: number) => {
    if (audioRef.current && audioRef.current.duration) {
      const target = ratio * audioRef.current.duration;
      audioRef.current.currentTime = target;
      setProgress(ratio);
      setCurrentTime(target);
    }
  }, []);

  const seekToTime = useCallback((seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = seconds;
      setCurrentTime(seconds);
      if (audioRef.current.duration) {
        setProgress(seconds / audioRef.current.duration);
      }
    }
  }, []);

  const playAmbient = useCallback(
    (type: 'rain' | 'cyber' | 'lofi') => {
      const preset = AMBIENT_PRESETS[type];
      if (preset) {
        playTrack(preset, { autoLyrics: false });
      }
    },
    [playTrack]
  );

  return (
    <MusicContext.Provider
      value={{
        currentTrack,
        isPlaying,
        progress,
        duration,
        currentTime,
        lyrics,
        currentLyricLine,
        isLoadingAudio,
        playTrack,
        pauseTrack,
        resumeTrack,
        togglePlay,
        stopTrack,
        seekTrack,
        seekToTime,
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
