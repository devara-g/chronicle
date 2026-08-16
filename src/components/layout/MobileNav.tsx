'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Home, Search, Bell, Mail, User, Plus } from 'lucide-react';

export function MobileNav() {
  const pathname = usePathname();
  const { unreadNotifsCount, unreadMessagesCount, openCompose, markNotificationsRead } = useApp();

  const items = [
    { href: '/', icon: Home },
    { href: '/explore', icon: Search },
    { href: '/notifications', icon: Bell, badge: unreadNotifsCount },
    { href: '/messages', icon: Mail, badge: unreadMessagesCount },
    { href: '/profile', icon: User },
  ];

  return (
    <>
      {/* Mobile Floating Action Button */}
      <button
        onClick={openCompose}
        aria-label="Create Post"
        className="md:hidden fixed bottom-20 right-4 w-14 h-14 bg-primary text-black rounded-full flex items-center justify-center shadow-[0_0_25px_rgba(255,255,255,0.25)] z-50 active:scale-95 transition-transform"
      >
        <Plus className="w-7 h-7" />
      </button>

      {/* Bottom Glass Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-black/80 backdrop-blur-xl border-t border-white/10 flex justify-around items-center h-16 z-50 px-2">
        {items.map((item) => {
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
              }}
              className={`p-3 relative rounded-full transition-colors ${
                isActive ? 'text-white' : 'text-on-surface-variant hover:text-white'
              }`}
            >
              <Icon className="w-6 h-6" />
              {item.badge && item.badge > 0 ? (
                <span className="absolute top-2 right-2 w-2 h-2 bg-white rounded-full"></span>
              ) : null}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
