import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { marked } from 'https://esm.sh/marked@14.1.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    // Determine action from path, query, or body (supports supabase.functions.invoke without subpath)
    let action = url.pathname.split('/').pop() || '';
    const allowed = new Set(['connect','disconnect','oauth-start','oauth-callback','publish','status']);
    if (!allowed.has(action) || action === 'cms-integration') {
      const qpAction = url.searchParams.get('action');
      if (qpAction && allowed.has(qpAction)) {
        action = qpAction;
      } else {
        try {
          const clone = req.clone();
          const body = await clone.json();
          if (body?.action && allowed.has(body.action)) {
            action = body.action;
          }
        } catch (_) {
          // No JSON body or unreadable; ignore
        }
      }
    }

    // Public callback endpoint hit by WordPress.com (no auth header available)
    if (action === 'oauth-callback' && req.method === 'GET') {
      return await handleOAuthCallbackPublic(req);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ 
        error: 'Unauthorized: missing token',
        success: false
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const userIdHeader = req.headers.get('X-User-Id');
    
    // Check if this is a service role request with user context
    const isServiceRole = token === Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    let supabaseClient;
    let user;
    
    if (isServiceRole && userIdHeader) {
      // Service role with user context - create admin client
      supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      
      // Mock user object for service role operations
      user = { id: userIdHeader };
      console.log('[CMS Integration] Service role request for user:', userIdHeader);
    } else {
      // Regular user token
      supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: { user: authUser }, error: userError } = await supabaseClient.auth.getUser(token);
      if (userError || !authUser) {
        return new Response(JSON.stringify({ 
          error: 'Unauthorized: invalid session',
          success: false
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      user = authUser;
    }

    switch (action) {
      case 'connect':
        return await handleConnect(req, supabaseClient, user);
      case 'disconnect':
        return await handleDisconnect(req, supabaseClient, user);
      case 'oauth-start':
        return await handleOAuthStart(req, supabaseClient, user);
      case 'oauth-callback':
        return await handleOAuthCallback(req, supabaseClient, user);
      case 'publish':
        return await handlePublish(req, supabaseClient, user);
      case 'status':
        return await handleStatus(req, supabaseClient, user);
      default:
        return new Response(JSON.stringify({
          error: 'Invalid action',
          success: false
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

  } catch (error) {
    console.error('Error in cms-integration function:', error);
    return new Response(JSON.stringify({ 
      error: (error as any).message,
      success: false
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function wpAuthHeaders(token: string) {
  const isBasic = token.includes(':');
  return {
    Authorization: isBasic ? `Basic ${btoa(token)}` : `Bearer ${token}`,
    Accept: 'application/json',
  };
}

async function handleConnect(req: Request, supabaseClient: any, user: any) {
  const { platform, siteUrl, apiKey, accessToken } = await req.json();

  console.log('CMS connection request:', { platform, siteUrl });

  // For WordPress.com sites, redirect to OAuth flow
  if (platform === 'wordpress' && (siteUrl.includes('wordpress.com') || siteUrl.includes('.wordpress.com'))) {
    return new Response(JSON.stringify({
      success: false,
      requiresOAuth: true,
      oauthUrl: await generateWordPressOAuthUrl(siteUrl, user.id),
      message: 'WordPress.com requires OAuth authentication'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // For Shopify and Wix, redirect to OAuth flow
  if (platform === 'shopify') {
    return new Response(JSON.stringify({
      success: false,
      requiresOAuth: true,
      oauthUrl: await generateShopifyOAuthUrl(siteUrl, user.id),
      message: 'Shopify requires OAuth authentication'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (platform === 'wix') {
    return new Response(JSON.stringify({
      success: false,
      requiresOAuth: true,
      oauthUrl: await generateWixOAuthUrl(siteUrl, user.id),
      message: 'Wix requires OAuth authentication'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Validate connection based on platform
  let connectionValid = false;
  let config = {};

  switch (platform) {
    case 'wordpress':
      // Self-hosted WordPress only
      connectionValid = await validateWordPressConnection(siteUrl, apiKey);
      config = { endpoint: `${siteUrl}/wp-json/wp/v2/` };
      break;
    case 'shopify':
      connectionValid = await validateShopifyConnection(siteUrl, accessToken);
      config = { endpoint: `https://${siteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')}/admin/api/2024-01/` };
      break;
    case 'webflow':
      connectionValid = await validateWebflowConnection(siteUrl, accessToken);
      config = { endpoint: 'https://api.webflow.com/v2/' };
      break;
    case 'wix':
      connectionValid = await validateWixConnection(siteUrl, accessToken);
      config = { endpoint: 'https://www.wixapis.com/blog/v3/' };
      break;
    case 'notion':
      connectionValid = await validateNotionConnection(accessToken);
      config = { endpoint: 'https://api.notion.com/v1/' };
      break;
    case 'ghost':
      connectionValid = await validateGhostConnection(siteUrl, apiKey);
      config = { endpoint: `${siteUrl}/ghost/api/admin/` };
      break;
    case 'zapier':
      connectionValid = await validateZapierWebhook(siteUrl);
      config = { endpoint: siteUrl };
      break;
    case 'squarespace':
      connectionValid = await validateSquarespaceConnection(siteUrl, accessToken);
      config = { endpoint: `${siteUrl}/api/1.0/` };
      break;
    case 'webhook':
      connectionValid = await validateWebhookConnection(siteUrl);
      config = { endpoint: siteUrl };
      break;
  }

  if (!connectionValid) {
    return new Response(JSON.stringify({
      success: false,
      error: `Failed to validate ${platform} connection`
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Save connection
  const { data: connection, error } = await supabaseClient
    .from('cms_connections')
    .upsert({
      user_id: user.id,
      platform,
      site_url: siteUrl,
      api_key: ['wordpress', 'ghost'].includes(platform) ? apiKey : null,
      access_token: ['shopify', 'webflow', 'wix', 'notion', 'squarespace'].includes(platform) ? accessToken : null,
      config,
      is_active: true,
      last_sync: new Date().toISOString()
    }, {
      onConflict: 'user_id,platform,site_url'
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save connection: ${error.message}`);
  }

  return new Response(JSON.stringify({
    success: true,
    connection,
    message: `Successfully connected to ${platform}`
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function handlePublish(req: Request, supabaseClient: any, user: any) {
  const { articleId, connectionId, publishOptions = {} } = await req.json();

  console.log('Publishing article:', { articleId, connectionId });

  // Get article
  const { data: article, error: articleError } = await supabaseClient
    .from('articles')
    .select('*')
    .eq('id', articleId)
    .eq('user_id', user.id)
    .single();

  if (articleError || !article) {
    throw new Error('Article not found');
  }

  // Get CMS connection
  let connection;
  const { data: cmsConnection, error: connectionError } = await supabaseClient
    .from('cms_connections')
    .select('*')
    .eq('id', connectionId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (cmsConnection) {
    connection = cmsConnection;
  } else {
    // Check if it's a Wix connection
    const { data: wixConnection, error: wixError } = await supabaseClient
      .from('wix_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (wixConnection) {
      // Convert Wix connection to cms_connections format for compatibility
      connection = {
        id: wixConnection.id,
        user_id: user.id,
        platform: 'wix',
        site_url: `wix-site-${wixConnection.instance_id || 'default'}`,
        access_token: wixConnection.access_token,
        api_key: null,
        config: {
          endpoint: 'https://www.wixapis.com/blog/v3/',
          instance_id: wixConnection.instance_id,
          expires_at: wixConnection.expires_at
        },
        is_active: true,
        connected_at: wixConnection.created_at,
        last_sync: wixConnection.created_at
      };
    } else {
      // Check if it's a Shopify install
      const { data: shopifyInstall, error: shopifyError } = await supabaseClient
        .from('cms_installs')
        .select('*')
        .eq('id', connectionId)
        .eq('user_id', user.id)
        .eq('provider', 'shopify')
        .maybeSingle();

      if (shopifyInstall) {
        // Convert Shopify install to cms_connections format for compatibility
        connection = {
          id: shopifyInstall.id,
          user_id: user.id,
          platform: 'shopify',
          site_url: shopifyInstall.external_id,
          access_token: shopifyInstall.access_token,
          api_key: null,
          config: {
            endpoint: `https://${shopifyInstall.external_id}/admin/api/2024-01/`,
            shop: shopifyInstall.external_id,
            scope: shopifyInstall.scope
          },
          is_active: true,
          connected_at: shopifyInstall.created_at,
          last_sync: shopifyInstall.created_at
        };
      }
    }
  }

  if (!connection) {
    throw new Error('CMS connection not found');
  }

  let publishResult;

  switch (connection.platform) {
    case 'wordpress':
      publishResult = await publishToWordPress(article, connection, publishOptions);
      break;
    case 'shopify':
      publishResult = await publishToShopify(article, connection, publishOptions);
      break;
    case 'webflow':
      publishResult = await publishToWebflow(article, connection, publishOptions);
      break;
    case 'wix': {
      // Ensure Wix memberId is provided (required for 3rd-party apps)
      let memberId = (connection.config && connection.config.memberId) || undefined;
      let installRec: any = null;
      if (!memberId) {
        const { data: install } = await supabaseClient
          .from('cms_installs')
          .select('id, extra')
          .eq('user_id', user.id)
          .eq('provider', 'wix')
          .maybeSingle();
        installRec = install || null;
        memberId = install?.extra?.memberId;

        // Fallback 1: introspect token to retrieve subjectId (may equal memberId depending on subjectType)
        if (!memberId && connection.access_token) {
          try {
            const tri = await fetch('https://www.wixapis.com/oauth2/token-info', {
              method: 'POST',
              headers: { 'content-type': 'application/json', 'accept': 'application/json' },
              body: JSON.stringify({ token: connection.access_token })
            });
            const triJson: any = await tri.json().catch(() => ({}));
            if (tri.ok) {
              memberId = triJson?.subjectId || undefined;
              console.log('[CMS Integration][Wix] token-info', { subjectType: triJson?.subjectType, subjectId: memberId, siteId: triJson?.siteId });
            } else {
              console.warn('[CMS Integration][Wix] token-info failed', { status: tri.status, body: triJson });
            }
          } catch (e) {
            console.warn('[CMS Integration][Wix] token-info error', e);
          }
        }

        // Fallback 2: list members (requires Members read permission)
        if (!memberId && connection.access_token) {
          try {
            const list = await fetch('https://www.wixapis.com/members/v1/members?paging.limit=1', {
              method: 'GET',
              headers: { 'accept': 'application/json', 'authorization': `Bearer ${connection.access_token}` }
            });
            const listJson: any = await list.json().catch(() => ({}));
            if (list.ok) {
              const items = listJson?.members || listJson?.items || [];
              memberId = items?.[0]?.id || undefined;
              console.log('[CMS Integration][Wix] members.list', { count: items?.length ?? 0, memberId });
            } else {
              console.warn('[CMS Integration][Wix] members.list failed', { status: list.status, body: listJson });
            }
          } catch (e) {
            console.warn('[CMS Integration][Wix] members.list error', e);
          }
        }

        // Persist discovered memberId for future publishes
        if (memberId) {
          try {
            if (installRec?.id) {
              const nextExtra = { ...(installRec.extra || {}), memberId } as any;
              await supabaseClient.from('cms_installs').update({ extra: nextExtra }).eq('id', installRec.id);
            } else {
              await supabaseClient.from('cms_installs').insert({
                user_id: user.id,
                provider: 'wix',
                external_id: connection?.config?.instance_id || 'unknown',
                access_token: connection.access_token,
                extra: { memberId },
              });
            }
          } catch (e) {
            console.warn('[CMS Integration][Wix] persist memberId failed', e);
          }
        }
      }

      if (!memberId) {
        throw new Error('Wix publish failed: missing required memberId for third-party app. Please reconnect Wix and ensure "Read Members and Contacts" and "Manage Blog" permissions.');
      }

      publishResult = await publishToWix(article, connection, { ...publishOptions, memberId });
      break;
    }
    case 'notion':
      publishResult = await publishToNotion(article, connection, publishOptions);
      break;
    case 'ghost':
      publishResult = await publishToGhost(article, connection, publishOptions);
      break;
    case 'zapier':
      publishResult = await publishToZapier(article, connection, publishOptions);
      break;
    case 'squarespace':
      publishResult = await publishToSquarespace(article, connection, publishOptions);
      break;
    case 'webhook':
      publishResult = await publishToWebhook(article, connection, publishOptions);
      break;
    default:
      throw new Error('Unsupported platform');
  }

  // Update article status
  await supabaseClient
    .from('articles')
    .update({
      status: 'published',
      published_at: new Date().toISOString()
    })
    .eq('id', articleId);

  return new Response(JSON.stringify({
    success: true,
    publishResult,
    message: `Successfully published to ${connection.platform}`
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function handleStatus(req: Request, supabaseClient: any, user: any) {
  const { data: connections, error } = await supabaseClient
    .from('cms_connections')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true);

  if (error) {
    throw new Error(`Failed to fetch connections: ${error.message}`);
  }

  let allConnections = connections || [];

  // Check for Wix connections in the wix_connections table
  const { data: wixConnections, error: wixError } = await supabaseClient
    .from('wix_connections')
    .select('id, access_token, instance_id, created_at, expires_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1);

  if (!wixError && wixConnections && wixConnections.length > 0) {
    const wixConn = wixConnections[0];
    // Add Wix connection in cms_connections format for compatibility
    allConnections.push({
      id: wixConn.id,
      user_id: user.id,
      platform: 'wix',
      site_url: `wix-site-${wixConn.instance_id || 'default'}`,
      access_token: wixConn.access_token,
      api_key: null,
      config: { 
        endpoint: 'https://www.wixapis.com/blog/v3/',
        instance_id: wixConn.instance_id,
        expires_at: wixConn.expires_at
      },
      is_active: true,
      connected_at: wixConn.created_at,
      last_sync: wixConn.created_at
    });
  }

  // Check for Shopify connections in the cms_installs table
  const { data: shopifyInstalls, error: shopifyError } = await supabaseClient
    .from('cms_installs')
    .select('id, external_id, access_token, created_at, scope')
    .eq('user_id', user.id)
    .eq('provider', 'shopify')
    .order('created_at', { ascending: false });

  if (!shopifyError && shopifyInstalls && shopifyInstalls.length > 0) {
    for (const shopifyInstall of shopifyInstalls) {
      // Add Shopify connection in cms_connections format for compatibility
      allConnections.push({
        id: shopifyInstall.id,
        user_id: user.id,
        platform: 'shopify',
        site_url: shopifyInstall.external_id,
        access_token: shopifyInstall.access_token,
        api_key: null,
        config: { 
          endpoint: `https://${shopifyInstall.external_id}/admin/api/2024-01/`,
          shop: shopifyInstall.external_id,
          scope: shopifyInstall.scope
        },
        is_active: true,
        connected_at: shopifyInstall.created_at,
        last_sync: shopifyInstall.created_at
      });
    }
  }

  return new Response(JSON.stringify({
    success: true,
    connections: allConnections
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Disconnect an integration (soft delete)
async function handleDisconnect(req: Request, supabaseClient: any, user: any) {
  try {
    const { platform, siteUrl } = await req.json();
    if (!platform) {
      return new Response(JSON.stringify({ success: false, error: 'Missing platform' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let builder = supabaseClient
      .from('cms_connections')
      .update({
        is_active: false,
        access_token: null,
        api_key: null,
        last_sync: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('platform', platform)
      .eq('is_active', true);

    if (siteUrl) {
      builder = builder.eq('site_url', siteUrl);
    }

    const { error } = await builder;
    if (error) {
      throw new Error(`Failed to disconnect: ${error.message}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message || 'Failed to disconnect' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// Platform-specific validation functions
async function validateWordPressConnection(siteUrl: string, apiKey: string): Promise<boolean> {
  try {
    const cleanUrl = siteUrl.replace(/\/$/, '');
    const response = await fetch(`${cleanUrl}/wp-json/wp/v2/users/me`, {
      headers: wpAuthHeaders(apiKey),
    });
    return response.ok;
  } catch (e) {
    console.error('WordPress validation error:', e);
    return false;
  }
}

async function validateShopifyConnection(siteUrl: string, accessToken: string): Promise<boolean> {
  try {
    // Remove protocol and trailing slash if present
    const cleanUrl = siteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const response = await fetch(`https://${cleanUrl}/admin/api/2024-01/shop.json`, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Shopify validation response:', response.status, await response.text());
    return response.ok;
  } catch (error) {
    console.error('Shopify validation error:', error);
    return false;
  }
}

async function validateWebflowConnection(siteUrl: string, accessToken: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.webflow.com/v2/sites', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });
    
    console.log('Webflow validation response:', response.status, await response.text());
    return response.ok;
  } catch (error) {
    console.error('Webflow validation error:', error);
    return false;
  }
}

async function validateWixConnection(siteUrl: string, accessToken: string): Promise<boolean> {
  try {
    const response = await fetch('https://www.wixapis.com/blog/v3/sites', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function validateNotionConnection(accessToken: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.notion.com/v1/users/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Notion-Version': '2022-06-28'
      }
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function validateGhostConnection(siteUrl: string, apiKey: string): Promise<boolean> {
  try {
    const cleanUrl = siteUrl.replace(/\/$/, '');
    const [keyId, secret] = apiKey.split(':');
    
    if (!keyId || !secret) {
      return false;
    }
    
    const response = await fetch(`${cleanUrl}/ghost/api/admin/site/`, {
      headers: {
        'Authorization': `Ghost ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    return response.ok;
  } catch (e) {
    console.error('Ghost validation error:', e);
    return false;
  }
}

async function validateZapierWebhook(webhookUrl: string): Promise<boolean> {
  try {
    // Validate URL and ensure it's a Zapier webhook
    const url = new URL(webhookUrl);
    return (url.protocol === 'http:' || url.protocol === 'https:') && 
           url.hostname.includes('zapier');
  } catch {
    return false;
  }
}

async function validateSquarespaceConnection(siteUrl: string, accessToken: string): Promise<boolean> {
  try {
    const cleanUrl = siteUrl.replace(/\/$/, '');
    const response = await fetch(`${cleanUrl}/api/1.0/authorization/website`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    return response.ok;
  } catch (e) {
    console.error('Squarespace validation error:', e);
    return false;
  }
}

async function validateWebhookConnection(webhookUrl: string): Promise<boolean> {
  try {
    // Just validate that it's a valid URL
    const url = new URL(webhookUrl);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

// Platform-specific publishing functions
async function publishToWordPress(article: any, connection: any, options: any) {
  // WordPress.com via OAuth (wpcom)
  if (connection?.config?.wpcom) {
    const siteRef = connection.site_url.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const endpoint = `https://public-api.wordpress.com/wp/v2/sites/${encodeURIComponent(siteRef)}/posts`;

    console.log('Publishing to WordPress.com (WP.com):', { endpoint, siteRef });

    const postData = {
      title: article.title,
      content: await marked(article.content),
      excerpt: article.meta_description || '',
      status: options.status || 'draft',
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${connection.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(postData)
    });

    console.log('WP.com API response:', { status: response.status, statusText: response.statusText, url: response.url });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('WP.com API error body:', errorBody);
      if (response.status === 404) {
        throw new Error(`WordPress.com REST API not found for site ${siteRef}. Ensure the site exists and OAuth connection is valid in Settings → Integrations.`);
      } else if (response.status === 401 || response.status === 403) {
        const scope = connection?.config?.scope || 'unknown';
        throw new Error(`WordPress.com authentication failed (scope: ${scope}). Please disconnect and reconnect WordPress.com in Settings → Integrations to grant the required “global” scope.`);
      }
      throw new Error(`WordPress.com publish failed: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    const result = await response.json();
    console.log('WordPress.com publish successful:', result.id);
    return result;
  }

  // Self-hosted WordPress via application password (Basic Auth)
  const cleanUrl = connection.site_url.replace(/\/$/, '');
  const endpoint = `${cleanUrl}/wp-json/wp/v2/posts`;
  
  console.log('Publishing to WordPress (self-hosted):', {
    endpoint,
    siteUrl: connection.site_url,
    hasApiKey: !!connection.api_key
  });
  
  const postData = {
    title: article.title,
    content: article.content,
    excerpt: article.meta_description || '',
    status: options.status || 'draft',
    featured_media: options.featured_media || null
  };

  console.log('WordPress post data:', JSON.stringify(postData, null, 2));

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      ...wpAuthHeaders(connection.api_key || ''),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(postData)
  });

  console.log('WordPress API response:', {
    status: response.status,
    statusText: response.statusText,
    url: response.url
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('WordPress API error body:', errorBody);
    
    if (response.status === 404) {
      throw new Error(`WordPress REST API not found at ${endpoint}. Please ensure WordPress REST API is enabled and the URL is correct.`);
    } else if (response.status === 401 || response.status === 403) {
      throw new Error(`WordPress authentication failed. Please check your credentials.`);
    } else {
      throw new Error(`WordPress publish failed: ${response.status} ${response.statusText} - ${errorBody}`);
    }
  }

  const result = await response.json();
  console.log('WordPress publish successful:', result.id);
  return result;
}

async function publishToShopify(article: any, connection: any, options: any) {
  try {
    // Clean the site URL
    const cleanUrl = connection.site_url.replace(/^https?:\/\//, '').replace(/\/$/, '');
    
    // First, get the default blog ID if not provided
    let blogId = options.blogId;
    if (!blogId) {
      const blogsResponse = await fetch(`https://${cleanUrl}/admin/api/2024-01/blogs.json`, {
        headers: {
          'X-Shopify-Access-Token': connection.access_token,
          'Content-Type': 'application/json'
        }
      });
      
      if (blogsResponse.ok) {
        const blogsData = await blogsResponse.json();
        if (blogsData.blogs && blogsData.blogs.length > 0) {
          blogId = blogsData.blogs[0].id; // Use the first blog
        }
      }
    }
    
    if (!blogId) {
      throw new Error('No blog found on Shopify store. Please create a blog first.');
    }
    
    const endpoint = `https://${cleanUrl}/admin/api/2024-01/blogs/${blogId}/articles.json`;
    
    const articleData = {
      article: {
        title: article.title,
        body_html: article.content,
        summary: article.meta_description,
        published: options.published || false,
        tags: article.keywords || ''
      }
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': connection.access_token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(articleData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Shopify publish failed: ${response.statusText} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Shopify publish error:', error);
    throw error;
  }
}

async function publishToWebflow(article: any, connection: any, options: any) {
  try {
    const siteId = options.siteId;
    const collectionId = options.collectionId;
    
    if (!siteId || !collectionId) {
      throw new Error('Site ID and Collection ID are required for Webflow publishing');
    }
    
    const endpoint = `https://api.webflow.com/v2/collections/${collectionId}/items`;
    
    const itemData = {
      isArchived: false,
      isDraft: options.draft !== false, // Default to draft unless explicitly set to false
      fieldData: {
        name: article.title,
        slug: article.slug || article.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        'post-body': article.content,
        'post-summary': article.meta_description
      }
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${connection.access_token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(itemData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Webflow publish failed: ${response.statusText} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Webflow publish error:', error);
    throw error;
  }
}

async function publishToWix(article: any, connection: any, options: any) {
  const endpoint = `https://www.wixapis.com/blog/v3/draft-posts`;
  
  const memberId = options?.memberId;
  if (!memberId) {
    throw new Error('Wix publish failed: missing required memberId for third-party app. Please connect Wix with proper permissions.');
  }

  // Extract instanceId from connection config
  const instanceId = connection.config?.instance_id || connection.instance_id;
  if (!instanceId) {
    throw new Error('Wix publish failed: missing instanceId. Please reconnect your Wix integration.');
  }

  const draftPostData = {
    draftPost: {
      title: article.title,
      excerpt: article.meta_description || '',
      memberId,
      richContent: {
        nodes: [{
          type: 'PARAGRAPH',
          id: '',
          nodes: [{
            type: 'TEXT',
            id: '',
            nodes: [],
            textData: {
              text: article.content,
              decorations: []
            }
          }],
          paragraphData: {
            textStyle: { textAlignment: 'AUTO' },
            indentation: 0
          }
        }]
      }
    }
  };

  const headers = {
    'Authorization': `Bearer ${connection.access_token}`,
    'Content-Type': 'application/json',
    'wix-instance-id': instanceId // Required for Wix Blog API authentication
  };

  console.log('Wix API request:', {
    endpoint,
    instanceId,
    memberId,
    data: JSON.stringify(draftPostData, null, 2),
    headers
  });

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(draftPostData)
  });

  const responseText = await response.text();
  console.log('Wix API response:', {
    status: response.status,
    statusText: response.statusText,
    body: responseText
  });

  if (!response.ok) {
    throw new Error(`Wix publish failed: ${response.status} ${response.statusText} - ${responseText}`);
  }

  return JSON.parse(responseText);
}

async function publishToNotion(article: any, connection: any, options: any) {
  const databaseId = options.databaseId;
  if (!databaseId) {
    throw new Error('Database ID is required for Notion integration');
  }

  const endpoint = `https://api.notion.com/v1/pages`;
  
  const pageData = {
    parent: {
      database_id: databaseId
    },
    properties: {
      Name: {
        title: [{
          text: {
            content: article.title
          }
        }]
      }
    },
    children: [{
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [{
          type: 'text',
          text: {
            content: article.content
          }
        }]
      }
    }]
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${connection.access_token}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28'
    },
    body: JSON.stringify(pageData)
  });

  if (!response.ok) {
    throw new Error(`Notion publish failed: ${response.statusText}`);
  }

  return await response.json();
}

// OAuth URL generation functions
async function generateWordPressOAuthUrl(siteUrl: string, userId: string): Promise<string> {
  // Get client ID from database config instead of environment
  const { wpClientId } = await getSecrets();
  if (!wpClientId) throw new Error('WordPress.com OAuth not configured');

  const redirectUri = `${(Deno.env.get('SUPABASE_URL') ?? '').replace(/\/$/, '')}/functions/v1/cms-integration/oauth-callback`;
  const state = btoa(JSON.stringify({ u: userId, s: siteUrl, p: 'wordpress' }));

  const params = new URLSearchParams({
    client_id: wpClientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'global',
    state,
  });

  return `https://public-api.wordpress.com/oauth2/authorize?${params.toString()}`;
}

async function generateShopifyOAuthUrl(siteUrl: string, userId: string): Promise<string> {
  const { shopifyClientId } = await getSecrets();
  if (!shopifyClientId) throw new Error('Shopify OAuth not configured');

  const cleanUrl = siteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const redirectUri = `${(Deno.env.get('SUPABASE_URL') ?? '').replace(/\/$/, '')}/functions/v1/cms-integration/oauth-callback`;
  const state = btoa(JSON.stringify({ u: userId, s: siteUrl, p: 'shopify' }));

  const params = new URLSearchParams({
    client_id: shopifyClientId,
    scope: 'read_content,write_content,read_themes,write_themes',
    redirect_uri: redirectUri,
    state,
  });

  return `https://${cleanUrl}/admin/oauth/authorize?${params.toString()}`;
}

async function generateWixOAuthUrl(siteUrl: string, userId: string): Promise<string> {
  const { wixClientId } = await getSecrets();
  if (!wixClientId) throw new Error('Wix OAuth not configured');

  const redirectUri = `${(Deno.env.get('SUPABASE_URL') ?? '').replace(/\/$/, '')}/functions/v1/cms-integration/oauth-callback`;
  const state = btoa(JSON.stringify({ u: userId, s: siteUrl, p: 'wix' }));

  const params = new URLSearchParams({
    client_id: wixClientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: 'offline_access,wix.blog',
    state,
  });

  return `https://www.wix.com/oauth/authorize?${params.toString()}`;
}

// Internal server-only function to get secrets from environment
async function getSecrets() {
  return {
    wpClientId: Deno.env.get('WORDPRESS_CLIENT_ID') || '',
    wpClientSecret: Deno.env.get('WORDPRESS_CLIENT_SECRET') || '',
    shopifyClientId: Deno.env.get('SHOPIFY_CLIENT_ID') || '',
    shopifyClientSecret: Deno.env.get('SHOPIFY_CLIENT_SECRET') || '',
    wixClientId: Deno.env.get('WIX_CLIENT_ID') || '',
    wixClientSecret: Deno.env.get('WIX_CLIENT_SECRET') || ''
  };
}

async function handleOAuthStart(req: Request, supabaseClient: any, user: any) {
  const { platform, siteUrl } = await req.json();
  
  let oauthUrl;
  
  try {
    switch (platform) {
      case 'wordpress':
        oauthUrl = await generateWordPressOAuthUrl(siteUrl, user.id);
        break;
      case 'shopify':
        oauthUrl = await generateShopifyOAuthUrl(siteUrl, user.id);
        break;
      case 'wix':
        oauthUrl = await generateWixOAuthUrl(siteUrl, user.id);
        break;
      default:
        return new Response(JSON.stringify({
          error: `OAuth not supported for ${platform}`,
          success: false
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    
    return new Response(JSON.stringify({
      success: true,
      oauthUrl,
      message: `Redirect to ${platform} for authorization`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// Public callback handler for OAuth
async function handleOAuthCallbackPublic(req: Request) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code') || '';
    const stateParam = url.searchParams.get('state') || '';
    const shop = url.searchParams.get('shop') || '';
    
    if (!code || !stateParam) {
      return new Response(JSON.stringify({ success:false, error:'Missing code or state' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let parsed: any = {};
    try { parsed = JSON.parse(atob(stateParam)); } catch {}
    const userId = parsed?.u;
    const siteUrl = parsed?.s;
    const platform = parsed?.p;
    
    if (!userId || !siteUrl || !platform) {
      return new Response(JSON.stringify({ success:false, error:'Invalid state' }), { status:200, headers:{ ...corsHeaders, 'Content-Type':'application/json' } });
    }

    let accessToken, config;
    
    if (platform === 'wordpress') {
      const { wpClientId, wpClientSecret } = await getSecrets();
      if (!wpClientId || !wpClientSecret) {
        return new Response(JSON.stringify({ success:false, error:'WordPress.com OAuth credentials not configured' }), { status:200, headers:{ ...corsHeaders, 'Content-Type':'application/json' } });
      }

      const redirectUri = `${(Deno.env.get('SUPABASE_URL') ?? '').replace(/\/$/, '')}/functions/v1/cms-integration/oauth-callback`;

      const tokenResponse = await fetch('https://public-api.wordpress.com/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: wpClientId, client_secret: wpClientSecret, code, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
      });
      if (!tokenResponse.ok) {
        const err = await tokenResponse.text();
        return new Response(JSON.stringify({ success:false, error:`Token exchange failed: ${err}` }), { status:200, headers:{ ...corsHeaders, 'Content-Type':'application/json' } });
      }
      const tokenData = await tokenResponse.json();
      accessToken = tokenData.access_token;

      const meRes = await fetch('https://public-api.wordpress.com/rest/v1/me', { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!meRes.ok) {
        const err = await meRes.text();
        return new Response(JSON.stringify({ success:false, error:`Token validation failed: ${err}` }), { status:200, headers:{ ...corsHeaders, 'Content-Type':'application/json' } });
      }
      const wpUser = await meRes.json();
      
      config = { 
        endpoint: 'https://public-api.wordpress.com/rest/v1.1/', 
        wpcom: true, 
        wpUserId: wpUser.ID, 
        wpUsername: wpUser.username,
        scope: tokenData?.scope || null
      };
    } else if (platform === 'shopify') {
      const { shopifyClientId, shopifyClientSecret } = await getSecrets();
      if (!shopifyClientId || !shopifyClientSecret) {
        return new Response(JSON.stringify({ success:false, error:'Shopify OAuth credentials not configured' }), { status:200, headers:{ ...corsHeaders, 'Content-Type':'application/json' } });
      }

      const cleanUrl = shop || siteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');

      const tokenResponse = await fetch(`https://${cleanUrl}/admin/oauth/access_token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: shopifyClientId, client_secret: shopifyClientSecret, code }),
      });
      if (!tokenResponse.ok) {
        const err = await tokenResponse.text();
        return new Response(JSON.stringify({ success:false, error:`Shopify token exchange failed: ${err}` }), { status:200, headers:{ ...corsHeaders, 'Content-Type':'application/json' } });
      }
      const tokenData = await tokenResponse.json();
      accessToken = tokenData.access_token;
      
      config = { 
        endpoint: `https://${cleanUrl}/admin/api/2024-01/`,
        shop: cleanUrl
      };
    } else if (platform === 'wix') {
      const { wixClientId, wixClientSecret } = await getSecrets();
      if (!wixClientId || !wixClientSecret) {
        return new Response(JSON.stringify({ success:false, error:'Wix OAuth credentials not configured' }), { status:200, headers:{ ...corsHeaders, 'Content-Type':'application/json' } });
      }

      const redirectUri = `${(Deno.env.get('SUPABASE_URL') ?? '').replace(/\/$/, '')}/functions/v1/cms-integration/oauth-callback`;

      const tokenResponse = await fetch('https://www.wix.com/oauth/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: wixClientId, client_secret: wixClientSecret, code, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
      });
      if (!tokenResponse.ok) {
        const err = await tokenResponse.text();
        return new Response(JSON.stringify({ success:false, error:`Wix token exchange failed: ${err}` }), { status:200, headers:{ ...corsHeaders, 'Content-Type':'application/json' } });
      }
      const tokenData = await tokenResponse.json();
      accessToken = tokenData.access_token;
      
      config = { 
        endpoint: 'https://www.wixapis.com/blog/v3/',
        wixSiteId: siteUrl
      };
    }

    const adminClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const { data: connection, error } = await adminClient
      .from('cms_connections')
      .upsert({ 
        user_id: userId, 
        platform, 
        site_url: siteUrl, 
        access_token: accessToken, 
        config, 
        is_active: true, 
        last_sync: new Date().toISOString() 
      }, { onConflict: 'user_id,platform,site_url' })
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ success:false, error:`Failed to save connection: ${error.message}` }), { status:200, headers:{ ...corsHeaders, 'Content-Type':'application/json' } });
    }

    const appUrl = `${req.headers.get('origin') || 'https://www.trycontent.ai'}/dashboard/settings?platform=${platform}&success=1`;
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WordPress Connected</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            text-align: center;
        }
        .container {
            max-width: 400px;
            padding: 2rem;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 1rem;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .icon {
            font-size: 3rem;
            margin-bottom: 1rem;
        }
        h1 {
            margin: 0 0 1rem 0;
            font-size: 1.5rem;
            font-weight: 600;
        }
        p {
            margin: 0;
            opacity: 0.9;
            font-size: 1rem;
        }
        .spinner {
            margin: 1rem auto;
            width: 24px;
            height: 24px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-top: 2px solid white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">✅</div>
        <h1>${platform.charAt(0).toUpperCase() + platform.slice(1)} Connected!</h1>
        <p>Successfully connected to your ${platform} site.</p>
        <div class="spinner"></div>
        <p style="font-size: 0.875rem; margin-top: 1rem;">Redirecting you back...</p>
    </div>
    <script>
        // Always notify parent window and close popup
        if (window.opener) {
            window.opener.postMessage({ type: '${platform}_connected', success: true }, '*');
            setTimeout(() => window.close(), 500);
        } else {
            setTimeout(() => {
                window.location.href = "${appUrl}";
            }, 1500);
        }
    </script>
</body>
</html>`;
    return new Response(html, { headers: { ...corsHeaders, 'Content-Type': 'text/html' } });
  } catch (e: any) {
    const msg = e?.message || 'Unexpected error';
    return new Response(JSON.stringify({ success:false, error: msg }), { status:200, headers:{ ...corsHeaders, 'Content-Type':'application/json' } });
  }
}

async function handleOAuthCallback(req: Request, supabaseClient: any, user: any) {
  const { code, state, siteUrl } = await req.json();
  
  // Accept both raw userId state and encoded JSON state
  let expectedUserId = user.id;
  let stateUserId = state;
  try {
    const parsed = JSON.parse(atob(state));
    stateUserId = parsed?.u || state;
  } catch {}

  if (stateUserId !== expectedUserId) {
    return new Response(JSON.stringify({
      error: 'Invalid OAuth state',
      success: false
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { clientId, clientSecret } = await getWpSupabaseSecrets();
    
    if (!clientId || !clientSecret) {
      throw new Error('WordPress.com OAuth credentials not configured');
    }

    const redirectUri = `${(Deno.env.get('SUPABASE_URL') ?? '').replace(/\/$/, '')}/functions/v1/cms-integration/oauth-callback`;

    // Exchange code for access token
    const tokenResponse = await fetch('https://public-api.wordpress.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange OAuth code for token');
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Validate the token by getting user info
    const userResponse = await fetch('https://public-api.wordpress.com/rest/v1/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userResponse.ok) {
      throw new Error('Failed to validate WordPress.com access token');
    }

    const wpUser = await userResponse.json();

    // Save connection
    const { data: connection, error } = await supabaseClient
      .from('cms_connections')
      .upsert({
        user_id: user.id,
        platform: 'wordpress',
        site_url: siteUrl,
        access_token: accessToken,
        config: { 
          endpoint: 'https://public-api.wordpress.com/rest/v1.1/',
          wpcom: true,
          wpUserId: wpUser.ID,
          wpUsername: wpUser.username
        },
        is_active: true,
        last_sync: new Date().toISOString()
      }, {
        onConflict: 'user_id,platform,site_url'
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save connection: ${error.message}`);
    }

    return new Response(JSON.stringify({
      success: true,
      connection,
      message: 'Successfully connected to WordPress.com'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('WordPress.com OAuth error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// Ghost publishing function
async function publishToGhost(article: any, connection: any, options: any) {
  try {
    const endpoint = `${connection.site_url}/ghost/api/admin/posts/`;
    
    const postData = {
      posts: [{
        title: article.title,
        html: article.content,
        excerpt: article.meta_description,
        status: options.status || 'draft',
        tags: article.keywords ? article.keywords.split(',').map((tag: string) => tag.trim()) : []
      }]
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Ghost ${connection.api_key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(postData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ghost publish failed: ${response.statusText} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Ghost publish error:', error);
    throw error;
  }
}

// Zapier webhook function
async function publishToZapier(article: any, connection: any, options: any) {
  const zapierData = {
    title: article.title,
    content: article.content,
    meta_description: article.meta_description,
    keywords: article.keywords,
    published_at: new Date().toISOString(),
    ...options
  };

  const response = await fetch(connection.site_url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(zapierData)
  });

  if (!response.ok) {
    throw new Error(`Zapier webhook failed: ${response.statusText}`);
  }

  return { success: true, webhook_url: connection.site_url };
}

// Squarespace publishing function
async function publishToSquarespace(article: any, connection: any, options: any) {
  try {
    const endpoint = `${connection.site_url}/api/1.0/blog-posts`;
    
    const postData = {
      title: article.title,
      body: article.content,
      excerpt: article.meta_description,
      publishOn: options.publishOn || new Date().toISOString(),
      tags: article.keywords ? article.keywords.split(',').map((tag: string) => tag.trim()) : []
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${connection.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(postData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Squarespace publish failed: ${response.statusText} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Squarespace publish error:', error);
    throw error;
  }
}

async function publishToWebhook(article: any, connection: any, options: any) {
  const webhookData = {
    title: article.title,
    content: article.content,
    meta_description: article.meta_description,
    published_at: new Date().toISOString(),
    ...options
  };

  const response = await fetch(connection.site_url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(webhookData)
  });

  if (!response.ok) {
    throw new Error(`Webhook publish failed: ${response.statusText}`);
  }

  return { success: true, webhook_url: connection.site_url };
}