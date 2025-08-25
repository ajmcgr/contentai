import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SendEmailRequest {
  to: string;
  subject: string;
  html: string;
  text?: string;
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

    // Get email config from database
    const { data: config, error: configError } = await supabase
      .from('config')
      .select('resend_api_key, email_from')
      .eq('id', 'global')
      .maybeSingle();

    if (configError) {
      console.error("Error fetching email config:", configError);
      throw new Error("Failed to fetch email configuration");
    }

    if (!config?.resend_api_key) {
      throw new Error("Resend API key not configured");
    }

    const apiKey = config.resend_api_key;
    const fromAddress = config.email_from || "support@trycontent.ai";

    console.log("Using email config:", { 
      fromAddress, 
      hasApiKey: !!apiKey 
    });

    const resend = new Resend(apiKey);
    const { to, subject, html, text }: SendEmailRequest = await req.json();

    console.log("Sending email:", { to, subject, from: fromAddress });

    const emailResponse = await resend.emails.send({
      from: fromAddress,
      to,
      subject,
      html,
      text,
    });

    const resp: any = emailResponse as any;
    if (resp?.error) {
      console.error("Resend email error:", resp.error);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: resp.error }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, id: emailResponse.data?.id }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-email-with-config function:", error);
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