import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface GenerateTokenRequest {
  userId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");

    if (!supabaseServiceRoleKey || !supabaseUrl) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { userId }: GenerateTokenRequest = await req.json();

    // Generate secure random token (32 bytes = 43 characters in base64url)
    const tokenArray = new Uint8Array(32);
    crypto.getRandomValues(tokenArray);
    const token = btoa(String.fromCharCode(...tokenArray))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    // Set expiration to 60 minutes from now
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    console.log("Generating verification token for user:", userId);

    // Update user profile with verification token
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email_verification_token: token,
        email_verification_expires_at: expiresAt,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error("Error updating profile with verification token:", error);
      throw error;
    }

    // Create verification URL
    const appUrl = req.headers.get('origin') || supabaseUrl.replace('//', '//').split('.')[0] + '.lovable.app';
    const verificationUrl = `${appUrl}/verify?token=${token}`;

    console.log("Verification token generated successfully");

    return new Response(
      JSON.stringify({ 
        success: true, 
        verificationUrl,
        token,
        expiresAt
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in generate-verification-token function:", error);
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