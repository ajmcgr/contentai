import React from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

export default function WixConnectButton() {
  const onConnect = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('Please sign in first');
        return;
      }

      // Use wix-oauth-start edge function to ensure consistent appId
      const startUrl = `https://hmrzmafwvhifjhsoizil.supabase.co/functions/v1/wix-oauth-start?userId=${user.id}`;
      
      console.log('[Wix] Starting OAuth via edge function:', startUrl);

      // Popup-safe open
      const popup = window.open('about:blank', '_blank', 'noopener,noreferrer');
      if (popup) {
        popup.location.href = startUrl;
      } else {
        window.location.href = startUrl; // fallback same-tab
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