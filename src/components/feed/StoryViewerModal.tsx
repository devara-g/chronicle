'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight, Trash2, Eye, ChevronUp, Users } from 'lucide-react';
import { UserStoriesGroup, StoryItem, StoryViewer } from '@/types';
import { useApp } from '@/context/AppContext';
import { StoriesService } from '@/lib/services/stories.service';
import { formatTimeAgo } from '@/lib/utils';

interface StoryViewerModalProps {
  groups: UserStoriesGroup[];
  initialGroupIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onStoryDeleted: () => void;
}

const STORY_DURATION_MS = 5500;

export function StoryViewerModal({
  groups,
  initialGroupIndex,
  isOpen,
  onClose,
  onStoryDeleted,
}: StoryViewerModalProps) {
  const { user } = useApp();
  const [mounted, setMounted] = useState(false);
  const [currentGroupIdx, setCurrentGroupIdx] = useState(initialGroupIndex);
  const [currentStoryIdx, setCurrentStoryIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [viewers, setViewers] = useState<StoryViewer[]>([]);
  const [isViewersListOpen, setIsViewersListOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const timerRef = useRef<any>(null);
  const startTimeRef = useRef<number>(Date.now());
  const elapsedBeforePauseRef = useRef<number>(0);

  // Sync initial group
  useEffect(() => {
    if (isOpen) {
      setCurrentGroupIdx(initialGroupIndex);
      setCurrentStoryIdx(0);
      setProgress(0);
      elapsedBeforePauseRef.current = 0;
      setIsViewersListOpen(false);
    }
  }, [isOpen, initialGroupIndex]);

  const currentGroup = groups[currentGroupIdx] || null;
  const currentStory: StoryItem | null = currentGroup?.stories[currentStoryIdx] || null;

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

  // Navigate to Next Story or Next Group
  const handleNext = useCallback(() => {
    if (!currentGroup) return;

    setIsViewersListOpen(false);
    if (currentStoryIdx < currentGroup.stories.length - 1) {
      setCurrentStoryIdx((prev) => prev + 1);
      setProgress(0);
      elapsedBeforePauseRef.current = 0;
    } else if (currentGroupIdx < groups.length - 1) {
      setCurrentGroupIdx((prev) => prev + 1);
      setCurrentStoryIdx(0);
      setProgress(0);
      elapsedBeforePauseRef.current = 0;
    } else {
      onClose();
    }
  }, [currentGroup, currentStoryIdx, currentGroupIdx, groups.length, onClose]);

  // Navigate to Previous Story or Previous Group
  const handlePrev = useCallback(() => {
    setIsViewersListOpen(false);
    if (currentStoryIdx > 0) {
      setCurrentStoryIdx((prev) => prev - 1);
      setProgress(0);
      elapsedBeforePauseRef.current = 0;
    } else if (currentGroupIdx > 0) {
      const prevGroup = groups[currentGroupIdx - 1];
      setCurrentGroupIdx((prev) => prev - 1);
      setCurrentStoryIdx(prevGroup.stories.length - 1);
      setProgress(0);
      elapsedBeforePauseRef.current = 0;
    }
  }, [currentStoryIdx, currentGroupIdx, groups]);

  // Auto-advancing Timer Animation (Pauses when long-held or viewers list is open)
  useEffect(() => {
    if (!isOpen || !currentStory || isPaused || isViewersListOpen) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    startTimeRef.current = Date.now() - elapsedBeforePauseRef.current;

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min(100, (elapsed / STORY_DURATION_MS) * 100);
      setProgress(pct);

      if (elapsed >= STORY_DURATION_MS) {
        clearInterval(timerRef.current);
        handleNext();
      }
    }, 40);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, currentStory, isPaused, isViewersListOpen, handleNext]);

  // Pause on Hold
  const handlePointerDown = () => {
    if (isViewersListOpen) return;
    setIsPaused(true);
    elapsedBeforePauseRef.current = (progress / 100) * STORY_DURATION_MS;
  };

  const handlePointerUp = () => {
    if (isViewersListOpen) return;
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

  if (!mounted || !isOpen || !currentGroup || !currentStory) return null;

  const isMyStory = user && currentStory.user_id === user.id;

  const modalContent = (
    <div className="fixed inset-0 z-[99999] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-0 sm:p-4 select-none animate-fadeIn">
      {/* Container Card */}
      <div
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        className="w-full max-w-sm sm:max-w-md h-full sm:h-[85vh] bg-[#0c0c0c] sm:border sm:border-white/15 sm:rounded-3xl overflow-hidden shadow-[0_25px_80px_rgba(0,0,0,0.95)] flex flex-col relative"
      >
        {/* Top Progress Segment Bars */}
        <div className="absolute top-3 inset-x-3 z-30 flex items-center gap-1.5 px-1">
          {currentGroup.stories.map((s, idx) => {
            const barFill =
              idx < currentStoryIdx
                ? 100
                : idx === currentStoryIdx
                ? progress
                : 0;

            return (
              <div
                key={s.id}
                className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden"
              >
                <div
                  style={{ width: `${barFill}%` }}
                  className="h-full bg-white transition-all duration-75"
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
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition"
              title="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

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
                <div className="absolute bottom-6 inset-x-4 z-20">
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

          {/* Interactive Tap Zones: Left (Prev) vs Right (Next) */}
          <div
            onClick={handlePrev}
            className="absolute left-0 top-16 bottom-0 w-1/3 z-20 cursor-pointer"
            title="Cerita sebelumnya"
          />
          <div
            onClick={handleNext}
            className="absolute right-0 top-16 bottom-0 w-2/3 z-20 cursor-pointer"
            title="Cerita berikutnya"
          />
        </div>

        {/* Bottom Views Bar for Owner (Instagram-style) */}
        {isMyStory && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsViewersListOpen(true);
            }}
            className="py-3 px-4 bg-black/75 hover:bg-black/90 border-t border-white/10 flex items-center justify-between transition-colors group cursor-pointer z-30 select-none"
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
