import { Conversation, Message } from '@/types';

export const MessagesService = {
  getConversations(): Conversation[] {
    return [];
  },

  getMessages(conversationId: string): Message[] {
    return [];
  },

  sendMessage(conversationId: string, senderId: string, content: string): Message {
    const newMessage: Message = {
      id: `msg_${Date.now()}`,
      conversation_id: conversationId,
      sender_id: senderId,
      content,
      read: true,
      created_at: new Date().toISOString(),
    };
    return newMessage;
  },
};
