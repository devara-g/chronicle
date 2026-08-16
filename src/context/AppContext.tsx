'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Post, Profile, Notification, Conversation, Message, Reply } from '@/types';
import { PostsService } from '@/lib/services/posts.service';
import { AuthService } from '@/lib/services/auth.service';
import { NotificationsService } from '@/lib/services/notifications.service';
import { MessagesService } from '@/lib/services/messages.service';
import { StorageService } from '@/lib/services/storage.service';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';

interface AppContextType {
  user: Profile | null;
  posts: Post[];
  notifications: Notification[];
  conversations: Conversation[];
  followingIds: string[];
  unreadNotifsCount: number;
  unreadMessagesCount: number;
  isComposeOpen: boolean;
  searchQuery: string;
  loading: boolean;
  openCompose: () => void;
  closeCompose: () => void;
  setSearchQuery: (query: string) => void;
  createPost: (content: string, mediaUrl?: string | null) => Promise<Post | null>;
  updatePost: (postId: string, content: string) => Promise<boolean>;
  deletePost: (postId: string) => Promise<boolean>;
  toggleLike: (postId: string) => void;
  toggleRepost: (postId: string) => void;
  toggleBookmark: (postId: string) => void;
  toggleFollow: (userId: string) => void;
  addReply: (postId: string, content: string, parentReplyId?: string | null) => Promise<Reply | null>;
  getRepliesForPost: (postId: string) => Promise<Reply[]>;
  sendMessage: (conversationId: string, content: string) => Message | null;
  markNotificationsRead: () => void;
  updateUserProfile: (data: Partial<Profile>) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);

  const [posts, setPosts] = useState<Post[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Initial data loading
  useEffect(() => {
    async function loadData() {
      try {
        const [loadedPosts, loadedProfile] = await Promise.all([
          PostsService.getPosts(),
          AuthService.getCurrentProfile(),
        ]);
        setPosts(loadedPosts);
        setUser(loadedProfile);
        setNotifications(NotificationsService.getNotifications());
        setConversations(MessagesService.getConversations());
      } catch (err) {
        console.error('Failed loading app data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Supabase Realtime WebSocket Subscription
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const postsChannel = supabase
      .channel('public:posts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts' },
        (payload) => {
          PostsService.getPostById(payload.new.id, []).then((newPost) => {
            if (newPost) {
              setPosts(prev => {
                if (prev.some(p => p.id === newPost.id)) return prev;
                return [newPost, ...prev];
              });
            }
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(postsChannel);
    };
  }, []);

  const openCompose = useCallback(() => setIsComposeOpen(true), []);
  const closeCompose = useCallback(() => setIsComposeOpen(false), []);

  const createPost = useCallback(async (content: string, mediaUrl?: string | null): Promise<Post | null> => {
    if (!user) return null;
    const newPost = await PostsService.createPost(content, user, mediaUrl);
    setPosts(prev => {
      const updated = [newPost, ...prev];
      return updated;
    });
    setUser(prev => prev ? ({
      ...prev,
      posts_count: (prev.posts_count || 0) + 1
    }) : prev);
    return newPost;
  }, [user]);

  const updatePost = useCallback(async (postId: string, content: string): Promise<boolean> => {
    if (!user) return false;
    const success = await PostsService.updatePost(postId, user.id, content);
    if (success) {
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, content } : p));
    }
    return success;
  }, [user]);

  const deletePost = useCallback(async (postId: string): Promise<boolean> => {
    if (!user) return false;
    const postToDelete = posts.find(p => p.id === postId);
    
    const success = await PostsService.deletePost(postId, user.id);
    
    if (success) {
      if (postToDelete?.media_url) {
        try {
           await StorageService.deleteMedia(postToDelete.media_url);
        } catch (e) {
           console.error("Failed to delete media from bucket:", e);
        }
      }
      
      setPosts(prev => prev.filter(p => p.id !== postId));
      setUser(prev => prev ? ({
        ...prev,
        posts_count: Math.max(0, (prev.posts_count || 0) - 1)
      }) : prev);
    }
    return success;
  }, [user, posts]);

  const toggleLike = useCallback((postId: string) => {
    if (!user) return; // Must login to like
    setPosts(prev => {
      const updated = prev.map(post => {
        if (post.id === postId) {
          const isLiked = !post.is_liked;
          return {
            ...post,
            is_liked: isLiked,
            likes_count: Math.max(0, post.likes_count + (isLiked ? 1 : -1)),
          };
        }
        return post;
      });
      return updated;
    });
  }, [user]);

  const toggleRepost = useCallback((postId: string) => {
    if (!user) return;
    setPosts(prev => {
      const updated = prev.map(post => {
        if (post.id === postId) {
          const isReposted = !post.is_reposted;
          return {
            ...post,
            is_reposted: isReposted,
            reposts_count: Math.max(0, post.reposts_count + (isReposted ? 1 : -1)),
          };
        }
        return post;
      });
      return updated;
    });
  }, [user]);

  const toggleBookmark = useCallback((postId: string) => {
    if (!user) return;
    setPosts(prev => {
      const updated = prev.map(post => {
        if (post.id === postId) {
          const isBookmarked = !post.is_bookmarked;
          return {
            ...post,
            is_bookmarked: isBookmarked,
            bookmarks_count: Math.max(0, post.bookmarks_count + (isBookmarked ? 1 : -1)),
          };
        }
        return post;
      });
      return updated;
    });
  }, [user]);

  const toggleFollow = useCallback((userId: string) => {
    if (!user) return;
    setFollowingIds(prev => {
      const exists = prev.includes(userId);
      const updated = exists ? prev.filter(id => id !== userId) : [...prev, userId];
      setUser(u => u ? ({
        ...u,
        following_count: Math.max(0, (u.following_count || 0) + (exists ? -1 : 1)),
      }) : u);
      return updated;
    });
  }, [user]);

  const addReply = useCallback(async (postId: string, content: string, parentReplyId?: string | null): Promise<Reply | null> => {
    if (!user) return null;
    const reply = await PostsService.createReply(postId, content, user, parentReplyId);
    setPosts(prev => {
      const updated = prev.map(p => {
        if (p.id === postId) {
          return { ...p, replies_count: p.replies_count + 1 };
        }
        return p;
      });
      return updated;
    });
    return reply;
  }, [user]);

  const getRepliesForPost = useCallback(async (postId: string) => {
    return await PostsService.getReplies(postId);
  }, []);

  const sendMessage = useCallback((conversationId: string, content: string): Message | null => {
    if (!user) return null;
    const msg = MessagesService.sendMessage(conversationId, user.id, content);
    setConversations(MessagesService.getConversations());
    return msg;
  }, [user]);

  const markNotificationsRead = useCallback(() => {
    if (!user) return;
    const updated = NotificationsService.markAllAsRead(notifications);
    setNotifications(updated);
  }, [user, notifications]);

  const updateUserProfile = useCallback(async (data: Partial<Profile>) => {
    if (!user) return;
    const updated = await AuthService.updateProfile(data, user);
    setUser(updated);
  }, [user]);

  const unreadNotifsCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);
  const unreadMessagesCount = useMemo(() => conversations.reduce((acc, c) => acc + (c.unread_count || 0), 0), [conversations]);

  const contextValue = useMemo<AppContextType>(() => ({
    user,
    posts,
    notifications,
    conversations,
    followingIds,
    unreadNotifsCount,
    unreadMessagesCount,
    isComposeOpen,
    searchQuery,
    loading,
    openCompose,
    closeCompose,
    setSearchQuery,
    createPost,
    updatePost,
    deletePost,
    toggleLike,
    toggleRepost,
    toggleBookmark,
    toggleFollow,
    addReply,
    getRepliesForPost,
    sendMessage,
    markNotificationsRead,
    updateUserProfile,
  }), [
    user,
    posts,
    notifications,
    conversations,
    followingIds,
    unreadNotifsCount,
    unreadMessagesCount,
    isComposeOpen,
    searchQuery,
    loading,
    openCompose,
    closeCompose,
    createPost,
    toggleLike,
    toggleRepost,
    toggleBookmark,
    toggleFollow,
    addReply,
    getRepliesForPost,
    sendMessage,
    markNotificationsRead,
    updateUserProfile
  ]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
