'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Eye,
  ChevronUp,
  Users,
  Volume2,
  VolumeX,
  Send,
  Loader2,
  AtSign,
} from 'lucide-react';
import { UserStoriesGroup, StoryItem, StoryViewer } from '@/types';
import { useApp } from '@/context/AppContext';
import { StoriesService } from '@/lib/services/stories.service';
import { MessagesService } from '@/lib/services/messages.service';
import { formatTimeAgo } from '@/lib/utils';

interface StoryViewerModalProps {
  groups: UserStoriesGroup[];
  initialGroupIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onStoryDeleted: () => void;
}

const DEFAULT_STORY_DURATION_MS = 6000;

export function StoryViewerModal({
  groups,
  initialGroupIndex,
  isOpen,
  onClose,
  onStoryDeleted,
}: StoryViewerModalProps) {
  const { user } = useApp();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [currentGroupIdx, setCurrentGroupIdx] = useState(initialGroupIndex);
  const [currentStoryIdx, setCurrentStoryIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [viewers, setViewers] = useState<StoryViewer[]>([]);
  const [isViewersListOpen, setIsViewersListOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Reply & Reaction State
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [reactionBurst, setReactionBurst] = useState<{ emoji: string; key: number } | null>(null);

  // Smooth Progress Bar Animation Refs
  const activeBarRef = useRef<HTMLDivElement | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const elapsedMsRef = useRef<number>(0);
  const startTimestampRef = useRef<number>(0);

  // Audio Playback Ref
  const storyAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => {
      if (storyAudioRef.current) {
        storyAudioRef.current.pause();
        storyAudioRef.current = null;
      }
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  // Sync initial group
  useEffect(() => {
    if (isOpen) {
      setCurrentGroupIdx(initialGroupIndex);
      setCurrentStoryIdx(0);
      elapsedMsRef.current = 0;
      startTimestampRef.current = 0;
      setIsViewersListOpen(false);
      setIsReplying(false);
      setReplyText('');
    }
  }, [isOpen, initialGroupIndex]);

  const currentGroup = groups[currentGroupIdx] || null;
  const currentStory: StoryItem | null = currentGroup?.stories[currentStoryIdx] || null;

  // Calculate dynamic story duration (e.g. 15s or 30s if song has duration, else default 6s)
  const currentStoryDurationMs = currentStory?.song_data?.duration
    ? currentStory.song_data.duration * 1000
    : DEFAULT_STORY_DURATION_MS;

  // Stop / cleanup audio
  const stopAudio = useCallback(() => {
    if (storyAudioRef.current) {
      storyAudioRef.current.pause();
      storyAudioRef.current = null;
    }
  }, []);

  const handleCloseModal = useCallback(() => {
    stopAudio();
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    onClose();
  }, [stopAudio, onClose]);

  // Navigate to Next Story or Next Group
  const handleNext = useCallback(() => {
    if (!currentGroup) return;

    setIsViewersListOpen(false);
    setIsReplying(false);
    setReplyText('');
    elapsedMsRef.current = 0;
    startTimestampRef.current = 0;

    if (currentStoryIdx < currentGroup.stories.length - 1) {
      setCurrentStoryIdx((prev) => prev + 1);
    } else if (currentGroupIdx < groups.length - 1) {
      setCurrentGroupIdx((prev) => prev + 1);
      setCurrentStoryIdx(0);
    } else {
      handleCloseModal();
    }
  }, [currentGroup, currentStoryIdx, currentGroupIdx, groups.length, handleCloseModal]);

  // Navigate to Previous Story or Previous Group
  const handlePrev = useCallback(() => {
    setIsViewersListOpen(false);
    setIsReplying(false);
    setReplyText('');
    elapsedMsRef.current = 0;
    startTimestampRef.current = 0;

    if (currentStoryIdx > 0) {
      setCurrentStoryIdx((prev) => prev - 1);
    } else if (currentGroupIdx > 0) {
      const prevGroup = groups[currentGroupIdx - 1];
      setCurrentGroupIdx((prev) => prev - 1);
      setCurrentStoryIdx(prevGroup.stories.length - 1);
    }
  }, [currentStoryIdx, currentGroupIdx, groups]);

  // BUTTERY-SMOOTH PROGRESS BAR ENGINE (via requestAnimationFrame & direct DOM updates)
  useEffect(() => {
    if (!isOpen || !currentStory || isPaused || isViewersListOpen || isReplying) {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      return;
    }

    let localRafId: number;

    const tick = (now: number) => {
      if (!startTimestampRef.current) {
        startTimestampRef.current = now - elapsedMsRef.current;
      }

      const elapsed = now - startTimestampRef.current;
      elapsedMsRef.current = elapsed;
      const pct = Math.min(100, (elapsed / currentStoryDurationMs) * 100);

      // Direct DOM update: Zero React state re-renders = pure 60-120fps smoothness!
      if (activeBarRef.current) {
        activeBarRef.current.style.width = `${pct}%`;
      }

      if (elapsed >= currentStoryDurationMs) {
        elapsedMsRef.current = 0;
        startTimestampRef.current = 0;
        handleNext();
      } else {
        localRafId = requestAnimationFrame(tick);
        rafIdRef.current = localRafId;
      }
    };

    startTimestampRef.current = 0;
    localRafId = requestAnimationFrame(tick);
    rafIdRef.current = localRafId;

    return () => {
      if (localRafId) cancelAnimationFrame(localRafId);
    };
  }, [isOpen, currentStory?.id, isPaused, isViewersListOpen, isReplying, currentStoryDurationMs, handleNext]);

  // Audio Playback for Official Music with custom startTime & duration
  useEffect(() => {
    if (!isOpen || !currentStory?.song_data?.previewUrl) {
      stopAudio();
      return;
    }

    stopAudio();

    const initialStartTime = currentStory.song_data.startTime || 0;
    const clipDuration = currentStory.song_data.duration || 15;
    const clipEndTime = initialStartTime + clipDuration;

    const audio = new Audio(currentStory.song_data.previewUrl);
    audio.volume = isMuted ? 0 : 0.85;
    storyAudioRef.current = audio;

    const setInitialTime = () => {
      try {
        if (initialStartTime > 0) {
          audio.currentTime = initialStartTime;
        }
      } catch (e) {
        console.warn('Set initial currentTime error:', e);
      }
    };

    if (audio.readyState >= 1) {
      setInitialTime();
    } else {
      audio.addEventListener('loadedmetadata', setInitialTime, { once: true });
    }

    // Loop inside chosen segment if audio is longer
    audio.ontimeupdate = () => {
      if (clipEndTime && audio.currentTime >= clipEndTime) {
        audio.currentTime = initialStartTime;
      }
    };

    if (!isPaused && !isViewersListOpen && !isReplying) {
      audio.play().catch((err) => {
        console.warn('Story audio autoplay blocked:', err);
      });
    }

    return () => {
      audio.pause();
    };
  }, [isOpen, currentStory?.id, currentStory?.song_data?.previewUrl, stopAudio]);

  // Sync audio with pause/resume
  useEffect(() => {
    if (!storyAudioRef.current) return;
    if (isPaused || isViewersListOpen || isReplying) {
      storyAudioRef.current.pause();
    } else {
      storyAudioRef.current.play().catch(() => {});
    }
  }, [isPaused, isViewersListOpen, isReplying]);

  // Sync audio with mute toggle
  useEffect(() => {
    if (storyAudioRef.current) {
      storyAudioRef.current.volume = isMuted ? 0 : 0.85;
    }
  }, [isMuted]);

  // Mark story as seen & record view if viewer is someone else
  useEffect(() => {
    if (currentStory && user) {
      StoriesService.markStorySeen(currentStory.id);
      if (currentStory.user_id !== user.id) {
        StoriesService.recordStoryView(currentStory.id, user);
      } else {
        StoriesService.getStoryViewers(currentStory.id).then(setViewers);
      }
    } else {
      setViewers([]);
      setIsViewersListOpen(false);
    }
  }, [currentStory, user]);

  // Listen to live viewers update
  useEffect(() => {
    const handleUpdate = () => {
      if (currentStory && user && currentStory.user_id === user.id) {
        StoriesService.getStoryViewers(currentStory.id).then(setViewers);
      }
    };
    window.addEventListener('chronicle_story_viewers_updated', handleUpdate);
    return () => window.removeEventListener('chronicle_story_viewers_updated', handleUpdate);
  }, [currentStory, user]);

  // Pause on Hold
  const handlePointerDown = () => {
    if (isViewersListOpen || isReplying) return;
    setIsPaused(true);
  };

  const handlePointerUp = () => {
    if (isViewersListOpen || isReplying) return;
    setIsPaused(false);
  };

  const handleDeleteCurrentStory = async () => {
    if (!currentStory || !user || currentStory.user_id !== user.id) return;
    if (confirm('Hapus story ini?')) {
      await StoriesService.deleteStory(currentStory.id);
      onStoryDeleted();
      handleNext();
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Send Reply to Story Author via Direct Messages
  const handleSendReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!replyText.trim() || !user || !currentStory || sendingReply) return;

    setSendingReply(true);
    try {
      const authorId = currentStory.author?.id || currentStory.user_id;
      const convId = await MessagesService.getOrCreateConversation(user.id, authorId);
      if (convId) {
        const preview =
          currentStory.caption ||
          currentStory.text_content ||
          (currentStory.song_data ? `Lagu ${currentStory.song_data.title}` : 'Foto Story');
        const textPayload = `Membalas Cerita Noir:\n"${preview.slice(0, 80)}"\n\n${replyText.trim()}`;
        await MessagesService.sendMessage(convId, user.id, textPayload);
        setReplyText('');
        setIsReplying(false);
        showToast('Balasan terkirim ke DM!');
      }
    } catch (err) {
      console.warn('Gagal membalas story:', err);
      showToast('Gagal mengirim balasan.');
    } finally {
      setSendingReply(false);
    }
  };

  // Send Quick Emoji Reaction to Author's DM
  const handleSendReaction = async (emoji: string) => {
    if (!user || !currentStory || sendingReply) return;
    setReactionBurst({ emoji, key: Date.now() });
    setTimeout(() => setReactionBurst(null), 1800);

    try {
      const authorId = currentStory.author?.id || currentStory.user_id;
      const convId = await MessagesService.getOrCreateConversation(user.id, authorId);
      if (convId) {
        const preview =
          currentStory.caption ||
          currentStory.text_content ||
          (currentStory.song_data ? `Lagu ${currentStory.song_data.title}` : 'Foto Story');
        const textPayload = `Bereaksi ${emoji} pada Cerita Noir:\n"${preview.slice(0, 80)}"`;
        await MessagesService.sendMessage(convId, user.id, textPayload);
        showToast(`Reaksi ${emoji} terkirim!`);
      }
    } catch (err) {
      console.warn('Gagal kirim reaksi:', err);
    }
  };

  if (!mounted || !isOpen || !currentGroup || !currentStory) return null;

  const isMyStory = user && currentStory.user_id === user.id;

  const modalContent = (
    <div className="fixed inset-0 z-[99999] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-0 sm:p-4 select-none animate-fadeIn">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-4 z-[999999] px-4 py-2 rounded-full bg-emerald-500 text-black font-semibold text-xs shadow-2xl animate-bounce">
          {toastMessage}
        </div>
      )}

      {/* Emoji Reaction Burst Animation */}
      {reactionBurst && (
        <div
          key={reactionBurst.key}
          className="absolute inset-0 z-[99999] flex items-center justify-center pointer-events-none animate-ping"
        >
          <span className="text-8xl select-none drop-shadow-2xl">
            {reactionBurst.emoji}
          </span>
        </div>
      )}

      {/* Container Card */}
      <div
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        className="w-full max-w-sm sm:max-w-md h-full sm:h-[88vh] bg-[#0c0c0c] sm:border sm:border-white/15 sm:rounded-3xl overflow-hidden shadow-[0_25px_80px_rgba(0,0,0,0.95)] flex flex-col relative"
      >
        {/* Top Progress Segment Bars (60-120fps butter-smooth) */}
        <div className="absolute top-3 inset-x-3 z-30 flex items-center gap-1.5 px-1">
          {currentGroup.stories.map((s, idx) => {
            const isPast = idx < currentStoryIdx;
            const isCurrent = idx === currentStoryIdx;

            return (
              <div
                key={s.id}
                className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden"
              >
                <div
                  ref={isCurrent ? activeBarRef : null}
                  style={{
                    width: isPast ? '100%' : '0%',
                  }}
                  className="h-full bg-white will-change-[width]"
                />
              </div>
            );
          })}
        </div>

        {/* Top Author Bar */}
        <div className="absolute top-7 inset-x-3 z-30 flex items-center justify-between px-2 pt-1 text-white">
          <div className="flex items-center gap-2.5">
            <div className="relative w-9 h-9 rounded-full overflow-hidden border border-white/30 bg-[#1e293b]">
              {currentGroup.author?.avatar_url ? (
                <Image
                  src={currentGroup.author.avatar_url}
                  alt={currentGroup.author.full_name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-emerald-950 to-teal-800 text-white font-bold text-sm">
                  {currentGroup.author?.full_name?.charAt(0) || 'U'}
                </div>
              )}
            </div>

            <div className="leading-tight">
              <h4 className="font-semibold text-sm text-white drop-shadow">
                {currentGroup.author?.full_name}
              </h4>
              <p className="text-[11px] font-mono text-white/70 drop-shadow">
                {formatTimeAgo(currentStory.created_at)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Music Mute Toggle (if story has song) */}
            {currentStory.song_data && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMuted((prev) => !prev);
                }}
                className="p-2 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition"
                title={isMuted ? 'Nyalakan Suara Musik' : 'Bisukan Suara Musik'}
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4 text-red-400" />
                ) : (
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                )}
              </button>
            )}

            {isMyStory && (
              <button
                type="button"
                onClick={handleDeleteCurrentStory}
                className="p-2 rounded-full hover:bg-white/10 text-white/80 hover:text-red-400 transition"
                title="Hapus Story"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={handleCloseModal}
              className="p-2 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition"
              title="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Instagram-Style Music Pill Sticker on Story */}
        {currentStory.song_data && (
          <div className="absolute top-18 inset-x-4 z-30 flex justify-center pointer-events-none animate-fadeIn">
            <div
              onClick={(e) => {
                e.stopPropagation();
                setIsMuted((prev) => !prev);
              }}
              className="pointer-events-auto flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-black/65 backdrop-blur-md border border-white/20 text-white shadow-xl max-w-[90%] cursor-pointer hover:bg-black/80 transition active:scale-95"
              title="Ketuk untuk bisukan / bunyikan musik"
            >
              {/* Equalizer animation */}
              <div className="flex items-end gap-[2px] h-3 shrink-0 text-emerald-400">
                <span
                  className={`w-[2px] bg-emerald-400 rounded-full transition-all ${
                    !isPaused && !isViewersListOpen && !isReplying && !isMuted ? 'animate-pulse h-3' : 'h-1.5'
                  }`}
                />
                <span
                  className={`w-[2px] bg-emerald-400 rounded-full transition-all ${
                    !isPaused && !isViewersListOpen && !isReplying && !isMuted ? 'animate-bounce h-2.5' : 'h-3'
                  }`}
                />
                <span
                  className={`w-[2px] bg-emerald-400 rounded-full transition-all ${
                    !isPaused && !isViewersListOpen && !isReplying && !isMuted ? 'animate-pulse h-2' : 'h-1'
                  }`}
                />
              </div>

              <div className="truncate text-left min-w-0 flex-1">
                <p className="text-[11px] font-semibold text-white truncate leading-tight">
                  {currentStory.song_data.title}
                </p>
                <p className="text-[9px] font-mono text-white/60 truncate leading-tight">
                  {currentStory.song_data.artist} • {currentStory.song_data.duration || 15}s
                </p>
              </div>

              {isMuted ? (
                <VolumeX className="w-3.5 h-3.5 text-red-400 ml-1 shrink-0" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-emerald-400 ml-1 shrink-0" />
              )}
            </div>
          </div>
        )}

        {/* Story Content Canvas */}
        <div className="flex-1 relative flex items-center justify-center overflow-hidden">
          {currentStory.media_type === 'image' && currentStory.media_url ? (
            <div className="relative w-full h-full">
              <Image
                src={currentStory.media_url}
                alt="Story content"
                fill
                className="object-contain"
                priority
              />

              {/* Caption overlay */}
              {currentStory.caption && (
                <div className="absolute bottom-20 inset-x-4 z-20">
                  <div className="p-3.5 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 text-center text-sm font-medium text-white shadow-lg">
                    {currentStory.caption}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Text Story Canvas */
            <div
              className={`w-full h-full bg-gradient-to-br ${
                currentStory.bg_gradient || 'from-[#050505] via-[#111111] to-[#1c1c1c]'
              } p-8 flex items-center justify-center text-center`}
            >
              <p className="font-headline font-bold text-2xl sm:text-3xl text-white leading-relaxed tracking-tight select-text max-w-xs drop-shadow-md">
                {currentStory.text_content}
              </p>
            </div>
          )}

          {/* Tagged Friends Pills on Story (Clickable to profile) */}
          {currentStory.tagged_users && currentStory.tagged_users.length > 0 && (
            <div className="absolute bottom-16 inset-x-4 z-20 flex flex-wrap gap-1.5 justify-center pointer-events-none">
              {currentStory.tagged_users.map((u) => {
                const isMe = user?.id === u.id;
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCloseModal();
                      router.push(`/profile/${u.username}`);
                    }}
                    className={`pointer-events-auto px-2.5 py-1 rounded-full text-xs font-mono flex items-center gap-1.5 backdrop-blur-md transition active:scale-95 shadow-lg ${
                      isMe
                        ? 'bg-emerald-500/25 border border-emerald-400 text-emerald-300 font-bold'
                        : 'bg-black/65 border border-white/20 text-white/90 hover:text-white hover:bg-black/85'
                    }`}
                    title={`Lihat profil @${u.username}`}
                  >
                    <AtSign className="w-3 h-3 text-emerald-400" />
                    <span>{u.username}</span>
                    {isMe && <span className="text-[10px] text-emerald-400"> (Kamu)</span>}
                  </button>
                );
              })}
            </div>
          )}

          {/* Interactive Tap Zones: Left (Prev) vs Right (Next) */}
          <div
            onClick={handlePrev}
            className="absolute left-0 top-16 bottom-24 w-1/3 z-20 cursor-pointer"
            title="Cerita sebelumnya"
          />
          <div
            onClick={handleNext}
            className="absolute right-0 top-16 bottom-24 w-2/3 z-20 cursor-pointer"
            title="Cerita berikutnya"
          />
        </div>

        {/* ======================================================== */}
        {/* BOTTOM SECTION: REPLY BAR (FOR VIEWERS) / SEEN BAR (FOR OWNER) */}
        {/* ======================================================== */}
        {isMyStory ? (
          /* Seen By Bar for Owner */
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsViewersListOpen(true);
            }}
            className="py-3 px-4 bg-black/80 hover:bg-black/90 border-t border-white/10 flex items-center justify-between transition-colors group cursor-pointer z-30 select-none"
          >
            <div className="flex items-center gap-2 text-xs font-mono text-white/90 group-hover:text-white">
              <Eye className="w-4 h-4 text-emerald-400" />
              <span>
                {viewers.length > 0
                  ? `Dilihat oleh ${viewers.length} orang`
                  : 'Belum ada yang melihat'}
              </span>
            </div>

            <div className="flex items-center gap-1 text-[11px] font-mono text-white/50 group-hover:text-emerald-400 transition-colors">
              <span>Lihat penonton</span>
              <ChevronUp className="w-3.5 h-3.5" />
            </div>
          </button>
        ) : (
          /* Reply & Quick Emoji Reaction Bar (Instagram-style for Friends) */
          <div className="p-3 sm:p-3.5 bg-black/85 border-t border-white/10 z-30 flex flex-col gap-2">
            {/* Quick Emoji Reactions */}
            <div className="flex items-center justify-around px-1">
              {['❤️', '🔥', '😂', '😮', '👏', '😢'].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSendReaction(emoji);
                  }}
                  disabled={sendingReply}
                  className="text-lg sm:text-xl hover:scale-125 active:scale-90 transition-transform p-1 rounded-full hover:bg-white/10"
                  title={`Kirim reaksi ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Direct Message Reply Input */}
            <form onSubmit={handleSendReply} className="flex items-center gap-2">
              <div className="flex-1 flex items-center bg-white/10 backdrop-blur-md border border-white/15 rounded-full px-3.5 py-1.5 text-xs text-white focus-within:border-emerald-400/70 focus-within:bg-black/50 transition">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onFocus={() => setIsReplying(true)}
                  onBlur={() => {
                    if (!replyText.trim()) setIsReplying(false);
                  }}
                  placeholder={`Kirim pesan ke ${currentGroup.author?.full_name?.split(' ')[0] || 'pengguna'}...`}
                  className="w-full bg-transparent border-none text-xs text-white placeholder:text-white/40 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={!replyText.trim() || sendingReply}
                className="p-2 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black transition active:scale-90 disabled:opacity-30 disabled:pointer-events-none shadow-md shrink-0"
                title="Kirim pesan"
              >
                {sendingReply ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 fill-current ml-0.5" />
                )}
              </button>
            </form>
          </div>
        )}

        {/* Sliding Viewers Drawer (Instagram-style) */}
        {isViewersListOpen && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-x-0 bottom-0 top-1/4 bg-[#0a0a0a]/95 backdrop-blur-2xl border-t border-white/20 rounded-t-3xl z-40 flex flex-col p-4 shadow-[0_-20px_50px_rgba(0,0,0,0.95)] animate-slideUp select-none"
          >
            {/* Drawer Header */}
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-3 shrink-0" />
            <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-emerald-400" />
                <h4 className="font-semibold text-sm text-white font-headline">
                  Dilihat Oleh ({viewers.length})
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsViewersListOpen(false)}
                className="p-1 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Viewers List */}
            <div className="flex-1 overflow-y-auto py-2 divide-y divide-white/5">
              {viewers.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-white/40 space-y-2">
                  <Users className="w-8 h-8 opacity-40 text-emerald-400" />
                  <p className="text-xs font-mono font-medium text-white/70">Belum ada penonton</p>
                  <p className="text-[11px] text-white/40 font-mono">
                    Pengikut & teman yang melihat ceritamu akan langsung muncul di sini.
                  </p>
                </div>
              ) : (
                viewers.map((v) => (
                  <div key={v.id || v.viewer_id} className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="relative w-9 h-9 rounded-full overflow-hidden border border-white/20 bg-[#1e293b] shrink-0">
                        {v.viewer.avatar_url ? (
                          <Image
                            src={v.viewer.avatar_url}
                            alt={v.viewer.full_name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-emerald-950 to-teal-800 text-white font-bold text-xs">
                            {v.viewer.full_name?.charAt(0) || 'U'}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white leading-tight truncate">
                          {v.viewer.full_name}
                        </p>
                        <p className="text-[11px] font-mono text-white/40 truncate">
                          @{v.viewer.username}
                        </p>
                      </div>
                    </div>

                    <span className="text-[10px] font-mono text-white/40 shrink-0">
                      {formatTimeAgo(v.viewed_at)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Outside Quick Navigation Arrows (Desktop) */}
      <button
        onClick={handlePrev}
        className="hidden md:flex absolute left-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white items-center justify-center transition active:scale-90"
        title="Prev"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      <button
        onClick={handleNext}
        className="hidden md:flex absolute right-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white items-center justify-center transition active:scale-90"
        title="Next"
      >
        <ChevronRight className="w-6 h-6" />
      </button>
    </div>
  );

  return createPortal(modalContent, document.body);
}
