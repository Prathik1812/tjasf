/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile, UserRole } from '@/types';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null; profile: Profile | null }>;
  signUp: (email: string, password: string, fullName: string, role?: UserRole) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (uid: string): Promise<Profile | null> => {
    // 1. Try fetching profile by ID
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .maybeSingle();
      if (data) {
        setProfile(data as Profile);
        return data as Profile;
      }
      if (error) console.error('[AuthContext] fetchProfile ID error:', error.message);
      if (attempt < 2) await new Promise((r) => setTimeout(r, 200));
    }

    // 2. Fallback: Try fetching profile by email if user is present
    const currentEmail = user?.email || (await supabase.auth.getUser()).data.user?.email;
    if (currentEmail) {
      const { data: byEmail } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', currentEmail)
        .maybeSingle();
      if (byEmail) {
        setProfile(byEmail as Profile);
        return byEmail as Profile;
      }

      // 3. Fallback: Auto-create profile row if completely missing in database
      const defaultRole: UserRole = (currentEmail.toLowerCase() === 'editorial@tjasf.com' || currentEmail.toLowerCase() === 'editor@tjasf.com') ? 'admin' : 'author';
      const newProfile: Partial<Profile> = {
        id: uid,
        email: currentEmail,
        full_name: user?.user_metadata?.full_name || currentEmail.split('@')[0],
        role: defaultRole,
        is_active: true,
        email_verified: true,
      };

      await supabase.from('profiles').upsert(newProfile as any);
      setProfile(newProfile as Profile);
      return newProfile as Profile;
    }

    setProfile(null);
    return null;
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (!data.session?.user) {
        setLoading(false);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (!newSession?.user) {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      setLoading(true);
      fetchProfile(user.id).finally(() => setLoading(false));
    } else {
      setProfile(null);
      setLoading(false);
    }
  }, [user]);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message, profile: null };
    let loadedProfile: Profile | null = null;
    if (data.user) {
      loadedProfile = await fetchProfile(data.user.id);
    }
    return { error: null, profile: loadedProfile };
  };

  const signUp = async (email: string, password: string, fullName: string, role: UserRole = 'author') => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) return { error: error.message };
    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        email,
        full_name: fullName,
        role,
      });
      await fetchProfile(data.user.id);
    }
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
