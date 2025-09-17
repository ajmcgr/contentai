'use client';
import React from "react";

/** NO-HOOK shim so preview can't crash on hooks */
export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

/** NO-HOOK selector — returns stable shape your app can read */
export function useSubscription(): any {
  return { 
    plan: null, 
    setPlan: () => {},
    subscribed: false,
    planType: 'free',
    status: 'inactive',
    currentPeriodEnd: undefined,
    loading: false,
    user: null,
    checkSubscriptionStatus: async () => {}
  };
}