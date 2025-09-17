'use client';
import React, { createContext, useContext, useMemo, useState } from 'react';

interface SubscriptionStatus {
  subscribed: boolean;
  planType: 'free' | 'basic' | 'pro';
  status: 'active' | 'inactive';
  currentPeriodEnd?: string;
  loading: boolean;
}

interface SubscriptionContextType extends SubscriptionStatus {
  checkSubscriptionStatus: () => Promise<void>;
  user: any | null;
}

const Ctx = createContext<SubscriptionContextType | null>(null);

export function SubscriptionProvider({ children }: { children: React.ReactNode }){
  if (typeof (React as any)?.useState !== 'function') {
    throw new Error('[SubscriptionProvider] React hooks unavailable; check duplicate/aliased React.');
  }
  
  // Safe stub values for now
  const [subscriptionStatus] = useState<SubscriptionStatus>({
    subscribed: false,
    planType: 'free',
    status: 'inactive',
    loading: false,
  });
  
  const [user] = useState<any | null>(null);
  
  const checkSubscriptionStatus = async () => {
    console.log('[SafeSubscriptionProvider] checkSubscriptionStatus called (stub)');
  };
  
  const value = useMemo((): SubscriptionContextType => ({
    ...subscriptionStatus,
    user,
    checkSubscriptionStatus,
  }), [subscriptionStatus, user]);
  
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSubscription(){
  const v = useContext(Ctx);
  if (!v) throw new Error('useSubscription must be used within SubscriptionProvider');
  return v;
}