'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Home, Search, Bell, Mail, User, Plus, Infinity } from 'lucide-react';

export function MobileNav() {
  const pathname = usePathname();
  const { unreadNotifsCount, unreadMessagesCount, openCompose, markNotificationsRead, markAllMessagesAsRead } = useApp();

  const handleOpenAi = () => {
    window.dispatchEvent(new CustomEvent('open-ai-assistant'));
  };

  const navItems = [
    { href: '/', icon: Home, label: 'Home' },
    { href: '/explore', icon: Search, label: 'Explore' },
    { href: '/notifications', icon: Bell, label: 'Notifications', badge: unreadNotifsCount },
    { href: '/messages', icon: Mail, label: 'Messages', badge: unreadMessagesCount },
    { href: '/profile', icon: User, label: 'Profile' },
  ];

  return (
    <>
      {/* Mobile Floating Action Button */}
      <button
        onClick={openCompose}
        aria-label="Create Post"
        className="md:hidden fixed bottom-20 right-4 w-14 h-14 bg-primary text-black rounded-full flex items-center justify-center shadow-[0_0_25px_rgba(255,255,255,0.25)] z-40 active:scale-95 transition-transform"
      >
        <Plus className="w-7 h-7" />
      </button>

      {/* Bottom Glass Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-black/85 backdrop-blur-xl border-t border-white/10 flex justify-around items-center h-16 z-40 px-2">
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
              className={`p-2.5 relative rounded-full transition-all active:scale-90 ${
                isActive ? 'text-white bg-white/10' : 'text-on-surface-variant hover:text-white'
              }`}
              title={item.label}
            >
              <Icon className="w-[22px] h-[22px]" />
              {item.badge && item.badge > 0 ? (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-sky-400 rounded-full animate-pulse"></span>
              ) : null}
            </Link>
          );
        })}

        {/* Chronicle AI Icon right next to User / Profile */}
        <button
          onClick={handleOpenAi}
          className="p-2.5 relative rounded-full text-on-surface-variant hover:text-white hover:bg-white/10 active:scale-90 transition-all group"
          title="Chronicle AI"
          aria-label="Open Chronicle AI"
        >
          <Infinity className="w-[22px] h-[22px] text-white/80 group-hover:text-white transition-colors" />
        </button>
      </nav>
    </>
  );
}
