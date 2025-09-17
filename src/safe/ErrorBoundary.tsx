'use client';
import React from 'react';

export default class ErrorBoundary extends React.Component<{children: React.ReactNode},{error:any}> {
  constructor(p:any){ super(p); this.state = { error: null }; }
  static getDerivedStateFromError(e:any){ return { error: e }; }
  componentDidCatch(e:any, info:any){ console.error('[Provider ErrorBoundary]', e, info); }
  render(){
    if (this.state.error) {
      return (
        <div style={{padding:24, fontFamily:'system-ui'}}>
          <h2>💥 Something threw</h2>
          <pre style={{whiteSpace:'pre-wrap'}}>{String(this.state.error?.message || this.state.error)}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}