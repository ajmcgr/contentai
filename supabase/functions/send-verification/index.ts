
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const FROM_EMAIL = Deno.env.get("RESEND_FROM") || "Content AI <onboarding@resend.dev>";

// Create admin client for generating verification tokens
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface VerificationEmailRequest {
  email: string;
  password: string;
  appOrigin?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, password, appOrigin }: VerificationEmailRequest = await req.json();

    // Determine app origin for redirect
    const redirectOrigin = appOrigin || req.headers.get("origin") || (new URL(req.url).origin);

    // Generate signup link using admin client (no automatic Supabase email)
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email,
      password,
      options: { redirectTo: `${redirectOrigin}/dashboard` }
    });

    if (error) {
      console.error("Error generating verification link:", error);
      throw error;
    }

    const emailResponse = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "Verify your email address",
      html: `
        <h1>Welcome to Content AI!</h1>
        <p>Please click the link below to verify your email address:</p>
        <a href="${data.properties.action_link}" style="display: inline-block; padding: 12px 24px; background-color: #000; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">Verify Email</a>
        <p>Or copy and paste this link in your browser:</p>
        <p style="word-break: break-all; color: #666;">${data.properties.action_link}</p>
        <p>If you didn't create an account, you can safely ignore this email.</p>
      `,
    });

    const resp: any = emailResponse as any;
    if (resp?.error) {
      console.error("Resend email error:", resp.error);
      // Return a fallback link so the client can proceed without email during setup/testing
      return new Response(
        JSON.stringify({ ok: false, resend_error: resp.error, fallback_link: data?.properties?.action_link }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending verification email:", error);
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
