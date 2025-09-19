'use client';
import React, { useEffect, useRef, useState } from 'react';
const SUPABASE_URL = 'https://hmrzmafwvhifjhsoizil.supabase.co';

async function getStatus(uid:string){
  const u = new URL(`${SUPABASE_URL}/functions/v1/wix-connection-status`);
  u.searchParams.set('uid', uid);
  const r = await fetch(u.toString()); 
  return r.json();
}

async function disconnect(uid: string) {
  const u = new URL(`${SUPABASE_URL}/functions/v1/wix-disconnect`);
  u.searchParams.set('uid', uid);
  const r = await fetch(u.toString(), { method: 'DELETE' });
  return r.json();
}

export default function WixConnectSection({ userId }: { userId: string }) {
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [instanceId, setInstanceId] = useState<string|null>(null);
  const popupRef = useRef<Window|null>(null);

  useEffect(() => { getStatus(userId).then(j=>{ setConnected(j.connected); setInstanceId(j.instance_id||null); }); }, [userId]);

  useEffect(() => {
    function onMsg(ev: MessageEvent) {
      const m = ev.data;
      if (m?.provider === 'wix' && m.status === 'connected') {
        setConnecting(false);
        setConnected(true);
        setInstanceId(m.instance_id ?? null);
        // Close popup immediately
        try { 
          if (popupRef.current && !popupRef.current.closed) {
            popupRef.current.close(); 
          }
        } catch {}
        // Refresh status after a short delay
        setTimeout(() => {
          getStatus(userId).then(j=>{ 
            setConnected(j.connected); 
            setInstanceId(j.instance_id||null); 
          });
        }, 500);
      }
    }
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [userId]);

  const onConnect = async () => {
    setConnecting(true);
    try {
      const start = new URL(`${SUPABASE_URL}/functions/v1/wix-oauth-start`);
      start.searchParams.set('uid', userId); // ✅ send uid
      const r = await fetch(start.toString());
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || 'start failed');
      popupRef.current = window.open('about:blank','_blank','noopener,noreferrer,width=980,height=760');
      if (popupRef.current) popupRef.current.location.href = j.installerUrl;
      else window.location.href = j.installerUrl;
    } catch (e) {
      setConnecting(false);
      alert(String(e));
    }
  };

  const onDisconnect = async () => {
    try {
      await disconnect(userId);
      setConnected(false);
      setInstanceId(null);
    } catch (e) {
      alert('Failed to disconnect: ' + String(e));
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button onClick={onConnect} disabled={connecting}
        className="px-4 py-2 bg-blue-600 text-white rounded-md shadow hover:bg-blue-700 disabled:opacity-60">
        {connecting ? 'Redirecting…' : connected ? 'Re-connect Wix' : 'Connect Wix'}
      </button>
      {connected && (
        <button onClick={onDisconnect}
          className="px-4 py-2 bg-red-600 text-white rounded-md shadow hover:bg-red-700">
          Disconnect
        </button>
      )}
      <span className={`text-sm ${connected ? 'text-green-600' : 'text-gray-500'}`}>
        {connected ? `Connected ${instanceId ? `(${instanceId.slice(0,6)}…)` : ''}` : 'Disconnected'}
      </span>
    </div>
  );
}