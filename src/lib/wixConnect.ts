const WIX_APP_ID = "f769a0b6-320b-486d-aa51-e465e3a7817e"; // your App ID (public)
const WIX_REDIRECT_URI = "https://hmrzmafwvhifjhsoizil.supabase.co/functions/v1/wix-oauth-callback"; // must match Wix app settings exactly

function goTop(href: string) {
  try { 
    (window.top || window).location.href = href; 
  }
  catch { 
    window.open(href, "_blank", "noopener,noreferrer"); 
  }
}

export function startWixFromSettings(userId: string) {
  // You can pass any opaque state; using userId makes it easy to associate on callback
  const state = userId || cryptoRandom();
  const url = new URL("https://www.wix.com/installer/install");
  url.searchParams.set("appId", WIX_APP_ID);
  url.searchParams.set("redirectUrl", WIX_REDIRECT_URI);
  url.searchParams.set("state", state);
  goTop(url.toString());
}

function cryptoRandom() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}