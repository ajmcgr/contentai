import React, { createContext, useContext, useState, useEffect } from 'react';
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
      setSubscriptionStatus(prev => ({ ...prev, loading: true }));
      
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        setSubscriptionStatus({
          subscribed: false,
          planType: 'free',
          status: 'inactive',
          loading: false,
        });
        return;
      }

      // Check subscription status via edge function
      const { data, error } = await supabase.functions.invoke('verify-payment');
      
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

  useEffect(() => {
    // Check subscription status on mount and auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.id);
      
      setUser(session?.user || null);
      
      if (session?.user) {
        await checkSubscriptionStatus();
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