export const maxDuration = 15;

export interface LyricLine {
  time: number; // in seconds
  text: string;
}

// Parse standard LRC format: [mm:ss.xx] Line text
function parseLrc(lrc: string): LyricLine[] {
  if (!lrc) return [];
  const lines = lrc.split('\n');
  const result: LyricLine[] = [];
  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const matches = [...line.matchAll(timeRegex)];
    if (matches.length > 0) {
      const text = line.replace(timeRegex, '').trim();
      if (!text) continue;
      for (const m of matches) {
        const min = parseInt(m[1], 10);
        const sec = parseInt(m[2], 10);
        const ms = parseInt(m[3].padEnd(3, '0').slice(0, 3), 10);
        result.push({
          time: min * 60 + sec + ms / 1000,
          text,
        });
      }
    }
  }

  return result.sort((a, b) => a.time - b.time);
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const title = searchParams.get('title') || searchParams.get('track_name') || '';
    const artist = searchParams.get('artist') || searchParams.get('artist_name') || '';
    const album = searchParams.get('album') || searchParams.get('album_name') || '';
    const duration = searchParams.get('duration');

    if (!title && !artist) {
      return new Response(JSON.stringify({ error: 'Title or artist required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Clean search terms (strip (feat. ...), (remix), etc. for better lyric match)
    const cleanTitle = title.replace(/\s*[\(\[](feat|ft|with|remix|version|deluxe|prod).*?[\)\]]/gi, '').trim();
    const cleanArtist = artist.split(/[,&/]/)[0].trim();

    // 1. Try LRCLIB exact get
    const getParams = new URLSearchParams();
    getParams.set('track_name', cleanTitle || title);
    getParams.set('artist_name', cleanArtist || artist);
    if (album) getParams.set('album_name', album);
    if (duration) getParams.set('duration', duration);

    const lrclibHeaders = {
      'User-Agent': 'ChronicleNoir/1.0 (https://lchronicle.vercel.app)',
    };

    let data: any = null;

    try {
      const getRes = await fetch(`https://lrclib.net/api/get?${getParams.toString()}`, {
        headers: lrclibHeaders,
        next: { revalidate: 86400 },
      });
      if (getRes.ok) {
        data = await getRes.json();
      }
    } catch {
      // ignore, proceed to search
    }

    // 2. If exact get didn't match, try LRCLIB search
    if (!data || (!data.syncedLyrics && !data.plainLyrics)) {
      try {
        const query = `${cleanTitle || title} ${cleanArtist || artist}`;
        const searchRes = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(query)}`, {
          headers: lrclibHeaders,
          next: { revalidate: 86400 },
        });
        if (searchRes.ok) {
          const list = await searchRes.json();
          if (Array.isArray(list) && list.length > 0) {
            // Find best matching item that has syncedLyrics if possible
            data = list.find((item: any) => item.syncedLyrics) || list[0];
          }
        }
      } catch {
        // ignore
      }
    }

    if (!data || (!data.syncedLyrics && !data.plainLyrics)) {
      return new Response(
        JSON.stringify({
          found: false,
          syncedLyrics: null,
          plainLyrics: null,
          lines: [],
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
          },
        }
      );
    }

    const lines = data.syncedLyrics ? parseLrc(data.syncedLyrics) : [];

    return new Response(
      JSON.stringify({
        found: true,
        id: data.id,
        trackName: data.trackName,
        artistName: data.artistName,
        albumName: data.albumName,
        duration: data.duration,
        syncedLyrics: data.syncedLyrics || null,
        plainLyrics: data.plainLyrics || null,
        lines,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
        },
      }
    );
  } catch (error: any) {
    console.error('[API /api/music/lyrics error]:', error);
    return new Response(
      JSON.stringify({
        found: false,
        error: error.message || 'Internal server error',
        lines: [],
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

