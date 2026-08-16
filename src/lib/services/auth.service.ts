import { Profile } from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';

export const AuthService = {
  // Sign in with Google OAuth
  async signInWithGoogle() {
    if (!isSupabaseConfigured()) return { error: new Error('Supabase not configured') };
    const redirectTo = `${window.location.origin}/auth/callback`;
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
