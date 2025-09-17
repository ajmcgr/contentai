'use client';
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type SubValue = { 
  plan: string|null; 
  setPlan: (p:string|null)=>void;
  subscribed: boolean;
  planType: 'free' | 'basic' | 'pro';
  status: 'active' | 'inactive';
  currentPeriodEnd?: string;
  loading: boolean;
  user: any | null;
  checkSubscriptionStatus: () => Promise<void>;
};
const Ctx = createContext<SubValue|null>(null);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  if (!(React as any)?.useState || !(React as any)?.useEffect) {
    throw new Error("[SubscriptionProvider] React hooks unavailable.");
  }
  const [plan, setPlan] = useState<string|null>(null);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => { 
    try { 
      const v = localStorage.getItem("subscription.plan"); 
      if (v) setPlan(v); 
    } catch {} 
  }, []);
  
  const checkSubscriptionStatus = async () => {
    setLoading(true);
    // Add your real subscription check logic here
    setTimeout(() => setLoading(false), 1000);
  };
  
  const value = useMemo((): SubValue => ({ 
    plan, 
    setPlan,
    subscribed: false,
    planType: 'free',
    status: 'inactive',
    loading,
    user: null,
    checkSubscriptionStatus
  }), [plan, loading]);
  
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSubscription(){
  const v = useContext(Ctx);
  if (!v) throw new Error("useSubscription must be used within <SubscriptionProvider>");
  return v;
}