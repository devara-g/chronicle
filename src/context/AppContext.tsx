'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Post, Profile, Notification, Conversation, Message, Reply } from '@/types';
import { PostsService } from '@/lib/services/posts.service';
import { AuthService } from '@/lib/services/auth.service';
import { NotificationsService } from '@/lib/services/notifications.service';
import { MessagesService } from '@/lib/services/messages.service';
import { StorageService } from '@/lib/services/storage.service';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { Capacitor } from '@capacitor/core';

interface AppContextType {
  user: Profile | null;
  posts: Post[];
  notifications: Notification[];
  conversations: Conversation[];
  followingIds: string[];
  followerIds: string[];
  friendIds: string[];
  isFriend: (userId: string) => boolean;
  isFollower: (userId: string) => boolean;
  unreadNotifsCount: number;
  unreadMessagesCount: number;
  isComposeOpen: boolean;
  searchQuery: string;
  loading: boolean;
  hasMorePosts: boolean;
  isLoadingMorePosts: boolean;
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
  updateReply: (replyId: string, content: string) => Promise<boolean>;
  deleteReply: (replyId: string) => Promise<boolean>;
  getRepliesForPost: (postId: string) => Promise<Reply[]>;
  sendMessage: (conversationId: string, content: string) => Promise<Message | null>;
  refreshConversations: () => Promise<void>;
  markConversationAsRead: (conversationId: string) => Promise<void>;
  markAllMessagesAsRead: () => Promise<void>;
  markNotificationsRead: () => Promise<void>;
  markSingleNotificationRead: (id: string) => Promise<void>;
  updateUserProfile: (data: Partial<Profile>) => Promise<void>;
  loadMorePosts: () => Promise<void>;
  refreshPosts: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);

  const [posts, setPosts] = useState<Post[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [followerIds, setFollowerIds] = useState<string[]>([]);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [isLoadingMorePosts, setIsLoadingMorePosts] = useState(false);
  const currentPageRef = React.useRef(0);

  // Initial data loading
  useEffect(() => {
    async function loadData() {
      try {
        const loadedProfile = await AuthService.getCurrentProfile();
        setUser(loadedProfile);

        const [{ posts: loadedPosts, hasMore }, followsData, followersData, notifData, loadedConvs] = await Promise.all([
          PostsService.getPosts(loadedProfile?.id, 0),
          loadedProfile && isSupabaseConfigured()
            ? supabase.from('follows').select('following_id').eq('follower_id', loadedProfile.id)
            : Promise.resolve({ data: null }),
          loadedProfile && isSupabaseConfigured()
            ? supabase.from('follows').select('follower_id').eq('following_id', loadedProfile.id)
            : Promise.resolve({ data: null }),
          loadedProfile ? NotificationsService.getNotifications(loadedProfile.id) : Promise.resolve([]),
          loadedProfile ? MessagesService.getConversations(loadedProfile.id) : Promise.resolve([]),
        ]);

        setPosts(loadedPosts);
        setHasMorePosts(hasMore);
        currentPageRef.current = 0;
        setConversations(loadedConvs);

        let initialFollowings: string[] = [];
        let initialFollowers: string[] = [];

        if (followsData.data) {
          initialFollowings = followsData.data.map((f: any) => f.following_id);
        }
        if (followersData?.data) {
          initialFollowers = followersData.data.map((f: any) => f.follower_id);
        }

        // Sync with local follows pool (membuat multi-akun & offline selalu konsisten)
        if (typeof window !== 'undefined' && loadedProfile) {
          try {
            const rawPool = localStorage.getItem('chronicle_follows_pool');
            const pool: Record<string, string[]> = rawPool ? JSON.parse(rawPool) : {};

            if (pool[loadedProfile.id]) {
              initialFollowings = Array.from(new Set([...initialFollowings, ...pool[loadedProfile.id]]));
            } else if (initialFollowings.length > 0) {
              pool[loadedProfile.id] = initialFollowings;
            }

            // Hitung followers dari pool akun lain yang mengikuti user ini
            Object.entries(pool).forEach(([otherId, followingList]) => {
              if (otherId !== loadedProfile.id && followingList.includes(loadedProfile.id)) {
                if (!initialFollowers.includes(otherId)) {
                  initialFollowers.push(otherId);
                }
              }
            });

            localStorage.setItem('chronicle_follows_pool', JSON.stringify(pool));
          } catch (e) {
            console.warn('Follows pool sync error:', e);
          }
        }

        setFollowingIds(initialFollowings);
        setFollowerIds(initialFollowers);
        setNotifications(notifData);
      } catch (err) {
        console.error('Failed loading app data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();

    if (isSupabaseConfigured()) {
      const { data: authSub } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
          loadData();
        }
      });

      // Capacitor Native Deep Link & OAuth Listener
      let cleanupAppUrl: (() => void) | undefined;
      if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
        import('@capacitor/app').then(({ App }) => {
          // Handle cold launch URL
          App.getLaunchUrl().then(async (launchUrl) => {
            if (launchUrl?.url) {
              handleDeepLinkUrl(launchUrl.url);
            }
          });

          // Handle active app resume / url open
          const urlListener = App.addListener('appUrlOpen', async (event) => {
            handleDeepLinkUrl(event.url);
          });

          cleanupAppUrl = () => {
            urlListener.then((l) => l.remove());
          };

          async function handleDeepLinkUrl(rawUrl: string) {
            try {
              const { Browser } = await import('@capacitor/browser');
              await Browser.close().catch(() => {});

              let paramsString = '';
              if (rawUrl.includes('#')) {
                paramsString = rawUrl.split('#')[1];
              } else if (rawUrl.includes('?')) {
                paramsString = rawUrl.split('?')[1];
              }

              const searchParams = new URLSearchParams(paramsString);
              const accessToken = searchParams.get('access_token');
              const refreshToken = searchParams.get('refresh_token');
              const code = searchParams.get('code');

              if (accessToken && refreshToken) {
                const { error: sessionError } = await supabase.auth.setSession({
                  access_token: accessToken,
                  refresh_token: refreshToken,
                });
                if (!sessionError) {
                  await loadData();
                  if (window.location.pathname.includes('/login') || window.location.pathname.includes('/signup')) {
                    window.location.href = '/';
                  }
                }
              } else if (code) {
                const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
                if (!exchangeError) {
                  await loadData();
                  if (window.location.pathname.includes('/login') || window.location.pathname.includes('/signup')) {
                    window.location.href = '/';
                  }
                }
              }
            } catch (e) {
              console.warn('[Chronicle Native] Failed to handle deep link URL:', e);
            }
          }
        });
      }

      return () => {
        authSub.subscription.unsubscribe();
        if (cleanupAppUrl) cleanupAppUrl();
      };
    }
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

  // Realtime subscription for user's direct messages & conversations
  useEffect(() => {
    if (!isSupabaseConfigured() || !user) return;

    const messagesGlobalChannel = supabase
      .channel(`public:messages_global:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          if (payload.new) {
            const convs = await MessagesService.getConversations(user.id);
            setConversations(convs);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversations',
        },
        async (payload) => {
          if (payload.new && (payload.new.participant_one === user.id || payload.new.participant_two === user.id)) {
            const convs = await MessagesService.getConversations(user.id);
            setConversations(convs);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
        },
        async () => {
          const convs = await MessagesService.getConversations(user.id);
          setConversations(convs);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesGlobalChannel);
    };
  }, [user]);

  const openCompose = useCallback(() => setIsComposeOpen(true), []);
  const closeCompose = useCallback(() => setIsComposeOpen(false), []);

  const loadMorePosts = useCallback(async () => {
    if (isLoadingMorePosts || !hasMorePosts) return;
    setIsLoadingMorePosts(true);
    try {
      const nextPage = currentPageRef.current + 1;
      const { posts: morePosts, hasMore } = await PostsService.getPosts(user?.id, nextPage);
      if (morePosts.length > 0) {
        setPosts(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const deduped = morePosts.filter(p => !existingIds.has(p.id));
          return [...prev, ...deduped];
        });
        currentPageRef.current = nextPage;
      }
      setHasMorePosts(hasMore);
    } catch (e) {
      console.error('Failed to load more posts:', e);
    } finally {
      setIsLoadingMorePosts(false);
    }
  }, [isLoadingMorePosts, hasMorePosts, user?.id]);

  const refreshPosts = useCallback(async () => {
    try {
      const { posts: freshPosts, hasMore } = await PostsService.getPosts(user?.id, 0);
      setPosts(freshPosts);
      setHasMorePosts(hasMore);
      currentPageRef.current = 0;
    } catch (e) {
      console.error('Failed to refresh posts:', e);
    }
  }, [user?.id]);

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
          
          let authorId = targetPost?.user_id;
          if (!authorId) {
            const { data } = await supabase.from('posts').select('user_id').eq('id', postId).single();
            authorId = data?.user_id;
          }

          if (authorId && authorId !== user.id) {
            await NotificationsService.createNotification(authorId, user.id, 'like', postId);
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

          let authorId = targetPost?.user_id;
          if (!authorId) {
            const { data } = await supabase.from('posts').select('user_id').eq('id', postId).single();
            authorId = data?.user_id;
          }

          if (authorId && authorId !== user.id) {
            await NotificationsService.createNotification(authorId, user.id, 'repost', postId);
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

  const friendIds = useMemo(() => {
    return followingIds.filter((id) => followerIds.includes(id));
  }, [followingIds, followerIds]);

  const isFriend = useCallback((userId: string) => {
    return friendIds.includes(userId);
  }, [friendIds]);

  const isFollower = useCallback((userId: string) => {
    return followerIds.includes(userId);
  }, [followerIds]);

  const toggleFollow = useCallback(async (userId: string) => {
    if (!user) return;
    const isFollowing = followingIds.includes(userId);

    // Optimistic UI update
    const updatedFollowings = isFollowing
      ? followingIds.filter(id => id !== userId)
      : [...followingIds, userId];

    setFollowingIds(updatedFollowings);

    // Update local follows pool
    if (typeof window !== 'undefined') {
      try {
        const rawPool = localStorage.getItem('chronicle_follows_pool');
        const pool: Record<string, string[]> = rawPool ? JSON.parse(rawPool) : {};
        pool[user.id] = updatedFollowings;
        localStorage.setItem('chronicle_follows_pool', JSON.stringify(pool));
      } catch (e) {
        console.warn('LocalStorage follow pool error:', e);
      }
    }

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

  const addReply = useCallback(async (postId: string, content: string, parentReplyId?: string | null) => {
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
      let authorId = posts.find(p => p.id === postId)?.user_id;
      if (!authorId) {
        const { data } = await supabase.from('posts').select('user_id').eq('id', postId).single();
        authorId = data?.user_id;
      }
      if (authorId && authorId !== user.id) {
        await NotificationsService.createNotification(authorId, user.id, 'reply', postId);
      }
    }
    return reply;
  }, [user, posts]);

  const updateReply = useCallback(async (replyId: string, content: string) => {
    return await PostsService.updateReply(replyId, content);
  }, []);

  const deleteReply = useCallback(async (replyId: string) => {
    return await PostsService.deleteReply(replyId);
  }, []);

  const getRepliesForPost = useCallback(async (postId: string) => {
    return await PostsService.getReplies(postId);
  }, []);

  const sendMessage = useCallback(async (conversationId: string, content: string): Promise<Message | null> => {
    if (!user) return null;
    const msg = await MessagesService.sendMessage(conversationId, user.id, content);
    if (msg) {
      const updatedConvs = await MessagesService.getConversations(user.id);
      setConversations(updatedConvs);
    }
    return msg;
  }, [user]);

  const refreshConversations = useCallback(async () => {
    if (!user) return;
    const convs = await MessagesService.getConversations(user.id);
    setConversations(convs);
  }, [user]);

  const markConversationAsRead = useCallback(async (conversationId: string) => {
    if (!user || !conversationId) return;
    setConversations(prev =>
      prev.map(c => (c.id === conversationId ? { ...c, unread_count: 0 } : c))
    );
    await MessagesService.markAsRead(conversationId, user.id);

    // Also mark related message notifications as read
    setNotifications(prev =>
      prev.map(n => (n.type === 'message' ? { ...n, read: true } : n))
    );
    if (isSupabaseConfigured()) {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('type', 'message');
    }
  }, [user]);

  const markAllMessagesAsRead = useCallback(async () => {
    if (!user) return;
    setConversations(prev => prev.map(c => ({ ...c, unread_count: 0 })));
    setNotifications(prev =>
      prev.map(n => (n.type === 'message' ? { ...n, read: true } : n))
    );
    for (const conv of conversations) {
      if (conv.unread_count > 0) {
        await MessagesService.markAsRead(conv.id, user.id);
      }
    }
  }, [user, conversations]);

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
    followerIds,
    friendIds,
    isFriend,
    isFollower,
    unreadNotifsCount,
    unreadMessagesCount,
    isComposeOpen,
    searchQuery,
    loading,
    hasMorePosts,
    isLoadingMorePosts,
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
    updateReply,
    deleteReply,
    getRepliesForPost,
    sendMessage,
    refreshConversations,
    markConversationAsRead,
    markAllMessagesAsRead,
    markNotificationsRead,
    markSingleNotificationRead,
    updateUserProfile,
    loadMorePosts,
    refreshPosts,
  }), [
    user,
    posts,
    notifications,
    conversations,
    followingIds,
    followerIds,
    friendIds,
    isFriend,
    isFollower,
    unreadNotifsCount,
    unreadMessagesCount,
    isComposeOpen,
    searchQuery,
    loading,
    hasMorePosts,
    isLoadingMorePosts,
    openCompose,
    closeCompose,
    createPost,
    toggleLike,
    toggleRepost,
    toggleBookmark,
    toggleFollow,
    addReply,
    updateReply,
    deleteReply,
    getRepliesForPost,
    sendMessage,
    refreshConversations,
    markConversationAsRead,
    markAllMessagesAsRead,
    markNotificationsRead,
    markSingleNotificationRead,
    updateUserProfile,
    loadMorePosts,
    refreshPosts,
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
