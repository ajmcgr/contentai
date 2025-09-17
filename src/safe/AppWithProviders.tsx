'use client';
import React from 'react';
import ErrorBoundary from './ErrorBoundary';
import ProviderProbe from './ProviderProbe';
import { SubscriptionProvider } from '../contexts/SubscriptionContext';
import SafeQueryProvider from './QueryProvider';

export default function AppWithProviders({ children }:{children:React.ReactNode}) {
  // Flip these booleans to gradually re-enable providers.
  const ENABLE_SUBSCRIPTION = true;
  const ENABLE_REACT_QUERY = true;

  let tree = <>{children}</>;
  if (ENABLE_SUBSCRIPTION) tree = <SubscriptionProvider>{tree}</SubscriptionProvider>;
  if (ENABLE_REACT_QUERY) tree = <SafeQueryProvider>{tree}</SafeQueryProvider>;

  return (
    <ErrorBoundary>
      {tree}
      <ProviderProbe />
    </ErrorBoundary>
  );
}