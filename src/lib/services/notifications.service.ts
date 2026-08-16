import { Notification } from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';

export const NotificationsService = {
  async getNotifications(userId: string): Promise<Notification[]> {
    if (!isSupabaseConfigured() || !userId) return [];
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          sender:profiles!sender_id (id, username, full_name, avatar_url)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []).map((n: any) => ({
        id: n.id,
        user_id: n.user_id,
        sender_id: n.sender_id,
        sender: n.sender,
        type: n.type,
        post_id: n.post_id,
        read: n.read,
        created_at: n.created_at,
      }));
    } catch (e) {
      console.warn('Failed to fetch notifications:', e);
      return [];
    }
  },

  async getNotificationById(id: string): Promise<Notification | null> {
    if (!isSupabaseConfigured() || !id) return null;
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          sender:profiles!sender_id (id, username, full_name, avatar_url)
        `)
        .eq('id', id)
        .single();

      if (error || !data) return null;
      return {
        id: data.id,
        user_id: data.user_id,
        sender_id: data.sender_id,
        sender: data.sender,
        type: data.type,
        post_id: data.post_id,
        read: data.read,
        created_at: data.created_at,
      };
    } catch (e) {
      console.warn('Failed to fetch single notification:', e);
      return null;
    }
  },

  async createNotification(
    userId: string,
    senderId: string,
    type: 'like' | 'repost' | 'reply' | 'mention' | 'follow' | 'message',
    postId?: string | null
  ): Promise<void> {
    // Don't notify yourself
    if (!isSupabaseConfigured() || !userId || !senderId || userId === senderId) return;
    try {
      const { error } = await supabase.from('notifications').insert({
        user_id: userId,
        sender_id: senderId,
        type,
        post_id: postId || null,
        read: false,
      });

      if (error) {
        console.warn('Supabase notification insert info:', error.message || error);
      }
    } catch (e) {
      console.warn('Failed to create notification:', e);
    }
  },

  async markAllAsRead(userId: string): Promise<void> {
    if (!isSupabaseConfigured() || !userId) return;
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId);

      if (error) {
        console.error('Failed to mark notifications as read:', error);
      }
    } catch (e) {
      console.warn('Failed to mark notifications as read:', e);
    }
  },

  async markSingleAsRead(notificationId: string): Promise<void> {
    if (!isSupabaseConfigured() || !notificationId) return;
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) {
        console.error('Failed to mark single notification as read:', error);
      }
    } catch (e) {
      console.warn('Failed to mark notification as read:', e);
    }
  },
};
