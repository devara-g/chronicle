'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { useApp } from '@/context/AppContext';
import { isSupabaseConfigured, supabase } from '@/lib/supabase/client';
import { AuthService } from '@/lib/services/auth.service';
import { StorageService } from '@/lib/services/storage.service';
import { 
  User, 
  Lock, 
  Bell, 
  Palette, 
  Database, 
  LogOut, 
  Check, 
  Sparkles, 
  Camera, 
  Globe, 
  ShieldCheck, 
  Eye, 
  Trash2,
  RefreshCw,
  Loader2,
  Sliders,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

const ACCENT_COLORS = [
  { name: 'Monochrome Noir', hex: '#ffffff', id: 'white', ring: 'ring-white' },
  { name: 'Neon Azure', hex: '#38bdf8', id: 'sky', ring: 'ring-sky-400' },
  { name: 'Cyberpunk Emerald', hex: '#10b981', id: 'emerald', ring: 'ring-emerald-400' },
  { name: 'Electric Violet', hex: '#a855f7', id: 'purple', ring: 'ring-purple-400' },
  { name: 'Crimson Rose', hex: '#f43f5e', id: 'rose', ring: 'ring-rose-400' },
  { name: 'Amber Gold', hex: '#f59e0b', id: 'amber', ring: 'ring-amber-400' },
];

export default function SettingsPage() {
  const router = useRouter();
  const { user, updateUserProfile } = useApp();

  // Active Settings Tab
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'appearance' | 'preferences' | 'database'>('profile');

  // Profile Form State
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [website, setWebsite] = useState(user?.website || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '/default-avatar.jpg');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  // Security Form State
  const [currentEmail, setCurrentEmail] = useState('');
  const [authProvider, setAuthProvider] = useState('Email');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Appearance & Theme State (Persisted in localStorage)
  const [accentColor, setAccentColor] = useState('white');
  const [glassBlur, setGlassBlur] = useState('balanced');
  const [highContrast, setHighContrast] = useState(false);

  // Feed & Experience State (Persisted in localStorage)
  const [autoExpandMedia, setAutoExpandMedia] = useState(true);
  const [notificationSound, setNotificationSound] = useState(true);
  const [compactFeed, setCompactFeed] = useState(false);

  // Status Alerts
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Sync state when user profile is loaded
  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setUsername(user.username || '');
      setBio(user.bio || '');
      setWebsite(user.website || '');
      setAvatarUrl(user.avatar_url || '/default-avatar.jpg');
    }
  }, [user]);

  // Load session metadata
  useEffect(() => {
    if (isSupabaseConfigured()) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setCurrentEmail(session.user.email || 'user@chronicle.app');
          setAuthProvider(session.user.app_metadata.provider || 'email');
        }
      });
    }

    // Load appearance settings from localStorage
    if (typeof window !== 'undefined') {
      const savedAccent = localStorage.getItem('chronicle_accent') || 'white';
      const savedBlur = localStorage.getItem('chronicle_blur') || 'balanced';
      const savedAutoExpand = localStorage.getItem('chronicle_auto_expand') !== 'false';
      const savedSound = localStorage.getItem('chronicle_sound') !== 'false';
      const savedCompact = localStorage.getItem('chronicle_compact') === 'true';

      setAccentColor(savedAccent);
      setGlassBlur(savedBlur);
      setAutoExpandMedia(savedAutoExpand);
      setNotificationSound(savedSound);
      setCompactFeed(savedCompact);
    }
  }, []);

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 3500);
  };

  // Avatar Upload Handler
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingAvatar(true);
    try {
      const uploadedUrl = await StorageService.uploadMedia(file, user.id);
      setAvatarUrl(uploadedUrl);
      await updateUserProfile({ avatar_url: uploadedUrl });
      showNotification('Profile avatar updated successfully!');
    } catch (err: any) {
      showNotification(err.message || 'Failed to upload avatar', 'error');
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Save Profile Changes
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSavingProfile(true);
    try {
      await updateUserProfile({
        full_name: fullName.trim(),
        username: username.trim().toLowerCase().replace(/[^a-z0-9_]/g, ''),
        bio: bio.trim(),
        website: website.trim(),
        avatar_url: avatarUrl,
      });
      showNotification('Profile details saved successfully!');
    } catch (err: any) {
      showNotification(err.message || 'Failed to save profile', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  // Update Password Handler
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      showNotification('Password must be at least 6 characters long', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showNotification('New passwords do not match', 'error');
      return;
    }

    setUpdatingPassword(true);
    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
        setNewPassword('');
        setConfirmPassword('');
        showNotification('Your password has been changed securely!');
      } else {
        showNotification('Password updated in local session mode.');
      }
    } catch (err: any) {
      showNotification(err.message || 'Failed to update password', 'error');
    } finally {
      setUpdatingPassword(false);
    }
  };

  // Change Accent Color
  const handleSelectAccent = (id: string, hex: string) => {
    setAccentColor(id);
    if (typeof window !== 'undefined') {
      localStorage.setItem('chronicle_accent', id);
      document.documentElement.style.setProperty('--accent-hex', hex);
      document.documentElement.setAttribute('data-accent', id);
    }
    showNotification(`Accent color set to ${id.toUpperCase()}`);
  };

  // Change Glass Blur
  const handleSelectBlur = (blur: string) => {
    setGlassBlur(blur);
    if (typeof window !== 'undefined') {
      localStorage.setItem('chronicle_blur', blur);
      document.documentElement.setAttribute('data-blur', blur);
    }
    showNotification(`Glass refraction level updated`);
  };

  // Toggle Preferences
  const togglePref = (key: string, current: boolean, setter: (val: boolean) => void, name: string) => {
    const next = !current;
    setter(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, String(next));
    }
    showNotification(`${name} ${next ? 'enabled' : 'disabled'}`);
  };

  // Clear App Cache
  const handleClearCache = () => {
    if (typeof window !== 'undefined') {
      const keysToKeep = ['chronicle_accent', 'chronicle_blur', 'sb-ehwayzsbfoloopnkzxgm-auth-token'];
      Object.keys(localStorage).forEach((k) => {
        if (!keysToKeep.some((keep) => k.includes(keep))) {
          localStorage.removeItem(k);
        }
      });
      showNotification('Local application cache cleared successfully!');
    }
  };

  const handleSignOut = async () => {
    await AuthService.signOut();
    router.push('/login');
  };

  const hasSupabase = isSupabaseConfigured();

  return (
    <AppShell>
      {/* Hidden Avatar File Input */}
      <input
        type="file"
        ref={avatarInputRef}
        onChange={handleAvatarChange}
        accept="image/*"
        className="hidden"
      />

      {/* Sticky Header */}
      <div className="sticky top-0 z-30 w-full bg-black/90 backdrop-blur-2xl border-b border-white/10 flex items-center justify-between h-14 md:h-16 px-4 md:px-6">
        <div>
          <h1 className="font-headline text-lg md:text-xl font-bold text-white tracking-tight">Settings</h1>
          <p className="text-xs text-on-surface-variant font-mono">Customization & Account</p>
        </div>
        <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/80">
          <Sliders className="w-4 h-4" />
        </div>
      </div>

      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6 pb-28 md:pb-20">
        {/* Real-time Status Toast Alert */}
        {statusMessage && (
          <div
            className={`p-4 rounded-2xl border flex items-center gap-3 animate-fade-in shadow-xl ${
              statusMessage.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-red-500/10 border-red-500/30 text-red-300'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            )}
            <span className="text-xs font-headline font-semibold">{statusMessage.text}</span>
          </div>
        )}

        {/* Navigation Tabs Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-white/10">
          {[
            { id: 'profile', label: 'Edit Profile', icon: User },
            { id: 'appearance', label: 'Aesthetics & Theme', icon: Palette },
            { id: 'security', label: 'Security & Auth', icon: Lock },
            { id: 'preferences', label: 'Preferences', icon: Bell },
            { id: 'database', label: 'Cloud Status', icon: Database },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-headline font-semibold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.15)]'
                    : 'bg-white/5 text-on-surface-variant hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ======================================================== */}
        {/* TAB 1: EDIT PROFILE */}
        {/* ======================================================== */}
        {activeTab === 'profile' && (
          <form onSubmit={handleSaveProfile} className="space-y-5 animate-fade-in">
            {/* Avatar & Cover Section */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-5 md:p-6 space-y-4">
              <h3 className="font-headline font-bold text-sm text-white">Profile Photo & Identity</h3>
              <div className="flex items-center gap-4 md:gap-6">
                <div className="relative group/avatar cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden border-2 border-white/20 relative aspect-square bg-black shadow-lg">
                    <Image
                      src={avatarUrl}
                      alt="Avatar Preview"
                      fill
                      className="object-cover group-hover/avatar:opacity-75 transition-opacity"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center transition-opacity">
                      {uploadingAvatar ? (
                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                      ) : (
                        <Camera className="w-6 h-6 text-white" />
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="px-4 py-2 bg-white/10 hover:bg-white/15 active:scale-95 border border-white/15 text-white rounded-xl text-xs font-semibold font-headline transition-all flex items-center gap-2"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>{uploadingAvatar ? 'Compressing to WebP...' : 'Change Photo'}</span>
                  </button>
                  <p className="text-[11px] text-on-surface-variant font-mono">
                    Auto-compressed to WebP format for high-speed loading.
                  </p>
                </div>
              </div>
            </div>

            {/* Profile Fields */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-5 md:p-6 space-y-4">
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-on-surface-variant uppercase tracking-wider">Display Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your Full Name"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-outline focus:outline-none focus:border-white/30 focus:bg-white/10 transition-colors"
                />
              </div>

              {/* Username */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-on-surface-variant uppercase tracking-wider">Username</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm font-mono">@</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="username"
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-sm text-white placeholder:text-outline focus:outline-none focus:border-white/30 focus:bg-white/10 transition-colors font-mono"
                  />
                </div>
              </div>

              {/* Bio */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-on-surface-variant uppercase tracking-wider">Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell the digital noir about yourself..."
                  rows={3}
                  maxLength={160}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-outline focus:outline-none focus:border-white/30 focus:bg-white/10 transition-colors resize-none"
                />
                <div className="flex justify-end text-[10px] font-mono text-on-surface-variant">
                  {bio.length}/160
                </div>
              </div>

              {/* Website */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-on-surface-variant uppercase tracking-wider">Website URL</label>
                <div className="relative">
                  <Globe className="w-4 h-4 text-on-surface-variant absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://yourportfolio.design"
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-outline focus:outline-none focus:border-white/30 focus:bg-white/10 transition-colors font-mono text-xs"
                  />
                </div>
              </div>

              {/* Submit Save Button */}
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-6 py-3 bg-white text-black font-headline font-bold rounded-xl text-sm hover:bg-white/90 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.15)] flex items-center gap-2 disabled:opacity-50"
                >
                  {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 stroke-[2.5]" />}
                  <span>Save Profile</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* ======================================================== */}
        {/* TAB 2: AESTHETICS & THEME */}
        {/* ======================================================== */}
        {activeTab === 'appearance' && (
          <div className="space-y-5 animate-fade-in">
            {/* Accent Color Palette Selection */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-5 md:p-6 space-y-4">
              <div>
                <h3 className="font-headline font-bold text-sm text-white">Accent Glow & Palette</h3>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Select your signature highlight glow applied across interactive elements and icons.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                {ACCENT_COLORS.map((item) => {
                  const isSelected = accentColor === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelectAccent(item.id, item.hex)}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center gap-3 ${
                        isSelected
                          ? 'bg-white/15 border-white shadow-[0_0_15px_rgba(255,255,255,0.15)]'
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <span
                        style={{ backgroundColor: item.hex }}
                        className={`w-6 h-6 rounded-full border border-white/20 shadow-md ${
                          isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-black' : ''
                        }`}
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">{item.name}</p>
                        <p className="text-[10px] font-mono text-on-surface-variant">{item.hex}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Glassmorphism Refraction */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-5 md:p-6 space-y-4">
              <div>
                <h3 className="font-headline font-bold text-sm text-white">Glassmorphism Intensity</h3>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Adjust the backdrop optical blur and frosted glass surface depth.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                {[
                  { id: 'ultra', label: 'Ultra Refraction', desc: '24px Blur' },
                  { id: 'balanced', label: 'Balanced Noir', desc: '16px Blur' },
                  { id: 'minimal', label: 'Minimal Frost', desc: '8px Blur' },
                  { id: 'solid', label: 'Obsidian Solid', desc: '0px Sharp' },
                ].map((b) => {
                  const isSelected = glassBlur === b.id;
                  return (
                    <div
                      key={b.id}
                      onClick={() => handleSelectBlur(b.id)}
                      className={`p-3 rounded-2xl border cursor-pointer text-center transition-all ${
                        isSelected
                          ? 'bg-white text-black border-white shadow-lg font-bold'
                          : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                      }`}
                    >
                      <p className="text-xs font-headline">{b.label}</p>
                      <p className={`text-[10px] font-mono mt-0.5 ${isSelected ? 'text-black/70' : 'text-on-surface-variant'}`}>
                        {b.desc}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: SECURITY & AUTH */}
        {/* ======================================================== */}
        {activeTab === 'security' && (
          <div className="space-y-5 animate-fade-in">
            {/* Account Credentials Card */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-5 md:p-6 space-y-4">
              <h3 className="font-headline font-bold text-sm text-white">Active Session Details</h3>
              <div className="divide-y divide-white/5 text-xs font-mono">
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-on-surface-variant">Connected Email:</span>
                  <span className="text-white font-semibold">{currentEmail || 'Not available'}</span>
                </div>
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-on-surface-variant">Auth Provider:</span>
                  <span className="text-emerald-400 capitalize">{authProvider}</span>
                </div>
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-on-surface-variant">User ID:</span>
                  <span className="text-white/60 text-[10px]">{user?.id || 'Local'}</span>
                </div>
              </div>
            </div>

            {/* Change Password Form */}
            <form onSubmit={handleUpdatePassword} className="bg-white/5 border border-white/10 rounded-3xl p-5 md:p-6 space-y-4">
              <div>
                <h3 className="font-headline font-bold text-sm text-white">Update Password</h3>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Set a new secure password for your Chronicle account.
                </p>
              </div>

              <div className="space-y-3 pt-1">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-on-surface-variant uppercase tracking-wider">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-outline focus:outline-none focus:border-white/30 focus:bg-white/10 transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-on-surface-variant uppercase tracking-wider">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-outline focus:outline-none focus:border-white/30 focus:bg-white/10 transition-colors"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={updatingPassword || !newPassword}
                  className="px-5 py-2.5 bg-white text-black font-headline font-bold rounded-xl text-xs hover:bg-white/90 active:scale-95 transition-all shadow-md flex items-center gap-2 disabled:opacity-40"
                >
                  {updatingPassword ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                  <span>Change Password</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: PREFERENCES & DATA */}
        {/* ======================================================== */}
        {activeTab === 'preferences' && (
          <div className="space-y-5 animate-fade-in">
            {/* Feed Behavior */}
            <div className="bg-white/5 border border-white/10 rounded-3xl divide-y divide-white/5 overflow-hidden">
              {/* Auto-Expand Media */}
              <div className="p-4 md:p-5 flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="font-semibold text-sm text-white">Auto-Expand Photos</p>
                  <p className="text-xs text-on-surface-variant">Display full attached media previews in the feed</p>
                </div>
                <button
                  onClick={() => togglePref('chronicle_auto_expand', autoExpandMedia, setAutoExpandMedia, 'Auto-expand media')}
                  className={`w-11 h-6 rounded-full transition-colors relative ${
                    autoExpandMedia ? 'bg-white' : 'bg-white/20'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full bg-black absolute top-1 transition-transform ${
                      autoExpandMedia ? 'right-1' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              {/* Compact Density Mode */}
              <div className="p-4 md:p-5 flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="font-semibold text-sm text-white">Compact Feed View</p>
                  <p className="text-xs text-on-surface-variant">Tighter spacing between microblog posts</p>
                </div>
                <button
                  onClick={() => togglePref('chronicle_compact', compactFeed, setCompactFeed, 'Compact view')}
                  className={`w-11 h-6 rounded-full transition-colors relative ${
                    compactFeed ? 'bg-white' : 'bg-white/20'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full bg-black absolute top-1 transition-transform ${
                      compactFeed ? 'right-1' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              {/* Notification Sounds */}
              <div className="p-4 md:p-5 flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="font-semibold text-sm text-white">Sound Effects</p>
                  <p className="text-xs text-on-surface-variant">Play audio feedback for messages and notifications</p>
                </div>
                <button
                  onClick={() => togglePref('chronicle_sound', notificationSound, setNotificationSound, 'Audio sounds')}
                  className={`w-11 h-6 rounded-full transition-colors relative ${
                    notificationSound ? 'bg-white' : 'bg-white/20'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full bg-black absolute top-1 transition-transform ${
                      notificationSound ? 'right-1' : 'left-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Storage & Local Cache */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-5 md:p-6 flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="font-semibold text-sm text-white">Clear Offline Cache</p>
                <p className="text-xs text-on-surface-variant">Purge local temporary state and refresh application</p>
              </div>
              <button
                type="button"
                onClick={handleClearCache}
                className="px-4 py-2 bg-white/10 hover:bg-white/15 active:scale-95 text-white rounded-xl text-xs font-semibold flex items-center gap-2 border border-white/15 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                <span>Clear Cache</span>
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 5: DATABASE & CLOUD STATUS */}
        {/* ======================================================== */}
        {activeTab === 'database' && (
          <div className="space-y-5 animate-fade-in">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-5 md:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Database className="w-5 h-5 text-white" />
                  <h2 className="font-headline font-bold text-sm text-white">Supabase Cloud Engine</h2>
                </div>
                <span
                  className={`text-[11px] font-mono font-semibold px-3 py-1 rounded-full border ${
                    hasSupabase
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                  }`}
                >
                  {hasSupabase ? '● Connected' : '○ Standby'}
                </span>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                {hasSupabase
                  ? 'Your microblog is synchronized in real-time with your live Supabase PostgreSQL database, Storage media bucket, and WebSockets broadcast engine.'
                  : 'Add NEXT_PUBLIC_SUPABASE_URL & NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local to activate live cloud database.'}
              </p>
            </div>
          </div>
        )}

        {/* Global Sign Out Button */}
        <div className="pt-4 border-t border-white/10">
          <button
            onClick={handleSignOut}
            className="w-full py-3.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-red-400 rounded-2xl font-headline font-bold text-sm transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out of Chronicle</span>
          </button>
        </div>
      </div>
    </AppShell>
  );
}
