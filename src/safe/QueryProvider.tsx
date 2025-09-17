'use client';
import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export default function SafeQueryProvider({ children }:{children:React.ReactNode}){
  // Create client once, lazily, after React is guaranteed to exist
  const [qc] = useState(() => new QueryClient());
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}