import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PasswordResetRequest {
  email: string;
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

    const { email }: PasswordResetRequest = await req.json();

    console.log("Generating password reset link for:", email);

    // Get app URL from request origin
    const appUrl = req.headers.get('origin') || supabaseUrl.replace('//', '//').split('.')[0] + '.lovable.app';

    // Generate password reset link using Supabase admin
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: `${appUrl}/reset-password`
      }
    });

    if (error) {
      console.error("Error generating password reset link:", error);
      throw error;
    }

    const resetLink = data.properties?.action_link as string;

    if (!resetLink) {
      throw new Error("Failed to generate reset link");
    }

    console.log("Password reset link generated, sending email");

    // Get email configuration
    const { data: configData, error: configError } = await supabase
      .from('config')
      .select('resend_api_key, email_from')
      .eq('id', 'global')
      .maybeSingle();

    if (configError) {
      console.error("Error fetching email config:", configError);
      throw new Error("Failed to fetch email configuration");
    }

    if (!configData?.resend_api_key) {
      throw new Error("Resend API key not configured");
    }

    // Send password reset email using Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${configData.resend_api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: configData.email_from || 'support@trycontent.ai',
        to: email,
        subject: 'Reset your TryContent password',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333; text-align: center;">Password Reset</h1>
            <p style="color: #666; font-size: 16px;">You requested a password reset for your TryContent account.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" 
                 style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                Reset Password
              </a>
            </div>
            <p style="color: #999; font-size: 14px;">
              This link will expire in 60 minutes. If you didn't request a password reset, please ignore this email.
            </p>
            <p style="color: #999; font-size: 14px;">
              If the button doesn't work, copy and paste this link: ${resetLink}
            </p>
          </div>
        `,
        text: `Reset your TryContent password:\n${resetLink}\n\nThis link expires in 60 minutes.`
      })
    });

    if (!resendResponse.ok) {
      const error = await resendResponse.text();
      console.error("Resend API error:", error);
      throw new Error("Failed to send password reset email");
    }

    console.log("Password reset email sent successfully");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Password reset email sent successfully" 
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
    console.error("Error in send-password-reset function:", error);
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