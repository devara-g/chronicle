'use client';

import React, { useRef, useEffect, useState, useLayoutEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Home, Search, Bell, Mail, Bookmark, Plus, Sparkles } from 'lucide-react';

interface NavItem {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  isBadge?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/explore', icon: Search, label: 'Explore' },
  { href: '/notifications', icon: Bell, label: 'Notifications', isBadge: true },
  { href: '/messages', icon: Mail, label: 'Messages', isBadge: true },
  { href: '/bookmarks', icon: Bookmark, label: 'Bookmarks' },
];

export function MobileNav() {
  const pathname = usePathname();
  const { unreadNotifsCount, unreadMessagesCount, openCompose, markNotificationsRead, markAllMessagesAsRead } = useApp();

  // Optimistic active path for instant sliding response on touch
  const [activeHref, setActiveHref] = useState(pathname);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [capsuleStyle, setCapsuleStyle] = useState<{ left: number; width: number; height: number } | null>(null);

  // Sync with route changes
  useEffect(() => {
    setActiveHref(pathname);
  }, [pathname]);

  // Find active index
  const activeIndex = NAV_ITEMS.findIndex((item) => {
    if (item.href === '/') return activeHref === '/';
    return activeHref.startsWith(item.href);
  });

  // Calculate liquid pill position & size
  const updateCapsulePosition = () => {
    const targetIdx = activeIndex >= 0 ? activeIndex : 0;
    const targetEl = itemRefs.current[targetIdx];
    const containerEl = containerRef.current;

    if (!targetEl || !containerEl) return;

    const containerRect = containerEl.getBoundingClientRect();
    const targetRect = targetEl.getBoundingClientRect();

    setCapsuleStyle({
      left: targetRect.left - containerRect.left,
      width: targetRect.width,
      height: targetRect.height,
    });
  };

  useLayoutEffect(() => {
    updateCapsulePosition();
    // Re-check after font/render settlement
    const t = setTimeout(updateCapsulePosition, 50);
    return () => clearTimeout(t);
  }, [activeHref, activeIndex]);

  useEffect(() => {
    window.addEventListener('resize', updateCapsulePosition);
    return () => window.removeEventListener('resize', updateCapsulePosition);
  }, [activeIndex]);

  return (
    <>
      {/* Floating Action Button for Compose */}
      <button
        onClick={openCompose}
        aria-label="Create Post"
        className="md:hidden fixed bottom-24 right-4 w-13 h-13 bg-primary text-black rounded-full flex items-center justify-center shadow-[0_0_25px_rgba(255,255,255,0.3)] z-40 active:scale-90 transition-transform"
      >
        <Plus className="w-6 h-6 stroke-[2.5]" />
      </button>

      {/* Floating Liquid Glass Navigation Dock */}
      <div className="md:hidden fixed bottom-4 left-0 right-0 z-40 px-3 flex justify-center pointer-events-none">
        <nav
          aria-label="Mobile Bottom Navigation"
          className="pointer-events-auto w-full max-w-[420px] rounded-full p-1.5 transition-all shadow-[0_12px_36px_rgba(0,0,0,0.85)] border border-white/[0.12]"
          style={{
            background: 'rgba(10, 10, 10, 0.78)',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          }}
        >
          <div ref={containerRef} className="relative flex items-center justify-between">
            {/* 3D Liquid Glass Capsule Pill (sliding indicator) */}
            {capsuleStyle && (
              <div
                className="liquid-glass-capsule"
                style={{
                  left: `${capsuleStyle.left}px`,
                  width: `${capsuleStyle.width}px`,
                  height: `${capsuleStyle.height}px`,
                }}
              />
            )}

            {NAV_ITEMS.map((item, idx) => {
              const isActive = (activeIndex >= 0 ? activeIndex : 0) === idx;
              const Icon = item.icon;
              const badgeCount =
                item.href === '/notifications'
                  ? unreadNotifsCount
                  : item.href === '/messages'
                  ? unreadMessagesCount
                  : 0;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  ref={(el) => { itemRefs.current[idx] = el; }}
                  onClick={() => {
                    setActiveHref(item.href);
                    if (item.href === '/notifications' && unreadNotifsCount > 0) markNotificationsRead();
                    if (item.href === '/messages' && unreadMessagesCount > 0) markAllMessagesAsRead();
                  }}
                  className={`relative flex-1 py-2.5 px-3 rounded-full flex items-center justify-center gap-1.5 transition-all duration-200 z-10 select-none active:scale-95 ${
                    isActive
                      ? 'text-white font-semibold'
                      : 'text-white/40 hover:text-white/75'
                  }`}
                  title={item.label}
                  aria-label={item.label}
                >
                  <Icon
                    className={`w-[21px] h-[21px] transition-all duration-200 ${
                      isActive
                        ? 'stroke-[2.2] scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.7)]'
                        : 'stroke-[1.7] scale-100'
                    }`}
                  />

                  {/* Badge Notification */}
                  {badgeCount > 0 && (
                    <span className="absolute top-2 right-3 w-2 h-2 bg-sky-400 rounded-full border border-black animate-pulse" />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </>
  );
}
