export interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string;
  banner_url?: string;
  bio?: string;
  website?: string;
  following_count?: number;
  followers_count?: number;
  posts_count?: number;
  created_at?: string;
}

export interface Post {
  id: string;
  user_id: string;
  content: string;
  media_url?: string | null;
  created_at: string;
  author: Profile;
  likes_count: number;
  reposts_count: number;
  replies_count: number;
  bookmarks_count: number;
  views_count?: number;
  is_liked?: boolean;
  is_reposted?: boolean;
  is_bookmarked?: boolean;
}

export interface Reply {
  id: string;
  post_id: string;
  user_id: string;
  parent_reply_id?: string | null;
  content: string;
  created_at: string;
  author: Profile;
  likes_count: number;
  is_liked?: boolean;
}

export interface Notification {
  id: string;
  user_id: string;
  sender_id: string;
  sender: Profile;
  type: 'like' | 'repost' | 'reply' | 'mention' | 'follow' | 'message';
  post_id?: string;
  post_snippet?: string;
  read: boolean;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read: boolean;
  created_at: string;
}

export interface Conversation {
  id: string;
  participant: Profile;
  last_message?: Message;
  unread_count: number;
  updated_at: string;
}

export interface TrendingTopic {
  id: string;
  category: string;
  tag: string;
  posts_count: string;
}
