'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { AppShell } from '@/components/layout/AppShell';
import { useApp } from '@/context/AppContext';
import { PostCard } from '@/components/feed/PostCard';
import { formatNumber } from '@/lib/utils';
import { ArrowLeft, Calendar, Link as LinkIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Profile, Post } from '@/types';

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;
  const { posts, followingIds, toggleFollow } = useApp();
  const [activeTab, setActiveTab] = useState<'posts' | 'replies' | 'media' | 'likes'>('posts');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('username', username)
          .single();
          
        if (!error && data) {
          setProfile(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [username]);

  if (loading) {
    return (
      <AppShell>
        <div className="p-8 text-center text-xs font-mono text-on-surface-variant">Loading profile...</div>
      </AppShell>
    );
  }

  if (!profile) {
    return (
      <AppShell>
        <div className="p-12 text-center text-xs font-mono text-on-surface-variant">
          User @{username} not found.
          <button onClick={() => router.back()} className="block mx-auto mt-4 text-primary hover:underline">Go Back</button>
        </div>
      </AppShell>
    );
  }

  const isFollowing = followingIds.includes(profile.id);
  const userPosts = posts.filter(p => p.author?.username === username || p.user_id === profile.id);
  const mediaPosts = userPosts.filter(p => !!p.media_url);

  let displayedPosts = userPosts;
  if (activeTab === 'media') displayedPosts = mediaPosts;

  return (
    <AppShell>
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 w-full bg-black/80 backdrop-blur-xl border-b border-white/10 flex items-center gap-6 h-14 px-4">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 rounded-full hover:bg-white/10 text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-headline text-lg font-bold text-primary tracking-tight leading-tight">{profile.full_name}</h1>
          <p className="text-xs text-on-surface-variant font-mono">{userPosts.length} posts</p>
        </div>
      </div>

      {/* Banner */}
      <div className="relative w-full h-44 md:h-52 bg-white/5 overflow-hidden">
        {profile.banner_url && (
          <Image src={profile.banner_url} alt="Profile Banner" fill className="object-cover" priority />
        )}
      </div>

      {/* Profile Info */}
      <div className="px-4 pb-4">
        <div className="flex justify-between items-end -mt-12 md:-mt-14 mb-4 relative z-10">
          <div className="relative w-24 h-24 md:w-28 md:h-28 rounded-full border-4 border-black overflow-hidden bg-black shadow-xl flex items-center justify-center">
            {profile.avatar_url ? (
               <Image
                 src={profile.avatar_url}
                 alt={profile.full_name}
                 fill
                 className="object-cover transition-all"
                 priority
               />
            ) : (
               <span className="text-white text-3xl font-headline">{profile.full_name.charAt(0)}</span>
            )}
          </div>

          <button
            onClick={() => toggleFollow(profile.id)}
            className={`px-6 py-2 rounded-full font-headline font-bold text-sm transition-all active:scale-95 ${
              isFollowing
                ? 'bg-white/10 border border-white/20 text-white hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30'
                : 'bg-primary text-black hover:bg-white/90'
            }`}
          >
            {isFollowing ? 'Following' : 'Follow'}
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <h2 className="font-headline font-bold text-xl md:text-2xl text-white tracking-tight">{profile.full_name}</h2>
            <p className="text-on-surface-variant text-sm font-mono">@{profile.username}</p>
          </div>

          {profile.bio && (
            <p className="text-white text-sm md:text-base leading-relaxed font-body whitespace-pre-wrap">
              {profile.bio}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-on-surface-variant font-mono pt-1">
            {profile.website && (
              <a
                href={profile.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-white hover:underline"
              >
                <LinkIcon className="w-3.5 h-3.5 text-on-surface-variant" />
                <span>{profile.website.replace(/^https?:\/\//, '')}</span>
              </a>
            )}
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>Joined</span>
            </div>
          </div>

          <div className="flex items-center gap-5 pt-1 text-sm font-body">
            <div className="flex items-center gap-1">
              <strong className="text-white font-semibold font-mono">{formatNumber(profile.following_count || 0)}</strong>
              <span className="text-on-surface-variant text-xs">Following</span>
            </div>
            <div className="flex items-center gap-1">
              <strong className="text-white font-semibold font-mono">{formatNumber(profile.followers_count || 0)}</strong>
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

      {/* Posts Stream */}
      <div className="flex flex-col divide-y divide-white/10">
        {displayedPosts.length === 0 ? (
          <div className="p-12 text-center text-on-surface-variant text-xs font-mono">
            No posts found for @{profile.username}.
          </div>
        ) : (
          displayedPosts.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </div>
    </AppShell>
  );
}
