import React, { createContext, useContext, useState, useEffect } from 'react';
if (typeof (React as any)?.useState !== 'function') {
  throw new Error('[SubscriptionProvider] React hooks unavailable — check duplicate React or Vite aliases.');
}
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

interface SubscriptionStatus {
  subscribed: boolean;
  planType: 'free' | 'basic' | 'pro';
  status: 'active' | 'inactive';
  currentPeriodEnd?: string;
  loading: boolean;
}

interface SubscriptionContextType extends SubscriptionStatus {
  checkSubscriptionStatus: () => Promise<void>;
  user: User | null;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

interface SubscriptionProviderProps {
  children: React.ReactNode;
}

export const SubscriptionProvider: React.FC<SubscriptionProviderProps> = ({ children }) => {
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>({
    subscribed: false,
    planType: 'free',
    status: 'inactive',
    loading: true,
  });
  const [user, setUser] = useState<User | null>(null);

  const checkSubscriptionStatus = async () => {
    try {
      console.log('[SubscriptionContext] Starting checkSubscriptionStatus');
      setSubscriptionStatus(prev => ({ ...prev, loading: true }));
      
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      console.log('[SubscriptionContext] Got user:', currentUser?.id);
      
      if (!currentUser) {
        console.log('[SubscriptionContext] No user found, setting free plan');
        setSubscriptionStatus({
          subscribed: false,
          planType: 'free',
          status: 'inactive',
          loading: false,
        });
        return;
      }

      // Check subscription status via edge function
      console.log('[SubscriptionContext] Calling verify-payment function');
      const { data, error } = await supabase.functions.invoke('verify-payment');
      console.log('[SubscriptionContext] verify-payment response:', { data, error });
      
      if (error) {
        console.error('Error checking subscription:', error);
        setSubscriptionStatus({
          subscribed: false,
          planType: 'free',
          status: 'inactive',
          loading: false,
        });
        return;
      }

      console.log('[SubscriptionContext] Setting subscription status:', data);
      setSubscriptionStatus({
        subscribed: data.subscribed || false,
        planType: data.plan_type || 'free',
        status: data.status || 'inactive',
        currentPeriodEnd: data.current_period_end,
        loading: false,
      });

    } catch (error) {
      console.error('Error in checkSubscriptionStatus:', error);
      setSubscriptionStatus({
        subscribed: false,
        planType: 'free',
        status: 'inactive',
        loading: false,
      });
    }
  };

  const checkGlobalLogout = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('logout_version')
        .eq('id', 'global')
        .single();

      if (error) {
        console.error('Error fetching app settings:', error);
        return;
      }

      const version = data?.logout_version ?? 0;
      const seen = parseInt(localStorage.getItem('logout_version_seen') || '0', 10);

      if (user && version > seen) {
        console.log('Global logout triggered (version', version, '), signing out user');
        localStorage.setItem('logout_version_seen', String(version));
        await supabase.auth.signOut({ scope: 'global' });
      }
    } catch (err) {
      console.error('Error in checkGlobalLogout:', err);
    }
  };

  useEffect(() => {
    // Check subscription status on mount and auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session?.user?.id);
      
      setUser(session?.user || null);
      
      if (session?.user) {
        // Defer async calls to avoid deadlocks inside the auth callback
        setTimeout(() => {
          checkSubscriptionStatus();
        }, 0);
      } else {
        // Clear subscription status when user signs out
        console.log('Clearing subscription status - user signed out');
        setSubscriptionStatus({
          subscribed: false,
          planType: 'free',
          status: 'inactive',
          loading: false,
        });
      }
    });

    // Initial check
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session check:', session?.user?.id);
      setUser(session?.user || null);
      if (session?.user) {
        checkGlobalLogout();
        checkSubscriptionStatus();
      } else {
        setSubscriptionStatus({
          subscribed: false,
          planType: 'free',
          status: 'inactive',
          loading: false,
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Check subscription status when user returns to the page (focus event)
  useEffect(() => {
    const handleFocus = () => {
      if (user) {
        checkGlobalLogout();
        checkSubscriptionStatus();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user]);

  const value: SubscriptionContextType = {
    ...subscriptionStatus,
    user,
    checkSubscriptionStatus,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};