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
  videoId?: string | null;
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
  activePlayerType: 'youtube' | 'html5' | null;
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
  const [activePlayerType, setActivePlayerType] = useState<'youtube' | 'html5' | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ytPlayerRef = useRef<any>(null);
  const ytPollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const ytApiLoadedRef = useRef<boolean>(false);

  // Load YouTube IFrame API once
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if ((window as any).YT && (window as any).YT.Player) {
      ytApiLoadedRef.current = true;
      return;
    }

    if (!document.getElementById('youtube-iframe-api-script')) {
      const tag = document.createElement('script');
      tag.id = 'youtube-iframe-api-script';
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
    }

    const prevOnReady = (window as any).onYouTubeIframeAPIReady;
    (window as any).onYouTubeIframeAPIReady = () => {
      ytApiLoadedRef.current = true;
      if (typeof prevOnReady === 'function') prevOnReady();
    };
  }, []);

  // Initialize HTML5 Audio element for ambient / fallback
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const audio = new Audio();
      audioRef.current = audio;

      const onTimeUpdate = () => {
        if (activePlayerType === 'html5') {
          const cur = audio.currentTime;
          setCurrentTime(cur);
          if (audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
            setProgress(cur / audio.duration);
          }
        }
      };

      const onLoadedMetadata = () => {
        if (activePlayerType === 'html5') {
          setIsLoadingAudio(false);
          if (audio.duration && !isNaN(audio.duration)) {
            setDuration(Math.round(audio.duration));
          }
        }
      };

      const onEnded = () => {
        if (activePlayerType === 'html5') {
          setIsPlaying(false);
          setProgress(0);
          setCurrentTime(0);
        }
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
  }, [activePlayerType]);

  // Update active synced lyric line based on currentTime
  useEffect(() => {
    if (lyrics.length === 0) {
      setCurrentLyricLine(null);
      return;
    }

    let activeLine: SyncedLyricLine | null = null;
    for (let i = 0; i < lyrics.length; i++) {
      if (lyrics[i].time <= currentTime + 0.35) {
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
            track,
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

  // Helper: Start polling YouTube player time
  const startYtPolling = useCallback(() => {
    if (ytPollTimerRef.current) clearInterval(ytPollTimerRef.current);
    ytPollTimerRef.current = setInterval(() => {
      const p = ytPlayerRef.current;
      if (p && typeof p.getCurrentTime === 'function' && typeof p.getDuration === 'function') {
        const cur = p.getCurrentTime() || 0;
        const dur = p.getDuration() || 0;
        setCurrentTime(cur);
        if (dur > 0) {
          setDuration(Math.round(dur));
          setProgress(cur / dur);
        }
      }
    }, 250);
  }, []);

  const stopYtPolling = useCallback(() => {
    if (ytPollTimerRef.current) {
      clearInterval(ytPollTimerRef.current);
      ytPollTimerRef.current = null;
    }
  }, []);

  // Play YouTube video in background
  const playViaYouTube = useCallback(
    (videoId: string, startSec: number = 0, track: TrackInfo) => {
      setActivePlayerType('youtube');
      setIsLoadingAudio(true);
      if (audioRef.current) audioRef.current.pause();

      const onPlayerReady = (player: any) => {
        try {
          player.loadVideoById({
            videoId,
            startSeconds: Math.floor(startSec),
          });
          player.playVideo();
          setIsPlaying(true);
          setIsLoadingAudio(false);
          startYtPolling();
          broadcastListeningStatus(track);
        } catch (e) {
          console.warn('[YouTube play error]:', e);
          setIsLoadingAudio(false);
        }
      };

      const initPlayer = () => {
        const YT = (window as any).YT;
        if (!YT || !YT.Player) {
          setTimeout(initPlayer, 200);
          return;
        }

        if (ytPlayerRef.current && typeof ytPlayerRef.current.loadVideoById === 'function') {
          onPlayerReady(ytPlayerRef.current);
        } else {
          ytPlayerRef.current = new YT.Player('chronicle-yt-bg-player', {
            height: '1',
            width: '1',
            videoId,
            playerVars: {
              autoplay: 1,
              controls: 0,
              disablekb: 1,
              fs: 0,
              modestbranding: 1,
              playsinline: 1,
              start: Math.floor(startSec),
            },
            events: {
              onReady: (event: any) => onPlayerReady(event.target),
              onStateChange: (event: any) => {
                const state = event.data;
                // YT.PlayerState: 1 = PLAYING, 2 = PAUSED, 0 = ENDED
                if (state === 1) {
                  setIsPlaying(true);
                  setIsLoadingAudio(false);
                  startYtPolling();
                } else if (state === 2) {
                  setIsPlaying(false);
                  stopYtPolling();
                } else if (state === 0) {
                  setIsPlaying(false);
                  stopYtPolling();
                  setProgress(0);
                  setCurrentTime(0);
                }
              },
              onError: (err: any) => {
                console.warn('[YouTube Player Error]:', err);
                setIsLoadingAudio(false);
                // Fallback to HTML5 audio preview
                if (track.previewUrl && audioRef.current) {
                  setActivePlayerType('html5');
                  audioRef.current.src = track.previewUrl;
                  audioRef.current.play().catch(() => {});
                }
              },
            },
          });
        }
      };

      initPlayer();
    },
    [startYtPolling, stopYtPolling, broadcastListeningStatus]
  );

  // Play HTML5 audio
  const playViaHtml5 = useCallback(
    (track: TrackInfo, startSec: number = 0) => {
      setActivePlayerType('html5');
      stopYtPolling();
      if (ytPlayerRef.current && typeof ytPlayerRef.current.pauseVideo === 'function') {
        ytPlayerRef.current.pauseVideo();
      }

      if (!audioRef.current) return;
      setIsLoadingAudio(true);
      audioRef.current.src = track.previewUrl;
      audioRef.current.volume = 0.88;

      if (startSec > 0) {
        audioRef.current.addEventListener(
          'loadedmetadata',
          () => {
            try {
              if (audioRef.current) audioRef.current.currentTime = startSec;
            } catch {}
          },
          { once: true }
        );
      }

      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          setIsLoadingAudio(false);
          broadcastListeningStatus(track);
        })
        .catch((err) => {
          console.warn('[HTML5 Audio play error]:', err);
          setIsLoadingAudio(false);
        });
    },
    [stopYtPolling, broadcastListeningStatus]
  );

  const playTrack = useCallback(
    async (track: TrackInfo, options?: { autoLyrics?: boolean; startTime?: number }) => {
      setCurrentTrack(track);
      const startSec = options?.startTime ?? track.startTime ?? 0;

      // Automatically fetch synced lyrics from LRCLIB
      if (options?.autoLyrics !== false) {
        MusicService.getLyrics(track.title, track.artist).then((data) => {
          if (data.found && data.lines.length > 0) {
            setLyrics(data.lines);
          } else {
            setLyrics([]);
          }
        });
      }

      // 1. If track already has YouTube videoId, play directly
      if (track.videoId) {
        playViaYouTube(track.videoId, startSec, track);
        return;
      }

      // 2. If it's an ambient preset or local audio, use HTML5
      if (track.source === 'local' || track.previewUrl.includes('freesound.org')) {
        playViaHtml5(track, startSec);
        return;
      }

      // 3. Resolve YouTube videoId for full-track 1:1 playback
      try {
        setIsLoadingAudio(true);
        const ytData = await MusicService.getYouTubeTrack(track.title, track.artist, track.previewUrl);
        if (ytData.videoId) {
          const updatedTrack = { ...track, videoId: ytData.videoId };
          setCurrentTrack(updatedTrack);
          playViaYouTube(ytData.videoId, startSec, updatedTrack);
          return;
        }
      } catch (err) {
        console.warn('Resolve YT track error:', err);
      }

      // 4. Fallback to HTML5 audio preview
      playViaHtml5(track, startSec);
    },
    [playViaYouTube, playViaHtml5]
  );

  const pauseTrack = useCallback(() => {
    if (activePlayerType === 'youtube' && ytPlayerRef.current) {
      ytPlayerRef.current.pauseVideo();
    } else if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
    stopYtPolling();
  }, [activePlayerType, stopYtPolling]);

  const resumeTrack = useCallback(() => {
    if (activePlayerType === 'youtube' && ytPlayerRef.current) {
      ytPlayerRef.current.playVideo();
      setIsPlaying(true);
      startYtPolling();
    } else if (audioRef.current && currentTrack) {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  }, [activePlayerType, currentTrack, startYtPolling]);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pauseTrack();
    } else {
      resumeTrack();
    }
  }, [isPlaying, pauseTrack, resumeTrack]);

  const stopTrack = useCallback(() => {
    if (activePlayerType === 'youtube' && ytPlayerRef.current) {
      try {
        ytPlayerRef.current.stopVideo();
      } catch {}
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    stopYtPolling();
    setCurrentTrack(null);
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);
    setLyrics([]);
    setCurrentLyricLine(null);
    broadcastListeningStatus(null);
  }, [activePlayerType, stopYtPolling, broadcastListeningStatus]);

  const seekToTime = useCallback(
    (seconds: number) => {
      setCurrentTime(seconds);
      if (activePlayerType === 'youtube' && ytPlayerRef.current) {
        ytPlayerRef.current.seekTo(seconds, true);
      } else if (audioRef.current) {
        audioRef.current.currentTime = seconds;
      }
      if (duration > 0) {
        setProgress(seconds / duration);
      }
    },
    [activePlayerType, duration]
  );

  const seekTrack = useCallback(
    (ratio: number) => {
      const targetSeconds = ratio * (duration || 30);
      seekToTime(targetSeconds);
    },
    [duration, seekToTime]
  );

  const playAmbient = useCallback(
    (type: 'rain' | 'cyber' | 'lofi') => {
      const preset = AMBIENT_PRESETS[type];
      if (preset) {
        playTrack({ ...preset, source: 'local' }, { autoLyrics: false });
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
        activePlayerType,
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
      {/* Invisible YouTube Player Container */}
      <div
        id="chronicle-yt-bg-player"
        style={{
          position: 'fixed',
          bottom: 0,
          right: 0,
          width: '1px',
          height: '1px',
          opacity: 0,
          pointerEvents: 'none',
          zIndex: -1,
        }}
      />
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
