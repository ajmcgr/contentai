'use client';
import React from 'react';

export default class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: any }
> {
  constructor(props:any){ super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error:any){ return { error }; }
  componentDidCatch(error:any, info:any){ console.error('[Provider ErrorBoundary]', error, info); }
  render(){
    if (this.state.error) {
      return (
        <div style={{padding:24, fontFamily:'system-ui'}}>
          <h2>💥 Provider crashed</h2>
          <pre style={{whiteSpace:'pre-wrap'}}>{String(this.state.error?.message || this.state.error)}</pre>
          <p>Check console for stack and fix the last provider you enabled.</p>
        </div>
      );
    }
    return this.props.children;
  }
}