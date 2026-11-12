export const maxDuration = 15;

const CURATED_QUERIES = [
  'Lana Del Rey Cherry Blossom',
  'Cigarettes After Sex Apocalypse',
  'The Weeknd Die For You',
  'Joji Glimpse of Us',
  'Hindia Rumah Ke Rumah',
  'Billie Eilish BIRDS OF A FEATHER',
  'Frank Ocean White Ferrari',
  'SZA Snooze',
];

let spotifyTokenCache: { token: string; expiresAt: number } | null = null;

async function getSpotifyAccessToken(): Promise<string | null> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  if (spotifyTokenCache && spotifyTokenCache.expiresAt > Date.now()) {
    return spotifyTokenCache.token;
  }

  try {
    const creds = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${creds}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!res.ok) return null;
    const data = await res.json();
    spotifyTokenCache = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in - 60) * 1000,
    };
    return spotifyTokenCache.token;
  } catch (err) {
    console.warn('[Spotify Auth error]:', err);
    return null;
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');
    const limit = Number(searchParams.get('limit') || '10');
    const isSuggestions = searchParams.get('suggestions') === 'true' || !query?.trim();

    if (isSuggestions) {
      // Curated fresh songs from iTunes API with 600x600 high-res album covers
      const fetchPromises = CURATED_QUERIES.map(async (term) => {
        try {
          const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=1`;
          const res = await fetch(itunesUrl, {
            headers: { 'User-Agent': 'ChronicleNoir/1.0' },
            next: { revalidate: 1800 },
          });
          if (!res.ok) return null;
          const data = await res.json();
          const item = data.results?.[0];
          if (!item) return null;

          const rawArt = item.artworkUrl100 || item.artworkUrl60 || '';
          const coverUrl = rawArt ? rawArt.replace('100x100bb', '600x600bb') : '';

          return {
            id: String(item.trackId),
            title: item.trackName,
            artist: item.artistName,
            album: item.collectionName || '',
            previewUrl: item.previewUrl || '',
            coverUrl: coverUrl || rawArt,
            duration: item.trackTimeMillis ? Math.round(item.trackTimeMillis / 1000) : 30,
          };
        } catch {
          return null;
        }
      });

      const settled = await Promise.all(fetchPromises);
      const results = settled.filter(Boolean);

      return new Response(JSON.stringify({ results, source: 'curated' }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
        },
      });
    }

    const searchQuery = query!.trim();

    // 1. Try Spotify Web API (if credentials configured)
    const spotifyToken = await getSpotifyAccessToken();
    if (spotifyToken) {
      try {
        const spotifyUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(searchQuery)}&type=track&limit=${limit}`;
        const sRes = await fetch(spotifyUrl, {
          headers: {
            Authorization: `Bearer ${spotifyToken}`,
          },
          next: { revalidate: 1800 },
        });

        if (sRes.ok) {
          const sData = await sRes.json();
          const tracks = sData.tracks?.items || [];
          if (tracks.length > 0) {
            const results = tracks.map((item: any) => ({
              id: `sp-${item.id}`,
              title: item.name,
              artist: (item.artists || []).map((a: any) => a.name).join(', '),
              album: item.album?.name || '',
              coverUrl: item.album?.images?.[0]?.url || item.album?.images?.[1]?.url || '',
              previewUrl: item.preview_url || '',
              duration: Math.round((item.duration_ms || 30000) / 1000),
              spotifyId: item.id,
            }));

            return new Response(JSON.stringify({ results, source: 'spotify' }), {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
              },
            });
          }
        }
      } catch (err) {
        console.warn('[Spotify search error]:', err);
        // Fall back to iTunes
      }
    }

    // 2. iTunes Search API (Universal fallback, 0 credentials needed, high reliability)
    const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(searchQuery)}&entity=song&limit=${limit}`;
    const res = await fetch(itunesUrl, {
      headers: { 'User-Agent': 'ChronicleNoir/1.0' },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return new Response(JSON.stringify({ results: [], source: 'empty' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await res.json();
    const songs = (data.results || []).map((item: any) => {
      const rawArt = item.artworkUrl100 || item.artworkUrl60 || '';
      const coverUrl = rawArt ? rawArt.replace('100x100bb', '600x600bb') : '';

      return {
        id: String(item.trackId),
        title: item.trackName,
        artist: item.artistName,
        album: item.collectionName || '',
        previewUrl: item.previewUrl || '',
        coverUrl: coverUrl || rawArt,
        duration: item.trackTimeMillis ? Math.round(item.trackTimeMillis / 1000) : 30,
      };
    });

    return new Response(JSON.stringify({ results: songs, source: 'itunes' }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    });
  } catch (error: any) {
    console.error('[API /api/music/search error]:', error);
    return new Response(JSON.stringify({ results: [], error: error.message }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
