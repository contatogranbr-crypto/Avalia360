import * as React from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';

interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: 'admin' | 'employee';
  department?: string;
  position?: string;
  status: 'active' | 'inactive';
  access_key?: string;
}

interface AuthContextType {
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  profile: null,
  loading: true,
  isAdmin: false,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for session in localStorage
    const savedUser = localStorage.getItem('auth_fallback_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setProfile(parsed);
        
        // Subscribe to profile changes
        const channel = supabase
          .channel(`profile_${parsed.uid}`)
          .on('postgres_changes', { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'users',
            filter: `uid=eq.${parsed.uid}`
          }, (payload) => {
            const updated = payload.new as UserProfile;
            setProfile(updated);
            localStorage.setItem('auth_fallback_user', JSON.stringify(updated));
          })
          .subscribe();

        setLoading(false);
        return () => {
          supabase.removeChannel(channel);
        };
      } catch (e) {
        localStorage.removeItem('auth_fallback_user');
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ profile, loading, isAdmin: profile?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
