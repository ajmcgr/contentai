'use client';
import React from "react";

/** NO-HOOK shim to unblock preview */
export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

/** NO-HOOK shim that mimics your hook API */
export function useSubscription(): any {
  // Return a stable object; no React context, no hooks.
  return {
    plan: null,
    setPlan: () => { /* noop in shim */ },
    // extras to satisfy existing usages without hooks
    subscribed: false,
    planType: 'free',
    status: 'inactive',
    currentPeriodEnd: undefined,
    loading: false,
    user: null,
    checkSubscriptionStatus: async () => {}
  };
}
