'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';

interface EmojiPickerProps {
  onSelectEmoji: (emoji: string) => void;
  onClose: () => void;
  positionClass?: string;
}

const EMOJI_CATEGORIES = [
  {
    name: 'Smileys',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊',
      '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😋', '😛', '😜', '🤪', '😝',
      '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄',
      '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮',
      '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐', '😕',
      '😟', '🙁', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥',
      '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡',
      '😠', '🤬', '💀', '☠️', '💩', '🤡', '👻', '👽', '👾', '🤖'
    ]
  },
  {
    name: 'Hands & Body',
    emojis: [
      '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🫰', '🤟',
      '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊',
      '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪'
    ]
  },
  {
    name: 'Noir & Hearts',
    emojis: [
      '🖤', '🤍', '🩶', '💔', '❤️', '🔥', '✨', '🌟', '💫', '⚡', '♾️', '🌑',
      '🌒', '🌓', '🌔', '🌕', '🌙', '🌌', '🪐', '🕯️', '🔮', '🕶️', '♟️', '🕷️',
      '🕸️', '🗝️', '🗡️', '⛓️', '🩸', '🍷', '🥂', '🍸', '🎭', '🎬', '☕', '🚬'
    ]
  },
  {
    name: 'Symbols & Objects',
    emojis: [
      '💯', '💢', '💥', '💬', '💭', '🗯️', '💤', '🎵', '🎶', '📢', '📣', '🔔',
      '🎯', '🎲', '🎰', '🎮', '🚀', '🛸', '⏳', '⌛', '💡', '📌', '🔑', '🔒',
      '🔓', '🎉', '🎊', '🎈', '🏆', '🥇', '👑', '💎', '💸', '💰', '💳', '📱'
    ]
  }
];

export function EmojiPicker({ onSelectEmoji, onClose, positionClass = 'bottom-full mb-2 left-0' }: EmojiPickerProps) {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('Smileys');
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const filteredEmojis = search.trim()
    ? EMOJI_CATEGORIES.flatMap(c => c.emojis)
    : EMOJI_CATEGORIES.find(c => c.name === activeTab)?.emojis || EMOJI_CATEGORIES[0].emojis;

  return (
    <div
      ref={pickerRef}
      className={`absolute ${positionClass} z-50 w-[280px] sm:w-[320px] bg-[#121212]/95 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-[0_15px_50px_rgba(0,0,0,0.9)] p-3 flex flex-col space-y-2.5 animate-scale-in text-white`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Search Input */}
      <div className="relative flex items-center bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 focus-within:border-white/30 transition-colors">
        <Search className="w-3.5 h-3.5 text-on-surface-variant mr-2 flex-shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search emojis..."
          autoFocus
          className="w-full bg-transparent border-none text-xs text-white placeholder:text-outline focus:outline-none font-body"
        />
        {search && (
          <button onClick={() => setSearch('')} className="text-on-surface-variant hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Category Tabs (if not searching) */}
      {!search && (
        <div className="flex border-b border-white/10 pb-1.5 gap-1 overflow-x-auto no-scrollbar">
          {EMOJI_CATEGORIES.map((cat) => (
            <button
              key={cat.name}
              type="button"
              onClick={() => setActiveTab(cat.name)}
              className={`px-2 py-1 rounded-lg text-[11px] font-mono whitespace-nowrap transition-colors ${
                activeTab === cat.name
                  ? 'bg-white/15 text-white font-semibold'
                  : 'text-on-surface-variant hover:text-white hover:bg-white/5'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Emoji Grid */}
      <div className="max-h-[190px] overflow-y-auto grid grid-cols-7 sm:grid-cols-8 gap-1 p-1 [&::-webkit-scrollbar]:hidden">
        {filteredEmojis.map((emoji, idx) => (
          <button
            key={`${emoji}-${idx}`}
            type="button"
            onClick={() => {
              onSelectEmoji(emoji);
            }}
            className="w-8 h-8 flex items-center justify-center text-lg rounded-lg hover:bg-white/15 active:scale-90 transition-transform cursor-pointer"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
