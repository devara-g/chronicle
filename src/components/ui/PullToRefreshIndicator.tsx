'use client';

import React from 'react';
import { RefreshCw } from 'lucide-react';

interface PullToRefreshIndicatorProps {
  isPulling: boolean;
  pullDistance: number;
  isRefreshing: boolean;
  threshold?: number;
}

export function PullToRefreshIndicator({
  isPulling,
  pullDistance,
  isRefreshing,
  threshold = 80,
}: PullToRefreshIndicatorProps) {
  const progress = Math.min(pullDistance / threshold, 1);
  const isVisible = isPulling || isRefreshing;

  if (!isVisible) return null;

  // Translate down proportionally to pull distance
  const translateY = isRefreshing ? threshold * 0.7 : pullDistance * 0.7;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none"
      style={{ transform: `translateY(${translateY}px)` }}
    >
      <div
        className="flex items-center justify-center gap-2 px-4 py-2 rounded-full
          bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl shadow-black/50
          text-white text-xs font-mono transition-all duration-200"
        style={{
          opacity: isRefreshing ? 1 : Math.min(progress * 1.4, 1),
          scale: isRefreshing ? '1' : `${0.7 + progress * 0.3}`,
        }}
      >
        <RefreshCw
          className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-sky-400' : 'text-white/80'}`}
          style={{
            transform: isRefreshing ? undefined : `rotate(${progress * 360}deg)`,
          }}
        />
        <span className="text-white/80">
          {isRefreshing
            ? 'Refreshing...'
            : progress >= 1
            ? 'Release to refresh'
            : 'Pull to refresh'}
        </span>
      </div>
    </div>
  );
}
