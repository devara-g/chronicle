'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Infinity, Plus, LogOut, Check, UserCircle2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useApp } from '@/context/AppContext';
import { AuthService } from '@/lib/services/auth.service';
import { getSavedAccounts, type SavedAccount } from './SidebarNav';

interface MobileTopBarProps {
  title: string;
  showBack?: boolean;
  action?: React.ReactNode;
}

export function MobileTopBar({ title, showBack = false, action }: MobileTopBarProps) {
  const router = useRouter();
  const { user } = useApp();
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSavedAccounts(getSavedAccounts());
  }, [user]);

  useEffect(() => {
    if (!showAccountMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowAccountMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showAccountMenu]);

  const otherAccounts = savedAccounts.filter((a) => a.id !== user?.id);

  const handleSignOut = async () => {
    await AuthService.signOut();
    setShowAccountMenu(false);
    router.push('/login');
  };

  const handleSwitch = async (acc: SavedAccount) => {
    setShowAccountMenu(false);
    await AuthService.signOut();
    router.push(`/login?hint=${encodeURIComponent(acc.username)}`);
  };

  return (
    <header className="md:hidden sticky top-0 z-40 w-full bg-black/75 backdrop-blur-lg border-b border-white/10 flex items-center justify-between h-14 px-4 transition-all">
      <div className="flex items-center gap-3">
        {showBack ? (
          <button
            onClick={() => router.back()}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        ) : user ? (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowAccountMenu((v) => !v)}
              className="focus:outline-none active:scale-95 transition-transform"
              aria-label="Account switcher"
            >
              <Image
                src={user.avatar_url || '/default-avatar.jpg'}
                alt={user.full_name}
                width={32}
                height={32}
                className="w-8 h-8 rounded-full object-cover border border-white/20"
              />
            </button>

            {/* Account Switcher Sheet */}
            {showAccountMenu && (
              <div className="absolute left-0 top-full mt-2 w-64 bg-[#111] border border-white/15 rounded-2xl shadow-2xl overflow-hidden z-50 animate-fade-in">
                {/* Current */}
                <div className="p-3 border-b border-white/10">
                  <p className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider px-1 mb-2">Active</p>
                  <div className="flex items-center gap-3 px-1">
                    <Image
                      src={user.avatar_url || '/default-avatar.jpg'}
                      alt={user.full_name}
                      width={32}
                      height={32}
                      className="w-8 h-8 rounded-full object-cover border border-white/20 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{user.full_name}</p>
                      <p className="text-xs text-on-surface-variant font-mono">@{user.username}</p>
                    </div>
                    <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  </div>
                </div>

                {/* Other accounts */}
                {otherAccounts.length > 0 && (
                  <div className="p-3 border-b border-white/10 space-y-1">
                    <p className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider px-1 mb-2">Switch</p>
                    {otherAccounts.map((acc) => (
                      <button
                        key={acc.id}
                        onClick={() => handleSwitch(acc)}
                        className="w-full flex items-center gap-3 px-1 py-2 rounded-xl hover:bg-white/5 transition-colors"
                      >
                        {acc.avatar_url ? (
                          <Image src={acc.avatar_url} alt={acc.full_name} width={32} height={32} className="w-8 h-8 rounded-full object-cover border border-white/10 flex-shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                            <UserCircle2 className="w-4 h-4 text-white/40" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-sm font-semibold text-white truncate">{acc.full_name}</p>
                          <p className="text-xs text-on-surface-variant font-mono">@{acc.username}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                <div className="p-2 space-y-0.5">
                  <button
                    onClick={async () => { setShowAccountMenu(false); await AuthService.signOut(); router.push('/login'); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 text-white/80 hover:text-white transition-colors text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add account</span>
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-500/10 text-red-400/80 hover:text-red-400 transition-colors text-sm"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : null}
        <h1 className="font-headline font-bold text-lg text-primary tracking-tight">{title}</h1>
      </div>

      <div>
        {action || (
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-ai-assistant'))}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 text-on-surface-variant hover:text-white transition-colors"
            title="Chronicle AI"
            aria-label="Open Chronicle AI"
          >
            <Infinity className="w-4 h-4 text-white/80" />
          </button>
        )}
      </div>
    </header>
  );
}
