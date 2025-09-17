'use client';
import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';

/** Hard guard: if React hooks aren't present, fail fast with context (won't render in prod build if React is OK). */
if (!(React as any)?.useState || !(React as any)?.useEffect) {
  throw new Error('[SubscriptionProvider] React hooks unavailable — check duplicate/aliased React.');
}

type SubValue = {
  plan: string | null;
  setPlan: (p: string | null) => void;
  /** add any fields you actually use below */
  subscribed: boolean;
  planType: 'free' | 'basic' | 'pro';
  status: 'active' | 'inactive';
  currentPeriodEnd?: string;
  loading: boolean;
  user: any | null;
  checkSubscriptionStatus: () => Promise<void>;
};

const Ctx = createContext<SubValue | null>(null);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  // All hooks run inside the component (no module-top hooks or side effects).
  const [plan, setPlan] = useState<string | null>(null);

  // Example: lazy load from localStorage/supabase/etc. (customize to your app)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('subscription.plan');
      if (saved) setPlan(saved);
    } catch {}
  }, []);

  const checkSubscriptionStatus = async () => {
    console.log('[SubscriptionProvider] checkSubscriptionStatus called');
  };

  const value = useMemo<SubValue>(() => ({ 
    plan, 
    setPlan,
    subscribed: false,
    planType: 'free',
    status: 'inactive',
    loading: false,
    user: null,
    checkSubscriptionStatus
  }), [plan]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSubscription() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSubscription must be used within <SubscriptionProvider>');
  return ctx;
}