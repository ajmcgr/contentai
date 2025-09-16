'use client';

import { useEffect, useState } from 'react';

export default function FontDiagnostics() {
  const [result, setResult] = useState<{reckless:boolean; notes:string[]; details:any}>({
    reckless: false, 
    notes: [], 
    details: {}
  });

  useEffect(() => {
    (async () => {
      const notes: string[] = [];
      // Check via FontFaceSet
      const supports = 'fonts' in document && 'check' in (document as any).fonts;
      let ok = false;
      
      if (supports) {
        try {
          // 1em Reckless at weight 400
          ok = await (document as any).fonts.check('1em "Reckless"');
          if (!ok) notes.push('document.fonts.check returned false for Reckless 400');
        } catch(e: any) {
          notes.push('document.fonts.check threw: ' + e?.message);
        }
      } else {
        notes.push('document.fonts unsupported (older WebView/Safari).');
      }

      // Attempt to load explicitly (helps older iOS)
      if (!ok && 'fonts' in document && 'load' in (document as any).fonts) {
        try {
          await (document as any).fonts.load('400 1em "Reckless"');
          ok = await (document as any).fonts.check('1em "Reckless"');
        } catch(e: any) {
          notes.push('document.fonts.load threw: ' + e?.message);
        }
      }

      // Fetch the actual file to catch 404/HTML/MIME/redirects
      const urls = [
        '/fonts/reckless/Reckless-Regular.woff2?v=1',
        '/fonts/reckless/Reckless-Regular.woff?v=1'
      ];
      
      const fetches = await Promise.all(urls.map(async u => {
        try {
          const res = await fetch(u, { cache: 'no-store' });
          return { 
            url: u, 
            status: res.status, 
            type: res.headers.get('content-type') || '', 
            redirected: res.redirected 
          };
        } catch(e: any) {
          return { url: u, status: 0, type: String(e), redirected: false };
        }
      }));

      setResult({
        reckless: ok, 
        notes, 
        details: { 
          ua: navigator.userAgent, 
          fetches 
        }
      });
    })();
  }, []);

  return (
    <main style={{
      maxWidth: 680, 
      margin: '40px auto', 
      padding: '0 20px',
      fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif'
    }}>
      <h1>Font Diagnostics</h1>
      <p>
        Status: <strong style={{color: result.reckless ? 'green' : 'crimson'}}>
          {result.reckless ? 'Reckless Loaded ✓' : 'Reckless NOT loaded ✗'}
        </strong>
      </p>

      <div style={{
        margin: '16px 0', 
        padding: 12, 
        border: '1px solid #ddd', 
        borderRadius: 12,
        backgroundColor: '#f9f9f9'
      }}>
        <p style={{
          fontFamily: '"Reckless", serif', 
          fontSize: 24, 
          lineHeight: 1.2,
          margin: '8px 0'
        }}>
          This sentence should be in Reckless Regular (400) on your device.
        </p>
        <p style={{
          fontFamily: '"Reckless", serif', 
          fontWeight: 500, 
          fontSize: 24,
          margin: '8px 0'
        }}>
          This should be Reckless Medium (500).
        </p>
        <p style={{
          fontFamily: '"Reckless", serif', 
          fontWeight: 700, 
          fontSize: 24,
          margin: '8px 0'
        }}>
          And this one should be Reckless Bold (700).
        </p>
      </div>

      <h3>Diagnostic Notes</h3>
      <ul>
        {result.notes.length ? result.notes.map((n, i) => <li key={i}>{n}</li>) : <li>No issues detected</li>}
      </ul>

      <h3>Font File Fetch Results</h3>
      <pre style={{
        whiteSpace: 'pre-wrap', 
        wordBreak: 'break-word', 
        fontSize: 12,
        backgroundColor: '#f0f0f0',
        padding: 12,
        borderRadius: 8,
        overflow: 'auto'
      }}>
        {JSON.stringify(result.details, null, 2)}
      </pre>

      <div style={{marginTop: 24, padding: 16, backgroundColor: '#e7f3ff', borderRadius: 8}}>
        <h4>Quick Mobile Test Instructions:</h4>
        <ol>
          <li>Open this page on your mobile device</li>
          <li>Check if the text above shows in Reckless font</li>
          <li>Look for green "Loaded ✓" status</li>
          <li>Inspect fetch results for any 404 or MIME type issues</li>
        </ol>
      </div>
    </main>
  );
}