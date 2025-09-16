'use client';

import { useEffect, useState } from 'react';

const V = 'v=3'; // bump to bust caches if needed

export default function FontSmokeTest() {
  const [status, setStatus] = useState('Checking…');
  const [fetchInfo, setFetchInfo] = useState<any>(null);

  useEffect(() => {
    (async () => {
      // Kill any SW caches for this origin (best effort)
      try {
        if ('serviceWorker' in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map(r => r.unregister().catch(()=>{})));
        }
      } catch {}

      // Fetch the raw files to detect redirects/MIME
      const urls = [
        `/fonts/reckless/Reckless-Regular.woff2?${V}`,
        `/fonts/reckless/Reckless-Regular.woff?${V}`,
      ];
      const results = await Promise.all(urls.map(async (u) => {
        try {
          const res = await fetch(u, { cache: 'no-store' });
          return { url: u, ok: res.ok, status: res.status, type: res.headers.get('content-type'), redirected: res.redirected };
        } catch (e:any) {
          return { url: u, ok: false, status: 0, type: String(e) };
        }
      }));
      setFetchInfo({ ua: navigator.userAgent, results });

      // Now ask the browser if it can render Reckless
      let ok = false;
      try {
        if ('fonts' in document && 'check' in (document as any).fonts) {
          ok = await (document as any).fonts.check('1em "Reckless"');
        }
      } catch {}
      setStatus(ok ? '✅ Loaded' : '❌ NOT loaded');
    })();
  }, []);

  return (
    <main style={{ maxWidth: 720, margin: '40px auto', padding: '0 20px', fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif' }}>
      <style>{`
        /* Self-contained @font-face (no unicode-range, no CORS, no Tailwind) */
        @font-face {
          font-family: "Reckless";
          src:
            url("/fonts/reckless/Reckless-Regular.woff2?${V}") format("woff2"),
            url("/fonts/reckless/Reckless-Regular.woff?${V}") format("woff");
          font-weight: 400;
          font-style: normal;
          font-display: swap;
        }
        .sample { font-family: "Reckless", serif; font-size: 28px; line-height: 1.25; }
      `}</style>

      <h1>Font Smoketest</h1>
      <p>Status: <strong style={{ color: status.startsWith('✅') ? 'green' : 'crimson' }}>{status}</strong></p>

      <div className="sample" style={{ border: '1px solid #ddd', padding: 12, borderRadius: 12, marginTop: 12, backgroundColor: '#f9f9f9' }}>
        Reckless: The quick brown fox — "quotes", 'apostrophes', & 1234567890.
      </div>

      <h3 style={{ marginTop: 24 }}>Fetch checks</h3>
      <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 12, backgroundColor: '#f0f0f0', padding: 12, borderRadius: 8, overflow: 'auto' }}>
        {JSON.stringify(fetchInfo, null, 2)}
      </pre>

      <div style={{marginTop: 24, padding: 16, backgroundColor: '#e7f3ff', borderRadius: 8}}>
        <h4>Diagnostic Guide:</h4>
        <ul style={{marginLeft: 16}}>
          <li>If status is ❌ but fetch is 200 with <code>font/woff2</code>/<code>font/woff</code> and <strong>redirected=false</strong>, the mismatch is in your main app CSS/preload (weight/name/unicode-range).</li>
          <li>If fetch shows 404: wrong file path or filename casing</li>
          <li>If fetch shows text/html or redirected=true: hitting middleware/redirect</li>
          <li>If status is ✅: font files work, issue is in main app integration</li>
        </ul>
      </div>
    </main>
  );
}