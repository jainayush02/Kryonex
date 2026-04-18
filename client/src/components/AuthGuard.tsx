import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'ayushsancheti098@gmail.com';

export function AuthGuard({ children, requireAdmin = false }: AuthGuardProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const currentSsoToken = localStorage.getItem('sso_token');

      // 1. Instant Guest Authorization
      if (currentSsoToken) {
        // SECURITY: If at an admin route, guests are NOT allowed. Redirect to portal.
        if (requireAdmin) {
          navigate('/portal');
          setLoading(false);
          return;
        }

        setSession({
          access_token: currentSsoToken,
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: '',
          user: { 
            id: 'sso-guest', 
            email: 'portfolio_visitor@sentinell.dev',
            aud: 'authenticated',
            role: 'authenticated',
            app_metadata: {},
            user_metadata: { name: 'Portfolio Visitor' },
            created_at: new Date().toISOString()
          }
        } as any);
        setLoading(false);
      }

      // 2. Official Session Check (Regular Google SSO / Supabase)
      const { data: { session: supabaseSession } } = await supabase.auth.getSession();
      
      if (supabaseSession) {
        // SECURITY: Once a real user logs in, we should clear the guest token to prevent conflicts
        if (currentSsoToken) {
          localStorage.removeItem('sso_token');
        }

        setSession(supabaseSession);
        setLoading(false);
        
        // Admin protection check
        if (requireAdmin && supabaseSession.user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
          navigate('/portal');
        }
      } else if (!currentSsoToken) {
        // No guest token and no login = back to login page
        setLoading(false);
        navigate('/');
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, supabaseSession) => {
      if (supabaseSession) {
        setSession(supabaseSession);
        // Clear guest token if we just logged in for real
        localStorage.removeItem('sso_token');
        
        if (requireAdmin && supabaseSession.user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
          navigate('/portal');
        }
      } else {
        // If no supabase session, check if we're a guest
        const ssoToken = localStorage.getItem('sso_token');
        if (!ssoToken && event !== 'INITIAL_SESSION') {
          setSession(null);
          navigate('/');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, requireAdmin]);

  if (loading) {
    return (
      <div className="min-h-screen bg-pearl dark:bg-obsidian flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-12 h-12 border-4 border-slate-200 dark:border-graphite border-t-graphite dark:border-t-white rounded-full animate-spin" />
          <div className="space-y-1">
            <h2 className="text-sm font-anta tracking-widest text-graphite dark:text-white uppercase">Validating Protocol</h2>
            <p className="text-[10px] text-slate-500 font-anta uppercase tracking-tight">Accessing Secure Archive...</p>
          </div>
        </div>
      </div>
    );
  }

  // Final check to prevent content flash
  const isSsoGuest = session?.user?.id === 'sso-guest';
  if (!session) return null;
  if (requireAdmin && !isSsoGuest && session.user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) return null;

  return <>{children}</>;
}
