import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { Profile } from '@/types';
import { NoteSong, UserNote } from '@/components/chat/DirectNotesBar';

const LOCAL_STORAGE_NOTES_KEY = 'chronicle_shared_notes';

export const NotesService = {
  // Ambil semua notes real
  async getNotes(currentUserId?: string): Promise<{ myNote: UserNote | null; friendsNotes: UserNote[] }> {
    let allNotes: Record<string, UserNote> = {};

    // 1. Ambil dari localStorage cache/shared pool
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(LOCAL_STORAGE_NOTES_KEY);
        if (stored) {
          allNotes = JSON.parse(stored);
        }
      } catch {
        allNotes = {};
      }
    }

    // 2. Jika Supabase aktif, coba fetch dari tabel user_notes jika sudah dibuat
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('user_notes')
          .select('*, profile:profiles(*)')
          .order('updated_at', { ascending: false })
          .limit(20);

        if (!error && data && data.length > 0) {
          data.forEach((row: any) => {
            const prof = row.profile || {};
            allNotes[row.user_id] = {
              id: row.id,
              userId: row.user_id,
              username: prof.username || 'user',
              fullName: prof.full_name || 'User',
              avatarUrl: prof.avatar_url || null,
              text: row.text || '',
              song: row.song_data ? (typeof row.song_data === 'string' ? JSON.parse(row.song_data) : row.song_data) : null,
              createdAt: new Date(row.updated_at || row.created_at).getTime(),
            };
          });
        }
      } catch {
        // Table user_notes optional jika belum di-migrate, fallback ke real shared pool
      }
    }

    // Filter catatan kadaluarsa (> 24 jam seperti Instagram Story/Notes)
    const now = Date.now();
    const activeNotes = Object.values(allNotes).filter(
      (n) => now - n.createdAt < 24 * 60 * 60 * 1000
    );

    const myNote = currentUserId ? activeNotes.find((n) => n.userId === currentUserId) || null : null;
    const friendsNotes = currentUserId
      ? activeNotes.filter((n) => n.userId !== currentUserId)
      : activeNotes;

    return { myNote, friendsNotes };
  },

  // Simpan catatan (Text + Song)
  async saveNote(
    user: Profile,
    text: string,
    song: NoteSong | null
  ): Promise<UserNote> {
    const newNote: UserNote = {
      id: `note-${user.id}`,
      userId: user.id,
      username: user.username,
      fullName: user.full_name,
      avatarUrl: user.avatar_url || null,
      text: text.trim(),
      song: song || null,
      createdAt: Date.now(),
    };

    // 1. Simpan ke local pool
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(LOCAL_STORAGE_NOTES_KEY);
        const pool: Record<string, UserNote> = raw ? JSON.parse(raw) : {};
        pool[user.id] = newNote;
        localStorage.setItem(LOCAL_STORAGE_NOTES_KEY, JSON.stringify(pool));
      } catch (e) {
        console.warn('LocalStorage error:', e);
      }
    }

    // 2. Broadcast via Supabase Realtime channel jika aktif
    if (isSupabaseConfigured()) {
      try {
        const channel = supabase.channel('global_notes_feed');
        channel.send({
          type: 'broadcast',
          event: 'new_note',
          payload: newNote,
        });

        // 3. Coba upsert ke database user_notes jika tabel tersedia
        await supabase.from('user_notes').upsert({
          user_id: user.id,
          text: newNote.text,
          song_data: newNote.song ? JSON.stringify(newNote.song) : null,
          updated_at: new Date().toISOString(),
        });
      } catch {
        // ignore jika table belum ada di database
      }
    }

    return newNote;
  },

  // Hapus catatan
  async deleteNote(userId: string): Promise<void> {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(LOCAL_STORAGE_NOTES_KEY);
        if (raw) {
          const pool: Record<string, UserNote> = JSON.parse(raw);
          delete pool[userId];
          localStorage.setItem(LOCAL_STORAGE_NOTES_KEY, JSON.stringify(pool));
        }
      } catch {
        // ignore
      }
    }

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('user_notes').delete().eq('user_id', userId);
        const channel = supabase.channel('global_notes_feed');
        channel.send({
          type: 'broadcast',
          event: 'delete_note',
          payload: { userId },
        });
      } catch {
        // ignore
      }
    }
  },
};

