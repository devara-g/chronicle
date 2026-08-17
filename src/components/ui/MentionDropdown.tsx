'use client';

import React from 'react';
import Image from 'next/image';
import { Profile } from '@/types';
import { Loader2, AtSign } from 'lucide-react';

interface MentionDropdownProps {
  isOpen: boolean;
  query: string;
  results: Profile[];
  isLoading: boolean;
  selectedIndex: number;
  onSelect: (profile: Profile) => void;
}

export function MentionDropdown({
  isOpen,
  query,
  results,
  isLoading,
  selectedIndex,
  onSelect,
}: MentionDropdownProps) {
  if (!isOpen) return null;

  return (
    <div
      className="absolute left-0 z-[9999] w-72 bg-[#111111] border border-white/15 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.8)] overflow-hidden animate-fade-in"
      style={{ top: 'calc(100% + 4px)' }}
      // Prevent mouse down from blurring the textarea
      onMouseDown={(e) => e.preventDefault()}
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-white/10 flex items-center gap-2">
        <AtSign className="w-3.5 h-3.5 text-sky-400" />
        <span className="text-xs font-mono text-on-surface-variant">
          {query ? (
            <>Searching <strong className="text-white">@{query}</strong>…</>
          ) : (
            'Tag someone'
          )}
        </span>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-4 text-on-surface-variant">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-xs font-mono">Searching…</span>
        </div>
      ) : results.length === 0 ? (
        <div className="py-4 px-3 text-center text-xs font-mono text-on-surface-variant">
          No accounts found for <strong className="text-white">@{query}</strong>
        </div>
      ) : (
        <ul>
          {results.map((profile, i) => (
            <li key={profile.id}>
              <button
                className={`w-full flex items-center gap-3 px-3 py-2.5 transition-colors text-left group ${
                  i === selectedIndex
                    ? 'bg-white/10'
                    : 'hover:bg-white/5'
                }`}
                onClick={() => onSelect(profile)}
              >
                <Image
                  src={profile.avatar_url || '/default-avatar.jpg'}
                  alt={profile.full_name}
                  width={36}
                  height={36}
                  className="w-9 h-9 rounded-full object-cover border border-white/10 flex-shrink-0 group-hover:border-white/20 transition-colors"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm leading-tight truncate">
                    {profile.full_name}
                  </p>
                  <p className="text-on-surface-variant text-xs font-mono truncate">
                    @{profile.username}
                  </p>
                </div>
                {i === selectedIndex && (
                  <span className="text-[10px] font-mono text-white/30 flex-shrink-0">↵</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
