import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    // Handle OAuth error
    if (error) {
      console.error('WordPress OAuth error:', error);
      return new Response(`
        <html>
          <body>
            <h1>Authorization Failed</h1>
            <p>Error: ${error}</p>
            <script>window.close();</script>
          </body>
        </html>
      `, {
        headers: { ...corsHeaders, 'Content-Type': 'text/html' },
      });
    }

    if (!code || !state) {
      return new Response(`
        <html>
          <body>
            <h1>Invalid Request</h1>
            <p>Missing authorization code or state parameter.</p>
            <script>window.close();</script>
          </body>
        </html>
      `, {
        headers: { ...corsHeaders, 'Content-Type': 'text/html' },
      });
    }

    const supabaseServiceRole = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify and consume OAuth state
    const { data: stateData, error: stateError } = await supabaseServiceRole
      .from('oauth_states')
      .select('user_id, expires_at')
      .eq('state', state)
      .maybeSingle();

    if (stateError || !stateData) {
      console.error('Invalid or expired OAuth state:', stateError);
      return new Response(`
        <html>
          <body>
            <h1>Invalid or Expired Request</h1>
            <p>The authorization request has expired or is invalid.</p>
            <script>window.close();</script>
          </body>
        </html>
      `, {
        headers: { ...corsHeaders, 'Content-Type': 'text/html' },
      });
    }

    // Check if state is expired
    if (new Date(stateData.expires_at) < new Date()) {
      await supabaseServiceRole
        .from('oauth_states')
        .delete()
        .eq('state', state);

      return new Response(`
        <html>
          <body>
            <h1>Request Expired</h1>
            <p>The authorization request has expired. Please try again.</p>
            <script>window.close();</script>
          </body>
        </html>
      `, {
        headers: { ...corsHeaders, 'Content-Type': 'text/html' },
      });
    }

    // Get WordPress config
    const { data: config, error: configError } = await supabaseServiceRole
      .from('config_integrations')
      .select('wp_client_id, wp_client_secret, wp_redirect_uri')
      .eq('id', 'global')
      .maybeSingle();

    if (configError || !config || !config.wp_client_id || !config.wp_client_secret) {
      console.error('WordPress config not found or incomplete:', configError);
      return new Response(`
        <html>
          <body>
            <h1>Configuration Error</h1>
            <p>WordPress integration is not properly configured.</p>
            <script>window.close();</script>
          </body>
        </html>
      `, {
        headers: { ...corsHeaders, 'Content-Type': 'text/html' },
      });
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://public-api.wordpress.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: config.wp_client_id,
        client_secret: config.wp_client_secret,
        redirect_uri: config.wp_redirect_uri,
        code: code,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      return new Response(`
        <html>
          <body>
            <h1>Token Exchange Failed</h1>
            <p>Failed to obtain access token from WordPress.com</p>
            <script>window.close();</script>
          </body>
        </html>
      `, {
        headers: { ...corsHeaders, 'Content-Type': 'text/html' },
      });
    }

    const tokenData = await tokenResponse.json();

    // Get user's site information
    const sitesResponse = await fetch('https://public-api.wordpress.com/rest/v1.1/me/sites', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    });

    let blogId = '';
    let blogUrl = '';
    
    if (sitesResponse.ok) {
      const sitesData = await sitesResponse.json();
      if (sitesData.sites && sitesData.sites.length > 0) {
        const primarySite = sitesData.sites[0];
        blogId = primarySite.ID.toString();
        blogUrl = primarySite.URL;
      }
    }

    // Store the token
    const { error: tokenError } = await supabaseServiceRole
      .from('wp_tokens')
      .upsert({
        user_id: stateData.user_id,
        access_token: tokenData.access_token,
        scope: tokenData.scope || 'global',
        blog_id: blogId,
        blog_url: blogUrl,
      }, {
        onConflict: 'user_id',
        ignoreDuplicates: false
      });

    // Clean up OAuth state
    await supabaseServiceRole
      .from('oauth_states')
      .delete()
      .eq('state', state);

    if (tokenError) {
      console.error('Error storing token:', tokenError);
      return new Response(`
        <html>
          <body>
            <h1>Storage Error</h1>
            <p>Failed to store access token.</p>
            <script>window.close();</script>
          </body>
        </html>
      `, {
        headers: { ...corsHeaders, 'Content-Type': 'text/html' },
      });
    }

    // Success page
    return new Response(`
      <html>
        <body>
          <h1>WordPress Connected Successfully!</h1>
          <p>Your WordPress.com account has been connected.</p>
          ${blogUrl ? `<p>Connected site: <a href="${blogUrl}" target="_blank">${blogUrl}</a></p>` : ''}
          <script>
            setTimeout(() => {
              window.close();
            }, 3000);
          </script>
        </body>
      </html>
    `, {
      headers: { ...corsHeaders, 'Content-Type': 'text/html' },
    });

  } catch (error: any) {
    console.error('Unexpected error in OAuth callback:', error);
    return new Response(`
      <html>
        <body>
          <h1>Unexpected Error</h1>
          <p>An unexpected error occurred during the authorization process.</p>
          <script>window.close();</script>
        </body>
      </html>
    `, {
      headers: { ...corsHeaders, 'Content-Type': 'text/html' },
    });
  }
});