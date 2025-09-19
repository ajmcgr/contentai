import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "DELETE,OPTIONS",
  "access-control-allow-headers": "authorization,apikey,content-type",
  "access-control-max-age": "86400",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }

  const url = new URL(req.url);
  const uid = url.searchParams.get("uid") || "";

  if (!uid) {
    return new Response(JSON.stringify({ error: "Missing uid parameter" }), {
      status: 400,
      headers: { ...cors, "content-type": "application/json" },
    });
  }

  try {
    const SB_URL = Deno.env.get("SUPABASE_URL")!;
    const SB_SVC = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SB_URL, SB_SVC, { auth: { persistSession: false } });

    // Delete the Wix connection for this user
    const { error } = await supabase
      .from("wix_connections")
      .delete()
      .eq("user_id", uid);

    if (error) {
      console.error("[Wix Disconnect] Database error:", error);
      throw error;
    }

    console.log("[Wix Disconnect] Successfully disconnected user:", uid);

    return new Response(JSON.stringify({ success: true, message: "Disconnected successfully" }), {
      headers: { ...cors, "content-type": "application/json" },
    });
  } catch (e) {
    console.error("[Wix Disconnect] Error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...cors, "content-type": "application/json" },
    });
  }
});