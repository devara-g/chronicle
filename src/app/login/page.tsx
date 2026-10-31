'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { Eye, EyeOff, ArrowRight, UserCircle2, X } from 'lucide-react';
import { type SavedAccount } from '@/components/layout/SidebarNav';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hintUsername = searchParams.get('hint');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = JSON.parse(localStorage.getItem('chronicle_saved_accounts') || '[]');
        setSavedAccounts(stored);
      } catch {
        // ignore
      }
    }
  }, []);

  const handleSelectSavedAccount = (acc: SavedAccount) => {
    setPassword('');
  };

  const handleRemoveSavedAccount = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = savedAccounts.filter((a) => a.id !== id);
    setSavedAccounts(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('chronicle_saved_accounts', JSON.stringify(updated));
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setLoading(true);
    setErrorMsg('');

    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });
        if (error) {
          setErrorMsg(error.message);
          setLoading(false);
          return;
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Authentication error');
        setLoading(false);
        return;
      }
    }

    router.push('/');
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 selection:bg-white/20">
      <main className="w-full max-w-sm bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 sm:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.8)] transition-all">
        {/* Brand Header */}
        <div className="text-center mb-8 space-y-2">
          <div className="w-14 h-14 rounded-2xl overflow-hidden border border-white/20 mx-auto mb-3 shadow-[0_0_25px_rgba(255,255,255,0.1)]">
            <Image
              src="/logo.jpg"
              alt="Chronicle Logo"
              width={56}
              height={56}
              className="w-full h-full object-cover"
              priority
            />
          </div>
          <h1 className="font-headline font-bold text-2xl md:text-3xl text-white tracking-tight">Chronicle</h1>
          <p className="text-xs text-on-surface-variant font-mono">
            {hintUsername ? `Masuk kembali sebagai @${hintUsername}` : 'Sign in to your noir space'}
          </p>
        </div>

        {/* Quick Switch Saved Accounts List */}
        {savedAccounts.length > 0 && (
          <div className="mb-6 pb-4 border-b border-white/10">
            <p className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider mb-2">
              Akun Tersimpan
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {savedAccounts.map((acc) => (
                <div
                  key={acc.id}
                  onClick={() => handleSelectSavedAccount(acc)}
                  className="flex items-center gap-2 p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer group flex-shrink-0"
                >
                  {acc.avatar_url ? (
                    <Image
                      src={acc.avatar_url}
                      alt={acc.full_name}
                      width={28}
                      height={28}
                      className="w-7 h-7 rounded-full object-cover border border-white/20 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                      <UserCircle2 className="w-4 h-4 text-white/50" />
                    </div>
                  )}
                  <div className="text-left pr-1">
                    <p className="text-xs font-semibold text-white leading-tight max-w-[90px] truncate">{acc.full_name}</p>
                    <p className="text-[10px] text-on-surface-variant font-mono truncate">@{acc.username}</p>
                  </div>
                  <button
                    onClick={(e) => handleRemoveSavedAccount(e, acc.id)}
                    className="text-on-surface-variant hover:text-red-400 p-0.5 rounded transition-colors"
                    title="Hapus dari daftar cepat"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 font-mono">
            {errorMsg}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4 font-body">
          {/* Email */}
          <div>
            <label className="sr-only" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              required
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-outline focus:outline-none focus:border-white/30 focus:bg-white/10 transition-colors"
            />
          </div>

          {/* Password */}
          <div>
            <label className="sr-only" htmlFor="password">Password</label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-outline focus:outline-none focus:border-white/30 focus:bg-white/10 transition-colors pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-outline hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Forgot Password */}
          <div className="flex justify-end pt-1">
            <a href="#" className="text-xs font-mono text-on-surface-variant hover:text-white transition-colors">
              Forgot password?
            </a>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-black font-headline font-bold py-3.5 rounded-xl text-sm hover:bg-white/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.15)] disabled:opacity-50"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-white/10"></div>
          <span className="text-[11px] font-mono text-on-surface-variant">OR</span>
          <div className="flex-1 h-px bg-white/10"></div>
        </div>

        {/* Google Sign In */}
        <button
          type="button"
          onClick={async () => {
            const { AuthService } = await import('@/lib/services/auth.service');
            await AuthService.signInWithGoogle();
          }}
          className="w-full bg-white/10 hover:bg-white/15 active:scale-[0.98] border border-white/15 text-white font-headline font-semibold py-3 rounded-xl text-sm transition-all flex items-center justify-center gap-3 mb-6"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"
            />
            <path
              fill="#4285F4"
              d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
            />
            <path
              fill="#FBBC05"
              d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.1s.7 5.4 1.9 7.8l3.7-2.9z"
            />
            <path
              fill="#34A853"
              d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        {/* Sign Up Link */}
        <div className="text-center">
          <p className="text-xs text-on-surface-variant">
            Don't have an account?{' '}
            <Link href="/signup" className="text-white font-semibold hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center text-xs font-mono text-on-surface-variant">Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
