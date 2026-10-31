import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { Profile, StoryItem, UserStoriesGroup } from '@/types';

const LOCAL_STORAGE_STORIES_KEY = 'chronicle_shared_stories_pool';
const LOCAL_STORAGE_SEEN_KEY = 'chronicle_seen_stories_set';

export const StoriesService = {
  // Ambil semua story aktif (kurang dari 24 jam)
  async getStories(
    currentUserId?: string,
    allowedUserIds: string[] = []
  ): Promise<{ myGroup: UserStoriesGroup | null; friendsGroups: UserStoriesGroup[] }> {
    let allStories: StoryItem[] = [];

    // 1. Ambil dari local pool
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(LOCAL_STORAGE_STORIES_KEY);
        if (stored) {
          allStories = JSON.parse(stored);
        }
      } catch {
        allStories = [];
      }
    }

    // 2. Jika Supabase aktif, coba fetch dari tabel user_stories jika ada
    if (isSupabaseConfigured()) {
      try {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data, error } = await supabase
          .from('user_stories')
          .select('*, author:profiles(*)')
          .gt('created_at', oneDayAgo)
          .order('created_at', { ascending: true });

        if (!error && data && data.length > 0) {
          const dbStories: StoryItem[] = data.map((row: any) => ({
            id: row.id,
            user_id: row.user_id,
            media_url: row.media_url || null,
            media_type: row.media_type || 'image',
            text_content: row.text_content || null,
            bg_gradient: row.bg_gradient || undefined,
            caption: row.caption || null,
            created_at: row.created_at,
            expires_at: row.expires_at || new Date(new Date(row.created_at).getTime() + 24 * 60 * 60 * 1000).toISOString(),
            author: row.author || {
              id: row.user_id,
              username: 'user',
              full_name: 'User',
              avatar_url: '',
            },
            views_count: row.views_count || 0,
          }));

          // Gabungkan dengan local stories unik
          const idSet = new Set(dbStories.map((s) => s.id));
          allStories = [...dbStories, ...allStories.filter((s) => !idSet.has(s.id))];
        }
      } catch {
        // Abaikan jika tabel belum ada
      }
    }

    // Filter story yang belum lewat 24 jam
    const now = Date.now();
    const activeStories = allStories.filter((s) => {
      const createdTime = new Date(s.created_at).getTime();
      return now - createdTime < 24 * 60 * 60 * 1000;
    });

    // Ambil daftar story yang sudah pernah dilihat
    let seenStoryIds = new Set<string>();
    if (typeof window !== 'undefined') {
      try {
        const rawSeen = localStorage.getItem(LOCAL_STORAGE_SEEN_KEY);
        if (rawSeen) seenStoryIds = new Set(JSON.parse(rawSeen));
      } catch {}
    }

    // Kelompokkan per user
    const groupedMap = new Map<string, UserStoriesGroup>();

    activeStories.forEach((story) => {
      // Filter: Hanya tampilkan story saya dan teman/following
      const isMine = currentUserId && story.user_id === currentUserId;
      const isFriend = allowedUserIds.includes(story.user_id);

      if (!isMine && !isFriend && allowedUserIds.length > 0) {
        return;
      }

      if (!groupedMap.has(story.user_id)) {
        groupedMap.set(story.user_id, {
          user_id: story.user_id,
          author: story.author,
          hasUnseen: false,
          stories: [],
          latestTimestamp: 0,
        });
      }

      const group = groupedMap.get(story.user_id)!;
      group.stories.push(story);

      const storyTime = new Date(story.created_at).getTime();
      if (storyTime > group.latestTimestamp) {
        group.latestTimestamp = storyTime;
      }

      if (!seenStoryIds.has(story.id) && story.user_id !== currentUserId) {
        group.hasUnseen = true;
      }
    });

    const myGroup = currentUserId ? groupedMap.get(currentUserId) || null : null;
    const friendsGroups = Array.from(groupedMap.values())
      .filter((g) => g.user_id !== currentUserId)
      .sort((a, b) => {
        // Tampilkan yang belum dilihat di depan
        if (a.hasUnseen && !b.hasUnseen) return -1;
        if (!a.hasUnseen && b.hasUnseen) return 1;
        return b.latestTimestamp - a.latestTimestamp;
      });

    return { myGroup, friendsGroups };
  },

  // Buat Story Baru (Image atau Text)
  async createStory(
    user: Profile,
    storyData: {
      media_url?: string | null;
      media_type: 'image' | 'text';
      text_content?: string | null;
      bg_gradient?: string;
      caption?: string | null;
    }
  ): Promise<StoryItem> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const newStory: StoryItem = {
      id: `story_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`,
      user_id: user.id,
      media_url: storyData.media_url || null,
      media_type: storyData.media_type,
      text_content: storyData.text_content || null,
      bg_gradient: storyData.bg_gradient || 'from-[#0d1117] via-[#161b22] to-[#010409]',
      caption: storyData.caption || null,
      created_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      author: user,
      views_count: 0,
    };

    // 1. Simpan ke local pool
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(LOCAL_STORAGE_STORIES_KEY);
        const pool: StoryItem[] = raw ? JSON.parse(raw) : [];
        pool.push(newStory);
        localStorage.setItem(LOCAL_STORAGE_STORIES_KEY, JSON.stringify(pool));
        window.dispatchEvent(new Event('chronicle_story_updated'));
      } catch (e) {
        console.warn('LocalStorage story save error:', e);
      }
    }

    // 2. Coba simpan ke Supabase jika ada tabelnya
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('user_stories').insert({
          id: newStory.id,
          user_id: user.id,
          media_url: newStory.media_url,
          media_type: newStory.media_type,
          text_content: newStory.text_content,
          bg_gradient: newStory.bg_gradient,
          caption: newStory.caption,
          created_at: newStory.created_at,
          expires_at: newStory.expires_at,
        });

        // Broadcast realtime
        const ch = supabase.channel('global_stories_feed');
        ch.send({
          type: 'broadcast',
          event: 'new_story',
          payload: newStory,
        });
      } catch {}
    }

    return newStory;
  },

  // Tandai Story sudah dilihat
  markStorySeen(storyId: string) {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_SEEN_KEY);
      const seen = raw ? JSON.parse(raw) : [];
      if (!seen.includes(storyId)) {
        seen.push(storyId);
        localStorage.setItem(LOCAL_STORAGE_SEEN_KEY, JSON.stringify(seen));
        window.dispatchEvent(new Event('chronicle_story_updated'));
      }
    } catch {}
  },

  // Hapus Story
  async deleteStory(storyId: string) {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(LOCAL_STORAGE_STORIES_KEY);
        if (raw) {
          const pool: StoryItem[] = JSON.parse(raw);
          const updated = pool.filter((s) => s.id !== storyId);
          localStorage.setItem(LOCAL_STORAGE_STORIES_KEY, JSON.stringify(updated));
          window.dispatchEvent(new Event('chronicle_story_updated'));
        }
      } catch {}
    }

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('user_stories').delete().eq('id', storyId);
      } catch {}
    }
  },
};

