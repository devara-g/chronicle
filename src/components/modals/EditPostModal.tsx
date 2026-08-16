'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { X } from 'lucide-react';
import { Post } from '@/types';

interface EditPostModalProps {
  post: Post | null;
  isOpen: boolean;
  onClose: () => void;
}

export function EditPostModal({ post, isOpen, onClose }: EditPostModalProps) {
  const { updatePost } = useApp();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (post) {
      setContent(post.content);
    }
  }, [post]);

  if (!isOpen || !post) return null;

  const handleSave = async () => {
    if (!content.trim() || content === post.content) {
      onClose();
      return;
    }
    
    setLoading(true);
    try {
      await updatePost(post.id, content.trim());
      onClose();
    } catch (err) {
      console.error('Failed to update post', err);
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
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-on-surface-variant hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <span className="font-headline font-bold text-sm text-primary">Edit Chronicle</span>
          
          <button
            onClick={handleSave}
            disabled={loading || !content.trim() || content.length > 280}
            className="bg-primary text-black font-headline font-bold py-1 px-4 rounded-full text-xs hover:bg-white/90 active:scale-95 transition-all disabled:opacity-40"
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>

        {/* Form Body */}
        <div className="p-4 flex gap-3.5">
          <div className="flex-1">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's happening?"
              rows={4}
              autoFocus
              className="w-full bg-transparent border-none text-white text-[17px] placeholder:text-outline focus:ring-0 resize-none outline-none font-body leading-relaxed"
            />
          </div>
        </div>
        
        {/* Footer */}
        <div className="px-4 py-3 border-t border-white/10 flex justify-end">
           <span className={`text-xs font-mono ${content.length > 280 ? 'text-red-400' : 'text-on-surface-variant'}`}>
             {280 - content.length}
           </span>
        </div>
      </div>
    </div>
  );
}
