import { Post, Reply, Profile } from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';

const PAGE_SIZE = 20;

export const PostsService = {
  // Get paginated posts for feed with accurate counts from related tables
  async getPosts(
    currentUserId?: string,
    page = 0,
    limit = PAGE_SIZE
  ): Promise<{ posts: Post[]; hasMore: boolean }> {
    if (isSupabaseConfigured()) {
      try {
        const from = page * limit;
        const to = from + limit - 1;

        const { data, error } = await supabase
          .from('posts')
          .select(`
            *,
            author:profiles!user_id (*),
            replies(count),
            likes(count),
            reposts(count),
            bookmarks(count)
          `)
          .order('created_at', { ascending: false })
          .range(from, to);

        if (!error && data) {
          // If user is logged in, fetch interaction state for this page
          let userLikedPostIds = new Set<string>();
          let userRepostedPostIds = new Set<string>();
          let userBookmarkedPostIds = new Set<string>();

          if (currentUserId && data.length > 0) {
            const ids = data.map((d: any) => d.id);
            const [likesRes, repostsRes, bookmarksRes] = await Promise.all([
              supabase.from('likes').select('post_id').eq('user_id', currentUserId).in('post_id', ids),
              supabase.from('reposts').select('post_id').eq('user_id', currentUserId).in('post_id', ids),
              supabase.from('bookmarks').select('post_id').eq('user_id', currentUserId).in('post_id', ids),
            ]);

            if (likesRes.data) userLikedPostIds = new Set(likesRes.data.map((l: any) => l.post_id));
            if (repostsRes.data) userRepostedPostIds = new Set(repostsRes.data.map((r: any) => r.post_id));
            if (bookmarksRes.data) userBookmarkedPostIds = new Set(bookmarksRes.data.map((b: any) => b.post_id));
          }

          const posts = data.map((item: any) => {
            const repliesCount = item.replies?.[0]?.count ?? 0;
            const likesCount = item.likes?.[0]?.count ?? 0;
            const repostsCount = item.reposts?.[0]?.count ?? 0;
            const bookmarksCount = item.bookmarks?.[0]?.count ?? 0;

            return {
              id: item.id,
              user_id: item.user_id,
              content: item.content,
              media_url: item.media_url,
              created_at: item.created_at,
              author: item.author,
              likes_count: likesCount,
              reposts_count: repostsCount,
              replies_count: repliesCount,
              bookmarks_count: bookmarksCount,
              views_count: item.views_count || 120,
              is_liked: userLikedPostIds.has(item.id),
              is_reposted: userRepostedPostIds.has(item.id),
              is_bookmarked: userBookmarkedPostIds.has(item.id),
            };
          });

          return { posts, hasMore: data.length === limit };
        }
      } catch (e) {
        console.warn('Supabase fetch failed:', e);
      }
    }
    return { posts: [], hasMore: false };
  },

  // Create new post
  async createPost(content: string, user: Profile, mediaUrl?: string | null): Promise<Post> {
    const newPost: Post = {
      id: `post_${Date.now()}`,
      user_id: user.id,
      author: user,
      content,
      media_url: mediaUrl || null,
      created_at: new Date().toISOString(),
      likes_count: 0,
      reposts_count: 0,
      replies_count: 0,
      bookmarks_count: 0,
      views_count: 1,
      is_liked: false,
      is_reposted: false,
      is_bookmarked: false,
    };

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('posts')
          .insert({
            user_id: user.id,
            content,
            media_url: mediaUrl || null,
          })
          .select(`
            *,
            author:profiles!user_id (*)
          `)
          .single();

        if (!error && data) {
          return {
            id: data.id,
            user_id: data.user_id,
            content: data.content,
            media_url: data.media_url,
            created_at: data.created_at,
            author: data.author,
            likes_count: 0,
            reposts_count: 0,
            replies_count: 0,
            bookmarks_count: 0,
            views_count: 1,
            is_liked: false,
            is_reposted: false,
            is_bookmarked: false,
          };
        }
      } catch (e) {
        console.error('Error saving post to Supabase:', e);
      }
    }

    return newPost;
  },

  // Update existing post
  async updatePost(postId: string, userId: string, content: string): Promise<boolean> {
    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase
          .from('posts')
          .update({ content, updated_at: new Date().toISOString() })
          .eq('id', postId)
          .eq('user_id', userId);

        if (error) throw error;
        return true;
      } catch (e) {
        console.error('Error updating post:', e);
        return false;
      }
    }
    return true;
  },

  // Delete post
  async deletePost(postId: string, userId: string): Promise<boolean> {
    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase
          .from('posts')
          .delete()
          .eq('id', postId)
          .eq('user_id', userId);

        if (error) throw error;
        return true;
      } catch (e) {
        console.error('Error deleting post:', e);
        return false;
      }
    }
    return true;
  },

  // Get single post by ID
  async getPostById(id: string, currentPosts: Post[]): Promise<Post | undefined> {
    const existing = currentPosts.find(p => p.id === id);
    if (existing) return existing;

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('posts')
          .select(`
            *,
            author:profiles!user_id(*),
            replies(count),
            likes(count),
            reposts(count),
            bookmarks(count)
          `)
          .eq('id', id)
          .single();

        if (!error && data) {
          return {
            id: data.id,
            user_id: data.user_id,
            content: data.content,
            media_url: data.media_url,
            created_at: data.created_at,
            author: data.author,
            likes_count: data.likes?.[0]?.count ?? 0,
            reposts_count: data.reposts?.[0]?.count ?? 0,
            replies_count: data.replies?.[0]?.count ?? 0,
            bookmarks_count: data.bookmarks?.[0]?.count ?? 0,
            views_count: data.views_count || 120,
            is_liked: false,
            is_reposted: false,
            is_bookmarked: false,
          };
        }
      } catch (e) {
        console.warn(e);
      }
    }

    return undefined;
  },

  // Get replies for a post
  async getReplies(postId: string): Promise<Reply[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('replies')
          .select('*, author:profiles!user_id(*)')
          .eq('post_id', postId)
          .order('created_at', { ascending: true });

        if (!error && data) {
          return data.map((r: any) => ({
            id: r.id,
            post_id: r.post_id,
            user_id: r.user_id,
            parent_reply_id: r.parent_reply_id,
            content: r.content,
            created_at: r.created_at,
            author: r.author,
            likes_count: 0,
            is_liked: false,
          }));
        }
      } catch (e) {
        console.warn(e);
      }
    }

    return [];
  },

  // Add a reply
  async createReply(postId: string, content: string, user: Profile, parentReplyId?: string | null): Promise<Reply | null> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('replies')
          .insert({
            post_id: postId,
            user_id: user.id,
            parent_reply_id: parentReplyId || null,
            content,
          })
          .select('*, author:profiles!user_id(*)')
          .single();

        if (!error && data) {
          return {
            id: data.id,
            post_id: data.post_id,
            user_id: data.user_id,
            parent_reply_id: data.parent_reply_id,
            content: data.content,
            created_at: data.created_at,
            author: data.author,
            likes_count: 0,
            is_liked: false,
          };
        }
      } catch (e) {
        console.error('Error inserting reply to Supabase:', e);
      }
    }

    return {
      id: `rep_${Date.now()}`,
      post_id: postId,
      user_id: user.id,
      parent_reply_id: parentReplyId || null,
      author: user,
      content,
      created_at: new Date().toISOString(),
      likes_count: 0,
      is_liked: false,
    };
  },
};
