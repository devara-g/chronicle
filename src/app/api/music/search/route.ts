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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');
    const isSuggestions = searchParams.get('suggestions') === 'true' || !query?.trim();

    if (isSuggestions) {
      // Ambil saran lagu curated dengan URL fresh dari iTunes API (segar & 100% bisa di-play)
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
          if (!item || !item.previewUrl) return null;
          return {
            id: String(item.trackId),
            title: item.trackName,
            artist: item.artistName,
            previewUrl: item.previewUrl,
            coverUrl: item.artworkUrl100 || item.artworkUrl60,
          };
        } catch {
          return null;
        }
      });

      const settled = await Promise.all(fetchPromises);
      const results = settled.filter(Boolean);

      return new Response(JSON.stringify({ results }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
        },
      });
    }

    const limit = searchParams.get('limit') || '10';
    const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(query!)}&entity=song&limit=${limit}`;

    const res = await fetch(itunesUrl, {
      headers: {
        'User-Agent': 'ChronicleNoir/1.0',
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return new Response(JSON.stringify({ results: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await res.json();
    const songs = (data.results || [])
      .filter((item: any) => item.previewUrl)
      .map((item: any) => ({
        id: String(item.trackId),
        title: item.trackName,
        artist: item.artistName,
        previewUrl: item.previewUrl,
        coverUrl: item.artworkUrl100 || item.artworkUrl60,
      }));

    return new Response(JSON.stringify({ results: songs }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    });
  } catch (error: any) {
    console.error('Music search proxy error:', error);
    return new Response(JSON.stringify({ results: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
