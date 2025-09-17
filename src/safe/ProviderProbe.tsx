'use client';
import React, { useEffect, useState } from 'react';

export default function ProviderProbe(){
  const [info, setInfo] = useState<any>(null);
  useEffect(() => {
    import('react').then((m:any)=>{
      const payload = {
        reactVersion: m?.version,
        hasUseState: !!m?.useState,
        hasUseEffect: !!m?.useEffect,
        ts: Date.now(),
      };
      console.log('[ProviderProbe]', payload);
      setInfo(payload);
    });
  }, []);
  return (
    <div style={{fontFamily:'system-ui', fontSize:12, opacity:.75, marginTop:8}}>
      <div><b>ProviderProbe</b>: {info ? `React ${info.reactVersion} (hooks OK)` : 'checking…'}</div>
    </div>
  );
}