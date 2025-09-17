'use client';
import React from "react";
import GuardedProvider from "./Guarded";

// Real + fallback for Subscription
import { SubscriptionProvider as RealSub } from "../contexts/SubscriptionContext.real";
import { SubscriptionProvider as ShimSub } from "../contexts/SubscriptionContext";

// Real + fallback for React Query
import { RealQueryProvider } from "./QueryProvider";
import { NoopQueryProvider } from "./QueryProvider";

export default function AppProviders({ children }:{children:React.ReactNode}){
  let tree = <>{children}</>;

  // Wrap with real SubscriptionProvider, auto-fallback to shim on error
  tree = (
    <GuardedProvider Real={RealSub} Fallback={ShimSub} onError={()=>console.warn("[Guarded] Using shim SubscriptionProvider")}>
      {tree}
    </GuardedProvider>
  );

  // Wrap with real React Query, auto-fallback to no-op on error
  tree = (
    <GuardedProvider Real={RealQueryProvider} Fallback={NoopQueryProvider} onError={()=>console.warn("[Guarded] Using Noop ReactQuery provider")}>
      {tree}
    </GuardedProvider>
  );

  return tree;
}