export const maxDuration = 30;

const INVIDIOUS_INSTANCES = [
  'https://yt.chocolatemoo53.com',
  'https://invidious.drgns.space',
  'https://iv.melmac.space',
  'https://invidious.perennialte.ch',
];

interface AudioSourceInfo {
  audioUrl: string;
  source: 'youtube' | 'deezer' | 'itunes';
  duration?: number;
  format?: string;
}

// In-memory cache for resolved stream URLs to speed up playback and reduce scraping
const resolvedCache = new Map<string, { info: AudioSourceInfo; expiresAt: number }>();

async function resolveAudioSource(
  title: string,
  artist: string,
  fallbackPreviewUrl?: string | null
): Promise<AudioSourceInfo | null> {
  const cacheKey = `${title.toLowerCase()}:::${artist.toLowerCase()}`;
  const cached = resolvedCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.info;
  }

  const query = `${title} ${artist}`.trim();

  // 1. First try Deezer (fast, open CDN, no datacenter IP blocking)
  try {
    const deezerRes = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(query)}`, {
      signal: AbortSignal.timeout(3000),
    });
    if (deezerRes.ok) {
      const dData = await deezerRes.json();
      const top = dData.data?.[0];
      if (top?.preview) {
        const info: AudioSourceInfo = {
          audioUrl: top.preview,
          source: 'deezer',
          duration: top.duration,
          format: 'audio/mpeg',
        };
        resolvedCache.set(cacheKey, { info, expiresAt: Date.now() + 2 * 60 * 60 * 1000 });
        return info;
      }
    }
  } catch {
    // Continue to next options
  }

  // 2. Fallback: Provided direct iTunes preview URL
  if (fallbackPreviewUrl && fallbackPreviewUrl.startsWith('http')) {
    return {
      audioUrl: fallbackPreviewUrl,
      source: 'itunes',
      duration: 30,
      format: 'audio/x-m4a',
    };
  }

  // 3. Fallback: Try Invidious / YouTube Music instances
  for (const base of INVIDIOUS_INSTANCES) {
    try {
      const searchRes = await fetch(`${base}/api/v1/search?q=${encodeURIComponent(query)}&type=video`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        signal: AbortSignal.timeout(3500),
      });

      if (!searchRes.ok) continue;
      const searchData = await searchRes.json();
      if (!Array.isArray(searchData) || searchData.length === 0) continue;

      const videoId = searchData[0]?.videoId;
      if (!videoId) continue;

      const videoRes = await fetch(`${base}/api/v1/videos/${videoId}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        signal: AbortSignal.timeout(4000),
      });

      if (!videoRes.ok) continue;
      const videoData = await videoRes.json();
      const adaptiveFormats = videoData.adaptiveFormats || [];

      const audioFormat =
        adaptiveFormats.find((f: any) => f.type?.includes('audio/mp4')) ||
        adaptiveFormats.find((f: any) => f.type?.startsWith('audio/'));

      if (audioFormat?.url) {
        const info: AudioSourceInfo = {
          audioUrl: audioFormat.url,
          source: 'youtube',
          duration: videoData.lengthSeconds ? Number(videoData.lengthSeconds) : undefined,
          format: audioFormat.type || 'audio/mp4',
        };
        resolvedCache.set(cacheKey, { info, expiresAt: Date.now() + 30 * 60 * 1000 });
        return info;
      }
    } catch {
      // Continue to next instance
    }
  }

  return null;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const title = searchParams.get('title') || '';
    const artist = searchParams.get('artist') || '';
    const previewUrl = searchParams.get('previewUrl') || '';
    const shouldStream = searchParams.get('stream') === 'true' || searchParams.get('stream') === '1';

    if (!title && !artist && !previewUrl) {
      return new Response(JSON.stringify({ error: 'Title, artist or previewUrl required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const audioSource = await resolveAudioSource(title, artist, previewUrl);

    if (!audioSource) {
      return new Response(JSON.stringify({ error: 'Audio source could not be resolved' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // If client requested JSON metadata
    if (!shouldStream) {
      const proxyStreamUrl = `/api/music/play?title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}&previewUrl=${encodeURIComponent(previewUrl)}&stream=true`;
      return new Response(
        JSON.stringify({
          success: true,
          source: audioSource.source,
          duration: audioSource.duration,
          streamUrl: proxyStreamUrl,
          directUrl: audioSource.audioUrl,
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
          },
        }
      );
    }

    // Direct audio streaming with HTTP Range support
    const rangeHeader = req.headers.get('range');
    const fetchHeaders: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };

    if (rangeHeader) {
      fetchHeaders['Range'] = rangeHeader;
    }

    let upstreamRes = await fetch(audioSource.audioUrl, {
      headers: fetchHeaders,
    });

    // If upstream audio failed (e.g. 403 Forbidden from YouTube), fallback immediately to previewUrl
    if (upstreamRes.status >= 400 && previewUrl && audioSource.audioUrl !== previewUrl) {
      upstreamRes = await fetch(previewUrl, { headers: fetchHeaders });
    }

    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', upstreamRes.headers.get('content-type') || audioSource.format || 'audio/mp4');
    responseHeaders.set('Accept-Ranges', 'bytes');
    responseHeaders.set('Cache-Control', 'public, max-age=7200');

    const contentLength = upstreamRes.headers.get('content-length');
    if (contentLength) responseHeaders.set('Content-Length', contentLength);

    const contentRange = upstreamRes.headers.get('content-range');
    if (contentRange) responseHeaders.set('Content-Range', contentRange);

    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      headers: responseHeaders,
    });
  } catch (error: any) {
    console.error('[API /api/music/play error]:', error);
    return new Response(JSON.stringify({ error: error.message || 'Stream error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

