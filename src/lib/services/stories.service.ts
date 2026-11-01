import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { Profile, StoryItem, StoryViewer, UserStoriesGroup } from '@/types';

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
          .select('*, author:profiles(*), views:user_story_views(*, viewer:profiles(*))')
          .gt('created_at', oneDayAgo)
          .order('created_at', { ascending: true });

        if (!error && data && data.length > 0) {
          const dbStories: StoryItem[] = data.map((row: any) => {
            const rawViews = row.views || [];
            const mappedViews: StoryViewer[] = rawViews.map((v: any) => ({
              id: v.id,
              story_id: v.story_id,
              viewer_id: v.viewer_id,
              viewed_at: v.viewed_at,
              viewer: v.viewer || {
                id: v.viewer_id,
                username: 'user',
                full_name: 'User',
                avatar_url: '',
              },
            }));

            return {
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
              views_count: mappedViews.length,
              viewers: mappedViews,
            };
          });

          // Gabungkan dengan local stories unik
          const idSet = new Set(dbStories.map((s) => s.id));
          allStories = [...dbStories, ...allStories.filter((s) => !idSet.has(s.id))];
        }
      } catch {
        // Fallback jika views table belum di-join
        try {
          const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
          const { data } = await supabase
            .from('user_stories')
            .select('*, author:profiles(*)')
            .gt('created_at', oneDayAgo)
            .order('created_at', { ascending: true });

          if (data && data.length > 0) {
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
              views_count: 0,
            }));
            const idSet = new Set(dbStories.map((s) => s.id));
            allStories = [...dbStories, ...allStories.filter((s) => !idSet.has(s.id))];
          }
        } catch {}
      }
    }

    // Filter story yang belum lewat 24 jam
    const now = Date.now();
    const activeStories = allStories.filter((s) => {
      const createdTime = new Date(s.created_at).getTime();
      return now - createdTime < 24 * 60 * 60 * 1000;
    });

    // Ambil daftar story yang sudah pernah dilihat oleh user saat ini
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
      // Pasang local viewers jika belum ada
      if (!story.viewers && typeof window !== 'undefined') {
        try {
          const rawV = localStorage.getItem(`chronicle_story_viewers_${story.id}`);
          if (rawV) {
            story.viewers = JSON.parse(rawV);
            story.views_count = story.viewers?.length || 0;
          }
        } catch {}
      }

      // Filter: Hanya tampilkan story saya dan teman/following/followers
      const isMine = currentUserId && story.user_id === currentUserId;
      const isConnected = allowedUserIds.includes(story.user_id);

      // Jika ada daftar user yang diikuti / teman, filter yang relevan. Jika kosong, tampilkan semua story aktif
      if (!isMine && !isConnected && allowedUserIds.length > 0) {
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
      viewers: [],
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

    // 2. Simpan ke Supabase jika ada tabelnya
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
      } catch (err) {
        console.warn('Supabase story insert error:', err);
      }
    }

    return newStory;
  },

  // Catat Penonton Story (Seen By - seperti Instagram)
  async recordStoryView(storyId: string, viewer: Profile): Promise<void> {
    if (!viewer || !storyId) return;

    if (typeof window !== 'undefined') {
      try {
        // 1. Simpan ke daftar penonton lokal untuk story ini
        const key = `chronicle_story_viewers_${storyId}`;
        const raw = localStorage.getItem(key);
        const viewers: StoryViewer[] = raw ? JSON.parse(raw) : [];

        if (!viewers.some((v) => v.viewer_id === viewer.id)) {
          viewers.push({
            id: `view_${Date.now()}_${viewer.id}`,
            story_id: storyId,
            viewer_id: viewer.id,
            viewed_at: new Date().toISOString(),
            viewer: viewer,
          });
          localStorage.setItem(key, JSON.stringify(viewers));
          window.dispatchEvent(new Event('chronicle_story_viewers_updated'));
        }

        // 2. Tandai story ini sudah dilihat oleh user saat ini
        const seenKey = LOCAL_STORAGE_SEEN_KEY;
        const seenRaw = localStorage.getItem(seenKey);
        const seenList: string[] = seenRaw ? JSON.parse(seenRaw) : [];
        if (!seenList.includes(storyId)) {
          seenList.push(storyId);
          localStorage.setItem(seenKey, JSON.stringify(seenList));
          window.dispatchEvent(new Event('chronicle_story_updated'));
        }
      } catch (e) {
        console.warn('Record story view local error:', e);
      }
    }

    // 3. Simpan ke database Supabase jika tabel user_story_views ada
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('user_story_views').upsert(
          {
            story_id: storyId,
            viewer_id: viewer.id,
            viewed_at: new Date().toISOString(),
          },
          { onConflict: 'story_id,viewer_id' }
        );

        // Realtime broadcast ke pemilik story
        const ch = supabase.channel('global_stories_feed');
        ch.send({
          type: 'broadcast',
          event: 'story_viewed',
          payload: { storyId, viewer },
        });
      } catch (e) {
        console.warn('Record story view Supabase error:', e);
      }
    }
  },

  // Ambil daftar penonton untuk story tertentu
  async getStoryViewers(storyId: string): Promise<StoryViewer[]> {
    let viewers: StoryViewer[] = [];

    // 1. Cek local cache
    if (typeof window !== 'undefined') {
      try {
        const key = `chronicle_story_viewers_${storyId}`;
        const raw = localStorage.getItem(key);
        if (raw) viewers = JSON.parse(raw);
      } catch {}
    }

    // 2. Ambil dari Supabase
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('user_story_views')
          .select('*, viewer:profiles(*)')
          .eq('story_id', storyId)
          .order('viewed_at', { ascending: false });

        if (!error && data && data.length > 0) {
          const dbViewers: StoryViewer[] = data.map((r: any) => ({
            id: r.id,
            story_id: r.story_id,
            viewer_id: r.viewer_id,
            viewed_at: r.viewed_at,
            viewer: r.viewer || {
              id: r.viewer_id,
              username: 'user',
              full_name: 'User',
              avatar_url: '',
            },
          }));

          const idMap = new Map<string, StoryViewer>();
          viewers.forEach((v) => idMap.set(v.viewer_id, v));
          dbViewers.forEach((v) => idMap.set(v.viewer_id, v));
          viewers = Array.from(idMap.values());
        }
      } catch {}
    }

    return viewers;
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
