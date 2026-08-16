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

  // Get messages for a specific conversation with reply_to context
  async getMessages(conversationId: string): Promise<Message[]> {
    if (!isSupabaseConfigured() || !conversationId) return [];
    try {
      // Fetch messages with sender profile info
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!sender_id (full_name)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      let messageList = data;

      if (error || !data) {
        // Fallback query if profiles join has issue
        const { data: fallbackData } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });
        messageList = fallbackData || [];
      }

      if (!messageList || messageList.length === 0) return [];

      // Create lookup map for instant parent message resolution
      const msgMap = new Map<string, any>();
      messageList.forEach((m: any) => msgMap.set(m.id, m));

      return messageList.map((m: any) => {
        let replyObj = null;
        if (m.reply_to_id && msgMap.has(m.reply_to_id)) {
          const parent = msgMap.get(m.reply_to_id);
          replyObj = {
            id: parent.id,
            sender_id: parent.sender_id,
            sender_name: parent.sender?.full_name || 'User',
            content: parent.content || '',
            media_type: parent.media_type || null,
          };
        }

        return {
          id: m.id,
          conversation_id: m.conversation_id,
          sender_id: m.sender_id,
          content: m.content,
          media_url: m.media_url || null,
          media_type: m.media_type || null,
          audio_duration: m.audio_duration || null,
          reply_to_id: m.reply_to_id || null,
          reply_to: replyObj,
          is_edited: m.is_edited || false,
          read: m.read,
          created_at: m.created_at,
        };
      });
    } catch (e) {
      console.warn('Failed to fetch messages:', e);
      return [];
    }
  },

  // Send a message and update conversation timestamp
  async sendMessage(
    conversationId: string,
    senderId: string,
    content: string,
    mediaUrl?: string | null,
    mediaType?: 'image' | 'audio' | null,
    replyToId?: string | null,
    audioDuration?: number | null
  ): Promise<Message | null> {
    if (!isSupabaseConfigured()) return null;
    try {
      const payload: any = {
        conversation_id: conversationId,
        sender_id: senderId,
        content: (content || '').trim(),
        read: false,
      };

      if (mediaUrl) payload.media_url = mediaUrl;
      if (mediaType) payload.media_type = mediaType;
      if (replyToId) payload.reply_to_id = replyToId;
      if (audioDuration) payload.audio_duration = audioDuration;

      const { data, error } = await supabase
        .from('messages')
        .insert(payload)
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
          'message'
        );
      }

      return data;
    } catch (e) {
      console.error('Failed to send message:', e);
      return null;
    }
  },

  // Edit message content
  async editMessage(messageId: string, newContent: string): Promise<boolean> {
    if (!isSupabaseConfigured() || !messageId) return false;
    try {
      const { error } = await supabase
        .from('messages')
        .update({
          content: newContent.trim(),
          is_edited: true,
        })
        .eq('id', messageId);

      if (error) {
        console.error('Failed to edit message:', error);
        return false;
      }
      return true;
    } catch (e) {
      console.error('Failed to edit message:', e);
      return false;
    }
  },

  // Delete a message
  async deleteMessage(messageId: string, mediaUrl?: string | null): Promise<boolean> {
    if (!isSupabaseConfigured() || !messageId) return false;
    try {
      if (mediaUrl) {
        const { StorageService } = await import('./storage.service');
        await StorageService.deleteMedia(mediaUrl).catch(() => {});
      }

      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);

      if (error) {
        console.error('Failed to delete message:', error);
        return false;
      }
      return true;
    } catch (e) {
      console.error('Failed to delete message:', e);
      return false;
    }
  },

  // Mark all messages in a conversation as read
  async markAsRead(conversationId: string, currentUserId: string): Promise<void> {
    if (!isSupabaseConfigured() || !conversationId || !currentUserId) return;
    try {
      const { error } = await supabase
        .from('messages')
        .update({ read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', currentUserId);

      if (error) {
        console.error('Failed to mark messages as read:', error);
      }
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
      console.warn('Failed to search users:', e);
      return [];
    }
  },
};
