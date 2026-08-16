'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { X, Download, ExternalLink, ZoomIn, ZoomOut, Check, Link as LinkIcon } from 'lucide-react';

interface ImageLightboxModalProps {
  isOpen: boolean;
  imageUrl: string | null;
  altText?: string;
  onClose: () => void;
}

export function ImageLightboxModal({ isOpen, imageUrl, altText = 'Image Preview', onClose }: ImageLightboxModalProps) {
  const [isZoomed, setIsZoomed] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
      setIsZoomed(false);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !imageUrl) return null;

  // Download image file directly to user device
  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      // Get extension or fallback
      const extension = blob.type.split('/')[1] || 'jpg';
      link.download = `chronicle-${Date.now()}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.warn('Failed to download image with blob, falling back to window.open:', err);
      window.open(imageUrl, '_blank');
    } finally {
      setIsDownloading(false);
    }
  };

  // Copy Image Link
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(imageUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy image link:', err);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-2xl flex flex-col justify-between select-none animate-fade-in"
      onClick={onClose}
    >
      {/* Top Floating Control Bar */}
      <div 
        className="w-full h-16 px-4 md:px-6 flex items-center justify-between z-10 bg-gradient-to-b from-black/80 to-transparent"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button on Left/Top */}
        <button
          onClick={onClose}
          className="p-2.5 rounded-full bg-black/60 hover:bg-white/20 text-white/80 hover:text-white backdrop-blur-xl border border-white/10 transition-all active:scale-95 shadow-lg group"
          title="Close (Esc)"
        >
          <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-200" />
        </button>

        {/* Action Controls on Right */}
        <div className="flex items-center gap-2 bg-black/60 backdrop-blur-xl border border-white/10 rounded-full px-2 py-1 shadow-lg">
          {/* Zoom Toggle */}
          <button
            onClick={() => setIsZoomed((prev) => !prev)}
            className="p-2 rounded-full hover:bg-white/15 text-white/80 hover:text-white transition-colors"
            title={isZoomed ? 'Zoom Out' : 'Zoom In'}
          >
            {isZoomed ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
          </button>

          {/* Copy Image Link */}
          <button
            onClick={handleCopyLink}
            className="p-2 rounded-full hover:bg-white/15 text-white/80 hover:text-white transition-colors relative"
            title="Copy Image Link"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <LinkIcon className="w-4 h-4" />}
          </button>

          {/* Open in new tab */}
          <a
            href={imageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-full hover:bg-white/15 text-white/80 hover:text-white transition-colors"
            title="Open Original Image"
          >
            <ExternalLink className="w-4 h-4" />
          </a>

          {/* Save / Download Image Button */}
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-primary text-black rounded-full text-xs font-headline font-bold hover:bg-white/90 active:scale-95 transition-all shadow-[0_0_15px_rgba(255,255,255,0.2)] ml-1 disabled:opacity-50"
            title="Save Image to Device"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isDownloading ? 'Saving...' : 'Save'}</span>
          </button>
        </div>
      </div>

      {/* Main Image Stage */}
      <div 
        className="flex-1 flex items-center justify-center p-2 sm:p-6 md:p-8 overflow-auto cursor-zoom-out"
        onClick={onClose}
      >
        <div
          className={`relative transition-transform duration-300 ease-out ${
            isZoomed ? 'scale-125 md:scale-150 cursor-grab active:cursor-grabbing' : 'cursor-zoom-in'
          }`}
          onClick={(e) => {
            e.stopPropagation();
            setIsZoomed((prev) => !prev);
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={altText}
            className="max-h-[82vh] max-w-[94vw] w-auto h-auto object-contain rounded-lg sm:rounded-xl shadow-[0_20px_70px_rgba(0,0,0,0.95)] border border-white/10"
          />
        </div>
      </div>

      {/* Bottom Hint */}
      <div 
        className="w-full pb-4 text-center z-10 pointer-events-none"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-[11px] font-mono text-white/40 bg-black/40 px-3 py-1 rounded-full border border-white/5 backdrop-blur-md">
          Click image to {isZoomed ? 'zoom out' : 'zoom in'} · Press ESC or click outside to close
        </span>
      </div>
    </div>
  );
}
