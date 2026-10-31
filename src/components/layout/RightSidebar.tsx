'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Search, Sparkles } from 'lucide-react';
import { useApp } from '@/context/AppContext';


export function RightSidebar() {
  const router = useRouter();
  const { searchQuery, setSearchQuery, followingIds, toggleFollow, user } = useApp();
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [trendingTopics, setTrendingTopics] = useState<any[]>([]);
  const [recommendedUsers, setRecommendedUsers] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    async function fetchSidebarData() {
      try {
        const { supabase } = await import('@/lib/supabase/client');
        
        // Fetch Recommended Users
        let usersQuery = supabase.from('profiles').select('*').limit(5);
        if (user) {
          usersQuery = usersQuery.neq('id', user.id);
        }
        const { data: users } = await usersQuery;
        if (users) {
          const filtered = users.filter(u => !followingIds.includes(u.id)).slice(0, 3);
          setRecommendedUsers(filtered);
        }

        // Fetch Trending Topics (extract from recent posts — count each tag once per post)
        const { data: posts } = await supabase.from('posts').select('content').order('created_at', { ascending: false }).limit(50);
        if (posts) {
          const tags: Record<string, number> = {};
          posts.forEach((p: any) => {
            const words: string[] = p.content.split(/\s+/);
            // deduplicate tags within each post (Set)
            const uniqueTagsInPost = new Set(
              words.filter((w: string) => w.startsWith('#') && w.length > 1).map((w: string) => w.toLowerCase())
            );
            uniqueTagsInPost.forEach((tag) => {
              tags[tag] = (tags[tag] || 0) + 1;
            });
          });
          const sorted = Object.entries(tags).sort((a,b) => b[1] - a[1]).slice(0,4);
          setTrendingTopics(sorted.map(t => ({
            id: t[0],
            tag: t[0],
            category: 'Trending',
            posts_count: t[1] + ' posts'
          })));
        }
      } catch (err) {
        console.warn('Failed to fetch sidebar data', err);
      } finally {
        setLoadingData(false);
      }
    }
    fetchSidebarData();
  }, [user, followingIds]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (localSearch.trim()) {
      setSearchQuery(localSearch.trim());
      router.push(`/explore?q=${encodeURIComponent(localSearch.trim())}`);
    }
  };

  return (
    <aside className="hidden lg:block w-[350px] pl-8 py-6 sticky top-0 h-screen overflow-y-auto">
      <div className="space-y-5">
        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-on-surface-variant group-focus-within:text-white transition-colors">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search Chronicle"
            className="w-full bg-white/5 border border-white/10 rounded-full py-2.5 pl-11 pr-4 text-white text-sm placeholder:text-outline focus:bg-white/10 focus:border-white/30 focus:outline-none transition-all font-body"
          />
        </form>

        {/* Trending Box */}
        <div className="bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-2xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-headline font-bold text-lg text-primary tracking-tight">Trending Now</h2>
            <Sparkles className="w-4 h-4 text-on-surface-variant" />
          </div>

          <div className="space-y-3.5">
            {loadingData ? (
              <p className="text-xs font-mono text-on-surface-variant">Loading trends...</p>
            ) : trendingTopics.length === 0 ? (
              <p className="text-xs font-mono text-on-surface-variant">No trending topics right now.</p>
            ) : trendingTopics.map((topic) => (
              <Link
                key={topic.id}
                href={`/explore?q=${encodeURIComponent(topic.tag)}`}
                className="block group transition-colors"
              >
                <div className="flex justify-between items-center text-xs text-on-surface-variant font-mono">
                  <span>{topic.category}</span>
                </div>
                <p className="font-bold text-white text-[15px] mt-0.5 group-hover:underline underline-offset-2">
                  {topic.tag}
                </p>
                <p className="text-xs text-on-surface-variant font-mono mt-0.5">{topic.posts_count}</p>
              </Link>
            ))}
          </div>

          <Link
            href="/explore"
            className="inline-block text-xs font-semibold text-primary hover:underline underline-offset-2 pt-1"
          >
            Show more topics →
          </Link>
        </div>

        {/* Who to Follow */}
        <div className="bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-2xl p-4 space-y-4">
          <h2 className="font-headline font-bold text-lg text-primary tracking-tight">Who to follow</h2>

          <div className="space-y-3.5">
            {loadingData ? (
              <p className="text-xs font-mono text-on-surface-variant">Loading suggestions...</p>
            ) : recommendedUsers.length === 0 ? (
              <p className="text-xs font-mono text-on-surface-variant">No new users to recommend.</p>
            ) : recommendedUsers.map((recUser) => {
              const isFollowing = followingIds.includes(recUser.id);
              return (
                <div key={recUser.id} className="flex items-center justify-between gap-3">
                  <Link href={`/profile/${recUser.username}`} className="flex items-center gap-3 flex-1 min-w-0 group">
                    <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {recUser.avatar_url ? (
                        <Image
                          src={recUser.avatar_url}
                          alt={recUser.full_name}
                          width={40}
                          height={40}
                          className="w-10 h-10 rounded-full object-cover transition-all border border-white/10"
                        />
                      ) : (
                        <span className="text-white text-xs font-headline">{recUser.full_name.charAt(0)}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-primary truncate group-hover:underline">
                        {recUser.full_name}
                      </p>
                      <p className="text-xs text-on-surface-variant truncate">@{recUser.username}</p>
                    </div>
                  </Link>

                  <button
                    onClick={() => toggleFollow(recUser.id)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex-shrink-0 ${
                      isFollowing
                        ? 'bg-white/10 border border-white/20 text-white hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30'
                        : 'bg-white text-black hover:bg-white/90'
                    }`}
                  >
                    {isFollowing ? 'Following' : 'Follow'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <footer className="px-2 pt-2 text-xs text-on-surface-variant font-mono flex flex-wrap gap-x-3 gap-y-1 opacity-70">
          <a href="#" className="hover:underline">Terms of Service</a>
          <a href="#" className="hover:underline">Privacy Policy</a>
          <a href="#" className="hover:underline">Cookie Policy</a>
          <a href="#" className="hover:underline">Accessibility</a>
          <span className="w-full mt-1">© 2026 Devara Inc.</span>
        </footer>
      </div>
    </aside>
  );
}
