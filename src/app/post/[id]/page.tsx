'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { AppShell } from '@/components/layout/AppShell';
import { useApp } from '@/context/AppContext';
import { Post, Reply } from '@/types';
import { formatNumber, formatTimeAgo } from '@/lib/utils';
import { 
  ArrowLeft, 
  MessageCircle, 
  Repeat2, 
  Heart, 
  Bookmark, 
  Share, 
  Check, 
  Sparkles,
  X,
  CornerDownRight
} from 'lucide-react';
import { ImageLightboxModal } from '@/components/ui/ImageLightboxModal';

interface ReplyingTarget {
  id: string;
  authorName: string;
  username: string;
}

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.id as string;
  const { posts, user, toggleLike, toggleRepost, toggleBookmark, addReply, getRepliesForPost } = useApp();

  const [post, setPost] = useState<Post | undefined>(undefined);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [replyText, setReplyText] = useState('');
  const [loadingReply, setLoadingReply] = useState(false);
  const [copied, setCopied] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ReplyingTarget | null>(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const replyInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const found = posts.find(p => p.id === postId);
    if (found) {
      setPost(found);
    }
    async function loadReplies() {
      const reps = await getRepliesForPost(postId);
      setReplies(reps);
    }
    loadReplies();
  }, [postId, posts, getRepliesForPost]);

  if (!post) {
    return (
      <AppShell>
        <div className="p-8 text-center text-on-surface-variant font-mono text-xs">
          Loading post or post not found...
        </div>
      </AppShell>
    );
  }

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || loadingReply) return;

    setLoadingReply(true);
    try {
      const parentId = replyingTo?.id || null;
      const newReply = await addReply(postId, replyText.trim(), parentId);
      if (newReply) {
        setReplies(prev => [...prev, newReply]);
      }
      setReplyText('');
      setReplyingTo(null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingReply(false);
    }
  };

  const handleStartReplyTo = (rep: Reply) => {
    setReplyingTo({
      id: rep.id,
      authorName: rep.author?.full_name || 'User',
      username: rep.author?.username || 'user',
    });
    setTimeout(() => {
      replyInputRef.current?.focus();
      replyInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  };

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Build threaded tree structure
  const rootReplies = replies.filter(r => !r.parent_reply_id);
  const getChildReplies = (parentId: string) => replies.filter(r => r.parent_reply_id === parentId);

  const renderReplyItem = (rep: Reply, isChild = false) => {
    const children = getChildReplies(rep.id);
    const isTarget = replyingTo?.id === rep.id;

    return (
      <div key={rep.id} className={`relative ${isChild ? 'ml-6 pl-4 border-l border-white/10 mt-3' : 'p-4'}`}>
        <div className="flex gap-3.5 hover:bg-white/[0.02] p-2 rounded-xl transition-colors">
          {/* Avatar */}
          <Link href={`/profile/${rep.author?.username || 'user'}`} className="flex-shrink-0">
            <Image
              src={rep.author?.avatar_url || '/default-avatar.jpg'}
              alt={rep.author?.full_name || 'user'}
              width={36}
              height={36}
              className="w-9 h-9 rounded-full object-cover border border-white/10"
            />
          </Link>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Link 
                href={`/profile/${rep.author?.username || 'user'}`}
                className="font-bold text-white text-sm hover:underline"
              >
                {rep.author?.full_name}
              </Link>
              <span className="text-on-surface-variant text-xs font-mono">@{rep.author?.username}</span>
              <span className="text-on-surface-variant text-[11px] font-mono">· {formatTimeAgo(rep.created_at)}</span>
            </div>

            <p className="text-white text-sm leading-relaxed font-body mb-2.5 whitespace-pre-wrap">
              {rep.content}
            </p>

            {/* Actions on Reply */}
            <div className="flex items-center gap-6 text-on-surface-variant text-xs font-mono">
              <button 
                onClick={() => handleStartReplyTo(rep)}
                className={`flex items-center gap-1.5 transition-all group/repbtn ${
                  isTarget ? 'text-primary font-semibold' : 'hover:text-sky-400'
                }`}
              >
                <div className="p-1.5 rounded-full group-hover/repbtn:bg-sky-400/10 group-hover/repbtn:scale-110 active:scale-90 transition-all">
                  <MessageCircle className="w-3.5 h-3.5 stroke-[1.8]" />
                </div>
                <span>Reply</span>
              </button>

              <button className="flex items-center gap-1.5 hover:text-rose-500 transition-all group/likebtn">
                <div className="p-1.5 rounded-full group-hover/likebtn:bg-rose-500/10 group-hover/likebtn:scale-110 active:scale-90 transition-all">
                  <Heart className="w-3.5 h-3.5" />
                </div>
                <span>{rep.likes_count || 0}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Render nested children recursively */}
        {children.length > 0 && (
          <div className="space-y-1">
            {children.map(child => renderReplyItem(child, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <AppShell>
      {/* Sticky Header with Back Button */}
      <div className="sticky top-0 z-30 w-full bg-black/80 backdrop-blur-xl border-b border-white/10 flex items-center gap-6 h-14 px-4">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 rounded-full hover:bg-white/10 text-white transition-all active:scale-90"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-headline text-lg font-bold text-primary tracking-tight">Chronicle</h1>
      </div>

      {/* Main Post Content */}
      <article className="p-4 md:p-6 border-b border-white/10">
        {/* Author Header */}
        <div className="flex items-center gap-3.5 mb-4">
          <Link href={`/profile/${post.author?.username || 'user'}`}>
            <Image
              src={post.author?.avatar_url || '/default-avatar.jpg'}
              alt={post.author?.full_name || 'user'}
              width={48}
              height={48}
              className="w-12 h-12 rounded-full object-cover border border-white/10 transition-all hover:scale-105"
            />
          </Link>
          <div>
            <Link
              href={`/profile/${post.author?.username || 'user'}`}
              className="font-headline font-bold text-white text-base hover:underline leading-tight block"
            >
              {post.author?.full_name}
            </Link>
            <span className="text-on-surface-variant text-xs font-mono">
              @{post.author?.username}
            </span>
          </div>
        </div>

        {/* Post Text */}
        <p className="text-white text-[18px] md:text-[20px] leading-relaxed font-body whitespace-pre-wrap mb-4">
          {post.content}
        </p>

        {/* Media Attachment */}
        {post.media_url && (
          <>
            <div
              onClick={() => setIsLightboxOpen(true)}
              className="rounded-2xl overflow-hidden border border-white/10 mb-4 bg-black/40 cursor-pointer group/img relative"
              title="Click to expand"
            >
              <Image
                src={post.media_url}
                alt="Post media"
                width={800}
                height={600}
                className="w-full h-auto max-h-[600px] object-contain group-hover/img:scale-[1.01] transition-transform duration-300"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/15 transition-colors pointer-events-none" />
            </div>

            <ImageLightboxModal
              isOpen={isLightboxOpen}
              imageUrl={post.media_url}
              altText={post.content.substring(0, 60) || 'Post media'}
              onClose={() => setIsLightboxOpen(false)}
            />
          </>
        )}

        {/* Timestamp & Platform */}
        <div className="flex items-center gap-2 py-3 text-xs text-on-surface-variant font-mono border-b border-white/10">
          <span>{new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          <span>·</span>
          <span>{new Date(post.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          <span>·</span>
          <span className="text-white/60">Chronicle for Web</span>
        </div>

        {/* Detailed Metrics Row */}
        <div className="flex items-center gap-6 py-3.5 border-b border-white/10 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <strong className="text-white font-semibold text-sm">{formatNumber(post.reposts_count)}</strong>
            <span className="text-on-surface-variant">Reposts</span>
          </div>
          <div className="flex items-center gap-1.5">
            <strong className="text-white font-semibold text-sm">{formatNumber(post.likes_count)}</strong>
            <span className="text-on-surface-variant">Likes</span>
          </div>
          <div className="flex items-center gap-1.5">
            <strong className="text-white font-semibold text-sm">{formatNumber(post.bookmarks_count)}</strong>
            <span className="text-on-surface-variant">Bookmarks</span>
          </div>
        </div>

        {/* Interactive Action Icons with Rich Animations */}
        <div className="flex justify-around items-center py-2.5 text-on-surface-variant">
          {/* Reply */}
          <button
            onClick={() => {
              setReplyingTo(null);
              replyInputRef.current?.focus();
            }}
            className="p-2.5 rounded-full text-white/50 hover:text-sky-400 hover:bg-sky-400/10 transition-all group active:scale-90"
            title="Reply"
          >
            <MessageCircle className="w-5 h-5 stroke-[1.8] transition-transform group-hover:-rotate-6" />
          </button>

          {/* Repost */}
          <button
            onClick={() => toggleRepost(post.id)}
            className={`p-2.5 rounded-full hover:bg-emerald-400/10 transition-all group active:scale-90 ${
              post.is_reposted ? 'text-emerald-400' : 'hover:text-emerald-400'
            }`}
            title="Repost"
          >
            <Repeat2 className={`w-5 h-5 transition-all duration-300 group-hover:rotate-45 active:rotate-180 ${
              post.is_reposted ? 'drop-shadow-[0_0_8px_rgba(52,211,153,0.7)]' : ''
            }`} />
          </button>

          {/* Like */}
          <button
            onClick={() => toggleLike(post.id)}
            className={`p-2.5 rounded-full hover:bg-rose-500/10 transition-all group active:scale-75 ${
              post.is_liked ? 'text-rose-500' : 'hover:text-rose-500'
            }`}
            title="Like"
          >
            <Heart className={`w-5 h-5 transition-all duration-200 ${
              post.is_liked 
                ? 'fill-rose-500 stroke-rose-500 drop-shadow-[0_0_10px_rgba(244,63,94,0.8)] scale-115' 
                : 'group-hover:scale-110'
            }`} />
          </button>

          {/* Bookmark */}
          <button
            onClick={() => toggleBookmark(post.id)}
            className={`p-2.5 rounded-full hover:bg-cyan-400/10 transition-all group active:scale-90 ${
              post.is_bookmarked ? 'text-cyan-400' : 'hover:text-cyan-400'
            }`}
            title="Bookmark"
          >
            <Bookmark className={`w-5 h-5 transition-all duration-200 ${
              post.is_bookmarked 
                ? 'fill-cyan-400 stroke-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.8)] scale-110' 
                : 'group-hover:scale-110'
            }`} />
          </button>

          {/* Share */}
          <button
            onClick={handleShare}
            className="p-2.5 rounded-full hover:bg-white/10 hover:text-white transition-all group active:scale-90"
            title="Copy link"
          >
            {copied ? (
              <Check className="w-5 h-5 text-emerald-400 animate-scale-in" />
            ) : (
              <Share className="w-5 h-5 transition-transform group-hover:-translate-y-0.5" />
            )}
          </button>
        </div>
      </article>

      {/* Reply Input Box with Target Indicator */}
      {user ? (
        <form onSubmit={handleReplySubmit} className="p-4 border-b border-white/10 flex flex-col gap-2 bg-black/40">
          {replyingTo && (
            <div className="flex items-center justify-between px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs font-mono text-on-surface-variant animate-fade-in">
              <div className="flex items-center gap-1.5">
                <CornerDownRight className="w-3.5 h-3.5 text-primary" />
                <span>Replying to <strong className="text-white font-semibold">@{replyingTo.username}</strong></span>
              </div>
              <button
                type="button"
                onClick={() => setReplyingTo(null)}
                className="p-1 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-colors"
                title="Cancel reply targeting"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="flex gap-3.5">
            <Image
              src={user.avatar_url || '/default-avatar.jpg'}
              alt={user.full_name}
              width={40}
              height={40}
              className="w-10 h-10 rounded-full object-cover border border-white/10 flex-shrink-0"
            />
            <div className="flex-1">
              <textarea
                ref={replyInputRef}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={replyingTo ? `Reply to @${replyingTo.username}...` : "Post your reply..."}
                rows={2}
                className="w-full bg-transparent border-none text-white text-base placeholder:text-outline focus:ring-0 resize-none outline-none font-body leading-relaxed"
              />
              <div className="flex justify-between items-center pt-2 border-t border-white/[0.06]">
                <div className="flex items-center gap-1 text-on-surface-variant">
                  <button 
                    type="button" 
                    onClick={() => setReplyText(prev => prev + ' 🖤')} 
                    className="p-1.5 rounded-full hover:bg-white/10 hover:text-white transition-colors"
                  >
                    <Sparkles className="w-4 h-4" />
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={!replyText.trim() || loadingReply}
                  className="bg-primary text-black font-headline font-bold py-1.5 px-5 rounded-full text-xs hover:bg-white/90 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none shadow-[0_0_15px_rgba(255,255,255,0.15)]"
                >
                  {loadingReply ? 'Replying...' : 'Reply'}
                </button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <div className="p-4 border-b border-white/10 text-center text-sm text-on-surface-variant">
          <Link href="/login" className="text-primary hover:underline">Sign in</Link> to reply to this post.
        </div>
      )}

      {/* Threaded Replies Stream */}
      <div className="flex flex-col divide-y divide-white/10">
        {replies.length === 0 ? (
          <div className="p-8 text-center text-on-surface-variant text-xs font-mono">
            No replies yet. Be the first to share your thoughts.
          </div>
        ) : (
          rootReplies.map((rep) => renderReplyItem(rep, false))
        )}
      </div>
    </AppShell>
  );
}
