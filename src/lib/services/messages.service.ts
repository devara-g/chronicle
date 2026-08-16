import { Conversation, Message, Profile } from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';

export const MessagesService = {
  // Get all conversations for a user with participant profiles and latest messages
  async getConversations(userId: string): Promise<Conversation[]> {
    if (!isSupabaseConfigured() || !userId) return [];
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          updated_at,
          participant_one,
          participant_two,
          user1:profiles!participant_one (*),
          user2:profiles!participant_two (*)
        `)
        .or(`participant_one.eq.${userId},participant_two.eq.${userId}`)
        .order('updated_at', { ascending: false });

      if (error || !data) return [];

      const conversations: Conversation[] = await Promise.all(
        data.map(async (item: any) => {
          const isUser1 = item.participant_one === userId;
          const participant: Profile = isUser1 ? item.user2 : item.user1;

          // Fetch the latest message for preview
          const { data: lastMsgData } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', item.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          // Fetch unread count for current user
          const { count: unreadCount } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', item.id)
            .neq('sender_id', userId)
            .eq('read', false);

          return {
            id: item.id,
            participant: participant || {
              id: isUser1 ? item.participant_two : item.participant_one,
              username: 'user',
              full_name: 'Chronicle User',
              avatar_url: '/default-avatar.jpg',
            },
            last_message: lastMsgData || undefined,
            unread_count: unreadCount || 0,
            updated_at: item.updated_at,
          };
        })
      );

      return conversations;
    } catch (e) {
      console.warn('Failed to fetch conversations:', e);
      return [];
    }
  },

  // Get messages for a specific conversation
  async getMessages(conversationId: string): Promise<Message[]> {
    if (!isSupabaseConfigured() || !conversationId) return [];
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (e) {
      console.warn('Failed to fetch messages:', e);
      return [];
    }
  },

  // Send a message and update conversation timestamp
  async sendMessage(conversationId: string, senderId: string, content: string): Promise<Message | null> {
    if (!isSupabaseConfigured()) return null;
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: senderId,
          content: content.trim(),
          read: false,
        })
        .select('*')
        .single();

      if (error) throw error;

      // Update conversation updated_at
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);

      // Find recipient to send notification
      const { data: conv } = await supabase
        .from('conversations')
        .select('participant_one, participant_two')
        .eq('id', conversationId)
        .single();

      if (conv) {
        const recipientId = conv.participant_one === senderId ? conv.participant_two : conv.participant_one;
        const { NotificationsService } = await import('./notifications.service');
        await NotificationsService.createNotification(
          recipientId,
          senderId,
          'message',
          null,
          content.trim().substring(0, 70)
        );
      }

      return data;
    } catch (e) {
      console.error('Failed to send message:', e);
      return null;
    }
  },

  // Mark all messages in a conversation as read
  async markAsRead(conversationId: string, currentUserId: string): Promise<void> {
    if (!isSupabaseConfigured() || !conversationId || !currentUserId) return;
    try {
      await supabase
        .from('messages')
        .update({ read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', currentUserId)
        .eq('read', false);
    } catch (e) {
      console.warn('Failed to mark messages as read:', e);
    }
  },

  // Find or create conversation between two users
  async getOrCreateConversation(user1Id: string, user2Id: string): Promise<string | null> {
    if (!isSupabaseConfigured() || !user1Id || !user2Id || user1Id === user2Id) return null;
    try {
      // Check both participant combinations
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .or(`and(participant_one.eq.${user1Id},participant_two.eq.${user2Id}),and(participant_one.eq.${user2Id},participant_two.eq.${user1Id})`)
        .maybeSingle();

      if (existing) return existing.id;

      // Create new conversation
      const { data: created, error } = await supabase
        .from('conversations')
        .insert({
          participant_one: user1Id,
          participant_two: user2Id,
        })
        .select('id')
        .single();

      if (error) throw error;
      return created.id;
    } catch (e) {
      console.error('Failed to get or create conversation:', e);
      return null;
    }
  },

  // Search users for starting new conversations
  async searchUsers(query: string, currentUserId: string): Promise<Profile[]> {
    if (!isSupabaseConfigured()) return [];
    try {
      let req = supabase.from('profiles').select('*').neq('id', currentUserId);
      if (query.trim()) {
        req = req.or(`username.ilike.%${query}%,full_name.ilike.%${query}%`);
      }
      const { data, error } = await req.limit(10);
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.warn('Failed to search users for chat:', e);
      return [];
    }
  }
};
