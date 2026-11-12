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
  Disc,
  SlidersHorizontal,
  Send,
  Trash2,
  Users,
  Mic2,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { NotesService } from '@/lib/services/notes.service';
import { MessagesService } from '@/lib/services/messages.service';
import { MusicService, SongResult, SyncedLyricLine } from '@/lib/services/music.service';
import { formatTimeAgo } from '@/lib/utils';
import { useMusic } from '@/context/MusicContext';

export interface NoteSong {
  id: string;
  title: string;
  artist: string;
  previewUrl: string;
  coverUrl?: string;
  startTime?: number;
  duration?: number;
  lyricSnippet?: string;
  streamUrl?: string;
  videoId?: string | null;
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

function formatSeconds(secs?: number): string {
  if (!secs || isNaN(secs) || secs < 0) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export function DirectNotesBar() {
  const { user, friendIds } = useApp();
  const { playTrack, currentTrack, isPlaying, pauseTrack, resumeTrack } = useMusic();
  const [myNote, setMyNote] = useState<UserNote | null>(null);
  const [friendsNotes, setFriendsNotes] = useState<UserNote[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [revealedNote, setRevealedNote] = useState<UserNote | null>(null);

  const loadNotes = async () => {
    if (!user) return;
    const { myNote: mine, friendsNotes: friends } = await NotesService.getNotes(user.id, friendIds);
    setMyNote(mine);
    setFriendsNotes(friends);
  };

  useEffect(() => {
    loadNotes();
  }, [user, friendIds]);

  // Real-time synchronization
  useEffect(() => {
    const handleSync = () => loadNotes();

    window.addEventListener('storage', handleSync);
    window.addEventListener('focus', handleSync);
    window.addEventListener('chronicle_note_updated', handleSync);

    const pollInterval = setInterval(handleSync, 4000);

    let channel: any = null;
    if (isSupabaseConfigured()) {
      channel = supabase
        .channel('global_notes_feed')
        .on('broadcast', { event: 'new_note' }, handleSync)
        .on('broadcast', { event: 'delete_note' }, handleSync)
        .subscribe();
    }

    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('focus', handleSync);
      window.removeEventListener('chronicle_note_updated', handleSync);
      clearInterval(pollInterval);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [user, friendIds]);

  const handlePlaySongDirect = (e: React.MouseEvent, note: UserNote) => {
    e.stopPropagation();
    const song = note.song;
    if (!song) return;

    const isThisTrackPlaying =
      isPlaying &&
      currentTrack?.title?.toLowerCase() === song.title.toLowerCase() &&
      currentTrack?.artist?.toLowerCase() === song.artist.toLowerCase();

    if (isThisTrackPlaying) {
      pauseTrack();
    } else {
      playTrack(
        {
          title: song.title,
          artist: song.artist,
          previewUrl: song.previewUrl,
          coverUrl: song.coverUrl,
          startTime: song.startTime || 0,
          duration: song.duration,
          videoId: song.videoId,
          lyricSnippet: song.lyricSnippet,
        },
        { autoLyrics: true, startTime: song.startTime || 0 }
      );
    }
  };

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
    setRevealedNote(null);
  };

  const isMyNotePlaying =
    isPlaying &&
    myNote?.song &&
    currentTrack?.title?.toLowerCase() === myNote.song.title.toLowerCase();

  return (
    <>
      <div className="w-full border-b border-white/[0.08] bg-black/40 backdrop-blur-xl px-4 py-3 select-none">
        <div className="flex items-center gap-4 overflow-x-auto no-scrollbar scroll-smooth py-1">
          {/* ======================================================== */}
          {/* My Note Column */}
          {/* ======================================================== */}
          <div className="flex flex-col items-center flex-shrink-0 w-[84px] text-center relative group">
            {/* Note Bubble */}
            <div
              onClick={() => {
                if (myNote) setRevealedNote(myNote);
                else setIsCreateModalOpen(true);
              }}
              className="relative cursor-pointer transition-transform active:scale-95 mb-2.5"
            >
              <div
                className={`max-w-[92px] liquid-glass-bubble rounded-2xl py-1.5 px-2.5 text-[11px] leading-tight text-white relative transition-all ${
                  myNote ? 'hover:border-white/40' : 'border-dashed border-white/20 hover:border-white/40'
                }`}
              >
                {myNote ? (
                  <>
                    {myNote.song ? (
                      <div className="flex items-center gap-1.5 text-left">
                        {/* Animated Equalizer */}
                        <div className="flex items-end gap-[1.5px] h-3 w-3 shrink-0 text-sky-400">
                          <span className={`w-[2px] bg-sky-400 rounded-full ${isMyNotePlaying ? 'animate-eq-1' : 'h-1.5'}`} />
                          <span className={`w-[2px] bg-sky-400 rounded-full ${isMyNotePlaying ? 'animate-eq-2' : 'h-2.5'}`} />
                          <span className={`w-[2px] bg-sky-400 rounded-full ${isMyNotePlaying ? 'animate-eq-3' : 'h-1'}`} />
                        </div>
                        <div className="truncate min-w-0">
                          <p className="font-semibold text-[10px] text-white truncate leading-tight">
                            {myNote.song.title}
                          </p>
                          <p className="text-[9px] text-white/50 truncate font-mono">
                            {myNote.song.artist}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="line-clamp-2 text-center text-white/95 font-medium text-[10px]">
                        {myNote.text}
                      </p>
                    )}
                  </>
                ) : (
                  <span className="text-white/40 text-[10px] whitespace-nowrap block text-center font-mono">
                    Catatan...
                  </span>
                )}

                {/* Speech tail */}
                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#121212] border-r border-b border-white/20 rotate-45" />
              </div>
            </div>

            {/* Avatar */}
            <div
              onClick={() => {
                if (myNote) setRevealedNote(myNote);
                else setIsCreateModalOpen(true);
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
            <span className="text-[11px] text-white/70 font-mono mt-1 truncate max-w-[80px]">
              Catatan Anda
            </span>
          </div>

          {/* ======================================================== */}
          {/* Friends' Notes */}
          {/* ======================================================== */}
          {friendsNotes.map((note) => {
            const isPlayingThis =
              isPlaying &&
              note.song &&
              currentTrack?.title?.toLowerCase() === note.song.title.toLowerCase();

            return (
              <div
                key={note.id}
                onClick={() => setRevealedNote(note)}
                className="flex flex-col items-center flex-shrink-0 w-[84px] text-center relative group animate-fade-in cursor-pointer"
              >
                {/* Note Bubble */}
                <div className="relative transition-transform active:scale-95 mb-2.5">
                  <div
                    className={`max-w-[92px] liquid-glass-bubble rounded-2xl py-1.5 px-2.5 text-[11px] leading-tight text-white relative transition-all ${
                      isPlayingThis
                        ? 'border-sky-400/80 shadow-[0_0_16px_rgba(56,189,248,0.4)]'
                        : 'hover:border-white/35'
                    }`}
                  >
                    {note.song ? (
                      <div className="flex items-center gap-1.5 text-left">
                        {/* Equalizer */}
                        <div className="flex items-end gap-[1.5px] h-3 w-3 shrink-0 text-sky-400">
                          <span className={`w-[2px] bg-sky-400 rounded-full ${isPlayingThis ? 'animate-eq-1' : 'h-1.5'}`} />
                          <span className={`w-[2px] bg-sky-400 rounded-full ${isPlayingThis ? 'animate-eq-2' : 'h-2.5'}`} />
                          <span className={`w-[2px] bg-sky-400 rounded-full ${isPlayingThis ? 'animate-eq-3' : 'h-1'}`} />
                        </div>
                        <div className="truncate min-w-0">
                          <p className="font-semibold text-[10px] text-white truncate leading-tight">
                            {note.song.title}
                          </p>
                          <p className="text-[9px] text-white/50 truncate font-mono">
                            {note.song.artist}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="line-clamp-2 text-center text-white/90 font-medium text-[10px]">
                        {note.text}
                      </p>
                    )}

                    <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#121212] border-r border-b border-white/20 rotate-45" />
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

                <span className="text-[11px] text-white/60 font-mono mt-1 truncate max-w-[80px]">
                  @{note.username}
                </span>
              </div>
            );
          })}

          {/* Empty state prompt for mutual friends */}
          {friendsNotes.length === 0 && (
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-2xl bg-white/[0.03] border border-dashed border-white/10 shrink-0 self-center my-auto ml-1 text-white/50 max-w-[215px] animate-fade-in">
              <Users className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="text-[10px] leading-tight font-mono">
                {friendIds.length > 0 ? (
                  <>
                    <p className="text-white/80 font-medium">Belum ada catatan</p>
                    <p className="text-white/40 text-[9px]">{friendIds.length} teman belum berbagi catatan</p>
                  </>
                ) : (
                  <>
                    <p className="text-white/80 font-medium">Hanya Teman</p>
                    <p className="text-white/40 text-[9px]">Saling follow untuk melihat catatan</p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal 1: Create Note */}
      {isCreateModalOpen && (
        <CreateNoteModal
          isOpen={isCreateModalOpen}
          initialNote={myNote}
          onClose={() => setIsCreateModalOpen(false)}
          onSave={handleSaveNote}
          onDelete={handleDeleteMyNote}
        />
      )}

      {/* Modal 2: Reveal Full Note */}
      {revealedNote && (
        <RevealNoteModal
          note={revealedNote}
          isMe={revealedNote.userId === user?.id}
          onClose={() => setRevealedNote(null)}
          onEdit={() => {
            setRevealedNote(null);
            setIsCreateModalOpen(true);
          }}
          onDelete={handleDeleteMyNote}
          onPlayDirect={handlePlaySongDirect}
        />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal Buat Catatan (Full Track Scrubber & Synced Lyrics Picker)
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
  const { playTrack, pauseTrack, seekToTime, isPlaying, currentTrack, currentTime } = useMusic();
  const [mounted, setMounted] = useState(false);
  const [text, setText] = useState(initialNote?.text || '');
  const [selectedSong, setSelectedSong] = useState<NoteSong | null>(initialNote?.song || null);
  const [showMusicSearch, setShowMusicSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SongResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [suggestedSongs, setSuggestedSongs] = useState<SongResult[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Audio trimming & lyrics states
  const [startTime, setStartTime] = useState<number>(initialNote?.song?.startTime || 0);
  const [songDuration, setSongDuration] = useState<number>(initialNote?.song?.duration || 210);
  const [lyricSnippet, setLyricSnippet] = useState<string>(initialNote?.song?.lyricSnippet || '');
  const [syncedLyrics, setSyncedLyrics] = useState<SyncedLyricLine[]>([]);
  const [loadingLyrics, setLoadingLyrics] = useState(false);

  useEffect(() => {
    setMounted(true);
    setLoadingSuggestions(true);
    MusicService.getSuggestions()
      .then((songs) => setSuggestedSongs(songs))
      .finally(() => setLoadingSuggestions(false));
  }, []);

  // When a song is selected, load its YouTube videoId & synced lyrics from LRCLIB
  useEffect(() => {
    if (!selectedSong) return;

    setLoadingLyrics(true);
    MusicService.getLyrics(selectedSong.title, selectedSong.artist)
      .then((data) => {
        if (data.found && data.lines.length > 0) {
          setSyncedLyrics(data.lines);
          if (data.duration && data.duration > 30) {
            setSongDuration(data.duration);
          }
        } else {
          setSyncedLyrics([]);
        }
      })
      .finally(() => setLoadingLyrics(false));

    // Resolve full YouTube videoId for 100% full-track playback
    MusicService.getYouTubeTrack(selectedSong.title, selectedSong.artist, selectedSong.previewUrl).then(
      (yt) => {
        if (yt.videoId) {
          setSelectedSong((prev) => (prev ? { ...prev, videoId: yt.videoId } : null));
        }
      }
    );
  }, [selectedSong?.id]);

  const isSongPlayingNow =
    isPlaying &&
    selectedSong &&
    currentTrack?.title?.toLowerCase() === selectedSong.title.toLowerCase();

  const toggleTrimmerPlayback = () => {
    if (!selectedSong) return;
    if (isSongPlayingNow) {
      pauseTrack();
    } else {
      playTrack(
        {
          title: selectedSong.title,
          artist: selectedSong.artist,
          previewUrl: selectedSong.previewUrl,
          coverUrl: selectedSong.coverUrl,
          duration: songDuration,
          videoId: selectedSong.videoId,
          startTime,
        },
        { startTime, autoLyrics: false }
      );
    }
  };

  const handleStartTimeChange = (val: number) => {
    setStartTime(val);
    seekToTime(val);
    if (!isSongPlayingNow && selectedSong) {
      playTrack(
        {
          title: selectedSong.title,
          artist: selectedSong.artist,
          previewUrl: selectedSong.previewUrl,
          coverUrl: selectedSong.coverUrl,
          duration: songDuration,
          videoId: selectedSong.videoId,
          startTime: val,
        },
        { startTime: val, autoLyrics: false }
      );
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
      const results = await MusicService.searchSongs(q, 10);
      setSearchResults(results);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectSong = (song: SongResult) => {
    const defaultDur = song.duration && song.duration > 30 ? song.duration : 210;
    setSelectedSong({
      id: song.id,
      title: song.title,
      artist: song.artist,
      previewUrl: song.previewUrl,
      coverUrl: song.coverUrl,
      duration: defaultDur,
      startTime: 0,
      lyricSnippet: '',
    });
    setStartTime(0);
    setSongDuration(defaultDur);
    setLyricSnippet('');
    setShowMusicSearch(false);

    // Resolve full YouTube track
    MusicService.getYouTubeTrack(song.title, song.artist, song.previewUrl).then((yt) => {
      if (yt.videoId) {
        setSelectedSong((prev) => (prev ? { ...prev, videoId: yt.videoId } : null));
      }
    });
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
            duration: songDuration,
            lyricSnippet: lyricSnippet.trim(),
          }
        : null,
    });
  };

  if (!mounted) return null;

  const displayedSongs = searchQuery.trim() ? searchResults : suggestedSongs;
  const maxScrubTime = Math.max(15, songDuration - 15);

  const modalContent = (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-2xl flex items-center justify-center p-4 animate-fade-in">
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm liquid-glass-card rounded-3xl p-5 shadow-[0_25px_60px_rgba(0,0,0,0.95)] space-y-4 relative z-10 max-h-[92vh] overflow-y-auto no-scrollbar"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <h3 className="font-semibold text-white text-sm tracking-wide">
            {initialNote ? 'Edit Catatan' : 'Catatan Baru'}
          </h3>
          <button
            onClick={() => {
              pauseTrack();
              onClose();
            }}
            className="p-1.5 text-white/50 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Note Bubble Preview */}
        <div className="flex flex-col items-center py-2">
          <div className="liquid-glass-bubble rounded-2xl p-3 max-w-[220px] text-center relative mb-3">
            {selectedSong && (
              <div className="flex items-center gap-2 mb-1.5 text-left bg-white/[0.06] p-1.5 rounded-xl border border-white/10">
                {selectedSong.coverUrl ? (
                  <img
                    src={selectedSong.coverUrl}
                    alt=""
                    className="w-7 h-7 rounded-lg object-cover flex-shrink-0"
                  />
                ) : (
                  <Music className="w-4 h-4 text-sky-400 shrink-0" />
                )}
                <div className="truncate min-w-0 flex-1">
                  <p className="font-semibold text-[11px] text-white truncate leading-tight">
                    {selectedSong.title}
                  </p>
                  <p className="text-[10px] text-white/50 truncate font-mono">
                    {selectedSong.artist}
                  </p>
                </div>
              </div>
            )}
            {lyricSnippet && (
              <p className="text-[10px] italic text-sky-300 font-mono line-clamp-1 mb-1">
                ♫ "{lyricSnippet}"
              </p>
            )}
            <p className="text-xs text-white break-words font-medium">
              {text.trim() || (selectedSong ? '' : 'Bagikan apa yang sedang kamu dengar...')}
            </p>
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#121212] border-r border-b border-white/20 rotate-45" />
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

          <div className="flex items-center gap-1.5 text-[10px] font-mono text-white/60 mt-2 bg-white/5 border border-white/10 px-3 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Dibagikan ke teman</span>
          </div>
        </div>

        {/* Music Search Screen */}
        {showMusicSearch ? (
          <div className="space-y-3 animate-fade-in">
            <div className="flex items-center gap-2 liquid-glass-input rounded-full px-3.5 py-2.5 text-xs text-white">
              <Search className="w-4 h-4 text-white/40" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => handleSearchSong(e.target.value)}
                placeholder="Cari lagu, artis, atau album..."
                className="w-full bg-transparent border-none text-xs text-white placeholder:text-white/40 focus:outline-none"
              />
              {searching && <Loader2 className="w-3.5 h-3.5 animate-spin text-white/60" />}
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono text-white/50 px-1">
              <span>{searchQuery.trim() ? 'Hasil Pencarian' : 'Pilihan Populer'}</span>
            </div>

            {/* Results List */}
            <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 no-scrollbar">
              {displayedSongs.map((song) => (
                <div
                  key={song.id}
                  onClick={() => handleSelectSong(song)}
                  className="flex items-center justify-between p-2 rounded-2xl hover:bg-white/[0.08] transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-neutral-900 border border-white/10 flex items-center justify-center flex-shrink-0 shadow-md">
                      {song.coverUrl ? (
                        <img
                          src={song.coverUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Music className="w-4 h-4 text-white/40" />
                      )}
                    </div>

                    <div className="truncate min-w-0 pr-2">
                      <p className="text-xs font-semibold text-white truncate leading-tight group-hover:text-sky-300 transition-colors">
                        {song.title}
                      </p>
                      <p className="text-[10px] text-white/50 truncate font-mono mt-0.5">
                        {song.artist}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="px-3.5 py-1.5 rounded-full bg-white text-black font-semibold text-xs hover:bg-white/90 active:scale-95 transition-all shadow-sm shrink-0"
                  >
                    Pilih
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowMusicSearch(false)}
              className="w-full py-2 text-xs font-mono text-white/50 hover:text-white"
            >
              ← Batal cari lagu
            </button>
          </div>
        ) : (
          /* Main Note Form */
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <input
                type="text"
                value={text}
                maxLength={60}
                onChange={(e) => setText(e.target.value)}
                placeholder="Bagikan apa yang sedang kamu pikirkan..."
                className="w-full liquid-glass-input rounded-2xl px-3.5 py-2.5 text-xs text-white placeholder:text-white/40"
              />
              <div className="flex justify-end text-[9px] font-mono text-white/40 pt-1">
                {text.length}/60
              </div>
            </div>

            {/* Selected Song Card */}
            {selectedSong ? (
              <div className="p-3 bg-white/[0.04] border border-white/10 rounded-2xl space-y-3 animate-fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {selectedSong.coverUrl ? (
                      <img
                        src={selectedSong.coverUrl}
                        alt="Cover"
                        className="w-9 h-9 rounded-xl object-cover flex-shrink-0 border border-white/15"
                      />
                    ) : (
                      <Music className="w-5 h-5 text-sky-400" />
                    )}
                    <div className="truncate">
                      <p className="text-xs font-semibold text-white truncate leading-tight">
                        {selectedSong.title}
                      </p>
                      <p className="text-[10px] text-white/50 truncate font-mono">
                        {selectedSong.artist}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      pauseTrack();
                      setSelectedSong(null);
                      setSyncedLyrics([]);
                    }}
                    className="p-1 text-white/40 hover:text-white rounded-full"
                    title="Ganti lagu"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Duration-aware Scrubber (Real Timeline) */}
                <div className="pt-2 border-t border-white/10 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-mono text-white/60">
                    <span className="flex items-center gap-1.5 text-white/80">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-sky-400" />
                      <span>Mulai di {formatSeconds(startTime)}</span>
                    </span>
                    <button
                      type="button"
                      onClick={toggleTrimmerPlayback}
                      className="flex items-center gap-1 text-sky-400 font-semibold hover:underline"
                    >
                      {isSongPlayingNow ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                      <span>{isSongPlayingNow ? 'Jeda' : 'Dengar'}</span>
                    </button>
                  </div>

                  <input
                    type="range"
                    min={0}
                    max={maxScrubTime}
                    step={1}
                    value={startTime}
                    onChange={(e) => handleStartTimeChange(Number(e.target.value))}
                    className="w-full accent-white h-1.5 bg-white/15 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] font-mono text-white/40">
                    <span>0:00</span>
                    <span className="text-sky-400 font-bold">{formatSeconds(startTime)}</span>
                    <span>{formatSeconds(songDuration)}</span>
                  </div>
                </div>

                {/* Synced Lyrics Picker */}
                <div className="pt-2 border-t border-white/10 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-white/60">
                    <Mic2 className="w-3 h-3 text-sky-400" />
                    <span>Sentuh lirik untuk cuplikan catatan:</span>
                    {loadingLyrics && <Loader2 className="w-3 h-3 animate-spin text-white/40 ml-auto" />}
                  </div>

                  {syncedLyrics.length > 0 ? (
                    <div className="max-h-28 overflow-y-auto space-y-1 pr-1 no-scrollbar py-1">
                      {syncedLyrics.map((line, idx) => {
                        const isChosen = lyricSnippet === line.text;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setLyricSnippet(line.text);
                              const lineSec = Math.max(0, Math.floor(line.time));
                              setStartTime(lineSec);
                              seekToTime(lineSec);
                            }}
                            className={`w-full text-left px-2.5 py-1.5 rounded-xl text-[11px] transition-all flex items-center justify-between ${
                              isChosen
                                ? 'bg-sky-500/20 text-sky-300 font-medium border border-sky-400/40'
                                : 'text-white/60 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            <span className="truncate pr-2">{line.text}</span>
                            <span className="text-[9px] font-mono opacity-50 shrink-0">
                              {formatSeconds(line.time)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={lyricSnippet}
                      maxLength={60}
                      onChange={(e) => setLyricSnippet(e.target.value)}
                      placeholder="Tulis kutipan lirik (opsional)..."
                      className="w-full liquid-glass-input rounded-xl px-3 py-1.5 text-[11px] text-white placeholder:text-white/40 italic"
                    />
                  )}
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowMusicSearch(true)}
                className="w-full py-3 px-3 liquid-glass-card rounded-2xl flex items-center justify-center gap-2 text-xs font-medium text-white hover:border-white/30 transition-all"
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
                  onClick={() => {
                    pauseTrack();
                    onDelete();
                  }}
                  className="px-3.5 py-2 text-xs text-red-400 hover:bg-red-500/10 rounded-xl font-mono transition-colors"
                >
                  Hapus
                </button>
              )}
              <div className="flex-1 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    pauseTrack();
                    onClose();
                  }}
                  className="px-4 py-2 text-xs text-white/50 hover:text-white rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!text.trim() && !selectedSong}
                  className="px-5 py-2 bg-white text-black font-semibold rounded-xl text-xs hover:bg-white/90 active:scale-95 transition-all shadow-md disabled:opacity-40"
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
// Modal Reveal Full Note (Full Track Playback & Karaoke Lyrics)
// ─────────────────────────────────────────────────────────────────────────────
interface RevealNoteModalProps {
  note: UserNote;
  isMe: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPlayDirect: (e: React.MouseEvent, note: UserNote) => void;
}

const QUICK_EMOJIS = ['❤️', '🔥', '👏', '🙌', '😮', '💯'];

function RevealNoteModal({
  note,
  isMe,
  onClose,
  onEdit,
  onDelete,
}: RevealNoteModalProps) {
  const router = useRouter();
  const { user } = useApp();
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    lyrics,
    playTrack,
    togglePlay,
    seekToTime,
  } = useMusic();

  const [mounted, setMounted] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const lyricsContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
    // Auto play note's song with full track from startTime
    if (note.song) {
      playTrack(
        {
          title: note.song.title,
          artist: note.song.artist,
          previewUrl: note.song.previewUrl,
          coverUrl: note.song.coverUrl,
          startTime: note.song.startTime || 0,
          duration: note.song.duration,
          videoId: note.song.videoId,
          lyricSnippet: note.song.lyricSnippet,
        },
        { startTime: note.song.startTime || 0, autoLyrics: true }
      );
    }
  }, [note.id]);

  // Find active lyric index based on global currentTime
  const activeLyricIndex = lyrics.findIndex((line, i) => {
    const nextLine = lyrics[i + 1];
    if (nextLine) {
      return currentTime >= line.time && currentTime < nextLine.time;
    }
    return currentTime >= line.time;
  });

  // Auto-scroll lyrics smoothly
  useEffect(() => {
    if (lyricsContainerRef.current && activeLyricIndex >= 0) {
      const lineEl = lyricsContainerRef.current.children[activeLyricIndex] as HTMLElement;
      if (lineEl) {
        lineEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeLyricIndex]);

  const handleSeek = (ratio: number) => {
    if (duration > 0) {
      seekToTime(ratio * duration);
    }
  };

  const handleSendReply = async (messageText: string) => {
    if (!messageText.trim() || !user) return;
    setSendingReply(true);
    try {
      const convId = await MessagesService.getOrCreateConversation(user.id, note.userId);
      if (convId) {
        const textPayload = `Membalas catatan: "${note.text || note.song?.title}"\n\n${messageText.trim()}`;
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

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-2xl flex items-center justify-center p-4 animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm liquid-glass-card rounded-3xl p-6 shadow-[0_30px_70px_rgba(0,0,0,0.95)] space-y-5 relative overflow-hidden"
      >
        {/* Dynamic ambient cover blur in background */}
        {note.song?.coverUrl && (
          <div
            className="absolute -top-24 -left-24 w-72 h-72 rounded-full opacity-20 pointer-events-none blur-3xl"
            style={{
              backgroundImage: `url(${note.song.coverUrl})`,
              backgroundSize: 'cover',
            }}
          />
        )}

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-white/50 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors z-20"
        >
          <X className="w-4 h-4" />
        </button>

        {/* User Info Header */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-white/20 shadow-md">
            <Image
              src={note.avatarUrl || '/default-avatar.jpg'}
              alt={note.fullName}
              fill
              className="object-cover"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-white text-base truncate">{note.fullName}</h4>
              <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/70 text-[10px] font-mono flex items-center gap-1 shrink-0">
                <Users className="w-2.5 h-2.5" />
                <span>Teman</span>
              </span>
            </div>
            <p className="text-xs text-white/50 font-mono">@{note.username}</p>
            <p className="text-[10px] text-white/40 font-mono mt-0.5">
              {formatTimeAgo(new Date(note.createdAt).toISOString())}
            </p>
          </div>
        </div>

        {/* Note Text Bubble */}
        {note.text && (
          <div className="liquid-glass-bubble rounded-2xl p-4 text-center shadow-inner relative z-10">
            <p className="text-white text-base md:text-lg font-medium leading-relaxed whitespace-pre-wrap">
              "{note.text}"
            </p>
          </div>
        )}

        {/* Song Card with Full-Track Scrubber & Karaoke Synced Lyrics */}
        {note.song && (
          <div className="liquid-glass-card rounded-2xl p-4 space-y-3 relative z-10 overflow-hidden">
            <div className="flex items-center gap-3.5">
              {/* Album Art Frame */}
              <div
                onClick={togglePlay}
                className="relative w-14 h-14 rounded-2xl overflow-hidden border border-white/25 shadow-xl cursor-pointer flex-shrink-0 group"
              >
                {note.song.coverUrl ? (
                  <img
                    src={note.song.coverUrl}
                    alt="Cover"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-neutral-900 flex items-center justify-center">
                    <Disc className="w-6 h-6 text-white/50" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  {isPlaying ? (
                    <Pause className="w-5 h-5 text-white fill-white" />
                  ) : (
                    <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                  )}
                </div>
              </div>

              {/* Meta */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <Music className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <h5 className="font-semibold text-sm text-white truncate leading-tight">
                    {note.song.title}
                  </h5>
                </div>
                <p className="text-xs text-white/50 truncate font-mono mt-0.5">
                  {note.song.artist}
                </p>
                {note.song.lyricSnippet && (
                  <p className="text-[11px] italic text-sky-300 font-mono mt-1 line-clamp-1">
                    ♫ "{note.song.lyricSnippet}"
                  </p>
                )}
              </div>

              {/* Play/Pause Button */}
              <button
                onClick={togglePlay}
                className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-lg active:scale-90 transition-transform flex-shrink-0"
                title={isPlaying ? 'Jeda' : 'Putar'}
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 fill-black" />
                ) : (
                  <Play className="w-4 h-4 fill-black ml-0.5" />
                )}
              </button>
            </div>

            {/* Seek Bar */}
            <div className="space-y-1 pt-1">
              <div
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const ratio = (e.clientX - rect.left) / rect.width;
                  handleSeek(Math.max(0, Math.min(1, ratio)));
                }}
                className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden cursor-pointer group"
              >
                <div
                  style={{
                    width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
                  }}
                  className="h-full bg-sky-400 transition-all duration-100"
                />
              </div>
              <div className="flex justify-between text-[9px] font-mono text-white/40">
                <span>{formatSeconds(currentTime)}</span>
                <span>{formatSeconds(duration)}</span>
              </div>
            </div>

            {/* Synced Lyrics Karaoke Scroller */}
            {lyrics.length > 0 && (
              <div className="pt-2 border-t border-white/10">
                <div className="text-[10px] font-mono text-white/40 mb-1 flex items-center gap-1">
                  <Mic2 className="w-3 h-3 text-sky-400" />
                  <span>Lirik Lagu Terhubung</span>
                </div>
                <div
                  ref={lyricsContainerRef}
                  className="max-h-24 overflow-y-auto space-y-1.5 pr-1 no-scrollbar py-1"
                >
                  {lyrics.map((line, idx) => {
                    const isActive = idx === activeLyricIndex;
                    return (
                      <div
                        key={idx}
                        onClick={() => seekToTime(line.time)}
                        className={`text-xs transition-all cursor-pointer ${
                          isActive
                            ? 'text-white font-bold text-sm scale-[1.02] text-sky-300'
                            : 'text-white/35 hover:text-white/70'
                        }`}
                      >
                        {line.text}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        {isMe ? (
          <div className="pt-2 flex items-center justify-between gap-3 border-t border-white/10 relative z-10">
            <button
              onClick={onDelete}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-mono text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Catatan</span>
            </button>
            <button
              onClick={onEdit}
              className="px-5 py-2 bg-white text-black font-semibold text-xs rounded-xl hover:bg-white/90 active:scale-95 transition-all shadow-md"
            >
              Catatan Baru
            </button>
          </div>
        ) : (
          /* Instagram Style Reply to Note with Quick Reactions */
          <div className="pt-2 border-t border-white/10 space-y-2.5 relative z-10">
            <div className="flex items-center justify-around py-1">
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleSendReply(emoji)}
                  className="text-xl hover:scale-125 active:scale-95 transition-transform"
                >
                  {emoji}
                </button>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendReply(replyMessage);
              }}
              className="relative flex items-center"
            >
              <input
                type="text"
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                placeholder={`Balas ${note.fullName.split(' ')[0]}...`}
                className="w-full liquid-glass-input rounded-full pl-4 pr-11 py-2.5 text-xs text-white placeholder:text-white/40"
              />
              <button
                type="submit"
                disabled={!replyMessage.trim() || sendingReply}
                className="absolute right-1.5 p-1.5 bg-white text-black rounded-full hover:scale-105 active:scale-95 disabled:opacity-40 transition-all shadow-sm"
                title="Kirim balasan"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
