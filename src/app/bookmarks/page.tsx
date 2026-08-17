'use client';

import React from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { PostCard } from '@/components/feed/PostCard';
import { useApp } from '@/context/AppContext';
import { Bookmark, Sparkles } from 'lucide-react';

export default function BookmarksPage() {
  const { posts, loading } = useApp();

  const bookmarkedPosts = posts.filter((p) => p.is_bookmarked);

  return (
    <AppShell>
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 w-full bg-black/80 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center justify-between h-14 px-4">
          <div>
            <h1 className="font-headline text-xl font-bold text-primary tracking-tight">Bookmarks</h1>
            {!loading && (
              <p className="text-[11px] font-mono text-on-surface-variant">
                {bookmarkedPosts.length} saved
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {bookmarkedPosts.length > 0 && (
              <span className="text-[11px] font-mono text-on-surface-variant bg-white/5 border border-white/10 rounded-full px-3 py-1">
                {bookmarkedPosts.length} saved
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="p-8 text-center text-on-surface-variant font-mono text-xs">
          Loading bookmarks...
        </div>
      ) : bookmarkedPosts.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center px-8 py-24 text-center gap-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
              <Bookmark className="w-9 h-9 text-white/20" />
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-cyan-400/20 border border-cyan-400/40 flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-cyan-400" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="font-headline font-bold text-white text-xl">Nothing saved yet</h2>
            <p className="text-on-surface-variant text-sm font-body leading-relaxed max-w-xs">
              When you bookmark a chronicle, it will appear here for easy access later.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-on-surface-variant bg-white/5 border border-white/10 rounded-full px-4 py-2">
            <Bookmark className="w-3.5 h-3.5" />
            <span>Tap the bookmark icon on any post</span>
          </div>
        </div>
      ) : (
        /* Bookmarked Posts Feed */
        <div className="flex flex-col divide-y divide-white/10">
          {bookmarkedPosts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </AppShell>
  );
}
