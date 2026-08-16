'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useApp } from '@/context/AppContext';
import { PostCard } from '@/components/feed/PostCard';
import { EditProfileModal } from '@/components/modals/EditProfileModal';
import Image from 'next/image';
import { formatNumber } from '@/lib/utils';
import { Calendar, Link as LinkIcon, Sparkles } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';

export default function ProfilePage() {
  const { user, posts, followingIds } = useApp();
  const [activeTab, setActiveTab] = useState<'posts' | 'replies' | 'media' | 'likes'>('posts');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [followCounts, setFollowCounts] = useState({ following: 0, followers: 0 });

  useEffect(() => {
    if (!user || !isSupabaseConfigured()) return;
    async function fetchCounts() {
      const [followingRes, followersRes] = await Promise.all([
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', user!.id),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', user!.id),
      ]);
      setFollowCounts({
        following: followingRes.count ?? 0,
        followers: followersRes.count ?? 0,
      });
    }
    fetchCounts();
  }, [user, followingIds]); // re-run when followingIds changes (after follow/unfollow)

  if (!user) {
    return (
      <AppShell>
        <div className="p-12 text-center text-xs font-mono text-on-surface-variant">
          Please sign in to view your profile.
        </div>
      </AppShell>
    );
  }

  // Filter posts based on active tab
  const userPosts = posts.filter(p => p.user_id === user.id);
  const likedPosts = posts.filter(p => p.is_liked);
  const mediaPosts = userPosts.filter(p => !!p.media_url);

  let displayedPosts = userPosts;
  if (activeTab === 'likes') displayedPosts = likedPosts;
  if (activeTab === 'media') displayedPosts = mediaPosts;

  return (
    <AppShell>
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 w-full bg-black/80 backdrop-blur-xl border-b border-white/10 flex items-center justify-between h-14 px-4">
        <div>
          <h1 className="font-headline text-lg font-bold text-primary tracking-tight leading-tight">{user.full_name}</h1>
          <p className="text-xs text-on-surface-variant font-mono">{userPosts.length} posts</p>
        </div>
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant">
          <Sparkles className="w-4 h-4" />
        </div>
      </div>

      {/* Banner */}
      <div className="relative w-full h-44 md:h-52 bg-white/5 overflow-hidden">
        {user.banner_url ? (
          <Image src={user.banner_url} alt="Profile Banner" fill className="object-cover" priority />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-neutral-900 to-black" />
        )}
      </div>

      {/* Profile Header Details */}
      <div className="px-4 pb-4">
        {/* Avatar & Edit Button */}
        <div className="flex justify-between items-end -mt-12 md:-mt-14 mb-4 relative z-10">
          <div className="relative w-24 h-24 md:w-28 md:h-28 rounded-full border-4 border-black overflow-hidden bg-black shadow-xl">
            <Image
              src={user.avatar_url || '/default-avatar.jpg'}
              alt={user.full_name}
              fill
              className="object-cover transition-all"
              priority
            />
          </div>

          <button
            onClick={() => setIsEditModalOpen(true)}
            className="px-5 py-1.5 rounded-full border border-white/20 text-white font-headline font-semibold text-sm hover:bg-white/10 active:scale-95 transition-all"
          >
            Edit Profile
          </button>
        </div>

        {/* Info */}
        <div className="space-y-3">
          <div>
            <h2 className="font-headline font-bold text-xl md:text-2xl text-white tracking-tight">{user.full_name}</h2>
            <p className="text-on-surface-variant text-sm font-mono">@{user.username}</p>
          </div>

          {user.bio && (
            <p className="text-white text-sm md:text-base leading-relaxed font-body whitespace-pre-wrap">
              {user.bio}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-on-surface-variant font-mono pt-1">
            {user.website && (
              <a
                href={user.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-white hover:underline"
              >
                <LinkIcon className="w-3.5 h-3.5 text-on-surface-variant" />
                <span>{user.website.replace(/^https?:\/\//, '')}</span>
              </a>
            )}
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>Joined</span>
            </div>
          </div>

          {/* Following / Followers Stats */}
          <div className="flex items-center gap-5 pt-1 text-sm font-body">
            <div className="flex items-center gap-1">
              <strong className="text-white font-semibold font-mono">{formatNumber(followCounts.following)}</strong>
              <span className="text-on-surface-variant text-xs">Following</span>
            </div>
            <div className="flex items-center gap-1">
              <strong className="text-white font-semibold font-mono">{formatNumber(followCounts.followers)}</strong>
              <span className="text-on-surface-variant text-xs">Followers</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 w-full mt-2 sticky top-14 bg-black/80 backdrop-blur-md z-20">
        {(['posts', 'replies', 'media', 'likes'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-center text-xs md:text-sm font-semibold capitalize transition-all relative ${
              activeTab === tab ? 'text-white' : 'text-on-surface-variant hover:text-white hover:bg-white/5'
            }`}
          >
            <span>{tab}</span>
            {activeTab === tab && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-white rounded-full"></span>
            )}
          </button>
        ))}
      </div>

      {/* Feed Stream */}
      <div className="flex flex-col divide-y divide-white/10">
        {activeTab === 'replies' ? (
          <div className="p-12 text-center text-on-surface-variant text-xs font-mono">
            No public thread replies to display.
          </div>
        ) : displayedPosts.length === 0 ? (
          <div className="p-12 text-center text-on-surface-variant space-y-1 font-mono text-xs">
            <p className="text-white font-semibold">No {activeTab} yet</p>
            <p>Posts will appear here once created or interacted with.</p>
          </div>
        ) : (
          displayedPosts.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </div>

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
      />
    </AppShell>
  );
}
