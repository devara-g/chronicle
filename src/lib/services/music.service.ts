export interface SongResult {
  id: string;
  title: string;
  artist: string;
  album?: string;
  coverUrl?: string;
  previewUrl: string;
  duration?: number;
  spotifyId?: string;
}

export interface SyncedLyricLine {
  time: number; // in seconds
  text: string;
}

export interface LyricsData {
  found: boolean;
  trackName?: string;
  artistName?: string;
  albumName?: string;
  duration?: number;
  syncedLyrics?: string | null;
  plainLyrics?: string | null;
  lines: SyncedLyricLine[];
}

export interface PlayStreamInfo {
  success: boolean;
  source: 'youtube' | 'deezer' | 'itunes';
  duration?: number;
  streamUrl: string;
  directUrl?: string;
}

export interface TrackPlayData {
  success: boolean;
  videoId: string | null;
  title: string;
  artist: string;
  source: 'youtube' | 'fallback';
  fallbackAudioUrl: string | null;
}

export const MusicService = {
  // Resolve official YouTube full-track videoId for 1:1 lyric sync
  async getYouTubeTrack(
    title: string,
    artist: string,
    fallbackPreviewUrl?: string
  ): Promise<TrackPlayData> {
    try {
      const params = new URLSearchParams();
      params.set('title', title);
      params.set('artist', artist);
      if (fallbackPreviewUrl) params.set('previewUrl', fallbackPreviewUrl);

      const res = await fetch(`/api/music/play?${params.toString()}`);
      if (!res.ok) {
        return {
          success: false,
          videoId: null,
          title,
          artist,
          source: 'fallback',
          fallbackAudioUrl: fallbackPreviewUrl || null,
        };
      }
      return await res.json();
    } catch {
      return {
        success: false,
        videoId: null,
        title,
        artist,
        source: 'fallback',
        fallbackAudioUrl: fallbackPreviewUrl || null,
      };
    }
  },

  // Search catalog (Spotify primary, iTunes fallback)
  async searchSongs(query: string, limit: number = 10): Promise<SongResult[]> {
    if (!query?.trim()) return this.getSuggestions();

    try {
      const res = await fetch(`/api/music/search?q=${encodeURIComponent(query)}&limit=${limit}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.results || [];
    } catch (err) {
      console.warn('[MusicService] search error:', err);
      return [];
    }
  },

  // Get curated song suggestions
  async getSuggestions(): Promise<SongResult[]> {
    try {
      const res = await fetch('/api/music/search?suggestions=true');
      if (!res.ok) return [];
      const data = await res.json();
      return data.results || [];
    } catch (err) {
      console.warn('[MusicService] suggestions error:', err);
      return [];
    }
  },

  // Get synced lyrics from LRCLIB
  async getLyrics(
    title: string,
    artist: string,
    album?: string,
    duration?: number
  ): Promise<LyricsData> {
    try {
      const params = new URLSearchParams();
      params.set('title', title);
      params.set('artist', artist);
      if (album) params.set('album', album);
      if (duration) params.set('duration', String(duration));

      const res = await fetch(`/api/music/lyrics?${params.toString()}`);
      if (!res.ok) {
        return { found: false, lines: [] };
      }
      return await res.json();
    } catch (err) {
      console.warn('[MusicService] lyrics error:', err);
      return { found: false, lines: [] };
    }
  },

  // Get playable stream endpoint (Instant direct CDN preview -> Deezer -> YouTube fallback)
  async getPlayStream(
    title: string,
    artist: string,
    fallbackPreviewUrl?: string
  ): Promise<PlayStreamInfo> {
    // If a direct high-speed audio preview is already present, use it directly
    // to avoid proxy latency and ensure 100% immediate playback without serverless IP blocks.
    if (fallbackPreviewUrl && fallbackPreviewUrl.startsWith('http')) {
      return {
        success: true,
        source: 'itunes',
        streamUrl: fallbackPreviewUrl,
        directUrl: fallbackPreviewUrl,
      };
    }

    const defaultStreamUrl = `/api/music/play?title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}&previewUrl=${encodeURIComponent(fallbackPreviewUrl || '')}&stream=true`;

    try {
      const res = await fetch(
        `/api/music/play?title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}&previewUrl=${encodeURIComponent(fallbackPreviewUrl || '')}`
      );
      if (!res.ok) {
        return {
          success: true,
          source: 'itunes',
          streamUrl: fallbackPreviewUrl || defaultStreamUrl,
        };
      }
      const data = await res.json();
      return {
        success: true,
        source: data.source || 'itunes',
        duration: data.duration,
        streamUrl: data.streamUrl || fallbackPreviewUrl || defaultStreamUrl,
        directUrl: data.directUrl,
      };
    } catch (err) {
      console.warn('[MusicService] getPlayStream error:', err);
      return {
        success: true,
        source: 'itunes',
        streamUrl: fallbackPreviewUrl || defaultStreamUrl,
      };
    }
  },
};

