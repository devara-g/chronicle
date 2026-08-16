'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Infinity } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useApp } from '@/context/AppContext';

interface MobileTopBarProps {
  title: string;
  showBack?: boolean;
  action?: React.ReactNode;
}

export function MobileTopBar({ title, showBack = false, action }: MobileTopBarProps) {
  const router = useRouter();
  const { user } = useApp();

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
          <Link href="/profile">
            <Image
              src={user.avatar_url || '/default-avatar.jpg'}
              alt={user.full_name}
              width={32}
              height={32}
              className="w-8 h-8 rounded-full object-cover border border-white/20"
            />
          </Link>
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
