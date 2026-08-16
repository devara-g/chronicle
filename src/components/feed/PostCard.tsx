'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Post } from '@/types';
import { useApp } from '@/context/AppContext';
import { formatTimeAgo, formatNumber } from '@/lib/utils';
import { 
  MessageSquare, 
  Repeat2, 
  Heart, 
  Bookmark, 
  Share, 
  Check,
  MoreHorizontal,
  Trash2,
  Edit
} from 'lucide-react';
import { EditPostModal } from '@/components/modals/EditPostModal';

interface PostCardProps {
  post: Post;
  showBorder?: boolean;
}

export function PostCard({ post, showBorder = true }: PostCardProps) {
  const router = useRouter();
  const { user, toggleLike, toggleRepost, toggleBookmark, deletePost } = useApp();
  const [copied, setCopied] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const isAuthor = user?.id === post.user_id;

  useEffect(() => {
    if (!showDropdown) return;
    const handleClick = () => setShowDropdown(false);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [showDropdown]);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this post?')) {
      await deletePost(post.id);
    }
    setShowDropdown(false);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // If target is button or link, don't navigate
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a') || target.closest('input')) {
      return;
    }
    router.push(`/post/${post.id}`);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}/post/${post.id}`;
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <article
      onClick={handleCardClick}
      className={`p-4 ${
        showBorder ? 'border-b border-white/10' : ''
      } hover:bg-white/[0.02] transition-colors cursor-pointer flex gap-3.5 group`}
    >
      {/* Author Avatar */}
      <div className="flex-shrink-0">
        <Link 
          href={`/profile/${post.author?.username || 'user'}`}
          onClick={(e) => e.stopPropagation()}
        >
          <Image
            src={post.author?.avatar_url || '/default-avatar.jpg'}
            alt={post.author?.full_name || 'User'}
            width={44}
            height={44}
            className="w-10 h-10 md:w-11 md:h-11 rounded-full object-cover border border-white/10 transition-all hover:scale-105"
          />
        </Link>
      </div>

      {/* Post Body */}
      <div className="flex-1 min-w-0">
        {/* Header info */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/profile/${post.author?.username || 'user'}`}
              onClick={(e) => e.stopPropagation()}
              className="font-bold text-white text-[15px] hover:underline leading-tight"
            >
              {post.author?.full_name}
            </Link>
            <span className="text-on-surface-variant text-xs font-mono">
              @{post.author?.username}
            </span>
            <span className="text-on-surface-variant text-xs">·</span>
            <span className="text-on-surface-variant text-xs font-mono">
              {formatTimeAgo(post.created_at)}
            </span>
          </div>

          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDropdown(!showDropdown);
              }}
              className="text-on-surface-variant hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            
            {showDropdown && (
              <div 
                className="absolute right-0 top-full mt-1 w-32 bg-[#161616] border border-white/10 rounded-xl shadow-xl z-20 py-1 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {isAuthor ? (
                  <>
                    <button
                      onClick={() => {
                        setShowDropdown(false);
                        setIsEditing(true);
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-headline hover:bg-white/5 flex items-center gap-2 transition-colors"
                    >
                      <Edit className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button
                      onClick={handleDelete}
                      className="w-full text-left px-4 py-2 text-xs font-headline text-red-500 hover:bg-red-500/10 flex items-center gap-2 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </>
                ) : (
                  <button
                    onClick={(e) => {
                       setShowDropdown(false);
                       handleShare(e);
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-headline hover:bg-white/5 flex items-center gap-2 transition-colors"
                  >
                    <Share className="w-3.5 h-3.5" /> Share
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <p className="text-white text-[15px] md:text-[16px] leading-relaxed font-body whitespace-pre-wrap mb-3">
          {post.content}
        </p>

        {/* Media Preview if attached */}
        {post.media_url && (
          <div className="rounded-2xl overflow-hidden border border-white/10 mb-3.5 bg-black/40">
            <Image
              src={post.media_url}
              alt="Post media"
              width={800}
              height={600}
              className="w-full h-auto max-h-[600px] object-cover hover:scale-[1.02] transition-transform duration-500"
              loading="lazy"
            />
          </div>
        )}

        {/* Engagement Action Bar */}
        <div className="flex justify-between items-center text-on-surface-variant max-w-md pt-1">
          {/* Reply */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/post/${post.id}`);
            }}
            className="flex items-center gap-1.5 group/btn hover:text-white transition-colors"
          >
            <div className="p-2 rounded-full group-hover/btn:bg-white/10 transition-colors -ml-2">
              <MessageSquare className="w-4 h-4" />
            </div>
            <span className="text-xs font-mono">{formatNumber(post.replies_count)}</span>
          </button>

          {/* Repost */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleRepost(post.id);
            }}
            className={`flex items-center gap-1.5 group/btn transition-colors ${
              post.is_reposted ? 'text-emerald-400' : 'hover:text-emerald-400'
            }`}
          >
            <div className="p-2 rounded-full group-hover/btn:bg-emerald-400/10 transition-colors -ml-2">
              <Repeat2 className="w-4 h-4" />
            </div>
            <span className="text-xs font-mono">{formatNumber(post.reposts_count)}</span>
          </button>

          {/* Like */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleLike(post.id);
            }}
            className={`flex items-center gap-1.5 group/btn transition-colors ${
              post.is_liked ? 'text-rose-500' : 'hover:text-rose-500'
            }`}
          >
            <div className="p-2 rounded-full group-hover/btn:bg-rose-500/10 transition-colors -ml-2">
              <Heart className={`w-4 h-4 ${post.is_liked ? 'fill-rose-500 stroke-rose-500' : ''}`} />
            </div>
            <span className="text-xs font-mono">{formatNumber(post.likes_count)}</span>
          </button>

          {/* Bookmark */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleBookmark(post.id);
            }}
            className={`flex items-center gap-1.5 group/btn transition-colors ${
              post.is_bookmarked ? 'text-cyan-400' : 'hover:text-cyan-400'
            }`}
          >
            <div className="p-2 rounded-full group-hover/btn:bg-cyan-400/10 transition-colors -ml-2">
              <Bookmark className={`w-4 h-4 ${post.is_bookmarked ? 'fill-cyan-400 stroke-cyan-400' : ''}`} />
            </div>
            {post.bookmarks_count > 0 && (
              <span className="text-xs font-mono">{formatNumber(post.bookmarks_count)}</span>
            )}
          </button>

          {/* Share Link */}
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 group/btn hover:text-white transition-colors"
            title="Copy post link"
          >
            <div className="p-2 rounded-full group-hover/btn:bg-white/10 transition-colors -ml-2">
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share className="w-4 h-4" />}
            </div>
          </button>
        </div>
      </div>
      
      {/* Edit Modal Component */}
      <EditPostModal 
        post={post}
        isOpen={isEditing}
        onClose={() => setIsEditing(false)}
      />
    </article>
  );
}
