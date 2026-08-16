'use client';

import React, { useState, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { X, Camera } from 'lucide-react';
import Image from 'next/image';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EditProfileModal({ isOpen, onClose }: EditProfileModalProps) {
  const { user, updateUserProfile } = useApp();
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [website, setWebsite] = useState(user?.website || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [bannerUrl, setBannerUrl] = useState(user?.banner_url || '');
  const [loading, setLoading] = useState(false);
  
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const setUploading = type === 'avatar' ? setUploadingAvatar : setUploadingBanner;
    const setUrl = type === 'avatar' ? setAvatarUrl : setBannerUrl;
    
    setUploading(true);
    try {
      const { compressImageToWebp } = await import('@/lib/image-utils');
      const { StorageService } = await import('@/lib/services/storage.service');
      
      const compressedFile = await compressImageToWebp(file, type === 'avatar' ? 400 : 1200);
      const url = await StorageService.uploadMedia(compressedFile, user.id);
      
      setUrl(url);
    } catch (err) {
      console.error(`Failed to upload ${type}`, err);
      alert(`Failed to upload ${type}.`);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  if (!isOpen || !user) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateUserProfile({
        full_name: fullName.trim(),
        bio: bio.trim(),
        website: website.trim(),
        avatar_url: avatarUrl.trim(),
        banner_url: bannerUrl.trim(),
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div 
        className="w-full max-w-lg bg-[#0e0e0e] border border-white/15 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white/10 text-on-surface-variant hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <span className="font-headline font-bold text-base text-primary">Edit Profile</span>
          </div>

          <button
            onClick={handleSave}
            disabled={loading}
            className="bg-primary text-black font-headline font-bold py-1.5 px-5 rounded-full text-xs hover:bg-white/90 transition-all disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSave} className="p-4 space-y-4 max-h-[80vh] overflow-y-auto font-body">
          {/* Banner URL Preview */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-on-surface-variant uppercase tracking-wider">Banner Image</label>
            <div className="relative h-28 bg-white/5 border border-white/10 rounded-xl overflow-hidden flex items-center justify-center group">
              {bannerUrl ? (
                <Image src={bannerUrl} alt="Banner Preview" fill className="object-cover" />
              ) : (
                <span className="text-xs text-on-surface-variant">No banner set</span>
              )}
              <div 
                onClick={() => bannerInputRef.current?.click()}
                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity"
              >
                {uploadingBanner ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Camera className="w-6 h-6 text-white" />
                )}
              </div>
              <input 
                type="file" 
                accept="image/*" 
                ref={bannerInputRef} 
                onChange={(e) => handleImageUpload(e, 'banner')} 
                className="hidden" 
              />
            </div>
          </div>

          {/* Avatar URL Preview */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-on-surface-variant uppercase tracking-wider">Avatar Image</label>
            <div className="flex items-center gap-4">
              <div className="relative w-14 h-14 rounded-full overflow-hidden border border-white/20 group">
                <Image
                  src={avatarUrl || '/default-avatar.jpg'}
                  alt="Avatar Preview"
                  fill
                  className="object-cover transition-all"
                />
                <div 
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity"
                >
                  {uploadingAvatar ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4 text-white" />
                  )}
                </div>
                <input 
                  type="file" 
                  accept="image/*" 
                  ref={avatarInputRef} 
                  onChange={(e) => handleImageUpload(e, 'avatar')} 
                  className="hidden" 
                />
              </div>
            </div>
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-on-surface-variant uppercase tracking-wider">Display Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
            />
          </div>

          {/* Bio */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-on-surface-variant uppercase tracking-wider">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30 resize-none"
            />
          </div>

          {/* Website */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-on-surface-variant uppercase tracking-wider">Website</label>
            <input
              type="text"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://yourportfolio.noir"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
            />
          </div>
        </form>
      </div>
    </div>
  );
}
