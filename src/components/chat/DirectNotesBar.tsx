'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { 
  Plus, 
  Music, 
  Volume2, 
  X, 
  Search, 
  Loader2, 
  Play, 
  Pause, 
  Disc3, 
  SlidersHorizontal,
  Send,
  Trash2,
  Sparkles
} from 'lucide-react';
import { NotesService } from '@/lib/services/notes.service';
import { MessagesService } from '@/lib/services/messages.service';
import { formatTimeAgo } from '@/lib/utils';

export interface NoteSong {
  id: string;
  title: string;
  artist: string;
  previewUrl: string;
  coverUrl?: string;
  startTime?: number; // Detik mulai (0 - 25 detik)
  lyricSnippet?: string; // Cuplikan lirik / bait yang dipilih
}

export interface UserNote {
  id: string;
  userId: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  text?: string;
  song?: NoteSong | null;
  createdAt: number;
}

// ─── Default empty suggestions (akan diisi secara real-time via /api/music/search) ──


export function DirectNotesBar() {
  const { user } = useApp();
  const [myNote, setMyNote] = useState<UserNote | null>(null);
  const [friendsNotes, setFriendsNotes] = useState<UserNote[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [revealedNote, setRevealedNote] = useState<UserNote | null>(null);

  // Audio playback state
  const [playingSongUrl, setPlayingSongUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const loadNotes = async () => {
    if (!user) return;
    const { myNote: mine, friendsNotes: friends } = await NotesService.getNotes(user.id);
    setMyNote(mine);
    setFriendsNotes(friends);
  };

  useEffect(() => {
    loadNotes();
  }, [user]);

  const handlePlaySong = (e: React.MouseEvent, song?: NoteSong | null) => {
    e.stopPropagation();
    if (!song?.previewUrl) return;

    if (playingSongUrl === song.previewUrl) {
      audioRef.current?.pause();
      setPlayingSongUrl(null);
    } else {
      if (audioRef.current) audioRef.current.pause();
      const audio = new Audio(song.previewUrl);
      audio.volume = 0.85;

      // Set currentTime ONLY when metadata is loaded to prevent DOMException reject!
      if (song.startTime && song.startTime > 0) {
        audio.addEventListener(
          'loadedmetadata',
          () => {
            try {
              audio.currentTime = song.startTime || 0;
            } catch (err) {
              console.warn('Set currentTime error:', err);
            }
          },
          { once: true }
        );
      }

      audio.onended = () => setPlayingSongUrl(null);
      audio.onerror = (err) => {
        console.warn('Audio element error:', err);
        setPlayingSongUrl(null);
      };

      const p = audio.play();
      if (p !== undefined) {
        p.then(() => {
          audioRef.current = audio;
          setPlayingSongUrl(song.previewUrl);
        }).catch((err) => {
          console.warn('Play was rejected:', err);
          setPlayingSongUrl(null);
        });
      }
    }
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) audioRef.current.pause();
    };
  }, []);

  const handleSaveNote = async (data: { text: string; song: NoteSong | null }) => {
    if (!user) return;
    const saved = await NotesService.saveNote(user, data.text, data.song);
    setMyNote(saved);
    setIsCreateModalOpen(false);
  };

  const handleDeleteMyNote = async () => {
    if (!user) return;
    await NotesService.deleteNote(user.id);
    setMyNote(null);
    setIsCreateModalOpen(false);
    setRevealedNote(null);
  };

  if (!user) return null;

  return (
    <>
      <div className="w-full border-b border-white/[0.08] px-3 pt-3 pb-2 bg-black/40">
        <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar items-start">
          {/* ======================================================== */}
          {/* My Note (Catatan Anda) */}
          {/* ======================================================== */}
          <div className="flex flex-col items-center flex-shrink-0 w-[78px] text-center relative group">
            {/* Note Bubble */}
            <div
              onClick={() => {
                if (myNote) {
                  setRevealedNote(myNote);
                } else {
                  setIsCreateModalOpen(true);
                }
              }}
              className="relative cursor-pointer transition-transform active:scale-95 mb-2.5"
            >
              <div
                className={`max-w-[86px] bg-[#1a1a1a]/95 border rounded-2xl py-1 px-2 text-[11px] leading-tight text-white shadow-lg backdrop-blur-md relative transition-all ${
                  myNote ? 'border-white/20 hover:border-white/40' : 'border-dashed border-white/20 hover:border-white/40'
                }`}
                style={{
                  boxShadow: myNote?.song ? '0 0 14px rgba(255,255,255,0.12)' : undefined,
                }}
              >
                {myNote ? (
                  <>
                    {myNote.song ? (
                      <div className="flex items-center gap-1 text-left">
                        <div className="flex items-end gap-[1.5px] h-3 w-3 shrink-0 text-sky-400">
                          <span className={`w-[2px] bg-sky-400 rounded-full ${playingSongUrl === myNote.song.previewUrl ? 'animate-pulse h-3' : 'h-1.5'}`} />
                          <span className={`w-[2px] bg-sky-400 rounded-full ${playingSongUrl === myNote.song.previewUrl ? 'animate-bounce h-2.5' : 'h-3'}`} />
                          <span className={`w-[2px] bg-sky-400 rounded-full ${playingSongUrl === myNote.song.previewUrl ? 'animate-pulse h-2' : 'h-1'}`} />
                        </div>
                        <div className="truncate min-w-0">
                          <p className="font-bold text-[10px] text-white truncate">{myNote.song.title}</p>
                          <p className="text-[9px] text-on-surface-variant truncate">{myNote.song.artist}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="line-clamp-2 text-center text-white/95 font-medium">{myNote.text}</p>
                    )}
                  </>
                ) : (
                  <span className="text-white/50 text-[10px] whitespace-nowrap block text-center font-mono">
                    Bagikan catatan...
                  </span>
                )}

                {/* Speech tail */}
                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#1a1a1a] border-r border-b border-white/20 rotate-45" />
              </div>
            </div>

            {/* Avatar */}
            <div
              onClick={() => {
                if (myNote) {
                  setRevealedNote(myNote);
                } else {
                  setIsCreateModalOpen(true);
                }
              }}
              className="relative w-14 h-14 rounded-full p-0.5 cursor-pointer group-hover:scale-105 transition-transform"
            >
              <Image
                src={user?.avatar_url || '/default-avatar.jpg'}
                alt={user?.full_name || 'My Avatar'}
                width={56}
                height={56}
                className="w-full h-full rounded-full object-cover border border-white/20 aspect-square"
              />
              {!myNote && (
                <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-white text-black flex items-center justify-center font-bold text-xs shadow-md">
                  <Plus className="w-3 h-3 stroke-[3]" />
                </div>
              )}
            </div>
            <span className="text-[11px] text-white/70 font-mono mt-1 truncate max-w-[76px]">
              Catatan Anda
            </span>
          </div>

          {/* ======================================================== */}
          {/* Other Users' Real Notes */}
          {/* ======================================================== */}
          {friendsNotes.map((note) => {
            const isPlayingThis = playingSongUrl === note.song?.previewUrl;

            return (
              <div
                key={note.id}
                onClick={() => setRevealedNote(note)}
                className="flex flex-col items-center flex-shrink-0 w-[78px] text-center relative group animate-fade-in cursor-pointer"
              >
                {/* Note Bubble */}
                <div className="relative transition-transform active:scale-95 mb-2.5">
                  <div
                    className={`max-w-[88px] bg-[#181818]/95 border rounded-2xl py-1 px-2 text-[11px] leading-tight text-white shadow-lg backdrop-blur-md relative transition-all ${
                      isPlayingThis
                        ? 'border-sky-400/80 shadow-[0_0_15px_rgba(56,189,248,0.35)] bg-sky-950/40'
                        : 'border-white/15 hover:border-white/30'
                    }`}
                  >
                    {note.song ? (
                      <div className="flex items-center gap-1.5 text-left">
                        <div className="flex items-end gap-[1.5px] h-3 w-3 shrink-0 text-sky-400">
                          <span className={`w-[2px] bg-sky-400 rounded-full ${isPlayingThis ? 'animate-pulse h-3' : 'h-1.5'}`} />
                          <span className={`w-[2px] bg-sky-400 rounded-full ${isPlayingThis ? 'animate-bounce h-2.5' : 'h-3'}`} />
                          <span className={`w-[2px] bg-sky-400 rounded-full ${isPlayingThis ? 'animate-pulse h-2' : 'h-1'}`} />
                        </div>
                        <div className="truncate min-w-0">
                          <p className="font-bold text-[10px] text-white truncate leading-tight">
                            {note.song.title}
                          </p>
                          <p className="text-[9px] text-on-surface-variant truncate font-mono">
                            {note.song.artist}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="line-clamp-2 text-center text-white/90 font-medium text-[10px]">
                        {note.text}
                      </p>
                    )}

                    <div
                      className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 ${
                        isPlayingThis
                          ? 'bg-sky-950 border-r border-b border-sky-400/80'
                          : 'bg-[#181818] border-r border-b border-white/15'
                      }`}
                    />
                  </div>
                </div>

                {/* Avatar */}
                <div
                  className={`relative w-14 h-14 rounded-full p-0.5 transition-transform ${
                    isPlayingThis ? 'ring-2 ring-sky-400 scale-105' : 'hover:scale-105'
                  }`}
                >
                  <Image
                    src={note.avatarUrl || '/default-avatar.jpg'}
                    alt={note.fullName}
                    width={56}
                    height={56}
                    className="w-full h-full rounded-full object-cover border border-white/20 aspect-square"
                  />
                  {isPlayingThis && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-sky-400 text-black flex items-center justify-center shadow-lg animate-pulse">
                      <Volume2 className="w-2.5 h-2.5" />
                    </div>
                  )}
                </div>

                <span className="text-[11px] text-white/60 font-mono mt-1 truncate max-w-[76px]">
                  @{note.username}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 1. Modal Buat / Edit Catatan dengan Audio Scrubber */}
      {/* ======================================================== */}
      {isCreateModalOpen && (
        <CreateNoteModal
          isOpen={isCreateModalOpen}
          initialNote={myNote}
          onClose={() => setIsCreateModalOpen(false)}
          onSave={handleSaveNote}
          onDelete={handleDeleteMyNote}
        />
      )}

      {/* ======================================================== */}
      {/* 2. Modal Reveal Full Note saat Catatan di-Klik */}
      {/* ======================================================== */}
      {revealedNote && (
        <RevealNoteModal
          note={revealedNote}
          isMe={revealedNote.userId === user.id}
          onClose={() => setRevealedNote(null)}
          onEdit={() => {
            setRevealedNote(null);
            setIsCreateModalOpen(true);
          }}
          onDelete={handleDeleteMyNote}
        />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal Buat Catatan (Live Search, Audio Part Trimmer, Lirik Snippet)
// ─────────────────────────────────────────────────────────────────────────────
interface CreateNoteModalProps {
  isOpen: boolean;
  initialNote: UserNote | null;
  onClose: () => void;
  onSave: (note: { text: string; song: NoteSong | null }) => void;
  onDelete: () => void;
}

function CreateNoteModal({ initialNote, onClose, onSave, onDelete }: CreateNoteModalProps) {
  const { user } = useApp();
  const [mounted, setMounted] = useState(false);
  const [text, setText] = useState(initialNote?.text || '');
  const [selectedSong, setSelectedSong] = useState<NoteSong | null>(initialNote?.song || null);
  const [showMusicSearch, setShowMusicSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NoteSong[]>([]);
  const [searching, setSearching] = useState(false);

  // Audio trimming & lyric selection states
  const [startTime, setStartTime] = useState<number>(initialNote?.song?.startTime || 0);
  const [lyricSnippet, setLyricSnippet] = useState<string>(initialNote?.song?.lyricSnippet || '');
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [previewAudioUrl, setPreviewAudioUrl] = useState<string | null>(null);
  const trimmerAudioRef = useRef<HTMLAudioElement | null>(null);
  const searchPreviewAudioRef = useRef<HTMLAudioElement | null>(null);

  const [suggestedSongs, setSuggestedSongs] = useState<NoteSong[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Fetch live suggestions on mount via internal server proxy
  useEffect(() => {
    setMounted(true);
    setLoadingSuggestions(true);
    fetch('/api/music/search?suggestions=true')
      .then((res) => res.json())
      .then((data) => {
        if (data.results && data.results.length > 0) {
          setSuggestedSongs(data.results);
        }
      })
      .catch((e) => console.warn('Fetch suggestions err:', e))
      .finally(() => setLoadingSuggestions(false));
  }, []);

  const handleTogglePreview = (e: React.MouseEvent, url: string) => {
    e.stopPropagation();
    if (previewAudioUrl === url) {
      if (searchPreviewAudioRef.current) {
        searchPreviewAudioRef.current.pause();
        try {
          if (searchPreviewAudioRef.current.readyState >= 1) {
            searchPreviewAudioRef.current.currentTime = 0;
          }
        } catch (e) {}
      }
      setPreviewAudioUrl(null);
    } else {
      if (searchPreviewAudioRef.current) {
        searchPreviewAudioRef.current.pause();
      }
      const a = new Audio(url);
      a.volume = 0.85;
      a.onended = () => setPreviewAudioUrl(null);
      a.onerror = () => setPreviewAudioUrl(null);
      
      const playPromise = a.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            searchPreviewAudioRef.current = a;
            setPreviewAudioUrl(url);
          })
          .catch((err) => {
            console.warn('Audio playback error:', err);
            setPreviewAudioUrl(null);
          });
      }
    }
  };

  // Update audio when selected song changes
  useEffect(() => {
    if (selectedSong?.previewUrl) {
      if (trimmerAudioRef.current) {
        trimmerAudioRef.current.pause();
      }
      const a = new Audio(selectedSong.previewUrl);
      a.volume = 0.85;
      if (startTime > 0) {
        a.addEventListener(
          'loadedmetadata',
          () => {
            try {
              a.currentTime = startTime;
            } catch (e) {
              console.warn('Set currentTime error:', e);
            }
          },
          { once: true }
        );
      }
      a.onended = () => setIsPlayingPreview(false);
      a.onerror = () => setIsPlayingPreview(false);
      trimmerAudioRef.current = a;
    }
    return () => {
      trimmerAudioRef.current?.pause();
      searchPreviewAudioRef.current?.pause();
    };
  }, [selectedSong]);

  const toggleTrimmerPlayback = () => {
    if (!trimmerAudioRef.current) return;
    if (isPlayingPreview) {
      trimmerAudioRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      try {
        if (trimmerAudioRef.current.readyState >= 1) {
          trimmerAudioRef.current.currentTime = startTime;
        }
      } catch (e) {}
      const playPromise = trimmerAudioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlayingPreview(true))
          .catch((err) => {
            console.warn('Trimmer audio play error:', err);
            setIsPlayingPreview(false);
          });
      }
    }
  };

  const handleStartTimeChange = (val: number) => {
    setStartTime(val);
    if (trimmerAudioRef.current) {
      try {
        if (trimmerAudioRef.current.readyState >= 1) {
          trimmerAudioRef.current.currentTime = val;
        }
      } catch (e) {}
      if (!isPlayingPreview) {
        const p = trimmerAudioRef.current.play();
        if (p !== undefined) {
          p.then(() => setIsPlayingPreview(true)).catch(() => {});
        }
      }
    }
  };

  const handleSearchSong = async (q: string) => {
    setSearchQuery(q);
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/music/search?q=${encodeURIComponent(q)}&limit=10`);
      const data = await res.json();
      if (data.results) {
        setSearchResults(data.results);
      }
    } catch (err) {
      console.warn('Failed searching song:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectSong = (song: NoteSong) => {
    if (searchPreviewAudioRef.current) searchPreviewAudioRef.current.pause();
    setPreviewAudioUrl(null);
    setSelectedSong({
      ...song,
      startTime: 0,
      lyricSnippet: '',
    });
    setStartTime(0);
    setLyricSnippet('');
    setShowMusicSearch(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() && !selectedSong) return;
    onSave({
      text: text.trim(),
      song: selectedSong
        ? {
            ...selectedSong,
            startTime,
            lyricSnippet: lyricSnippet.trim(),
          }
        : null,
    });
  };

  if (!mounted) return null;

  const displayedSongs = searchQuery.trim() ? searchResults : suggestedSongs;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-[#121212] border border-white/20 rounded-3xl p-5 shadow-[0_25px_60px_rgba(0,0,0,0.95)] space-y-4 relative z-10 max-h-[92vh] overflow-y-auto no-scrollbar"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <h3 className="font-headline font-bold text-white text-base">
            {initialNote ? 'Edit Catatan' : 'Catatan Baru'}
          </h3>
          <button onClick={onClose} className="p-1 text-on-surface-variant hover:text-white rounded-full">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Note Visual Preview */}
        <div className="flex flex-col items-center py-2">
          <div className="bg-[#1e1e1e] border border-white/20 rounded-2xl p-2.5 max-w-[210px] text-center shadow-lg relative mb-3">
            {selectedSong && (
              <div className="flex items-center gap-2 mb-1.5 text-left bg-white/5 p-1 rounded-lg">
                {selectedSong.coverUrl ? (
                  <img
                    src={selectedSong.coverUrl}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="w-6 h-6 rounded-md object-cover flex-shrink-0"
                  />
                ) : (
                  <Music className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                )}
                <div className="truncate min-w-0 flex-1">
                  <p className="font-bold text-[11px] text-white truncate">{selectedSong.title}</p>
                  <p className="text-[10px] text-on-surface-variant truncate">{selectedSong.artist}</p>
                </div>
              </div>
            )}
            {lyricSnippet && (
              <p className="text-[10px] italic text-sky-300 font-mono line-clamp-1 mb-1">
                ♫ "{lyricSnippet}"
              </p>
            )}
            <p className="text-xs text-white break-words">
              {text.trim() || (selectedSong ? '' : 'Bagikan apa yang sedang kamu pikirkan...')}
            </p>
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#1e1e1e] border-r border-b border-white/20 rotate-45" />
          </div>

          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white/20 shadow-xl">
            <Image
              src={user?.avatar_url || '/default-avatar.jpg'}
              alt="Avatar"
              width={64}
              height={64}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* ======================================================== */}
        {/* Layar Pencarian Lagu dengan Saran Otomatis */}
        {/* ======================================================== */}
        {showMusicSearch ? (
          <div className="space-y-3 animate-fade-in">
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3 py-2 text-xs text-white focus-within:border-white/30">
              <Search className="w-3.5 h-3.5 text-on-surface-variant" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => handleSearchSong(e.target.value)}
                placeholder="Cari lagu atau artis..."
                className="w-full bg-transparent border-none text-xs text-white placeholder:text-outline focus:outline-none"
              />
              {searching && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />}
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono text-on-surface-variant px-1">
              <span>{searchQuery.trim() ? 'Hasil Pencarian' : '✨ Saran Lagu Untuk Anda'}</span>
            </div>

            {/* Loading Skeleton */}
            {loadingSuggestions && displayedSongs.length === 0 && (
              <div className="space-y-2 py-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-2xl bg-white/[0.02] animate-pulse">
                    <div className="w-10 h-10 rounded-xl bg-white/10 shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 bg-white/10 rounded w-2/3" />
                      <div className="h-2.5 bg-white/5 rounded w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Results / Suggestions List */}
            <div className="max-h-56 overflow-y-auto space-y-1.5 divide-y divide-white/5 pr-1 no-scrollbar">
              {displayedSongs.map((song) => {
                const isPreviewing = previewAudioUrl === song.previewUrl;

                return (
                  <div
                    key={song.id}
                    className="flex items-center justify-between p-2 rounded-2xl hover:bg-white/[0.06] transition-colors group"
                  >
                    <div
                      onClick={() => handleSelectSong(song)}
                      className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                    >
                      {/* Artwork with safe fallback (no broken image icons) */}
                      <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-gradient-to-br from-neutral-800 to-neutral-900 border border-white/10 flex items-center justify-center flex-shrink-0 shadow-md">
                        {song.coverUrl && (
                          <img
                            src={song.coverUrl}
                            alt=""
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // Hide broken image smoothly
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        )}
                        <Music className="w-4 h-4 text-sky-400 absolute pointer-events-none opacity-40" />
                      </div>

                      <div className="truncate min-w-0 pr-2">
                        <p className="text-xs font-bold text-white truncate leading-tight group-hover:text-sky-300 transition-colors">
                          {song.title}
                        </p>
                        <p className="text-[10px] text-on-surface-variant truncate font-mono mt-0.5">
                          {song.artist}
                        </p>
                      </div>
                    </div>

                    {/* Actions: Play Preview + Choose Button */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {/* Audio preview play/stop */}
                      <button
                        type="button"
                        onClick={(e) => handleTogglePreview(e, song.previewUrl)}
                        className={`p-2 rounded-full transition-all active:scale-90 ${
                          isPreviewing
                            ? 'bg-sky-400 text-black shadow-[0_0_12px_rgba(56,189,248,0.5)]'
                            : 'bg-white/10 hover:bg-white/20 text-white'
                        }`}
                        title={isPreviewing ? 'Stop preview' : 'Putar 30 detik preview'}
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
                        className="px-3.5 py-1.5 rounded-full bg-white text-black font-headline font-bold text-xs hover:bg-white/90 active:scale-95 transition-all shadow-sm"
                      >
                        Pilih
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setShowMusicSearch(false)}
              className="w-full py-2 text-xs font-mono text-on-surface-variant hover:text-white"
            >
              ← Batal cari lagu
            </button>
          </div>
        ) : (
          /* ======================================================== */
          /* Form Utama: Teks, Pemilihan Bagian Lagu 30s & Lirik */
          /* ======================================================== */
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <input
                type="text"
                value={text}
                maxLength={60}
                onChange={(e) => setText(e.target.value)}
                placeholder="Bagikan apa yang sedang kamu pikirkan..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-outline focus:outline-none focus:border-white/30"
              />
              <div className="flex justify-end text-[9px] font-mono text-on-surface-variant pt-1">
                {text.length}/60
              </div>
            </div>

            {/* Song Card + Audio Trimmer / Part Selector */}
            {selectedSong ? (
              <div className="p-3 bg-white/5 border border-white/10 rounded-2xl space-y-3 animate-fade-in">
                {/* Info Lagu */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {selectedSong.coverUrl ? (
                      <img
                        src={selectedSong.coverUrl}
                        alt="Cover"
                        referrerPolicy="no-referrer"
                        className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
                      />
                    ) : (
                      <Music className="w-5 h-5 text-sky-400" />
                    )}
                    <div className="truncate">
                      <p className="text-xs font-bold text-white truncate">{selectedSong.title}</p>
                      <p className="text-[10px] text-on-surface-variant truncate">{selectedSong.artist}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedSong(null)}
                    className="p-1 text-on-surface-variant hover:text-red-400"
                    title="Ganti/Hapus Lagu"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Audio Trimmer Slider (Pilih Part 30 Detik) */}
                <div className="pt-1 border-t border-white/10 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-mono text-on-surface-variant">
                    <span className="flex items-center gap-1.5 text-white/90">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-sky-400" />
                      <span>Bagian Lagu (Mulai di {startTime}s)</span>
                    </span>
                    <button
                      type="button"
                      onClick={toggleTrimmerPlayback}
                      className="flex items-center gap-1 text-sky-400 font-semibold hover:underline"
                    >
                      {isPlayingPreview ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                      <span>{isPlayingPreview ? 'Jeda' : 'Dengar'}</span>
                    </button>
                  </div>

                  <input
                    type="range"
                    min={0}
                    max={25}
                    step={1}
                    value={startTime}
                    onChange={(e) => handleStartTimeChange(Number(e.target.value))}
                    className="w-full accent-sky-400 h-1.5 bg-white/15 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] font-mono text-on-surface-variant">
                    <span>0:00 (Intro)</span>
                    <span className="text-sky-400 font-bold">0:{startTime < 10 ? `0${startTime}` : startTime}</span>
                    <span>0:25 (Reff/Chorus)</span>
                  </div>
                </div>

                {/* Input Kutipan Lirik Part Ini */}
                <div className="pt-1">
                  <input
                    type="text"
                    value={lyricSnippet}
                    maxLength={50}
                    onChange={(e) => setLyricSnippet(e.target.value)}
                    placeholder="Tulis kutipan lirik bagian ini (opsional)..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-[11px] text-white placeholder:text-outline focus:outline-none focus:border-white/30 italic"
                  />
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowMusicSearch(true)}
                className="w-full py-2.5 px-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl flex items-center justify-center gap-2 text-xs font-medium text-white transition-colors"
              >
                <Music className="w-4 h-4 text-sky-400" />
                <span>Pilih Musik untuk Catatan</span>
              </button>
            )}

            {/* Actions */}
            <div className="pt-2 flex items-center justify-between gap-2">
              {initialNote && (
                <button
                  type="button"
                  onClick={onDelete}
                  className="px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 rounded-xl font-mono"
                >
                  Hapus
                </button>
              )}
              <div className="flex-1 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs text-on-surface-variant hover:text-white rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!text.trim() && !selectedSong}
                  className="px-5 py-2 bg-white text-black font-headline font-bold rounded-xl text-xs hover:bg-white/90 active:scale-95 transition-all shadow-md disabled:opacity-40"
                >
                  Bagikan
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal Reveal Full Note saat Catatan di-Tap / di-Klik
// ─────────────────────────────────────────────────────────────────────────────
interface RevealNoteModalProps {
  note: UserNote;
  isMe: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function RevealNoteModal({ note, isMe, onClose, onEdit, onDelete }: RevealNoteModalProps) {
  const router = useRouter();
  const { user } = useApp();
  const [mounted, setMounted] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-play song if available
  useEffect(() => {
    if (note.song?.previewUrl) {
      const audio = new Audio(note.song.previewUrl);
      audio.volume = 0.85;
      if (note.song.startTime && note.song.startTime > 0) {
        audio.addEventListener(
          'loadedmetadata',
          () => {
            try {
              audio.currentTime = note.song?.startTime || 0;
            } catch (e) {
              console.warn('Set currentTime error:', e);
            }
          },
          { once: true }
        );
      }
      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => setIsPlaying(false);
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch((err) => {
            console.warn('Reveal note audio play error:', err);
            setIsPlaying(false);
          });
      }
      audioRef.current = audio;
    }
    return () => {
      audioRef.current?.pause();
    };
  }, [note]);

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim() || !user) return;
    setSendingReply(true);
    try {
      // Buka percakapan dengan pembuat note
      const convId = await MessagesService.getOrCreateConversation(user.id, note.userId);
      if (convId) {
        const textPayload = `Membalas catatan: "${note.text || note.song?.title}"\n\n${replyMessage.trim()}`;
        await MessagesService.sendMessage(convId, user.id, textPayload);
        onClose();
        router.push(`/messages?user=${note.userId}`);
      }
    } catch (err) {
      console.warn('Gagal membalas catatan:', err);
    } finally {
      setSendingReply(false);
    }
  };

  if (!mounted) return null;

  const modalContent = (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-[#131313] border border-white/20 rounded-3xl p-6 shadow-[0_30px_70px_rgba(0,0,0,0.95)] space-y-5 relative"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-on-surface-variant hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* User Info Header */}
        <div className="flex items-center gap-3">
          <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-white/20 shadow-md">
            <Image
              src={note.avatarUrl || '/default-avatar.jpg'}
              alt={note.fullName}
              fill
              className="object-cover"
            />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-white text-base truncate">{note.fullName}</h4>
            <p className="text-xs text-on-surface-variant font-mono">@{note.username}</p>
            <p className="text-[10px] text-white/40 font-mono mt-0.5">{formatTimeAgo(new Date(note.createdAt).toISOString())}</p>
          </div>
        </div>

        {/* Note Text Quote Bubble */}
        {note.text && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center shadow-inner">
            <p className="text-white text-base md:text-lg font-body leading-relaxed whitespace-pre-wrap">
              "{note.text}"
            </p>
          </div>
        )}

        {/* Song Music Player Card (Spinning Vinyl) */}
        {note.song && (
          <div className="bg-gradient-to-b from-white/10 to-white/5 border border-white/15 rounded-2xl p-4 flex items-center gap-4 relative overflow-hidden shadow-lg">
            {/* Spinning Vinyl Album Art */}
            <div
              onClick={toggleAudio}
              className={`relative w-16 h-16 rounded-full overflow-hidden border-2 border-white/30 shadow-2xl cursor-pointer flex-shrink-0 ${
                isPlaying ? 'animate-[spin_8s_linear_infinite]' : ''
              }`}
            >
              {note.song.coverUrl ? (
                <img
                  src={note.song.coverUrl}
                  alt="Cover"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full h-full bg-neutral-800 flex items-center justify-center">
                  <Disc3 className="w-8 h-8 text-sky-400" />
                </div>
              )}
              {/* Center hole of vinyl */}
              <div className="absolute inset-0 m-auto w-3.5 h-3.5 bg-black rounded-full border border-white/40" />
            </div>

            {/* Song Meta & Lyric */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <Music className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <h5 className="font-bold text-sm text-white truncate">{note.song.title}</h5>
              </div>
              <p className="text-xs text-on-surface-variant truncate font-mono">{note.song.artist}</p>

              {note.song.lyricSnippet && (
                <p className="text-[11px] italic text-sky-300 font-mono mt-1 line-clamp-2">
                  ♫ "{note.song.lyricSnippet}"
                </p>
              )}
            </div>

            {/* Play/Pause Button */}
            <button
              onClick={toggleAudio}
              className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-lg active:scale-90 transition-transform flex-shrink-0"
              title={isPlaying ? 'Jeda' : 'Putar'}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-black" /> : <Play className="w-4 h-4 fill-black ml-0.5" />}
            </button>
          </div>
        )}

        {/* Footer Actions */}
        {isMe ? (
          <div className="pt-2 flex items-center justify-between gap-3 border-t border-white/10">
            <button
              onClick={onDelete}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-mono text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Catatan</span>
            </button>
            <button
              onClick={onEdit}
              className="px-5 py-2 bg-white text-black font-headline font-bold text-xs rounded-xl hover:bg-white/90 active:scale-95 transition-all shadow-md"
            >
              Tinggalkan Catatan Baru
            </button>
          </div>
        ) : (
          /* Reply to Friend's Note (Instagram Style) */
          <form onSubmit={handleSendReply} className="pt-2 border-t border-white/10 space-y-2">
            <div className="relative flex items-center">
              <input
                type="text"
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                placeholder={`Kirim balasan ke ${note.fullName.split(' ')[0]}...`}
                className="w-full bg-white/5 border border-white/10 rounded-full pl-4 pr-11 py-2.5 text-xs text-white placeholder:text-outline focus:outline-none focus:border-white/30"
              />
              <button
                type="submit"
                disabled={!replyMessage.trim() || sendingReply}
                className="absolute right-1.5 p-1.5 bg-primary text-black rounded-full hover:scale-105 active:scale-95 disabled:opacity-40 transition-all"
                title="Kirim pesan"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
