'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import {
  X,
  Image as ImageIcon,
  Type,
  Sparkles,
  Loader2,
  Check,
  Music,
  Search,
  Play,
  Pause,
  ArrowLeft,
  Volume2,
  Upload,
  Sliders,
  Disc,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { StoriesService } from '@/lib/services/stories.service';
import { StorageService } from '@/lib/services/storage.service';
import { StorySong } from '@/types';

interface CreateStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStoryCreated: () => void;
}

const GRADIENTS = [
  { id: 'noir', name: 'Obsidian', class: 'from-[#050505] via-[#111111] to-[#1c1c1c]' },
  { id: 'emerald', name: 'Emerald Noir', class: 'from-[#022c22] via-[#064e3b] to-[#021d17]' },
  { id: 'cyber', name: 'Cyber Violet', class: 'from-[#1e1b4b] via-[#2e1065] to-[#0f0728]' },
  { id: 'crimson', name: 'Crimson Smoke', class: 'from-[#450a0a] via-[#280505] to-[#120202]' },
  { id: 'ocean', name: 'Midnight Deep', class: 'from-[#082f49] via-[#0f172a] to-[#030712]' },
];

function formatSeconds(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export function CreateStoryModal({ isOpen, onClose, onStoryCreated }: CreateStoryModalProps) {
  const { user } = useApp();
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<'text' | 'image'>('text');
  const [selectedGradient, setSelectedGradient] = useState(GRADIENTS[1].class);
  const [textContent, setTextContent] = useState('');
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioFileInputRef = useRef<HTMLInputElement>(null);

  // Active view: canvas (story editor) | music_list (search & select) | music_trimmer (IG scrubber)
  const [currentView, setCurrentView] = useState<'canvas' | 'music_list' | 'music_trimmer'>('canvas');

  // Music State
  const [selectedSong, setSelectedSong] = useState<StorySong | null>(null);
  const [musicQuery, setMusicQuery] = useState('');
  const [musicResults, setMusicResults] = useState<StorySong[]>([]);
  const [loadingMusic, setLoadingMusic] = useState(false);
  const [previewAudioUrl, setPreviewAudioUrl] = useState<string | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  // Music Trimmer / Scrubber State
  const [trimmingSong, setTrimmingSong] = useState<StorySong | null>(null);
  const [trimStartTime, setTrimStartTime] = useState<number>(0);
  const [trimDuration, setTrimDuration] = useState<number>(15); // 15 or 30 seconds
  const [audioTotalDuration, setAudioTotalDuration] = useState<number>(30);
  const [isTrimmerPlaying, setIsTrimmerPlaying] = useState<boolean>(false);
  const trimmerAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => {
      stopAllAudio();
    };
  }, []);

  const stopAllAudio = useCallback(() => {
    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
      audioPreviewRef.current = null;
    }
    if (trimmerAudioRef.current) {
      trimmerAudioRef.current.pause();
      trimmerAudioRef.current = null;
    }
    setPreviewAudioUrl(null);
    setIsTrimmerPlaying(false);
  }, []);

  // Fetch initial music suggestions when music list opens
  useEffect(() => {
    if (currentView === 'music_list' && musicResults.length === 0 && !musicQuery.trim()) {
      setLoadingMusic(true);
      fetch('/api/music/search?suggestions=true')
        .then((res) => res.json())
        .then((data) => {
          if (data?.results && Array.isArray(data.results)) {
            setMusicResults(data.results);
          }
        })
        .catch((err) => console.warn('Fetch music suggestions error:', err))
        .finally(() => setLoadingMusic(false));
    }
  }, [currentView, musicResults.length, musicQuery]);

  // Handle music search with debouncing
  useEffect(() => {
    if (currentView !== 'music_list') return;
    const query = musicQuery.trim();
    if (!query) {
      setLoadingMusic(true);
      fetch('/api/music/search?suggestions=true')
        .then((res) => res.json())
        .then((data) => {
          if (data?.results && Array.isArray(data.results)) {
            setMusicResults(data.results);
          }
        })
        .catch(() => {})
        .finally(() => setLoadingMusic(false));
      return;
    }

    const timer = setTimeout(async () => {
      setLoadingMusic(true);
      try {
        const res = await fetch(`/api/music/search?q=${encodeURIComponent(query)}&limit=12`);
        if (res.ok) {
          const data = await res.json();
          setMusicResults(data.results || []);
        }
      } catch (err) {
        console.warn('Music search error:', err);
      } finally {
        setLoadingMusic(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [musicQuery, currentView]);

  if (!mounted || !isOpen || !user) return null;

  // Toggle quick preview in list
  const handleTogglePreview = (e: React.MouseEvent, previewUrl?: string) => {
    e.stopPropagation();
    if (!previewUrl) return;

    if (previewAudioUrl === previewUrl) {
      stopAllAudio();
    } else {
      stopAllAudio();
      const audio = new Audio(previewUrl);
      audio.volume = 0.85;
      audio.onended = () => setPreviewAudioUrl(null);
      audio.onerror = () => setPreviewAudioUrl(null);
      audio.play().then(() => {
        audioPreviewRef.current = audio;
        setPreviewAudioUrl(previewUrl);
      }).catch((err) => {
        console.warn('Preview play blocked:', err);
        setPreviewAudioUrl(null);
      });
    }
  };

  // Open Trimmer for a selected song
  const handleOpenTrimmer = (song: StorySong) => {
    stopAllAudio();
    setTrimmingSong(song);
    const initialStart = song.startTime || 0;
    const initialDur = song.duration || 15;
    setTrimStartTime(initialStart);
    setTrimDuration(initialDur);
    setCurrentView('music_trimmer');

    // Create audio for trimmer and detect total duration
    const audio = new Audio(song.previewUrl);
    audio.volume = 0.85;
    trimmerAudioRef.current = audio;

    const onMeta = () => {
      const dur = Math.floor(audio.duration) || 30;
      setAudioTotalDuration(dur);
      if (initialStart > 0 && initialStart < dur) {
        audio.currentTime = initialStart;
      }
    };

    if (audio.readyState >= 1) {
      onMeta();
    } else {
      audio.addEventListener('loadedmetadata', onMeta, { once: true });
    }

    // Auto-loop within selected window
    audio.ontimeupdate = () => {
      if (trimmerAudioRef.current) {
        const cur = trimmerAudioRef.current.currentTime;
        if (cur >= trimStartTime + trimDuration || cur < trimStartTime) {
          trimmerAudioRef.current.currentTime = trimStartTime;
        }
      }
    };

    audio.onended = () => {
      if (trimmerAudioRef.current) {
        trimmerAudioRef.current.currentTime = trimStartTime;
        trimmerAudioRef.current.play().catch(() => {});
      }
    };

    audio.play().then(() => {
      setIsTrimmerPlaying(true);
    }).catch(() => {
      setIsTrimmerPlaying(false);
    });
  };

  // Seek trimmer audio when user scrubs slider
  const handleScrubAudio = (newStart: number) => {
    setTrimStartTime(newStart);
    if (trimmerAudioRef.current) {
      trimmerAudioRef.current.currentTime = newStart;
      if (!isTrimmerPlaying) {
        trimmerAudioRef.current.play().then(() => {
          setIsTrimmerPlaying(true);
        }).catch(() => {});
      }
    }
  };

  // Toggle trimmer audio play/pause
  const handleToggleTrimmerPlay = () => {
    if (!trimmerAudioRef.current) return;
    if (isTrimmerPlaying) {
      trimmerAudioRef.current.pause();
      setIsTrimmerPlaying(false);
    } else {
      if (
        trimmerAudioRef.current.currentTime < trimStartTime ||
        trimmerAudioRef.current.currentTime >= trimStartTime + trimDuration
      ) {
        trimmerAudioRef.current.currentTime = trimStartTime;
      }
      trimmerAudioRef.current.play().then(() => {
        setIsTrimmerPlaying(true);
      }).catch(() => {});
    }
  };

  // Confirm trimmed music part and apply to story
  const handleConfirmTrim = () => {
    if (!trimmingSong) return;
    stopAllAudio();
    setSelectedSong({
      ...trimmingSong,
      startTime: trimStartTime,
      duration: trimDuration,
    });
    setCurrentView('canvas');
  };

  // Upload custom MP3/Audio file from device
  const handleCustomAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|m4a|wav|aac|ogg)$/i)) {
      alert('Pilih file audio yang valid (MP3, M4A, WAV, OGG).');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      alert('Ukuran file audio maksimal 25MB.');
      return;
    }

    let audioUrl = URL.createObjectURL(file);
    try {
      audioUrl = await StorageService.uploadMedia(file, user.id, 'music');
    } catch (err) {
      console.warn('Storage upload error, using local url:', err);
    }

    const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    const customSong: StorySong = {
      id: `custom_${Date.now()}`,
      title: cleanTitle,
      artist: user.full_name || 'Lagu Sendiri',
      previewUrl: audioUrl,
      coverUrl: user.avatar_url || null,
      startTime: 0,
      duration: 15,
    };

    handleOpenTrimmer(customSong);
  };

  const handleRemoveSong = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    stopAllAudio();
    setSelectedSong(null);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Pilih file gambar yang valid.');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      alert('Ukuran gambar maksimal 15MB.');
      return;
    }

    setSelectedImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
  };

  const handleResetImage = () => {
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setSelectedImageFile(null);
    setImagePreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    stopAllAudio();
    setCurrentView('canvas');
    onClose();
  };

  const handleSubmit = async () => {
    if (mode === 'text' && !textContent.trim()) {
      alert('Tuliskan sesuatu untuk story teks kamu.');
      return;
    }

    if (mode === 'image' && !selectedImageFile) {
      alert('Pilih foto terlebih dahulu.');
      return;
    }

    stopAllAudio();
    setIsSubmitting(true);
    try {
      let mediaUrl: string | null = null;

      if (mode === 'image' && selectedImageFile) {
        try {
          mediaUrl = await StorageService.uploadMedia(selectedImageFile, user.id, 'stories');
        } catch (e) {
          console.warn('Storage upload failed, falling back to base64:', e);
          mediaUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(selectedImageFile);
          });
        }
      }

      await StoriesService.createStory(user, {
        media_type: mode,
        media_url: mediaUrl,
        text_content: mode === 'text' ? textContent.trim() : null,
        bg_gradient: mode === 'text' ? selectedGradient : undefined,
        caption: mode === 'image' ? caption.trim() : null,
        song_data: selectedSong,
      });

      handleResetImage();
      setTextContent('');
      setCaption('');
      setSelectedSong(null);
      setCurrentView('canvas');
      onStoryCreated();
      onClose();
    } catch (err) {
      console.error('Failed to create story:', err);
      alert('Gagal membagikan story. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const maxStartTime = Math.max(0, Math.floor(audioTotalDuration - trimDuration));

  const modalContent = (
    <div
      onClick={handleClose}
      className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-xl flex items-center justify-center p-3 sm:p-4 select-none animate-fadeIn"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[#0f0f0f] border border-white/15 rounded-3xl overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.95)] flex flex-col max-h-[92vh] relative z-10"
      >
        {/* ======================================================== */}
        {/* TAMPILAN 1: MUSIC TRIMMER / SCRUBBER (INSTAGRAM STYLE) */}
        {/* ======================================================== */}
        {currentView === 'music_trimmer' && trimmingSong ? (
          <div className="flex flex-col h-[520px] max-h-[85vh] animate-fadeIn">
            {/* Trimmer Header */}
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    stopAllAudio();
                    setCurrentView('music_list');
                  }}
                  className="p-1.5 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-400" />
                  <h3 className="font-headline font-bold text-white text-sm">Pilih Bagian Lagu (IG Style)</h3>
                </div>
              </div>

              <button
                type="button"
                onClick={handleConfirmTrim}
                className="px-4 py-1.5 rounded-full bg-emerald-400 hover:bg-emerald-300 text-black font-headline font-bold text-xs transition active:scale-95 shadow-[0_0_15px_rgba(52,211,153,0.5)]"
              >
                Selesai
              </button>
            </div>

            {/* Trimmer Body */}
            <div className="p-5 flex-1 overflow-y-auto flex flex-col items-center justify-center text-center space-y-5">
              {/* Spinning Vinyl Artwork */}
              <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-white/20 shadow-[0_0_30px_rgba(0,0,0,0.8)] group flex items-center justify-center bg-neutral-900">
                {trimmingSong.coverUrl ? (
                  <img
                    src={trimmingSong.coverUrl}
                    alt=""
                    className={`w-full h-full object-cover transition-transform duration-1000 ${
                      isTrimmerPlaying ? 'animate-spin' : ''
                    }`}
                    style={{ animationDuration: '6s' }}
                  />
                ) : (
                  <Disc className={`w-12 h-12 text-emerald-400 ${isTrimmerPlaying ? 'animate-spin' : ''}`} />
                )}
                {/* Vinyl center pin */}
                <div className="absolute w-5 h-5 rounded-full bg-black border border-white/30" />
              </div>

              {/* Title & Artist */}
              <div className="space-y-1 max-w-xs">
                <h4 className="font-headline font-bold text-base text-white truncate drop-shadow">
                  {trimmingSong.title}
                </h4>
                <p className="font-mono text-xs text-white/60 truncate">
                  {trimmingSong.artist}
                </p>
              </div>

              {/* Story Duration Pill Toggle (15 Detik vs 30 Detik) */}
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full p-1 text-xs">
                <span className="text-[10px] font-mono text-white/40 pl-2">Durasi Cerita:</span>
                <button
                  type="button"
                  onClick={() => {
                    setTrimDuration(15);
                    if (trimStartTime > Math.max(0, audioTotalDuration - 15)) {
                      handleScrubAudio(Math.max(0, audioTotalDuration - 15));
                    }
                  }}
                  className={`px-3 py-1 rounded-full font-mono text-xs transition ${
                    trimDuration === 15
                      ? 'bg-emerald-400 text-black font-bold shadow-sm'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  15 Detik
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTrimDuration(30);
                    if (trimStartTime > Math.max(0, audioTotalDuration - 30)) {
                      handleScrubAudio(Math.max(0, audioTotalDuration - 30));
                    }
                  }}
                  className={`px-3 py-1 rounded-full font-mono text-xs transition ${
                    trimDuration === 30
                      ? 'bg-emerald-400 text-black font-bold shadow-sm'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  30 Detik
                </button>
              </div>

              {/* Waveform Scrubber Box */}
              <div className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-4 space-y-3 relative">
                {/* Visual Audio Waveform Simulation */}
                <div className="flex items-center justify-between gap-1 h-12 px-2 overflow-hidden select-none">
                  {[
                    24, 40, 16, 50, 75, 90, 60, 45, 80, 95, 100, 70, 85, 40, 25, 65, 80, 90,
                    55, 35, 70, 85, 95, 60, 40, 80, 100, 85, 65, 45, 75, 90, 60, 40, 80, 50,
                  ].map((height, i) => {
                    const activeRatio = maxStartTime > 0 ? trimStartTime / maxStartTime : 0;
                    const barPos = i / 36;
                    const isWithinWindow =
                      barPos >= activeRatio - 0.15 && barPos <= activeRatio + 0.35;

                    return (
                      <span
                        key={i}
                        style={{ height: `${height}%` }}
                        className={`w-1 rounded-full transition-all duration-150 ${
                          isWithinWindow
                            ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]'
                            : 'bg-white/20'
                        }`}
                      />
                    );
                  })}
                </div>

                {/* Range Scrubber Slider */}
                <div className="relative pt-1">
                  <input
                    type="range"
                    min={0}
                    max={maxStartTime}
                    step={1}
                    value={trimStartTime}
                    onChange={(e) => handleScrubAudio(Number(e.target.value))}
                    className="w-full accent-emerald-400 cursor-pointer h-2 bg-white/10 rounded-lg appearance-none focus:outline-none"
                  />
                </div>

                {/* Scrubber Timestamp Display */}
                <div className="flex items-center justify-between text-[11px] font-mono text-white/60 pt-0.5">
                  <span className="text-emerald-400 font-semibold">
                    Mulai: {formatSeconds(trimStartTime)}
                  </span>
                  <span>
                    Selesai: {formatSeconds(trimStartTime + trimDuration)}
                  </span>
                  <span className="text-white/40">
                    Total: {formatSeconds(audioTotalDuration)}
                  </span>
                </div>
              </div>

              {/* Play / Pause Toggle Button */}
              <button
                type="button"
                onClick={handleToggleTrimmerPlay}
                className="w-12 h-12 rounded-full bg-emerald-400 hover:bg-emerald-300 text-black flex items-center justify-center transition active:scale-95 shadow-[0_0_20px_rgba(52,211,153,0.5)]"
                title={isTrimmerPlaying ? 'Pause cuplikan' : 'Putar cuplikan'}
              >
                {isTrimmerPlaying ? (
                  <Pause className="w-5 h-5 fill-black" />
                ) : (
                  <Play className="w-5 h-5 fill-black ml-0.5" />
                )}
              </button>
            </div>
          </div>
        ) : currentView === 'music_list' ? (
          /* ======================================================== */
          /* TAMPILAN 2: MUSIC SEARCH & SUGGESTIONS DRAWER */
          /* ======================================================== */
          <div className="flex flex-col h-[520px] max-h-[85vh] animate-fadeIn">
            {/* Header */}
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    stopAllAudio();
                    setCurrentView('canvas');
                  }}
                  className="p-1 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2">
                  <Music className="w-4 h-4 text-emerald-400" />
                  <h3 className="font-headline font-bold text-white text-sm">Pilih Musik Resmi</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  stopAllAudio();
                  setCurrentView('canvas');
                }}
                className="p-1.5 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Custom Audio Upload Banner */}
            <div className="px-4 pt-3 pb-1">
              <input
                ref={audioFileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleCustomAudioUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => audioFileInputRef.current?.click()}
                className="w-full py-2.5 px-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/15 to-teal-500/10 hover:from-emerald-500/25 hover:to-teal-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center justify-between transition group"
              >
                <div className="flex items-center gap-2.5">
                  <Upload className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                  <span className="font-semibold text-white">Unggah MP3 Sendiri (Full Song)</span>
                </div>
                <span className="text-[10px] text-emerald-400/80 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  Pilih bebas 30s
                </span>
              </button>
            </div>

            {/* Search Input Bar */}
            <div className="p-3 border-b border-white/10 bg-white/[0.02]">
              <div className="flex items-center gap-2.5 bg-white/5 border border-white/10 rounded-2xl px-3.5 py-2 text-xs text-white focus-within:border-emerald-400/50 transition">
                <Search className="w-4 h-4 text-white/40 shrink-0" />
                <input
                  type="text"
                  autoFocus
                  value={musicQuery}
                  onChange={(e) => setMusicQuery(e.target.value)}
                  placeholder="Cari lagu di katalog iTunes..."
                  className="w-full bg-transparent border-none text-xs text-white placeholder:text-white/30 focus:outline-none"
                />
                {loadingMusic && <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400 shrink-0" />}
                {musicQuery && !loadingMusic && (
                  <button
                    type="button"
                    onClick={() => setMusicQuery('')}
                    className="p-0.5 text-white/40 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <p className="text-[10px] font-mono text-white/40 mt-1.5 px-1">
                {musicQuery.trim() ? 'Hasil pencarian resmi iTunes' : '✨ Rekomendasi lagu trending untuk story'}
              </p>
            </div>

            {/* Music List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5 divide-y divide-white/5">
              {loadingMusic && musicResults.length === 0 ? (
                <div className="p-8 flex flex-col items-center justify-center text-center text-white/40 space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                  <p className="text-xs font-mono">Memuat musik resmi...</p>
                </div>
              ) : musicResults.length === 0 ? (
                <div className="p-8 flex flex-col items-center justify-center text-center text-white/40 space-y-2">
                  <Music className="w-8 h-8 opacity-40 text-emerald-400" />
                  <p className="text-xs font-mono">Tidak ada musik ditemukan</p>
                  <p className="text-[11px] text-white/30">Coba kata kunci lagu lain atau unggah MP3 sendiri.</p>
                </div>
              ) : (
                musicResults.map((song) => {
                  const isPreviewing = previewAudioUrl === song.previewUrl;
                  const isCurrentlySelected = selectedSong?.id === song.id;

                  return (
                    <div
                      key={song.id}
                      className={`flex items-center justify-between p-2 rounded-2xl hover:bg-white/[0.06] transition-colors group ${
                        isCurrentlySelected ? 'bg-emerald-500/10 border border-emerald-500/20' : ''
                      }`}
                    >
                      <div
                        onClick={() => handleOpenTrimmer(song)}
                        className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                      >
                        {/* Artwork */}
                        <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-gradient-to-br from-neutral-800 to-neutral-900 border border-white/10 flex items-center justify-center shrink-0 shadow-md">
                          {song.coverUrl ? (
                            <img
                              src={song.coverUrl}
                              alt={song.title}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : null}
                          <Music className="w-4 h-4 text-emerald-400 absolute pointer-events-none opacity-40" />
                        </div>

                        {/* Song Meta */}
                        <div className="truncate min-w-0 pr-2">
                          <p className="text-xs font-bold text-white truncate leading-tight group-hover:text-emerald-300 transition-colors">
                            {song.title}
                          </p>
                          <p className="text-[10px] text-white/50 truncate font-mono mt-0.5">
                            {song.artist}
                          </p>
                        </div>
                      </div>

                      {/* Controls: Play Preview & Select/Trim */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => handleTogglePreview(e, song.previewUrl)}
                          className={`p-2 rounded-full transition-all active:scale-90 ${
                            isPreviewing
                              ? 'bg-emerald-400 text-black shadow-[0_0_12px_rgba(52,211,153,0.6)]'
                              : 'bg-white/10 hover:bg-white/20 text-white'
                          }`}
                          title={isPreviewing ? 'Stop preview' : 'Putar cuplikan 30s'}
                        >
                          {isPreviewing ? (
                            <Pause className="w-3.5 h-3.5 fill-black" />
                          ) : (
                            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenTrimmer(song)}
                          className={`px-3 py-1.5 rounded-full font-headline font-bold text-xs active:scale-95 transition-all shadow-sm ${
                            isCurrentlySelected
                              ? 'bg-emerald-400 text-black'
                              : 'bg-white text-black hover:bg-white/90'
                          }`}
                        >
                          Pilih Part
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          /* ======================================================== */
          /* TAMPILAN 3: STORY CREATOR CANVAS (UTAMA) */
          /* ======================================================== */
          <>
            {/* Header */}
            <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <h3 className="font-headline font-bold text-white text-sm sm:text-base">Buat Noir Story</h3>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="p-1.5 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Selector */}
            <div className="p-2.5 border-b border-white/10 flex gap-2">
              <button
                type="button"
                onClick={() => setMode('text')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-mono font-semibold flex items-center justify-center gap-2 transition ${
                  mode === 'text'
                    ? 'bg-white/15 text-white border border-white/20'
                    : 'text-white/40 hover:text-white hover:bg-white/5'
                }`}
              >
                <Type className="w-4 h-4" />
                <span>Teks Noir</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('image')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-mono font-semibold flex items-center justify-center gap-2 transition ${
                  mode === 'image'
                    ? 'bg-white/15 text-white border border-white/20'
                    : 'text-white/40 hover:text-white hover:bg-white/5'
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                <span>Foto / Media</span>
              </button>
            </div>

            {/* Content Body */}
            <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4">
              {mode === 'text' ? (
                <>
                  {/* Text Preview Box with Instagram Music Sticker */}
                  <div
                    className={`w-full aspect-[9/12] max-h-[290px] rounded-2xl bg-gradient-to-br ${selectedGradient} p-5 flex items-center justify-center text-center shadow-inner relative overflow-hidden border border-white/10`}
                  >
                    {/* Instagram Music Sticker Badge */}
                    {selectedSong && (
                      <div
                        onClick={() => handleOpenTrimmer(selectedSong)}
                        className="absolute top-3 inset-x-3 z-20 flex items-center justify-between p-2 rounded-2xl bg-black/65 backdrop-blur-md border border-white/20 shadow-xl animate-fadeIn cursor-pointer hover:bg-black/80 transition"
                        title="Ketuk untuk ganti bagian lagu"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="relative w-8 h-8 rounded-lg overflow-hidden bg-neutral-800 shrink-0 border border-white/10">
                            {selectedSong.coverUrl ? (
                              <img src={selectedSong.coverUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Music className="w-4 h-4 text-emerald-400 m-auto mt-2" />
                            )}
                          </div>
                          <div className="min-w-0 text-left">
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              <p className="text-[11px] font-bold text-white truncate leading-tight">
                                {selectedSong.title}
                              </p>
                            </div>
                            <p className="text-[10px] font-mono text-white/60 truncate leading-tight mt-0.5">
                              {selectedSong.artist} • {selectedSong.duration || 15}s (Mulai {formatSeconds(selectedSong.startTime || 0)})
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenTrimmer(selectedSong);
                            }}
                            className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-emerald-400 transition"
                            title="Sesuaikan bagian lagu"
                          >
                            <Sliders className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={handleRemoveSong}
                            className="p-1 rounded-full hover:bg-white/10 text-white/50 hover:text-red-400 transition"
                            title="Hapus lagu"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}

                    <textarea
                      value={textContent}
                      onChange={(e) => setTextContent(e.target.value)}
                      placeholder="Ketik cerita noir kamu di sini..."
                      maxLength={280}
                      className="w-full h-full bg-transparent text-white font-headline text-lg sm:text-xl font-bold placeholder:text-white/30 resize-none focus:outline-none flex items-center text-center leading-relaxed pt-14"
                    />
                  </div>

                  {/* Gradient Theme Picker */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-mono text-white/50">Warna Gradien Noir:</span>
                    <div className="flex items-center gap-2">
                      {GRADIENTS.map((g) => (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => setSelectedGradient(g.class)}
                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br ${g.class} border-2 transition active:scale-90 flex items-center justify-center ${
                            selectedGradient === g.class ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-60'
                          }`}
                          title={g.name}
                        >
                          {selectedGradient === g.class && <Check className="w-3.5 h-3.5 text-white" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Image Preview / Upload Box with Instagram Music Sticker */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />

                  {imagePreviewUrl ? (
                    <div className="relative w-full aspect-[9/12] max-h-[290px] rounded-2xl overflow-hidden border border-white/10 group">
                      <Image src={imagePreviewUrl} alt="Story Preview" fill className="object-cover" />

                      {/* Instagram Music Sticker Badge */}
                      {selectedSong && (
                        <div
                          onClick={() => handleOpenTrimmer(selectedSong)}
                          className="absolute top-3 inset-x-3 z-20 flex items-center justify-between p-2 rounded-2xl bg-black/65 backdrop-blur-md border border-white/20 shadow-xl animate-fadeIn cursor-pointer hover:bg-black/80 transition"
                          title="Ketuk untuk ganti bagian lagu"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="relative w-8 h-8 rounded-lg overflow-hidden bg-neutral-800 shrink-0 border border-white/10">
                              {selectedSong.coverUrl ? (
                                <img src={selectedSong.coverUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <Music className="w-4 h-4 text-emerald-400 m-auto mt-2" />
                              )}
                            </div>
                            <div className="min-w-0 text-left">
                              <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                <p className="text-[11px] font-bold text-white truncate leading-tight">
                                  {selectedSong.title}
                                </p>
                              </div>
                              <p className="text-[10px] font-mono text-white/60 truncate leading-tight mt-0.5">
                                {selectedSong.artist} • {selectedSong.duration || 15}s (Mulai {formatSeconds(selectedSong.startTime || 0)})
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenTrimmer(selectedSong);
                              }}
                              className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-emerald-400 transition"
                              title="Sesuaikan bagian lagu"
                            >
                              <Sliders className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={handleRemoveSong}
                              className="p-1 rounded-full hover:bg-white/10 text-white/50 hover:text-red-400 transition"
                              title="Hapus lagu"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={handleResetImage}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-white hover:bg-black transition z-30"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full aspect-[9/12] max-h-[290px] rounded-2xl border-2 border-dashed border-white/20 hover:border-emerald-400/60 bg-white/[0.02] hover:bg-white/[0.04] flex flex-col items-center justify-center gap-3 cursor-pointer transition p-6 text-center"
                    >
                      <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white/60">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">Ketuk untuk memilih foto</p>
                        <p className="text-xs font-mono text-white/40 mt-1">Maksimal 15MB (JPG, PNG, WebP)</p>
                      </div>
                    </div>
                  )}

                  {/* Caption Input */}
                  <input
                    type="text"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Tambah caption singkat (opsional)..."
                    maxLength={100}
                    className="w-full bg-white/5 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 font-body"
                  />
                </>
              )}

              {/* Music Attachment Button Bar */}
              <div className="pt-1">
                {selectedSong ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenTrimmer(selectedSong)}
                      className="flex-1 py-2 px-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 text-xs font-mono flex items-center justify-between transition"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Volume2 className="w-3.5 h-3.5 animate-pulse shrink-0" />
                        <span className="truncate">
                          {selectedSong.title} ({selectedSong.duration || 15}s)
                        </span>
                      </div>
                      <span className="text-[10px] text-white/60 shrink-0 ml-2 underline flex items-center gap-1">
                        <Sliders className="w-3 h-3" />
                        Atur Part
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentView('music_list')}
                      className="py-2 px-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-xs font-mono transition shrink-0"
                    >
                      Ganti Lagu
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setCurrentView('music_list')}
                    className="w-full py-2.5 px-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-emerald-400/40 text-white/80 hover:text-white text-xs font-mono flex items-center justify-center gap-2 transition shadow-sm"
                  >
                    <Music className="w-3.5 h-3.5 text-emerald-400" />
                    <span>+ Tambah Musik & Atur Bagian Lagu (seperti IG)</span>
                  </button>
                )}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="px-5 py-3.5 border-t border-white/10 flex items-center justify-between">
              <span className="text-[11px] font-mono text-white/40">
                {selectedSong ? `Durasi: ${selectedSong.duration || 15} detik` : 'Hilang dalam 24 jam'}
              </span>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || (mode === 'text' && !textContent.trim()) || (mode === 'image' && !selectedImageFile)}
                className="px-5 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs flex items-center gap-2 shadow-[0_0_20px_rgba(52,211,153,0.4)] transition active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Membagikan...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Bagikan Cerita</span>
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
