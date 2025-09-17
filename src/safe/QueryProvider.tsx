'use client';
import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export function RealQueryProvider({ children }:{children:React.ReactNode}) {
  const [qc] = useState(()=>new QueryClient());
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

export function NoopQueryProvider({ children }:{children:React.ReactNode}){ 
  return <>{children}</>; 
}