import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';
  const isNative = searchParams.get('native') === 'true';

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // The `setAll` method was called from a Server Component.
            }
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data?.session) {
      if (isNative) {
        const deepLink = `com.stitch.chronicle://auth/callback#access_token=${encodeURIComponent(
          data.session.access_token
        )}&refresh_token=${encodeURIComponent(data.session.refresh_token)}`;

        return new Response(
          `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Chronicle — Menyambungkan Akun</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      background: #050505;
      color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      text-align: center;
    }
    .card {
      width: 90%;
      max-width: 380px;
      padding: 36px 24px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 24px;
      backdrop-filter: blur(24px);
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.9);
    }
    .spinner {
      width: 44px;
      height: 44px;
      border: 3px solid rgba(255, 255, 255, 0.15);
      border-top-color: #ffffff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 24px;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .title {
      font-size: 20px;
      font-weight: 700;
      letter-spacing: -0.02em;
      margin: 0 0 8px;
    }
    .desc {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.6);
      margin: 0 0 24px;
      line-height: 1.5;
    }
    .btn {
      display: block;
      width: 100%;
      padding: 14px 20px;
      background: #ffffff;
      color: #000000;
      font-weight: 700;
      font-size: 14px;
      border-radius: 14px;
      text-decoration: none;
      transition: transform 0.15s, opacity 0.15s;
    }
    .btn:active {
      transform: scale(0.98);
      opacity: 0.9;
    }
    .fallback {
      margin-top: 16px;
      font-size: 12px;
      color: rgba(255, 255, 255, 0.4);
    }
    .fallback a {
      color: rgba(255, 255, 255, 0.8);
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="spinner"></div>
    <h1 class="title">Masuk Berhasil</h1>
    <p class="desc">Mengalihkan kamu kembali ke aplikasi Chronicle...</p>
    <a id="openBtn" class="btn" href="${deepLink}">Buka Aplikasi Chronicle</a>
    <p class="fallback">
      Jika tidak terbuka otomatis, ketuk tombol di atas atau <a href="${origin}${next}">lanjutkan di browser</a>.
    </p>
  </div>
  <script>
    const deepLinkUrl = ${JSON.stringify(deepLink)};
    // Immediate redirect to custom scheme to launch Chronicle APK
    window.location.href = deepLinkUrl;
    setTimeout(() => {
      window.location.href = deepLinkUrl;
    }, 400);
  </script>
</body>
</html>`,
          {
            headers: {
              'Content-Type': 'text/html; charset=utf-8',
            },
          }
        );
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // If error, redirect back to login
  if (isNative) {
    return new Response(
      `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Chronicle — Login Failed</title>
  <style>
    body { background: #000; color: #fff; font-family: sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; text-align: center; }
    .card { background: rgba(255,255,255,0.05); padding: 32px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.1); }
    .btn { display: inline-block; margin-top: 16px; padding: 12px 24px; background: #fff; color: #000; font-weight: 700; border-radius: 12px; text-decoration: none; }
  </style>
</head>
<body>
  <div class="card">
    <h2>Gagal Masuk</h2>
    <p style="color: rgba(255,255,255,0.6); font-size: 13px;">Otorisasi Google tidak berhasil diselesaikan.</p>
    <a class="btn" href="com.stitch.chronicle://login">Kembali ke Aplikasi</a>
  </div>
  <script>
    window.location.href = "com.stitch.chronicle://login";
  </script>
</body>
</html>`,
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  return NextResponse.redirect(`${origin}/login?error=oauth-failed`);
}
