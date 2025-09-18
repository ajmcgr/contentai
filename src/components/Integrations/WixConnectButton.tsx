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

      const popup = window.open('about:blank', '_blank', 'noopener,noreferrer');
      if (popup) popup.location.href = data.installerUrl;
      else window.location.href = data.installerUrl;
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