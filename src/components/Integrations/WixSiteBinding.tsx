'use client';
import React, { useEffect, useState } from 'react';

const SB = 'https://hmrzmafwvhifjhsoizil.supabase.co';

async function fetchSiteInfo(uid: string) {
  const u = new URL(`${SB}/functions/v1/wix-site-info`);
  u.searchParams.set('uid', uid);
  const r = await fetch(u.toString());
  return r.json();
}

async function startInstall(uid: string) {
  const u = new URL(`${SB}/functions/v1/wix-oauth-start`);
  u.searchParams.set('uid', uid);
  const r = await fetch(u.toString());
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error || 'start failed');
  window.open(j.installerUrl, '_blank', 'noopener,noreferrer,width=980,height=760');
}

export default function WixSiteBinding({ userId, desiredBlogHost }: { userId: string; desiredBlogHost: string }) {
  const [info, setInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchSiteInfo(userId).then(setInfo).finally(() => setLoading(false));
  }, [userId]);

  const currentHost =
    info?.blogSettings?.blogUrl?.host ||
    info?.blogSettings?.siteUrl?.host ||
    info?.blogSettings?.siteUrl || null;

  const matches = !!currentHost && String(currentHost).includes(desiredBlogHost);

  return (
    <div className="rounded-lg border p-4 space-y-2">
      <div className="text-sm text-gray-600">Wix Site Binding</div>
      {loading ? (
        <div className="text-sm">Checking…</div>
      ) : info?.ok ? (
        <>
          <div className="text-sm">
            Connected instance: <code>{info.instanceId ?? 'n/a'}</code>
          </div>
          <div className="text-sm">
            Detected blog/site: <code>{currentHost ?? 'unknown'}</code>
          </div>
          <div className={`text-sm ${matches ? 'text-green-600' : 'text-red-600'}`}>
            {matches ? '✔ Bound to the correct Wix site' : '✖ Bound to a different Wix site'}
          </div>
          {!matches && (
            <button
              onClick={() => startInstall(userId)}
              className="px-3 py-2 rounded-md bg-amber-600 text-white hover:bg-amber-700"
            >
              Connect to a different Wix site
            </button>
          )}
          <div className="text-xs text-gray-500">
            Expected host: <code>{desiredBlogHost}</code>
          </div>
        </>
      ) : (
        <div className="text-sm text-red-600">Not connected to Wix.</div>
      )}
    </div>
  );
}