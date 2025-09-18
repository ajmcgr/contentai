import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,OPTIONS",
  "access-control-allow-headers": "authorization,apikey,content-type",
  "access-control-max-age": "86400",
};
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  const url = new URL(req.url);
  const uid = url.searchParams.get("uid") || "";
  try {
    const SB_URL = Deno.env.get("SUPABASE_URL")!;
    const SB_SVC = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SB_URL, SB_SVC, { auth: { persistSession: false } });
    const { data, error } = await supabase
      .from("wix_connections")
      .select("instance_id")
      .eq("user_id", uid)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return new Response(JSON.stringify({ connected: !!data, instance_id: data?.instance_id ?? null }), {
      headers: { ...cors, "content-type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ connected: false, error: String(e) }), {
      headers: { ...cors, "content-type": "application/json" },
    });
  }
});