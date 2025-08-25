import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface UpdateConfigRequest {
  config: {
    resend_api_key?: string;
    email_from?: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role key
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");

    if (!supabaseServiceRoleKey || !supabaseUrl) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { config }: UpdateConfigRequest = await req.json();

    console.log("Updating email config:", { ...config, resend_api_key: config.resend_api_key ? '[REDACTED]' : undefined });

    const { data, error } = await supabase
      .from('config')
      .upsert({
        id: 'global',
        ...config,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error("Error updating email config:", error);
      throw error;
    }

    console.log("Email config updated successfully");

    return new Response(
      JSON.stringify({ success: true, data }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in update-email-config function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);