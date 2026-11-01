'use client';

import React, { useState, useRef, useEffect } from 'react';
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

  // Music Picker State
  const [selectedSong, setSelectedSong] = useState<StorySong | null>(null);
  const [isMusicPickerOpen, setIsMusicPickerOpen] = useState(false);
  const [musicQuery, setMusicQuery] = useState('');
  const [musicResults, setMusicResults] = useState<StorySong[]>([]);
  const [loadingMusic, setLoadingMusic] = useState(false);
  const [previewAudioUrl, setPreviewAudioUrl] = useState<string | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => {
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
        audioPreviewRef.current = null;
      }
    };
  }, []);

  // Fetch initial music suggestions when picker opens
  useEffect(() => {
    if (isMusicPickerOpen && musicResults.length === 0 && !musicQuery.trim()) {
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
  }, [isMusicPickerOpen, musicResults.length, musicQuery]);

  // Handle music search with debouncing
  useEffect(() => {
    if (!isMusicPickerOpen) return;
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
  }, [musicQuery, isMusicPickerOpen]);

  if (!mounted || !isOpen || !user) return null;

  const stopPreviewAudio = () => {
    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
      audioPreviewRef.current = null;
    }
    setPreviewAudioUrl(null);
  };

  const handleTogglePreview = (e: React.MouseEvent, previewUrl?: string) => {
    e.stopPropagation();
    if (!previewUrl) return;

    if (previewAudioUrl === previewUrl) {
      stopPreviewAudio();
    } else {
      stopPreviewAudio();
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

  const handleSelectSong = (song: StorySong) => {
    stopPreviewAudio();
    setSelectedSong(song);
    setIsMusicPickerOpen(false);
  };

  const handleRemoveSong = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    stopPreviewAudio();
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
    stopPreviewAudio();
    setIsMusicPickerOpen(false);
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

    stopPreviewAudio();
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
      onStoryCreated();
      onClose();
    } catch (err) {
      console.error('Failed to create story:', err);
      alert('Gagal membagikan story. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
        {/* TAMPILAN 1: MUSIC PICKER DRAWER */}
        {/* ======================================================== */}
        {isMusicPickerOpen ? (
          <div className="flex flex-col h-[520px] max-h-[85vh] animate-fadeIn">
            {/* Header */}
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    stopPreviewAudio();
                    setIsMusicPickerOpen(false);
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
                  stopPreviewAudio();
                  setIsMusicPickerOpen(false);
                }}
                className="p-1.5 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition"
              >
                <X className="w-4 h-4" />
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
                  placeholder="Cari judul lagu, artis, atau genre..."
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
                {musicQuery.trim() ? 'Hasil pencarian resmi iTunes' : '✨ Rekomendasi lagu populer untuk story'}
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
                  <p className="text-[11px] text-white/30">Coba kata kunci lagu atau nama artis lain.</p>
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
                        onClick={() => handleSelectSong(song)}
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

                      {/* Controls: Play Preview & Select */}
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
                          onClick={() => handleSelectSong(song)}
                          className={`px-3 py-1.5 rounded-full font-headline font-bold text-xs active:scale-95 transition-all shadow-sm ${
                            isCurrentlySelected
                              ? 'bg-emerald-400 text-black'
                              : 'bg-white text-black hover:bg-white/90'
                          }`}
                        >
                          {isCurrentlySelected ? 'Dipakai' : 'Pilih'}
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
          /* TAMPILAN 2: STORY CREATOR CANVAS */
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
                  {/* Text Preview Box with Music Sticker */}
                  <div
                    className={`w-full aspect-[9/12] max-h-[290px] rounded-2xl bg-gradient-to-br ${selectedGradient} p-5 flex items-center justify-center text-center shadow-inner relative overflow-hidden border border-white/10`}
                  >
                    {/* Instagram Music Sticker Badge (if attached) */}
                    {selectedSong && (
                      <div className="absolute top-3 inset-x-3 z-20 flex items-center justify-between p-2 rounded-2xl bg-black/60 backdrop-blur-md border border-white/20 shadow-xl animate-fadeIn">
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
                              {selectedSong.artist}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => handleTogglePreview(e, selectedSong.previewUrl)}
                            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition active:scale-90"
                            title="Preview lagu"
                          >
                            {previewAudioUrl === selectedSong.previewUrl ? (
                              <Pause className="w-3 h-3 fill-white" />
                            ) : (
                              <Play className="w-3 h-3 fill-white ml-0.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={handleRemoveSong}
                            className="p-1.5 rounded-full hover:bg-white/10 text-white/50 hover:text-red-400 transition"
                            title="Hapus lagu"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}

                    <textarea
                      value={textContent}
                      onChange={(e) => setTextContent(e.target.value)}
                      placeholder="Ketik cerita noir kamu di sini..."
                      maxLength={280}
                      className="w-full h-full bg-transparent text-white font-headline text-lg sm:text-xl font-bold placeholder:text-white/30 resize-none focus:outline-none flex items-center text-center leading-relaxed pt-12"
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
                  {/* Image Preview / Upload Box with Music Sticker */}
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
                        <div className="absolute top-3 inset-x-3 z-20 flex items-center justify-between p-2 rounded-2xl bg-black/65 backdrop-blur-md border border-white/20 shadow-xl animate-fadeIn">
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
                                {selectedSong.artist}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => handleTogglePreview(e, selectedSong.previewUrl)}
                              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition active:scale-90"
                              title="Preview lagu"
                            >
                              {previewAudioUrl === selectedSong.previewUrl ? (
                                <Pause className="w-3 h-3 fill-white" />
                              ) : (
                                <Play className="w-3 h-3 fill-white ml-0.5" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={handleRemoveSong}
                              className="p-1.5 rounded-full hover:bg-white/10 text-white/50 hover:text-red-400 transition"
                              title="Hapus lagu"
                            >
                              <X className="w-3 h-3" />
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
                  <button
                    type="button"
                    onClick={() => setIsMusicPickerOpen(true)}
                    className="w-full py-2 px-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 text-xs font-mono flex items-center justify-between transition"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Volume2 className="w-3.5 h-3.5 animate-pulse shrink-0" />
                      <span className="truncate">Lagu: {selectedSong.title} — {selectedSong.artist}</span>
                    </div>
                    <span className="text-[10px] text-white/60 shrink-0 ml-2 underline">Ganti</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsMusicPickerOpen(true)}
                    className="w-full py-2.5 px-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-emerald-400/40 text-white/80 hover:text-white text-xs font-mono flex items-center justify-center gap-2 transition shadow-sm"
                  >
                    <Music className="w-3.5 h-3.5 text-emerald-400" />
                    <span>+ Tambah Musik Resmi (seperti IG)</span>
                  </button>
                )}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="px-5 py-3.5 border-t border-white/10 flex items-center justify-between">
              <span className="text-[11px] font-mono text-white/40">Hilang dalam 24 jam</span>
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
