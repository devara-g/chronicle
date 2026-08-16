'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { useApp } from '@/context/AppContext';
import { PostCard } from '@/components/feed/PostCard';

import { Search, X, TrendingUp } from 'lucide-react';

function ExploreContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const { posts, searchQuery, setSearchQuery } = useApp();
  const [searchTerm, setSearchTerm] = useState(initialQuery || searchQuery);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [trendingTopics, setTrendingTopics] = useState<any[]>([]);
  const [loadingTrends, setLoadingTrends] = useState(true);

  useEffect(() => {
    async function fetchTrends() {
      try {
        const { supabase } = await import('@/lib/supabase/client');
        const { data: posts } = await supabase.from('posts').select('content').order('created_at', { ascending: false }).limit(100);
        if (posts) {
          const tags: Record<string, number> = {};
          posts.forEach((p: any) => {
            const words: string[] = p.content.split(/\s+/);
            words.forEach((w: string) => {
              if (w.startsWith('#') && w.length > 1) {
                tags[w] = (tags[w] || 0) + 1;
              }
            });
          });
          const sorted = Object.entries(tags).sort((a,b) => b[1] - a[1]).slice(0,6);
          setTrendingTopics(sorted.map(t => ({
            id: t[0],
            tag: t[0],
            category: 'Trending',
            posts_count: t[1] + ' posts'
          })));
        }
      } catch (e) {
        console.warn(e);
      } finally {
        setLoadingTrends(false);
      }
    }
    fetchTrends();
  }, []);

  useEffect(() => {
    if (initialQuery) {
      setSearchTerm(initialQuery);
      setSearchQuery(initialQuery);
    }
  }, [initialQuery, setSearchQuery]);

  const categories = ['All', 'Design', 'Technology', 'Development', 'Architecture', 'Audio'];

  // Filter posts based on searchTerm & category
  const filteredPosts = posts.filter((post) => {
    const matchesSearch = !searchTerm.trim() || 
      post.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.author.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.author.full_name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = activeCategory === 'All' || 
      post.content.toLowerCase().includes(activeCategory.toLowerCase());

    return matchesSearch && matchesCategory;
  });

  return (
    <>
      {/* Sticky Search Header */}
      <div className="sticky top-0 z-30 w-full bg-black/80 backdrop-blur-xl border-b border-white/10 p-3 space-y-3">
        <div className="relative flex items-center">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-on-surface-variant">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setSearchQuery(e.target.value);
            }}
            placeholder="Search keywords, @handles, #tags..."
            className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-10 text-white text-sm placeholder:text-outline focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all font-body"
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSearchQuery('');
              }}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-on-surface-variant hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar text-xs font-mono">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full transition-all whitespace-nowrap ${
                activeCategory === cat
                  ? 'bg-white text-black font-semibold'
                  : 'bg-white/5 border border-white/10 text-on-surface-variant hover:text-white hover:bg-white/10'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* If no search term, show Trending Topics Section */}
      {!searchTerm && (
        <div className="p-4 border-b border-white/10 space-y-3 bg-white/[0.01]">
          <div className="flex items-center gap-2 text-primary font-headline font-bold text-base">
            <TrendingUp className="w-4 h-4" />
            <span>Popular in Noir</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {loadingTrends ? (
              <p className="text-xs font-mono text-on-surface-variant p-2">Loading trends...</p>
            ) : trendingTopics.length === 0 ? (
              <p className="text-xs font-mono text-on-surface-variant p-2">No trending topics found.</p>
            ) : trendingTopics.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setSearchTerm(item.tag);
                  setSearchQuery(item.tag);
                }}
                className="p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-left transition-all group"
              >
                <span className="text-[11px] font-mono text-on-surface-variant">{item.category}</span>
                <p className="text-sm font-bold text-white group-hover:underline mt-0.5">{item.tag}</p>
                <span className="text-[11px] font-mono text-on-surface-variant">{item.posts_count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results Header */}
      {searchTerm && (
        <div className="px-4 py-3 bg-white/[0.02] border-b border-white/10 flex justify-between items-center text-xs font-mono text-on-surface-variant">
          <span>Results for "{searchTerm}"</span>
          <span>{filteredPosts.length} posts</span>
        </div>
      )}

      {/* Post List */}
      <div className="flex flex-col divide-y divide-white/10">
        {filteredPosts.length === 0 ? (
          <div className="p-12 text-center text-on-surface-variant text-xs font-mono">
            No chronicles match your search query. Try another term or tag.
          </div>
        ) : (
          filteredPosts.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </div>
    </>
  );
}

export default function ExplorePage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="p-8 text-center text-xs font-mono text-on-surface-variant">Loading exploration...</div>}>
        <ExploreContent />
      </Suspense>
    </AppShell>
  );
}
