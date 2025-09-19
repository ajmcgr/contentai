'use client';
import { useEffect } from 'react';

export default function WixInstalled() {
  useEffect(() => {
    // If Wix opened this in a popup/tab, close it nicely.
    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({ provider: 'wix', status: 'installed' }, '*');
      }
      // Close after a short delay to let user see the message.
      setTimeout(() => window.close(), 600);
    } catch {}
  }, []);

  return (
    <main className="min-h-[60vh] flex flex-col items-center justify-center gap-2 p-8">
      <h1 className="text-xl font-semibold">Wix app installed</h1>
      <p className="text-sm text-muted-foreground">You can return to the app. This window will close automatically.</p>
    </main>
  );
}