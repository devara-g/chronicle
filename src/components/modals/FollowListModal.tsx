'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2, Users } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Profile } from '@/types';
import { supabase } from '@/lib/supabase/client';
import { useApp } from '@/context/AppContext';

interface FollowListModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  initialTab: 'followers' | 'following';
}

export function FollowListModal({ isOpen, onClose, userId, initialTab }: FollowListModalProps) {
  const { followingIds, toggleFollow, user: currentUser, isFriend, isFollower } = useApp();
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>(initialTab);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  // Sync tab if initialTab changes while open
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    async function fetchProfiles() {
      setLoading(true);
      try {
        let userIdsToFetch: string[] = [];

        if (activeTab === 'followers') {
          // get people who follow the userId
          const { data } = await supabase.from('follows').select('follower_id').eq('following_id', userId);
          if (data) userIdsToFetch = data.map((d: any) => d.follower_id);
        } else {
          // get people the userId follows
          const { data } = await supabase.from('follows').select('following_id').eq('follower_id', userId);
          if (data) userIdsToFetch = data.map((d: any) => d.following_id);
        }

        if (userIdsToFetch.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('*')
            .in('id', userIdsToFetch);
          
          if (profilesData) {
            // keep original order or just return what DB gave
            setProfiles(profilesData as Profile[]);
          }
        } else {
          setProfiles([]);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    fetchProfiles();
  }, [isOpen, activeTab, userId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div 
        className="w-full max-w-md bg-[#0e0e0e] border border-white/15 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white/10 text-on-surface-variant hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="font-headline font-bold text-white text-lg">Follows</h2>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/[0.06]">
          <button
            onClick={() => setActiveTab('followers')}
            className={`flex-1 py-3 text-center text-sm font-semibold transition-all relative ${
              activeTab === 'followers' ? 'text-white' : 'text-on-surface-variant hover:text-white hover:bg-white/5'
            }`}
          >
            <span>Followers</span>
            {activeTab === 'followers' && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-0.5 bg-white rounded-full"></span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('following')}
            className={`flex-1 py-3 text-center text-sm font-semibold transition-all relative ${
              activeTab === 'following' ? 'text-white' : 'text-on-surface-variant hover:text-white hover:bg-white/5'
            }`}
          >
            <span>Following</span>
            {activeTab === 'following' && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-0.5 bg-white rounded-full"></span>
            )}
          </button>
        </div>

        {/* List Body */}
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex items-center justify-center p-12 text-on-surface-variant">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : profiles.length === 0 ? (
            <div className="p-12 text-center text-on-surface-variant text-sm font-mono">
              No {activeTab} yet.
            </div>
          ) : (
            <div className="flex flex-col">
              {profiles.map((profile) => {
                const isFollowing = followingIds.includes(profile.id);
                const isSelf = currentUser?.id === profile.id;

                return (
                  <div key={profile.id} className="flex items-center justify-between p-3 hover:bg-white/5 rounded-xl transition-colors">
                    <Link href={`/profile/${profile.username}`} onClick={onClose} className="flex items-center gap-3 flex-1 min-w-0">
                      <Image
                        src={profile.avatar_url || '/default-avatar.jpg'}
                        alt={profile.full_name}
                        width={44}
                        height={44}
                        className="w-11 h-11 rounded-full object-cover border border-white/10 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-white font-semibold text-sm leading-tight truncate">
                            {profile.full_name}
                          </p>
                          {isFriend(profile.id) && (
                            <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[9px] font-mono flex items-center gap-0.5 shrink-0">
                              <Users className="w-2.5 h-2.5" />
                              <span>Teman</span>
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <p className="text-on-surface-variant text-xs font-mono truncate">
                            @{profile.username}
                          </p>
                          {isFollower(profile.id) && !isFriend(profile.id) && (
                            <span className="text-[9px] font-mono text-white/50 bg-white/5 px-1 rounded">
                              Mengikuti Anda
                            </span>
                          )}
                        </div>
                        {profile.bio && (
                          <p className="text-white/80 text-xs mt-1 truncate font-body">
                            {profile.bio}
                          </p>
                        )}
                      </div>
                    </Link>

                    {/* Action Button */}
                    {!isSelf && currentUser && (
                      <button
                        onClick={async (e) => {
                          e.preventDefault();
                          await toggleFollow(profile.id);
                        }}
                        className={`ml-3 px-4 py-1.5 rounded-full text-xs font-semibold font-headline transition-all ${
                          isFollowing
                            ? 'bg-transparent border border-white/30 text-white hover:border-red-500/50 hover:text-red-400 hover:bg-red-500/10'
                            : isFollower(profile.id)
                            ? 'bg-emerald-400 text-black hover:bg-emerald-300 font-bold shadow-[0_0_12px_rgba(52,211,153,0.3)]'
                            : 'bg-white text-black hover:bg-white/90'
                        }`}
                      >
                        {isFollowing ? 'Following' : isFollower(profile.id) ? 'Follow Back' : 'Follow'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
