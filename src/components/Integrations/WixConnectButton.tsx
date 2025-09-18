import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';

const SUPABASE_URL = 'https://hmrzmafwvhifjhsoizil.supabase.co';

export default function WixConnectButton({ userId }: { userId: string }) {
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const popupRef = useRef<Window | null>(null);
  const timeoutRef = useRef<number | null>(null);

  async function refreshStatus() {
    try {
      const u = new URL(`${SUPABASE_URL}/functions/v1/wix-connection-status`);
      u.searchParams.set('uid', userId);
      const res = await fetch(u.toString(), { method: 'GET' });
      const j = await res.json();
      setConnected(!!j.connected);
      return j.connected;
    } catch {
      return false;
    }
  }

  useEffect(() => {
    // On mount, check if already connected (after a manual refresh)
    refreshStatus();
  }, [userId]);

  useEffect(() => {
    function onMessage(ev: MessageEvent) {
      const msg = ev?.data;
      if (msg && msg.provider === 'wix' && msg.status === 'connected') {
        // Got success from callback
        setConnecting(false);
        // Final recheck against server
        refreshStatus();
        // Close popup if still open
        try { popupRef.current?.close(); } catch {}
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const onConnect = async () => {
    setConnecting(true);
    // Ask server to generate installer URL (guarantees same appId/redirect as callback)
    const startUrl = new URL(`${SUPABASE_URL}/functions/v1/wix-oauth-start`);
    startUrl.searchParams.set('uid', userId);
    try {
      const r = await fetch(startUrl.toString(), { method: 'GET' });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || 'start failed');

      // Open popup and navigate
      popupRef.current = window.open('about:blank', '_blank', 'noopener,noreferrer,width=980,height=760');
      if (popupRef.current) {
        popupRef.current.location.href = j.installerUrl;
      } else {
        // fallback same-tab
        window.location.href = j.installerUrl;
      }

      // Safety timeout: if no message in 120s, stop spinner and allow retry
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => setConnecting(false), 120000);
    } catch (e) {
      console.error('[Wix] start error', e);
      setConnecting(false);
      alert(String(e));
    }
  };

  return (
    <div className="flex items-center gap-3">
      <Button
        onClick={onConnect}
        disabled={connecting}
        className="bg-primary hover:bg-primary/90"
      >
        {connecting ? 'Redirecting…' : connected ? 'Re-connect Wix' : 'Connect Wix'}
      </Button>
      <span className={`text-sm ${connected ? 'text-green-600' : 'text-gray-500'}`}>
        {connected ? 'Connected' : 'Disconnected'}
      </span>
    </div>
  );
}