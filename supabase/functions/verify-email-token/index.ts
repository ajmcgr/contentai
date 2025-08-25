import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface VerifyTokenRequest {
  token: string;
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

    const { token }: VerifyTokenRequest = await req.json();

    console.log("Verifying email token");

    // Find user by verification token
    const { data: profile, error: findError } = await supabase
      .from('profiles')
      .select('id, email_verification_token, email_verification_expires_at, email_verified_at')
      .eq('email_verification_token', token)
      .maybeSingle();

    if (findError) {
      console.error("Error finding profile by token:", findError);
      throw findError;
    }

    if (!profile) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired verification token" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Check if token has expired
    if (profile.email_verification_expires_at && new Date(profile.email_verification_expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Verification token has expired" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Check if email is already verified
    if (profile.email_verified_at) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Email already verified",
          alreadyVerified: true 
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Mark email as verified
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        email_verified_at: new Date().toISOString(),
        email_verification_token: null,
        email_verification_expires_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', profile.id);

    if (updateError) {
      console.error("Error updating profile verification status:", updateError);
      throw updateError;
    }

    console.log("Email verification successful for user:", profile.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email verified successfully",
        userId: profile.id
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
    console.error("Error in verify-email-token function:", error);
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