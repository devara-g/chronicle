'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { X, Image as ImageIcon, Type, Sparkles, Loader2, Check } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { StoriesService } from '@/lib/services/stories.service';
import { StorageService } from '@/lib/services/storage.service';

interface CreateStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStoryCreated: () => void;
}

const GRADIENTS = [
  { id: 'noir', name: 'Obsidian', class: 'from-[#050505] via-[#111111] to-[#1c1c1c]' },
  { id: 'emerald', name: 'Emerald Noir', class: 'from-[#022c22] via-[#064e3b] to-[#021d17]' },
  { id: 'cyber', name: 'Cyber Violet', class: 'from-[#1e1b4b] via-[#2e1065] to-[#0f0728]' },
  { id: 'crimson', name: 'Crimson Smoke', class: 'from-[#450a0a] via-[#280505] to-[#120202]' },
  { id: 'ocean', name: 'Midnight Deep', class: 'from-[#082f49] via-[#0f172a] to-[#030712]' },
];

export function CreateStoryModal({ isOpen, onClose, onStoryCreated }: CreateStoryModalProps) {
  const { user } = useApp();
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<'text' | 'image'>('text');
  const [selectedGradient, setSelectedGradient] = useState(GRADIENTS[1].class);
  const [textContent, setTextContent] = useState('');
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isOpen || !user) return null;

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Pilih file gambar yang valid.');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      alert('Ukuran gambar maksimal 15MB.');
      return;
    }

    setSelectedImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
  };

  const handleResetImage = () => {
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setSelectedImageFile(null);
    setImagePreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async () => {
    if (mode === 'text' && !textContent.trim()) {
      alert('Tuliskan sesuatu untuk story teks kamu.');
      return;
    }

    if (mode === 'image' && !selectedImageFile) {
      alert('Pilih foto terlebih dahulu.');
      return;
    }

    setIsSubmitting(true);
    try {
      let mediaUrl: string | null = null;

      if (mode === 'image' && selectedImageFile) {
        try {
          mediaUrl = await StorageService.uploadMedia(selectedImageFile, user.id, 'stories');
        } catch (e) {
          console.warn('Storage upload failed, falling back to base64:', e);
          mediaUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(selectedImageFile);
          });
        }
      }

      await StoriesService.createStory(user, {
        media_type: mode,
        media_url: mediaUrl,
        text_content: mode === 'text' ? textContent.trim() : null,
        bg_gradient: mode === 'text' ? selectedGradient : undefined,
        caption: mode === 'image' ? caption.trim() : null,
      });

      handleResetImage();
      setTextContent('');
      setCaption('');
      onStoryCreated();
      onClose();
    } catch (err) {
      console.error('Failed to create story:', err);
      alert('Gagal membagikan story. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalContent = (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-xl flex items-center justify-center p-3 sm:p-4 select-none animate-fadeIn"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[#0f0f0f] border border-white/15 rounded-3xl overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.95)] flex flex-col max-h-[90vh] relative z-10"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h3 className="font-headline font-bold text-white text-base">Buat Noir Story</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="p-3 border-b border-white/10 flex gap-2">
          <button
            type="button"
            onClick={() => setMode('text')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-mono font-semibold flex items-center justify-center gap-2 transition ${
              mode === 'text'
                ? 'bg-white/15 text-white border border-white/20'
                : 'text-white/40 hover:text-white hover:bg-white/5'
            }`}
          >
            <Type className="w-4 h-4" />
            <span>Teks Noir</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('image')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-mono font-semibold flex items-center justify-center gap-2 transition ${
              mode === 'image'
                ? 'bg-white/15 text-white border border-white/20'
                : 'text-white/40 hover:text-white hover:bg-white/5'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Foto / Media</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {mode === 'text' ? (
            <>
              {/* Text Preview Box */}
              <div
                className={`w-full aspect-[9/12] max-h-[300px] rounded-2xl bg-gradient-to-br ${selectedGradient} p-6 flex items-center justify-center text-center shadow-inner relative overflow-hidden border border-white/10`}
              >
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Ketik cerita noir kamu di sini..."
                  maxLength={280}
                  className="w-full h-full bg-transparent text-white font-headline text-lg sm:text-xl font-bold placeholder:text-white/30 resize-none focus:outline-none flex items-center text-center leading-relaxed"
                />
              </div>

              {/* Gradient Theme Picker */}
              <div className="space-y-1.5">
                <span className="text-xs font-mono text-white/50">Warna Gradien Noir:</span>
                <div className="flex items-center gap-2">
                  {GRADIENTS.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setSelectedGradient(g.class)}
                      className={`w-8 h-8 rounded-full bg-gradient-to-br ${g.class} border-2 transition active:scale-90 flex items-center justify-center ${
                        selectedGradient === g.class ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-60'
                      }`}
                      title={g.name}
                    >
                      {selectedGradient === g.class && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Image Preview / Upload Box */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />

              {imagePreviewUrl ? (
                <div className="relative w-full aspect-[9/12] max-h-[300px] rounded-2xl overflow-hidden border border-white/10 group">
                  <Image src={imagePreviewUrl} alt="Story Preview" fill className="object-cover" />
                  <button
                    type="button"
                    onClick={handleResetImage}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-white hover:bg-black transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full aspect-[9/12] max-h-[300px] rounded-2xl border-2 border-dashed border-white/20 hover:border-emerald-400/60 bg-white/[0.02] hover:bg-white/[0.04] flex flex-col items-center justify-center gap-3 cursor-pointer transition p-6 text-center"
                >
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white/60">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Ketuk untuk memilih foto</p>
                    <p className="text-xs font-mono text-white/40 mt-1">Maksimal 15MB (JPG, PNG, WebP)</p>
                  </div>
                </div>
              )}

              {/* Caption Input */}
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Tambah caption singkat (opsional)..."
                maxLength={100}
                className="w-full bg-white/5 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 font-body"
              />
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-4 border-t border-white/10 flex items-center justify-between">
          <span className="text-[11px] font-mono text-white/40">Hilang dalam 24 jam</span>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || (mode === 'text' && !textContent.trim()) || (mode === 'image' && !selectedImageFile)}
            className="px-5 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs flex items-center gap-2 shadow-[0_0_20px_rgba(52,211,153,0.4)] transition active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Membagikan...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Bagikan Cerita</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
