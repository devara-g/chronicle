import { Post, Reply, Profile } from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';

export const PostsService = {
  // Get all posts for feed
  async getPosts(): Promise<Post[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('posts')
          .select(`
            *,
            author:profiles!user_id (*)
          `)
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          return data.map((item: any) => ({
            id: item.id,
            user_id: item.user_id,
            content: item.content,
            media_url: item.media_url,
            created_at: item.created_at,
            author: item.author,
            likes_count: item.likes_count || 0,
            reposts_count: item.reposts_count || 0,
            replies_count: item.replies_count || 0,
            bookmarks_count: item.bookmarks_count || 0,
            views_count: item.views_count || 120,
            is_liked: false,
            is_reposted: false,
            is_bookmarked: false,
          }));
        }
      } catch (e) {
        console.warn('Supabase fetch failed:', e);
      }
    }
    return [];
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
            media_url: mediaUrl,
          })
          .select('*, author:profiles!user_id(*)')
          .single();

        if (!error && data) {
          return {
            ...newPost,
            id: data.id,
            author: data.author || user,
          };
        }
      } catch (e) {
        console.warn('Supabase insert failed:', e);
      }
    }

    return newPost;
  },

  // Update a post
  async updatePost(postId: string, userId: string, newContent: string): Promise<boolean> {
    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase
          .from('posts')
          .update({ content: newContent })
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

  // Delete a post
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
          .select('*, author:profiles!user_id(*)')
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
            likes_count: 0,
            reposts_count: 0,
            replies_count: 0,
            bookmarks_count: 0,
            views_count: 1,
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
  async createReply(postId: string, content: string, user: Profile, parentReplyId?: string | null): Promise<Reply> {
    const newReply: Reply = {
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

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('replies')
          .insert({
            post_id: postId,
            user_id: user.id,
            parent_reply_id: parentReplyId,
            content,
          })
          .select('*, author:profiles!user_id(*)')
          .single();
          
        if (!error && data) {
          return {
             ...newReply,
             id: data.id,
             author: data.author || user
          }
        }
      } catch (e) {
        console.warn(e);
      }
    }

    return newReply;
  },
};
