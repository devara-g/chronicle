'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { AppShell } from '@/components/layout/AppShell';
import { useApp } from '@/context/AppContext';
import { formatTimeAgo } from '@/lib/utils';
import { 
  Heart, 
  Repeat2, 
  AtSign, 
  UserPlus, 
  CheckCheck,
  Settings,
  Sparkles,
  Mail 
} from 'lucide-react';

export default function NotificationsPage() {
  const { notifications, markNotificationsRead, markSingleNotificationRead } = useApp();
  const [filter, setFilter] = useState<'all' | 'mentions' | 'likes' | 'reposts' | 'messages'>('all');

  // Auto-mark all unread notifications as read when viewing this page
  useEffect(() => {
    const hasUnread = notifications.some(n => !n.read);
    if (hasUnread) {
      markNotificationsRead();
    }
  }, [notifications, markNotificationsRead]);

  const filteredNotifs = notifications.filter((n) => {
    if (filter === 'mentions') return n.type === 'mention';
    if (filter === 'likes') return n.type === 'like';
    if (filter === 'reposts') return n.type === 'repost';
    if (filter === 'messages') return n.type === 'message';
    return true;
  });

  return (
    <AppShell>
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 w-full bg-black/80 backdrop-blur-xl border-b border-white/10">
        <div className="flex justify-between items-center h-14 px-4">
          <h1 className="font-headline text-lg font-bold text-primary tracking-tight">Notifications</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={markNotificationsRead}
              className="flex items-center gap-1 text-xs font-mono text-on-surface-variant hover:text-white px-2.5 py-1 rounded-full hover:bg-white/10 transition-colors"
              title="Mark all as read"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark read</span>
            </button>
            <Link href="/settings" className="p-1.5 rounded-full hover:bg-white/10 text-on-surface-variant hover:text-white transition-colors">
              <Settings className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex border-t border-white/[0.06] overflow-x-auto scrollbar-hide">
          {(['all', 'mentions', 'likes', 'reposts', 'messages'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`min-w-fit px-4 py-3 text-center text-xs md:text-sm font-semibold capitalize transition-all relative whitespace-nowrap ${
                filter === tab ? 'text-white' : 'text-on-surface-variant hover:text-white hover:bg-white/5'
              }`}
            >
              <span>{tab}</span>
              {filter === tab && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-white rounded-full"></span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications List */}
      <div className="flex flex-col divide-y divide-white/10">
        {filteredNotifs.length === 0 ? (
          <div className="p-12 text-center text-on-surface-variant text-xs font-mono">
            No {filter} notifications yet.
          </div>
        ) : (
          filteredNotifs.map((notif) => {
            const href = notif.type === 'message'
              ? `/messages?user=${notif.sender_id}`
              : notif.post_id 
              ? `/post/${notif.post_id}` 
              : `/profile/${notif.sender.username}`;

            return (
              <Link
                key={notif.id}
                href={href}
                onClick={() => {
                  if (!notif.read) {
                    markSingleNotificationRead(notif.id);
                  }
                }}
                className={`p-4 flex gap-3.5 hover:bg-white/[0.02] transition-colors cursor-pointer ${
                  !notif.read ? 'bg-white/[0.03]' : ''
                }`}
              >
                {/* Icon Column */}
                <div className="w-8 flex justify-end pt-1 flex-shrink-0">
                  {notif.type === 'like' && <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />}
                  {notif.type === 'repost' && <Repeat2 className="w-5 h-5 text-emerald-400" />}
                  {notif.type === 'reply' && <Sparkles className="w-5 h-5 text-amber-400" />}
                  {notif.type === 'mention' && <AtSign className="w-5 h-5 text-white" />}
                  {notif.type === 'follow' && <UserPlus className="w-5 h-5 text-cyan-400" />}
                  {notif.type === 'message' && <Mail className="w-5 h-5 text-sky-400" />}
                </div>

                {/* Content Column */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Image
                      src={notif.sender.avatar_url || '/default-avatar.jpg'}
                      alt={notif.sender.full_name}
                      width={32}
                      height={32}
                      className="w-8 h-8 rounded-full object-cover border border-white/10"
                    />
                    <span className="text-on-surface-variant text-xs font-mono">
                      {formatTimeAgo(notif.created_at)}
                    </span>
                  </div>

                  <p className="text-sm text-white font-body leading-relaxed">
                    <strong className="font-semibold">{notif.sender.full_name}</strong>{' '}
                    {notif.type === 'like' && 'liked your chronicle.'}
                    {notif.type === 'repost' && 'reposted your article.'}
                    {notif.type === 'reply' && 'replied to your chronicle.'}
                    {notif.type === 'mention' && 'mentioned you in a post.'}
                    {notif.type === 'follow' && 'started following you.'}
                    {notif.type === 'message' && 'sent you a direct message.'}
                  </p>

                  {notif.post_snippet && (
                    <div className="mt-2 text-xs text-on-surface-variant bg-white/5 border border-white/10 rounded-lg p-2.5 font-body leading-relaxed">
                      "{notif.post_snippet}"
                    </div>
                  )}
                </div>
              </Link>
            );
          })
        )}
      </div>
    </AppShell>
  );
}
