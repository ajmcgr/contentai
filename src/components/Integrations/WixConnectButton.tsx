import React from 'react';
import { Button } from '@/components/ui/button';

export default function WixConnectButton() {
  // Your Wix app configuration
  const appId = 'f769a0b6-320b-486d-aa51-e465e3a7817e'; // Wix App ID
  const redirectUrl =
    'https://hmrzmafwvhifjhsoizil.supabase.co/functions/v1/wix-oauth-callback'; // OAuth redirect URI (exact)
  const appUrl = 'https://hmrzmafwvhifjhsoizil.supabase.co'; // App homepage URL

  const onConnect = () => {
    try {
      const u = new URL('https://www.wix.com/installer/install');
      u.searchParams.set('appId', appId);
      u.searchParams.set('redirectUrl', redirectUrl);
      u.searchParams.set('state', crypto.randomUUID());

      console.log('[Wix] Using appId:', appId);
      console.log('[Wix] Using redirectUrl:', redirectUrl);
      console.log('[Wix] App homepage URL:', appUrl);
      console.log('[Wix] Installer URL:', u.toString());

      // Popup-safe open
      const popup = window.open('about:blank', '_blank', 'noopener,noreferrer');
      if (popup) {
        popup.location.href = u.toString();
      } else {
        window.location.href = u.toString(); // fallback same-tab
      }
    } catch (e) {
      console.error('[Wix] Connect error:', e);
      alert((e as Error).message);
    }
  };

  return (
    <Button
      onClick={onConnect}
      className="bg-primary hover:bg-primary/90"
    >
      Connect Wix
    </Button>
  );
}