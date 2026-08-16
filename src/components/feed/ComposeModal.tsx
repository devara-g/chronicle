'use client';

import React, { useState, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { X, Image as ImageIcon, Sparkles, Smile } from 'lucide-react';
import Image from 'next/image';

export function ComposeModal() {
  const { isComposeOpen, closeCompose, user, createPost } = useApp();
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isComposeOpen || !user) return null;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingMedia(true);
    try {
      const { compressImageToWebp } = await import('@/lib/image-utils');
      const { StorageService } = await import('@/lib/services/storage.service');
      
      const compressedFile = await compressImageToWebp(file, 1200);
      const url = await StorageService.uploadMedia(compressedFile, user.id);
      
      setMediaUrl(url);
    } catch (err) {
      console.error('Failed to upload image', err);
      alert('Failed to upload image.');
    } finally {
      setUploadingMedia(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!content.trim() && !mediaUrl.trim()) return;
    setLoading(true);
    try {
      await createPost(content.trim(), mediaUrl.trim() || null);
      setContent('');
      setMediaUrl('');
      closeCompose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div 
        className="w-full max-w-lg bg-[#0e0e0e] border border-white/15 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <button
            onClick={closeCompose}
            className="p-1.5 rounded-full hover:bg-white/10 text-on-surface-variant hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <span className="font-headline font-bold text-sm text-primary">New Chronicle</span>
          <div className="w-8" />
        </div>

        {/* Form Body */}
        <div className="p-4 flex gap-3.5">
          <Image
            src={user.avatar_url || '/default-avatar.jpg'}
            alt={user.full_name}
            width={44}
            height={44}
            className="w-11 h-11 rounded-full object-cover border border-white/10 flex-shrink-0 mt-1"
          />

          <div className="flex-1">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's happening in the noir?"
              rows={4}
              autoFocus
              className="w-full bg-transparent border-none text-white text-[17px] placeholder:text-outline focus:ring-0 resize-none outline-none font-body leading-relaxed"
            />

            {/* Media Preview */}
            {uploadingMedia ? (
              <div className="mb-3 p-4 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center">
                 <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                 <span className="ml-3 text-xs text-on-surface-variant font-mono">Compressing & Uploading...</span>
              </div>
            ) : mediaUrl ? (
              <div className="mt-2 relative rounded-lg overflow-hidden border border-white/10 max-h-40 group">
                <Image src={mediaUrl} alt="Preview" width={400} height={300} className="w-full h-auto object-cover" />
                <button
                  onClick={() => setMediaUrl('')}
                  className="absolute top-2 right-2 p-1 bg-black/70 text-white rounded-full hover:bg-black opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-white/10 bg-black/40">
          <div className="flex items-center gap-2 text-on-surface-variant">
            <input 
              type="file" 
              accept="image/*" 
              ref={fileInputRef} 
              onChange={handleFileSelect} 
              className="hidden" 
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingMedia}
              className={`p-2 rounded-full transition-colors ${
                mediaUrl ? 'bg-white/20 text-white' : 'hover:bg-white/10 hover:text-white'
              }`}
            >
              <ImageIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => setContent(prev => prev + ' #Noir')}
              className="p-2 rounded-full hover:bg-white/10 hover:text-white transition-colors"
            >
              <Sparkles className="w-5 h-5" />
            </button>
            <button
              onClick={() => setContent(prev => prev + ' 🖤')}
              className="p-2 rounded-full hover:bg-white/10 hover:text-white transition-colors"
            >
              <Smile className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            {content.length > 0 && (
              <span className={`text-xs font-mono ${content.length > 280 ? 'text-red-400' : 'text-on-surface-variant'}`}>
                {280 - content.length}
              </span>
            )}
            <button
              onClick={handleSubmit}
              disabled={(!content.trim() && !mediaUrl.trim()) || loading || content.length > 280}
              className="bg-primary text-black font-headline font-bold py-2 px-6 rounded-full text-sm hover:bg-white/90 active:scale-95 transition-all disabled:opacity-40"
            >
              {loading ? 'Posting...' : 'Post'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
