export const maxDuration = 15;

interface YouTubeResolveResult {
  videoId: string;
  source: 'youtube';
}

const ytCache = new Map<string, { result: YouTubeResolveResult; expiresAt: number }>();

async function resolveYouTubeVideoId(title: string, artist: string): Promise<string | null> {
  const cacheKey = `${title.toLowerCase().trim()}:::${artist.toLowerCase().trim()}`;
  const cached = ytCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.result.videoId;
  }

  try {
    const q = `${title} ${artist} audio`;
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      next: { revalidate: 86400 },
    });

    if (!res.ok) return null;
    const html = await res.text();
    const match = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
    const videoId = match ? match[1] : null;

    if (videoId) {
      ytCache.set(cacheKey, {
        result: { videoId, source: 'youtube' },
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days cache
      });
    }

    return videoId;
  } catch (err) {
    console.warn('[YouTube search error]:', err);
    return null;
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const title = searchParams.get('title') || '';
    const artist = searchParams.get('artist') || '';
    const fallbackPreview = searchParams.get('previewUrl') || '';

    if (!title && !artist && !fallbackPreview) {
      return new Response(JSON.stringify({ error: 'Title, artist or previewUrl required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const videoId = await resolveYouTubeVideoId(title, artist);

    return new Response(
      JSON.stringify({
        success: true,
        videoId: videoId || null,
        title,
        artist,
        source: videoId ? 'youtube' : 'fallback',
        fallbackAudioUrl: fallbackPreview || null,
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
    console.error('[API /api/music/play error]:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Error resolving track',
        fallbackAudioUrl: null,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
