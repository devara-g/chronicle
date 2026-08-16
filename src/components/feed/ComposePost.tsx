'use client';

import React, { useState, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { Image as ImageIcon, Smile, BarChart2, Sparkles, X } from 'lucide-react';
import Image from 'next/image';

interface ComposePostProps {
  placeholder?: string;
  onSuccess?: () => void;
  compact?: boolean;
}

export function ComposePost({ placeholder = "What's happening in the noir?", onSuccess, compact = false }: ComposePostProps) {
  const { user, createPost } = useApp();
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    
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

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!content.trim() && !mediaUrl.trim()) return;

    setLoading(true);
    try {
      await createPost(content.trim(), mediaUrl.trim() || null);
      setContent('');
      setMediaUrl('');
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (!user) {
    return (
      <div className="p-6 border-b border-white/10 text-center bg-white/[0.02]">
        <p className="text-sm text-on-surface-variant font-mono mb-3">Sign in to write a chronicle.</p>
        <a href="/login" className="inline-block bg-primary text-black font-headline font-bold py-2 px-6 rounded-full text-sm hover:bg-white/90 transition-all">Sign In</a>
      </div>
    );
  }

  return (
    <div className={`p-4 border-b border-white/10 flex gap-3.5 bg-black/30 backdrop-blur-sm ${compact ? '' : ''}`}>
      <div className="flex-shrink-0">
        <Image
          src={user.avatar_url || '/default-avatar.jpg'}
          alt={user.full_name}
          width={44}
          height={44}
          className="w-10 h-10 md:w-11 md:h-11 rounded-full object-cover border border-white/10"
        />
      </div>

      <div className="flex-1 pt-0.5">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={compact ? 2 : 3}
          className="w-full bg-transparent border-none text-white text-[16px] md:text-[18px] placeholder:text-outline focus:ring-0 resize-none outline-none font-body leading-relaxed"
        />

        {/* Media Preview */}
        {uploadingMedia ? (
          <div className="mb-3 p-4 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center">
             <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
             <span className="ml-3 text-xs text-on-surface-variant font-mono">Compressing & Uploading...</span>
          </div>
        ) : mediaUrl ? (
          <div className="mb-3 relative rounded-lg overflow-hidden border border-white/10 max-h-40 group">
            <Image src={mediaUrl} alt="Preview" width={400} height={300} className="w-full h-auto object-cover" />
            <button
              onClick={() => setMediaUrl('')}
              className="absolute top-2 right-2 p-1 bg-black/70 hover:bg-black text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : null}

        <div className="flex justify-between items-center pt-3 border-t border-white/[0.06]">
          <div className="flex items-center gap-1 text-on-surface-variant">
            <input 
              type="file" 
              accept="image/*" 
              ref={fileInputRef} 
              onChange={handleFileSelect} 
              className="hidden" 
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingMedia}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                mediaUrl ? 'bg-white/20 text-white' : 'hover:bg-white/10 hover:text-white'
              } ${uploadingMedia ? 'opacity-50 cursor-wait' : ''}`}
              title="Upload Image"
            >
              {uploadingMedia ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <ImageIcon className="w-4 h-4" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setContent(prev => prev + ' #Minimalism')}
              className="w-8 h-8 rounded-full hover:bg-white/10 hover:text-white flex items-center justify-center transition-colors"
              title="Add Tag"
            >
              <Sparkles className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setContent(prev => prev + ' 🖤')}
              className="w-8 h-8 rounded-full hover:bg-white/10 hover:text-white flex items-center justify-center transition-colors"
              title="Add Emoji"
            >
              <Smile className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            {content.length > 0 && (
              <span className={`text-xs font-mono ${content.length > 280 ? 'text-red-400' : 'text-on-surface-variant'}`}>
                {280 - content.length}
              </span>
            )}
            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={(!content.trim() && !mediaUrl.trim()) || loading || content.length > 280}
              className="bg-primary text-black font-headline font-bold py-1.5 px-5 rounded-full text-sm hover:bg-white/90 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none"
            >
              {loading ? 'Posting...' : 'Post'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
