'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { useApp } from '@/context/AppContext';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { AuthService } from '@/lib/services/auth.service';
import { 
  User, 
  Lock, 
  Bell, 
  Eye, 
  Database, 
  LogOut, 
  ChevronRight, 
  Check, 
  Sparkles,
  ShieldCheck,
  Moon
} from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const { user } = useApp();
  const [privateAccount, setPrivateAccount] = useState(false);
  const [pushNotifs, setPushNotifs] = useState(true);
  const [highContrastGlass, setHighContrastGlass] = useState(true);
  const [savedBanner, setSavedBanner] = useState(false);

  const handleSignOut = async () => {
    await AuthService.signOut();
    router.push('/login');
  };

  const hasSupabase = isSupabaseConfigured();

  return (
    <AppShell>
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 w-full bg-black/80 backdrop-blur-xl border-b border-white/10 flex items-center justify-between h-14 px-4">
        <div>
          <h1 className="font-headline text-lg font-bold text-primary tracking-tight">Settings</h1>
          <p className="text-xs text-on-surface-variant font-mono">Preferences & Account</p>
        </div>
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant">
          <Sparkles className="w-4 h-4" />
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Supabase Connection Status Card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Database className="w-5 h-5 text-white" />
              <h2 className="font-headline font-bold text-sm text-white">Database & Auth Status</h2>
            </div>
            <span className={`text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full border ${
              hasSupabase 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
            }`}>
              {hasSupabase ? 'Supabase Connected' : 'Local Fallback Mode'}
            </span>
          </div>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            {hasSupabase 
              ? 'Your application is connected to live Supabase PostgreSQL and Auth.'
              : 'Add NEXT_PUBLIC_SUPABASE_URL & NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local to activate live cloud database.'}
          </p>
        </div>

        {/* Section 1: Account Information */}
        <div className="space-y-2">
          <h3 className="text-xs font-mono text-on-surface-variant uppercase tracking-wider px-1">
            Account Details
          </h3>
          <div className="bg-white/5 border border-white/10 rounded-2xl divide-y divide-white/5 overflow-hidden">
            <Link href="/profile" className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors group">
              <div className="flex items-center gap-3.5">
                <User className="w-5 h-5 text-on-surface-variant group-hover:text-white transition-colors" />
                <div>
                  <p className="font-semibold text-sm text-white">{user?.full_name || 'User'}</p>
                  <p className="text-xs text-on-surface-variant font-mono">@{user?.username || 'traveler'}</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-on-surface-variant group-hover:text-white transition-colors" />
            </Link>

            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <ShieldCheck className="w-5 h-5 text-on-surface-variant" />
                <div>
                  <p className="font-semibold text-sm text-white">Security & Password</p>
                  <p className="text-xs text-on-surface-variant">Manage credentials & 2FA</p>
                </div>
              </div>
              <span className="text-xs font-mono text-on-surface-variant">Active</span>
            </div>
          </div>
        </div>

        {/* Section 2: Privacy & Safety */}
        <div className="space-y-2">
          <h3 className="text-xs font-mono text-on-surface-variant uppercase tracking-wider px-1">
            Privacy & Safety
          </h3>
          <div className="bg-white/5 border border-white/10 rounded-2xl divide-y divide-white/5 overflow-hidden">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <Lock className="w-5 h-5 text-on-surface-variant" />
                <div>
                  <p className="font-semibold text-sm text-white">Private Profile</p>
                  <p className="text-xs text-on-surface-variant">Only approved followers can see your posts</p>
                </div>
              </div>
              <button
                onClick={() => setPrivateAccount(!privateAccount)}
                className={`w-11 h-6 rounded-full transition-colors relative ${
                  privateAccount ? 'bg-white' : 'bg-white/20'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full bg-black absolute top-1 transition-transform ${
                    privateAccount ? 'right-1' : 'left-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Section 3: Notifications */}
        <div className="space-y-2">
          <h3 className="text-xs font-mono text-on-surface-variant uppercase tracking-wider px-1">
            Notifications
          </h3>
          <div className="bg-white/5 border border-white/10 rounded-2xl divide-y divide-white/5 overflow-hidden">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <Bell className="w-5 h-5 text-on-surface-variant" />
                <div>
                  <p className="font-semibold text-sm text-white">Push Notifications</p>
                  <p className="text-xs text-on-surface-variant">Realtime alerts for mentions and likes</p>
                </div>
              </div>
              <button
                onClick={() => setPushNotifs(!pushNotifs)}
                className={`w-11 h-6 rounded-full transition-colors relative ${
                  pushNotifs ? 'bg-white' : 'bg-white/20'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full bg-black absolute top-1 transition-transform ${
                    pushNotifs ? 'right-1' : 'left-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Section 4: Display & Obsidian Theme */}
        <div className="space-y-2">
          <h3 className="text-xs font-mono text-on-surface-variant uppercase tracking-wider px-1">
            Obsidian Design Aesthetics
          </h3>
          <div className="bg-white/5 border border-white/10 rounded-2xl divide-y divide-white/5 overflow-hidden">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <Moon className="w-5 h-5 text-on-surface-variant" />
                <div>
                  <p className="font-semibold text-sm text-white">OLED True Black</p>
                  <p className="text-xs text-on-surface-variant font-mono">#000000 Canvas</p>
                </div>
              </div>
              <span className="text-xs font-mono text-emerald-400">Locked Active</span>
            </div>

            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <Eye className="w-5 h-5 text-on-surface-variant" />
                <div>
                  <p className="font-semibold text-sm text-white">Glassmorphic Refraction</p>
                  <p className="text-xs text-on-surface-variant">Backdrop blur and structural depth</p>
                </div>
              </div>
              <button
                onClick={() => setHighContrastGlass(!highContrastGlass)}
                className={`w-11 h-6 rounded-full transition-colors relative ${
                  highContrastGlass ? 'bg-white' : 'bg-white/20'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full bg-black absolute top-1 transition-transform ${
                    highContrastGlass ? 'right-1' : 'left-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Sign Out Button */}
        <div className="pt-2">
          <button
            onClick={handleSignOut}
            className="w-full py-3.5 bg-white/5 border border-red-500/20 text-red-400 hover:bg-red-500/10 rounded-2xl font-semibold text-sm transition-colors flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out of Chronicle</span>
          </button>
        </div>
      </div>
    </AppShell>
  );
}
