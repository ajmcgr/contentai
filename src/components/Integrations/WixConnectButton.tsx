import React from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

export default function WixConnectButton({ userId }: { userId?: string }) {
  const onConnect = async () => {
    try {
      // Get current user if not provided
      let currentUserId = userId;
      if (!currentUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          alert('Please sign in first');
          return;
        }
        currentUserId = user.id;
      }

      // Ask the server to build the installer URL from Edge env secrets
      const q = currentUserId ? `?uid=${encodeURIComponent(currentUserId)}` : "";
      const res = await fetch(
        `https://hmrzmafwvhifjhsoizil.supabase.co/functions/v1/wix-oauth-start${q}`,
        { method: "GET" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to get installer URL");

      console.log("[Wix] start debug", data.debug); // shows appId_tail + redirectUri

      // Always open in new window with better popup settings
      const popup = window.open(
        data.installerUrl, 
        '_blank', 
        'width=600,height=700,scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=no,directories=no,status=no'
      );
      
      if (!popup) {
        alert('Popup blocked! Please allow popups for this site and try again.');
        return;
      }
    } catch (e) {
      console.error("[Wix] start error:", e);
      alert(String(e));
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