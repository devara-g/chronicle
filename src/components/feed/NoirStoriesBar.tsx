'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Plus } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { UserStoriesGroup } from '@/types';
import { StoriesService } from '@/lib/services/stories.service';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { CreateStoryModal } from '@/components/feed/CreateStoryModal';
import { StoryViewerModal } from '@/components/feed/StoryViewerModal';

export function NoirStoriesBar() {
  const { user, followingIds, followerIds, friendIds } = useApp();
  const [myGroup, setMyGroup] = useState<UserStoriesGroup | null>(null);
  const [friendsGroups, setFriendsGroups] = useState<UserStoriesGroup[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewerState, setViewerState] = useState<{
    isOpen: boolean;
    initialIndex: number;
    allGroups: UserStoriesGroup[];
  }>({
    isOpen: false,
    initialIndex: 0,
    allGroups: [],
  });

  const loadStories = useCallback(async () => {
    if (!user) return;
    try {
      const connectedIds = Array.from(new Set([...followingIds, ...followerIds, ...friendIds]));
      const { myGroup: myG, friendsGroups: friendsG } = await StoriesService.getStories(
        user.id,
        connectedIds
      );
      setMyGroup(myG);
      setFriendsGroups(friendsG);
    } catch (e) {
      console.warn('Load stories error:', e);
    }
  }, [user, followingIds, followerIds, friendIds]);

  useEffect(() => {
    loadStories();

    const handleSync = () => loadStories();
    window.addEventListener('chronicle_story_updated', handleSync);
    window.addEventListener('storage', handleSync);

    // Polling halus setiap 10 detik
    const poll = setInterval(loadStories, 10000);

    let channel: any = null;
    if (isSupabaseConfigured()) {
      channel = supabase
        .channel('global_stories_feed')
        .on('broadcast', { event: 'new_story' }, handleSync)
        .subscribe();
    }

    return () => {
      window.removeEventListener('chronicle_story_updated', handleSync);
      window.removeEventListener('storage', handleSync);
      clearInterval(poll);
      if (channel) supabase.removeChannel(channel);
    };
  }, [loadStories]);

  if (!user) return null;

  // Buka story viewer
  const handleOpenViewer = (group: UserStoriesGroup) => {
    // Susun semua grup yang ada story-nya (Mulai dari myGroup jika ada, lalu friendsGroups)
    const all = myGroup ? [myGroup, ...friendsGroups] : friendsGroups;
    const targetIdx = all.findIndex((g) => g.user_id === group.user_id);

    setViewerState({
      isOpen: true,
      initialIndex: Math.max(0, targetIdx),
      allGroups: all,
    });
  };

  const hasMyStories = myGroup && myGroup.stories.length > 0;

  return (
    <div className="w-full border-b border-white/10 bg-black/40 backdrop-blur-md py-3 px-4 select-none">
      <div className="flex items-center gap-4 overflow-x-auto no-scrollbar py-1">
        {/* ======================================================== */}
        {/* Item 1: Cerita Saya (Your Story) */}
        {/* ======================================================== */}
        <div className="flex flex-col items-center gap-1.5 shrink-0 group cursor-pointer">
          <div className="relative">
            {/* Avatar Circle with Ring if has stories */}
            <div
              onClick={() => {
                if (hasMyStories && myGroup) {
                  handleOpenViewer(myGroup);
                } else {
                  setIsCreateOpen(true);
                }
              }}
              className={`relative w-14 h-14 rounded-full p-[2.5px] transition-transform active:scale-95 ${
                hasMyStories
                  ? 'bg-gradient-to-tr from-emerald-500 via-teal-400 to-sky-400 shadow-[0_0_15px_rgba(52,211,153,0.35)]'
                  : 'bg-white/15'
              }`}
            >
              <div className="relative w-full h-full rounded-full overflow-hidden bg-[#1e293b] border-2 border-black">
                {user.avatar_url ? (
                  <Image src={user.avatar_url} alt={user.full_name} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-emerald-950 text-white font-bold text-base">
                    {user.full_name?.charAt(0) || 'U'}
                  </div>
                )}
              </div>
            </div>

            {/* Plus Button to add more */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsCreateOpen(true);
              }}
              className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black flex items-center justify-center shadow-md border-2 border-black transition active:scale-90"
              title="Tambah Cerita"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
            </button>
          </div>

          <span className="text-[11px] font-mono text-white/70 max-w-[64px] truncate leading-tight">
            Cerita Saya
          </span>
        </div>

        {/* ======================================================== */}
        {/* Items 2+: Stories Teman / Following */}
        {/* ======================================================== */}
        {friendsGroups.map((group) => {
          const author = group.author;
          const isUnseen = group.hasUnseen;

          return (
            <div
              key={group.user_id}
              onClick={() => handleOpenViewer(group)}
              className="flex flex-col items-center gap-1.5 shrink-0 group cursor-pointer"
            >
              <div
                className={`relative w-14 h-14 rounded-full p-[2.5px] transition-transform active:scale-95 ${
                  isUnseen
                    ? 'bg-gradient-to-tr from-emerald-500 via-teal-400 to-sky-400 shadow-[0_0_15px_rgba(52,211,153,0.4)] animate-pulse'
                    : 'bg-white/20'
                }`}
              >
                <div className="relative w-full h-full rounded-full overflow-hidden bg-[#1e293b] border-2 border-black">
                  {author?.avatar_url ? (
                    <Image src={author.avatar_url} alt={author.full_name} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-emerald-950 to-teal-800 text-white font-bold text-base">
                      {author?.full_name?.charAt(0) || 'U'}
                    </div>
                  )}
                </div>
              </div>

              <span className={`text-[11px] font-mono max-w-[64px] truncate leading-tight ${isUnseen ? 'text-white font-semibold' : 'text-white/60'}`}>
                {author?.full_name?.split(' ')[0] || 'Teman'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Modal: Create Story */}
      <CreateStoryModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onStoryCreated={loadStories}
      />

      {/* Modal: Story Viewer */}
      <StoryViewerModal
        isOpen={viewerState.isOpen}
        groups={viewerState.allGroups}
        initialGroupIndex={viewerState.initialIndex}
        onClose={() => setViewerState((prev) => ({ ...prev, isOpen: false }))}
        onStoryDeleted={loadStories}
      />
    </div>
  );
}

