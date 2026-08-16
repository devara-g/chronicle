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
  toggleFollow: (userId: string) => Promise<void>;
  addReply: (postId: string, content: string, parentReplyId?: string | null) => Promise<Reply | null>;
  getRepliesForPost: (postId: string) => Promise<Reply[]>;
  sendMessage: (conversationId: string, content: string) => Message | null;
  markNotificationsRead: () => Promise<void>;
  markSingleNotificationRead: (id: string) => Promise<void>;
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
        const loadedProfile = await AuthService.getCurrentProfile();
        setUser(loadedProfile);

        const [loadedPosts, followsData, notifData] = await Promise.all([
          PostsService.getPosts(loadedProfile?.id),
          loadedProfile && isSupabaseConfigured()
            ? supabase.from('follows').select('following_id').eq('follower_id', loadedProfile.id)
            : Promise.resolve({ data: null }),
          loadedProfile ? NotificationsService.getNotifications(loadedProfile.id) : Promise.resolve([]),
        ]);

        setPosts(loadedPosts);
        setConversations(MessagesService.getConversations());
        if (followsData.data) {
          setFollowingIds(followsData.data.map((f: any) => f.following_id));
        }
        setNotifications(notifData);
      } catch (err) {
        console.error('Failed loading app data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Supabase Realtime WebSocket Subscription for Posts & Notifications
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

  // Realtime subscription for user's notifications
  useEffect(() => {
    if (!isSupabaseConfigured() || !user) return;

    const notifsChannel = supabase
      .channel(`public:notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          if (payload.new && payload.new.id) {
            const fullNotif = await NotificationsService.getNotificationById(payload.new.id);
            if (fullNotif) {
              setNotifications(prev => {
                if (prev.some(n => n.id === fullNotif.id)) return prev;
                return [fullNotif, ...prev];
              });
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new && payload.new.id) {
            setNotifications(prev =>
              prev.map(n => (n.id === payload.new.id ? { ...n, read: payload.new.read } : n))
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notifsChannel);
    };
  }, [user]);

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

  const toggleLike = useCallback(async (postId: string) => {
    if (!user) return;
    const targetPost = posts.find(p => p.id === postId);
    const isLiked = targetPost ? !targetPost.is_liked : true;

    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          is_liked: isLiked,
          likes_count: Math.max(0, (post.likes_count || 0) + (isLiked ? 1 : -1)),
        };
      }
      return post;
    }));

    if (isSupabaseConfigured()) {
      try {
        if (isLiked) {
          await supabase.from('likes').insert({ user_id: user.id, post_id: postId });
          if (targetPost && targetPost.user_id !== user.id) {
            await NotificationsService.createNotification(targetPost.user_id, user.id, 'like', postId);
          }
        } else {
          await supabase.from('likes').delete().eq('user_id', user.id).eq('post_id', postId);
        }
      } catch (err) {
        console.error('Failed to toggle like:', err);
      }
    }
  }, [user, posts]);

  const toggleRepost = useCallback(async (postId: string) => {
    if (!user) return;
    const targetPost = posts.find(p => p.id === postId);
    const isReposted = targetPost ? !targetPost.is_reposted : true;

    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          is_reposted: isReposted,
          reposts_count: Math.max(0, (post.reposts_count || 0) + (isReposted ? 1 : -1)),
        };
      }
      return post;
    }));

    if (isSupabaseConfigured()) {
      try {
        if (isReposted) {
          await supabase.from('reposts').insert({ user_id: user.id, post_id: postId });
          if (targetPost && targetPost.user_id !== user.id) {
            await NotificationsService.createNotification(targetPost.user_id, user.id, 'repost', postId);
          }
        } else {
          await supabase.from('reposts').delete().eq('user_id', user.id).eq('post_id', postId);
        }
      } catch (err) {
        console.error('Failed to toggle repost:', err);
      }
    }
  }, [user, posts]);

  const toggleBookmark = useCallback(async (postId: string) => {
    if (!user) return;
    const targetPost = posts.find(p => p.id === postId);
    const isBookmarked = targetPost ? !targetPost.is_bookmarked : true;

    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          is_bookmarked: isBookmarked,
          bookmarks_count: Math.max(0, (post.bookmarks_count || 0) + (isBookmarked ? 1 : -1)),
        };
      }
      return post;
    }));

    if (isSupabaseConfigured()) {
      try {
        if (isBookmarked) {
          await supabase.from('bookmarks').insert({ user_id: user.id, post_id: postId });
        } else {
          await supabase.from('bookmarks').delete().eq('user_id', user.id).eq('post_id', postId);
        }
      } catch (err) {
        console.error('Failed to toggle bookmark:', err);
      }
    }
  }, [user, posts]);

  const toggleFollow = useCallback(async (userId: string) => {
    if (!user) return;
    const isFollowing = followingIds.includes(userId);

    // Optimistic UI update
    setFollowingIds(prev =>
      isFollowing ? prev.filter(id => id !== userId) : [...prev, userId]
    );

    if (isSupabaseConfigured()) {
      try {
        if (isFollowing) {
          await supabase
            .from('follows')
            .delete()
            .eq('follower_id', user.id)
            .eq('following_id', userId);
        } else {
          await supabase
            .from('follows')
            .insert({ follower_id: user.id, following_id: userId });

          // Send follow notification to the person being followed
          await NotificationsService.createNotification(userId, user.id, 'follow');
        }
      } catch (err) {
        // Revert optimistic update on failure
        console.error('Failed to toggle follow:', err);
        setFollowingIds(prev =>
          isFollowing ? [...prev, userId] : prev.filter(id => id !== userId)
        );
      }
    }
  }, [user, followingIds]);

  const addReply = useCallback(async (postId: string, content: string, parentReplyId?: string | null): Promise<Reply | null> => {
    if (!user) return null;
    const reply = await PostsService.createReply(postId, content, user, parentReplyId);
    if (reply) {
      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          return { ...p, replies_count: (p.replies_count || 0) + 1 };
        }
        return p;
      }));

      // Create reply notification for post author
      const targetPost = posts.find(p => p.id === postId);
      if (targetPost && targetPost.user_id !== user.id) {
        await NotificationsService.createNotification(targetPost.user_id, user.id, 'reply', postId);
      }
    }
    return reply;
  }, [user, posts]);

  const getRepliesForPost = useCallback(async (postId: string) => {
    return await PostsService.getReplies(postId);
  }, []);

  const sendMessage = useCallback((conversationId: string, content: string): Message | null => {
    if (!user) return null;
    const msg = MessagesService.sendMessage(conversationId, user.id, content);
    setConversations(MessagesService.getConversations());
    return msg;
  }, [user]);

  const markNotificationsRead = useCallback(async () => {
    if (!user) return;
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    await NotificationsService.markAllAsRead(user.id);
  }, [user]);

  const markSingleNotificationRead = useCallback(async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    await NotificationsService.markSingleAsRead(id);
  }, []);

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
    markSingleNotificationRead,
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
    markSingleNotificationRead,
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
