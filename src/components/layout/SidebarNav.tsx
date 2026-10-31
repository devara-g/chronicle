'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import Image from 'next/image';
import { 
  Home, 
  Search, 
  Bell, 
  Mail, 
  User, 
  Settings, 
  Feather,
  MoreHorizontal,
  Bookmark,
  Plus,
  LogOut,
  UserCircle2,
  Check,
} from 'lucide-react';
import { AuthService } from '@/lib/services/auth.service';

// ─── Saved Accounts helpers (localStorage) ───────────────────────────────────
export interface SavedAccount {
  id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
}

export function getSavedAccounts(): SavedAccount[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem('chronicle_saved_accounts') || '[]');
  } catch {
    return [];
  }
}

function saveAccount(account: SavedAccount) {
  if (typeof window === 'undefined') return;
  const accounts = getSavedAccounts();
  const exists = accounts.some((a) => a.id === account.id);
  if (!exists) {
    accounts.unshift(account);
    localStorage.setItem('chronicle_saved_accounts', JSON.stringify(accounts.slice(0, 5)));
  }
}

function removeAccount(id: string) {
  if (typeof window === 'undefined') return;
  const accounts = getSavedAccounts().filter((a) => a.id !== id);
  localStorage.setItem('chronicle_saved_accounts', JSON.stringify(accounts));
}
// ─────────────────────────────────────────────────────────────────────────────

export function SidebarNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, unreadNotifsCount, unreadMessagesCount, openCompose, markNotificationsRead, markAllMessagesAsRead } = useApp();
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);

  // Persist current account to saved list whenever user changes
  useEffect(() => {
    if (user) {
      saveAccount({
        id: user.id,
        full_name: user.full_name,
        username: user.username,
        avatar_url: user.avatar_url || null,
      });
      setSavedAccounts(getSavedAccounts());
    }
  }, [user]);

  // Close menu on outside click
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

  const handleSignOut = async () => {
    await AuthService.signOut();
    setShowAccountMenu(false);
    router.push('/login');
  };

  const handleSwitchToAccount = async (account: SavedAccount) => {
    // Sign out current, then redirect to login with hint
    setShowAccountMenu(false);
    await AuthService.signOut();
    router.push(`/login?hint=${encodeURIComponent(account.username)}`);
  };

  const handleAddAccount = async () => {
    setShowAccountMenu(false);
    await AuthService.signOut();
    router.push('/login');
  };

  const otherAccounts = savedAccounts.filter((a) => a.id !== user?.id);

  const navItems = [
    { label: 'Home', href: '/', icon: Home, badge: 0 },
    { label: 'Explore', href: '/explore', icon: Search, badge: 0 },
    { label: 'Notifications', href: '/notifications', icon: Bell, badge: unreadNotifsCount },
    { label: 'Messages', href: '/messages', icon: Mail, badge: unreadMessagesCount },
    { label: 'Bookmarks', href: '/bookmarks', icon: Bookmark, badge: 0 },
    { label: 'Profile', href: '/profile', icon: User, badge: 0 },
    { label: 'Settings', href: '/settings', icon: Settings, badge: 0 },
  ];

  return (
    <aside className="hidden md:flex fixed left-0 top-0 h-full w-[280px] flex-col py-6 px-4 border-r border-white/10 z-40 bg-black/40 backdrop-blur-md">
      {/* Brand Logo */}
      <div className="px-4 pb-4">
        <Link 
          href="/" 
          className="flex items-center gap-3 text-white font-headline text-2xl font-bold tracking-tight hover:opacity-85 transition-opacity group"
        >
          <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/20 group-hover:scale-105 transition-transform flex-shrink-0">
            <Image
              src="/logo.jpg"
              alt="Chronicle Logo"
              width={40}
              height={40}
              className="w-full h-full object-cover"
              priority
            />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight">Chronicle</span>
            <p className="text-[11px] font-mono tracking-wider text-on-surface-variant uppercase opacity-75">News Feed</p>
          </div>
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1.5 mt-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => {
                if (item.href === '/notifications' && unreadNotifsCount > 0) {
                  markNotificationsRead();
                }
                if (item.href === '/messages' && unreadMessagesCount > 0) {
                  markAllMessagesAsRead();
                }
              }}
              className={`flex items-center justify-between px-4 py-3 rounded-full transition-all duration-150 group ${
                isActive 
                  ? 'bg-white/10 text-white font-semibold shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]' 
                  : 'text-on-surface-variant hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-4">
                <Icon className={`w-6 h-6 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-on-surface-variant group-hover:text-white'}`} />
                <span className="text-[17px] tracking-tight">{item.label}</span>
              </div>

              {item.badge > 0 && (
                <span className="bg-white text-black font-bold text-xs px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Compose CTA */}
      <div className="px-2 mt-auto">
        <button
          onClick={openCompose}
          className="w-full bg-primary text-black font-headline font-bold py-3.5 rounded-full text-base hover:bg-white/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(255,255,255,0.15)]"
        >
          <Feather className="w-5 h-5" />
          <span>Post</span>
        </button>
      </div>

      {/* User Card + Account Switcher */}
      <div className="mt-4 pt-4 border-t border-white/10 relative" ref={menuRef}>
        {user ? (
          <>
            <button
              onClick={() => setShowAccountMenu((v) => !v)}
              className="w-full flex items-center gap-3 p-2.5 rounded-full hover:bg-white/5 transition-colors group"
            >
              <Image
                src={user?.avatar_url || '/default-avatar.jpg'}
                alt="Profile"
                width={40}
                height={40}
                className="w-10 h-10 rounded-full object-cover border border-white/20 transition-all group-hover:border-white/40 flex-shrink-0"
              />
              <div className="flex-1 overflow-hidden text-left">
                <p className="font-semibold text-sm text-primary truncate leading-tight">{user.full_name}</p>
                <p className="text-on-surface-variant text-xs truncate">@{user.username}</p>
              </div>
              <MoreHorizontal className="w-5 h-5 text-on-surface-variant group-hover:text-white transition-colors flex-shrink-0" />
            </button>

            {/* Account Switcher Dropdown */}
            {showAccountMenu && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-[#111] border border-white/15 rounded-2xl shadow-2xl overflow-hidden z-50 animate-fade-in">
                {/* Current Account */}
                <div className="p-3 border-b border-white/10">
                  <p className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider px-1 mb-2">Active Account</p>
                  <div className="flex items-center gap-3 px-1">
                    <Image
                      src={user.avatar_url || '/default-avatar.jpg'}
                      alt={user.full_name}
                      width={36}
                      height={36}
                      className="w-9 h-9 rounded-full object-cover border border-white/20 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{user.full_name}</p>
                      <p className="text-xs text-on-surface-variant font-mono truncate">@{user.username}</p>
                    </div>
                    <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  </div>
                </div>

                {/* Other Saved Accounts */}
                {otherAccounts.length > 0 && (
                  <div className="p-3 border-b border-white/10 space-y-1">
                    <p className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider px-1 mb-2">Switch Account</p>
                    {otherAccounts.map((acc) => (
                      <button
                        key={acc.id}
                        onClick={() => handleSwitchToAccount(acc)}
                        className="w-full flex items-center gap-3 px-1 py-2 rounded-xl hover:bg-white/5 transition-colors group/acc"
                      >
                        {acc.avatar_url ? (
                          <Image
                            src={acc.avatar_url}
                            alt={acc.full_name}
                            width={36}
                            height={36}
                            className="w-9 h-9 rounded-full object-cover border border-white/10 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-white/10 border border-white/10 flex items-center justify-center flex-shrink-0">
                            <UserCircle2 className="w-5 h-5 text-white/50" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-sm font-semibold text-white truncate group-hover/acc:underline">{acc.full_name}</p>
                          <p className="text-xs text-on-surface-variant font-mono truncate">@{acc.username}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="p-2 space-y-0.5">
                  <button
                    onClick={handleAddAccount}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 text-white/80 hover:text-white transition-colors text-sm font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add existing account</span>
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-500/10 text-red-400/80 hover:text-red-400 transition-colors text-sm font-medium"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign out @{user.username}</span>
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <Link
            href="/login"
            className="flex justify-center items-center py-2.5 rounded-full border border-white/20 text-white hover:bg-white/5 transition-colors text-sm font-semibold"
          >
            Sign In
          </Link>
        )}
      </div>
    </aside>
  );
}
