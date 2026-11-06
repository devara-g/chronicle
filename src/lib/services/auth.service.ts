import { Profile } from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

export const AuthService = {
  // Sign in with Google OAuth
  async signInWithGoogle() {
    if (!isSupabaseConfigured()) return { error: new Error('Supabase not configured') };

    const isNative = typeof window !== 'undefined' && Capacitor.isNativePlatform();
    const redirectTo = isNative
      ? 'https://lchronicle.vercel.app/auth/callback?native=true'
      : `${window.location.origin}/auth/callback`;

    if (isNative) {
      // On Android/iOS native app: skip automatic redirect so we get the authorization URL,
      // then open it securely in Chrome Custom Tabs (trusted by Google OAuth).
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        console.error('[AuthService] Native OAuth error:', error);
        return { error };
      }

      if (data?.url) {
        await Browser.open({ url: data.url, windowName: '_blank' });
      }

      return { data, error: null };
    }

    // Standard web browser flow
    return await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
  },

  // Get active user profile
  async getCurrentProfile(): Promise<Profile | null> {
    if (isSupabaseConfigured()) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profile) return profile;
        }
      } catch (e) {
        console.warn('Supabase auth profile check failed:', e);
      }
    }
    return null;
  },

  // Save profile updates
  async updateProfile(profile: Partial<Profile>, current: Profile): Promise<Profile> {
    const updated: Profile = { ...current, ...profile };

    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from('profiles')
          .update(profile)
          .eq('id', current.id);
      } catch (e) {
        console.warn(e);
      }
    }
    return updated;
  },

  // Sign out
  async signOut() {
    if (isSupabaseConfigured()) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn(e);
      }
    }
  },
};
