'use client';
import React from "react";

class GuardBoundary extends React.Component<{ onError?: (e:any)=>void, fallback: React.ReactNode, children: React.ReactNode }, {err:any}> {
  constructor(p:any){ super(p); this.state = { err: null }; }
  static getDerivedStateFromError(err:any){ return { err }; }
  componentDidCatch(e:any){ this.props.onError?.(e); console.error("[Guarded] provider threw:", e); }
  render(){ return this.state.err ? this.props.fallback : this.props.children; }
}

export default function GuardedProvider({
  Real, Fallback, children, onError,
}: {
  Real: React.FC<{children:React.ReactNode}>;
  Fallback: React.FC<{children:React.ReactNode}>;
  children: React.ReactNode;
  onError?: (e:any)=>void;
}) {
  return (
    <GuardBoundary fallback={<Fallback>{children}</Fallback>} onError={onError}>
      <Real>{children}</Real>
    </GuardBoundary>
  );
}