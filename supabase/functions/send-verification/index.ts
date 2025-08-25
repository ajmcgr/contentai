
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    // Check if RESEND_API_KEY is available
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY environment variable is not set");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const resend = new Resend(RESEND_API_KEY);
    const { email, password, appOrigin }: VerificationEmailRequest = await req.json();

    // Determine app origin for redirect
    const redirectOrigin = appOrigin || req.headers.get("origin") || (new URL(req.url).origin);

    // Generate signup link; if user exists, fall back to magic link sign-in
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email,
      password,
      options: { redirectTo: `${redirectOrigin}/dashboard` }
    });

    let actionLink = data?.properties?.action_link as string | undefined;
    let emailSubject = "Verify your email address";
    let heading = "Welcome to Content AI!";
    let introText = "Please click the link below to verify your email address:";

    if (error) {
      // Handle already-registered users gracefully by sending a magic sign-in link
      if ((error as any)?.code === 'email_exists' || (error as any)?.status === 422) {
        const { data: magicData, error: magicErr } = await supabaseAdmin.auth.admin.generateLink({
          type: 'magiclink',
          email,
          options: { redirectTo: `${redirectOrigin}/dashboard` }
        });
        if (magicErr) {
          console.error("Error generating magic link:", magicErr);
          throw magicErr;
        }
        actionLink = magicData?.properties?.action_link as string | undefined;
        emailSubject = "Sign in to Content AI";
        heading = "You're already registered";
        introText = "Click below to sign in instantly:";
      } else {
        console.error("Error generating verification link:", error);
        throw error;
      }
    }

    const emailResponse = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: emailSubject,
      html: `
        <h1>${heading}</h1>
        <p>${introText}</p>
        <a href="${actionLink}" style="display: inline-block; padding: 12px 24px; background-color: #000; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">Verify Email</a>
        <p>Or copy and paste this link in your browser:</p>
        <p style="word-break: break-all; color: #666;">${actionLink}</p>
        <p>If you didn't create an account, you can safely ignore this email.</p>
      `,
    });

    const resp: any = emailResponse as any;
    if (resp?.error) {
      console.error("Resend email error:", resp.error);
      // Return a fallback link so the client can proceed without email during setup/testing
      return new Response(
        JSON.stringify({ ok: false, resend_error: resp.error, fallback_link: actionLink }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Return success with the action link as well for immediate redirect if desired
    return new Response(
      JSON.stringify({ ok: true, action_link: actionLink }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
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
