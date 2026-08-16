'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { ArrowRight, Eye, EyeOff, MailCheck, Infinity, ArrowLeft } from 'lucide-react';

export default function SignUpPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !username.trim() || !email.trim() || !password.trim()) return;
    if (!termsAgreed) {
      setErrorMsg('Please accept the Terms of Service to continue.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
          options: {
            data: {
              full_name: fullName.trim(),
              username: username.trim().toLowerCase().replace(/\s+/g, '_'),
            },
          },
        });

        if (error) {
          setErrorMsg(error.message);
          setLoading(false);
          return;
        }

        // If signup requires email confirmation (data.session is null or user created)
        setIsSuccess(true);
        setLoading(false);
        return;
      } catch (err: any) {
        setErrorMsg(err.message || 'Registration failed');
        setLoading(false);
        return;
      }
    } else {
      // Mock mode fallback
      setIsSuccess(true);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 selection:bg-white/20">
      <main className="w-full max-w-[420px] my-8">
        {/* Brand Header */}
        <div className="text-center mb-6 space-y-2">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Infinity className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-headline font-bold text-2xl text-white tracking-tight">Chronicle</h1>
          </Link>
          <p className="text-xs text-on-surface-variant font-mono">Join the minimalist digital noir</p>
        </div>

        {/* Glass Container */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.8)] font-body">
          {isSuccess ? (
            /* ======================================================== */
            /* Email Confirmation Screen */
            /* ======================================================== */
            <div className="text-center py-4 space-y-4 animate-fade-in">
              <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mx-auto text-primary shadow-[0_0_30px_rgba(255,255,255,0.15)]">
                <MailCheck className="w-8 h-8" />
              </div>

              <div className="space-y-1.5">
                <h2 className="font-headline font-bold text-xl text-white">Konfirmasi Email Kamu</h2>
                <p className="text-xs text-on-surface-variant font-body leading-relaxed max-w-xs mx-auto">
                  Kami telah mengirimkan link verifikasi ke:
                </p>
                <div className="py-1 px-3 bg-white/5 border border-white/10 rounded-lg inline-block text-xs font-mono text-white">
                  {email}
                </div>
              </div>

              <div className="p-3.5 bg-sky-500/10 border border-sky-500/20 rounded-xl text-xs text-sky-300/90 text-left font-body leading-relaxed">
                Silakan buka kotak masuk atau folder spam emailmu, lalu klik link konfirmasi untuk mengaktifkan akun sebelum login.
              </div>

              <div className="pt-3 space-y-2">
                <Link
                  href="/login"
                  className="w-full bg-primary text-black font-headline font-bold py-3 rounded-xl text-xs hover:bg-white/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                >
                  <span>Lanjut ke Halaman Login</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <button
                  type="button"
                  onClick={() => setIsSuccess(false)}
                  className="w-full py-2.5 text-xs text-on-surface-variant hover:text-white transition-colors font-mono"
                >
                  ← Ubah data pendaftaran
                </button>
              </div>
            </div>
          ) : (
            /* ======================================================== */
            /* Registration Form */
            /* ======================================================== */
            <>
              {errorMsg && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 font-mono">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleSignUp} className="space-y-4">
                {/* Full Name */}
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-on-surface-variant uppercase tracking-wider" htmlFor="fullName">
                    Full Name
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jane Doe"
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-outline focus:outline-none focus:border-white/30 focus:bg-white/10 transition-colors"
                  />
                </div>

                {/* Username */}
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-on-surface-variant uppercase tracking-wider" htmlFor="username">
                    Username
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm font-mono">@</span>
                    <input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="janedoe"
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-outline focus:outline-none focus:border-white/30 focus:bg-white/10 transition-colors font-mono"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-on-surface-variant uppercase tracking-wider" htmlFor="email">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jane@example.com"
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-outline focus:outline-none focus:border-white/30 focus:bg-white/10 transition-colors"
                  />
                </div>

                {/* Password */}
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-on-surface-variant uppercase tracking-wider" htmlFor="password">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-outline focus:outline-none focus:border-white/30 focus:bg-white/10 transition-colors pr-10"
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

                {/* Terms Checkbox */}
                <div className="flex items-start gap-2.5 pt-1">
                  <input
                    id="terms"
                    type="checkbox"
                    checked={termsAgreed}
                    onChange={(e) => setTermsAgreed(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-white/20 bg-white/5 accent-white cursor-pointer"
                  />
                  <label htmlFor="terms" className="text-xs text-on-surface-variant leading-tight cursor-pointer">
                    I agree to the <a href="#" className="text-white hover:underline">Terms of Service</a> and <a href="#" className="text-white hover:underline">Privacy Policy</a>.
                  </label>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary text-black font-headline font-bold py-3.5 rounded-xl text-sm hover:bg-white/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.15)] disabled:opacity-50 mt-2"
                >
                  <span>{loading ? 'Creating Account...' : 'Create Account'}</span>
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
                className="w-full bg-white/10 hover:bg-white/15 active:scale-[0.98] border border-white/15 text-white font-headline font-semibold py-3 rounded-xl text-sm transition-all flex items-center justify-center gap-3"
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

              {/* Login Link */}
              <div className="mt-6 text-center">
                <p className="text-xs text-on-surface-variant">
                  Already have an account?{' '}
                  <Link href="/login" className="text-white font-semibold hover:underline">
                    Sign in
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
