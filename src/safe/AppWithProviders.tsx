'use client';
import React from 'react';
import ErrorBoundary from './ErrorBoundary';

// Import the shim (safe)
import { SubscriptionProvider } from '../contexts/SubscriptionContext';

// If you had a safe React Query wrapper, keep it off for now
const ENABLE_SUBSCRIPTION = true;
const ENABLE_REACT_QUERY = false; // leave OFF to keep preview clean

function MaybeWrap({ on, Wrap, children }:{on:boolean; Wrap:React.FC<{children:React.ReactNode}>; children:React.ReactNode}) {
  return on ? <Wrap>{children}</Wrap> : <>{children}</>;
}

export default function AppWithProviders({ children }:{children:React.ReactNode}) {
  let tree = <>{children}</>;
  tree = <MaybeWrap on={ENABLE_SUBSCRIPTION} Wrap={SubscriptionProvider}>{tree}</MaybeWrap>;
  // add React Query later when you want:
  // tree = <MaybeWrap on={ENABLE_REACT_QUERY} Wrap={SafeQueryProvider}>{tree}</MaybeWrap>;
  return <ErrorBoundary>{tree}</ErrorBoundary>;
}
