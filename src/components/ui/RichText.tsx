'use client';

import React from 'react';
import Link from 'next/link';

interface RichTextProps {
  text: string;
  className?: string;
}

// Regex to match @mentions, #hashtags, and URLs
const TOKEN_REGEX = /(@[\w]+|#[\w\u00C0-\u024F]+|https?:\/\/[^\s]+)/g;

export function RichText({ text, className }: RichTextProps) {
  const parts = text.split(TOKEN_REGEX);

  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (part.startsWith('@')) {
          const username = part.slice(1);
          return (
            <Link
              key={i}
              href={`/profile/${username}`}
              onClick={(e) => e.stopPropagation()}
              className="text-sky-400 hover:text-sky-300 hover:underline transition-colors font-medium"
            >
              {part}
            </Link>
          );
        }

        if (part.startsWith('#')) {
          const tag = encodeURIComponent(part);
          return (
            <Link
              key={i}
              href={`/explore?q=${tag}`}
              onClick={(e) => e.stopPropagation()}
              className="text-violet-400 hover:text-violet-300 hover:underline transition-colors font-medium"
            >
              {part}
            </Link>
          );
        }

        if (part.startsWith('http://') || part.startsWith('https://')) {
          // Truncate displayed URL if too long
          const displayUrl = part.length > 40 ? part.slice(0, 40) + '…' : part;
          return (
            <a
              key={i}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-cyan-400 hover:text-cyan-300 hover:underline transition-colors"
            >
              {displayUrl}
            </a>
          );
        }

        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </span>
  );
}
