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
  media_url?: string | null;
  media_type?: 'image' | 'audio' | null;
  audio_duration?: number | null;
  reply_to_id?: string | null;
  reply_to?: {
    id: string;
    sender_id: string;
    sender_name: string;
    content: string;
    media_type?: 'image' | 'audio' | null;
  } | null;
  is_edited?: boolean;
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

export interface StorySong {
  id: string;
  title: string;
  artist: string;
  previewUrl: string;
  coverUrl?: string | null;
  startTime?: number;
  duration?: number;
}

export interface StoryViewer {
  id: string;
  story_id: string;
  viewer_id: string;
  viewed_at: string;
  viewer: Profile;
}

export interface StoryItem {
  id: string;
  user_id: string;
  media_url?: string | null;
  media_type: 'image' | 'text';
  text_content?: string | null;
  bg_gradient?: string;
  caption?: string | null;
  song_data?: StorySong | null;
  tagged_users?: Profile[] | null;
  created_at: string;
  expires_at: string;
  author: Profile;
  views_count?: number;
  viewers?: StoryViewer[];
}

export interface UserStoriesGroup {
  user_id: string;
  author: Profile;
  hasUnseen: boolean;
  stories: StoryItem[];
  latestTimestamp: number;
}

export interface TrendingTopic {
  id: string;
  category: string;
  tag: string;
  posts_count: string;
}
