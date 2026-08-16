'use client';

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { ComposePost } from '@/components/feed/ComposePost';
import { PostCard } from '@/components/feed/PostCard';
import { useApp } from '@/context/AppContext';
import { Sparkles } from 'lucide-react';

export default function HomePage() {
  const { user, posts, followingIds, loading } = useApp();
  const [tab, setTab] = useState<'for_you' | 'following'>('for_you');

  const displayedPosts = tab === 'for_you' 
    ? posts 
    : posts.filter(p => followingIds.includes(p.user_id) || p.user_id === user?.id);

  return (
    <AppShell>
      {/* Sticky Header / Feed Tabs */}
      <div className="sticky top-0 z-30 w-full bg-black/80 backdrop-blur-xl border-b border-white/10">
        <div className="flex justify-between items-center h-14 px-4">
          <h1 className="font-headline text-xl font-bold text-primary tracking-tight">Home</h1>
          <button 
            className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-on-surface-variant hover:text-white transition-colors"
            title="Custom feed options"
          >
            <Sparkles className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-t border-white/[0.06]">
          <button
            onClick={() => setTab('for_you')}
            className={`flex-1 py-3 text-center text-sm font-semibold transition-all relative ${
              tab === 'for_you' ? 'text-white' : 'text-on-surface-variant hover:text-white hover:bg-white/5'
            }`}
          >
            <span>For you</span>
            {tab === 'for_you' && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-white rounded-full"></span>
            )}
          </button>

          <button
            onClick={() => setTab('following')}
            className={`flex-1 py-3 text-center text-sm font-semibold transition-all relative ${
              tab === 'following' ? 'text-white' : 'text-on-surface-variant hover:text-white hover:bg-white/5'
            }`}
          >
            <span>Following</span>
            {tab === 'following' && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-white rounded-full"></span>
            )}
          </button>
        </div>
      </div>

      {/* Compose Area */}
      <ComposePost />

      {/* Feed Stream */}
      <div className="flex flex-col divide-y divide-white/10">
        {loading ? (
          <div className="p-8 text-center text-on-surface-variant font-mono text-xs">
            Loading noir feed...
          </div>
        ) : displayedPosts.length === 0 ? (
          <div className="p-12 text-center text-on-surface-variant space-y-2">
            <p className="font-headline font-bold text-white text-base">No posts in this feed yet</p>
            <p className="text-xs font-mono">Follow more accounts or write your first chronicle above.</p>
          </div>
        ) : (
          displayedPosts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))
        )}
      </div>
    </AppShell>
  );
}
