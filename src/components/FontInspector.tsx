'use client';
import { useEffect, useState } from 'react';

export default function FontInspector() {
  const [info, setInfo] = useState<any>(null);
  
  useEffect(() => {
    const sample = document.createElement('span');
    sample.textContent = 'Reckless inspector';
    sample.style.fontFamily = '"Reckless", serif';
    sample.style.fontWeight = '400';
    sample.style.position = 'fixed';
    sample.style.left = '-9999px';
    document.body.appendChild(sample);
    
    const s = getComputedStyle(sample);
    setInfo({
      computedFamily: s.fontFamily,
      computedWeight: s.fontWeight,
      fontsApiCheck: ('fonts' in document) ? (document as any).fonts.check?.('1em "Reckless"') : 'unsupported',
      ua: navigator.userAgent,
    });
    
    document.body.removeChild(sample);
  }, []);
  
  if (!info) return null;
  
  return (
    <div style={{
      position: 'fixed',
      bottom: 12,
      right: 12,
      background: 'rgba(0,0,0,.75)',
      color: '#fff',
      padding: '8px 10px',
      borderRadius: 8,
      fontSize: 12,
      zIndex: 9999
    }}>
      <div><b>FontInspector</b></div>
      <div>family: {info.computedFamily}</div>
      <div>weight: {info.computedWeight}</div>
      <div>fonts.check: {String(info.fontsApiCheck)}</div>
    </div>
  );
}