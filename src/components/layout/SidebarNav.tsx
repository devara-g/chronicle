'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  Sparkles,
  MoreHorizontal
} from 'lucide-react';

export function SidebarNav() {
  const pathname = usePathname();
  const { user, unreadNotifsCount, unreadMessagesCount, openCompose } = useApp();

  const navItems = [
    { label: 'Home', href: '/', icon: Home, badge: 0 },
    { label: 'Explore', href: '/explore', icon: Search, badge: 0 },
    { label: 'Notifications', href: '/notifications', icon: Bell, badge: unreadNotifsCount },
    { label: 'Messages', href: '/messages', icon: Mail, badge: unreadMessagesCount },
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
          <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center group-hover:scale-105 transition-transform">
            <span className="material-symbols-outlined text-white text-2xl">all_inclusive</span>
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight">Chronicle</span>
            <p className="text-[11px] font-mono tracking-wider text-on-surface-variant uppercase opacity-75">Noir Glass</p>
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

      {/* User Card */}
      <div className="mt-4 pt-4 border-t border-white/10">
        {user ? (
          <Link
            href="/profile"
            className="flex items-center gap-3 p-2.5 rounded-full hover:bg-white/5 transition-colors group"
          >
            <Image
              src={user?.avatar_url || '/default-avatar.jpg'}
              alt="Profile"
              width={40}
              height={40}
              className="w-10 h-10 rounded-full object-cover border border-white/20 transition-all group-hover:border-white/40"
            />
            <div className="flex-1 overflow-hidden">
              <p className="font-semibold text-sm text-primary truncate leading-tight">{user.full_name}</p>
              <p className="text-on-surface-variant text-xs truncate">@{user.username}</p>
            </div>
            <MoreHorizontal className="w-5 h-5 text-on-surface-variant group-hover:text-white transition-colors" />
          </Link>
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
