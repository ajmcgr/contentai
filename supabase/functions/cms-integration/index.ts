import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ 
        error: 'Unauthorized: invalid session',
        success: false
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const action = url.pathname.split('/').pop();

    switch (action) {
      case 'connect':
        return await handleConnect(req, supabaseClient, user);
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
      api_key: platform === 'wordpress' ? apiKey : null,
      access_token: ['shopify', 'webflow', 'wix', 'notion'].includes(platform) ? accessToken : null,
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
  const { data: connection, error: connectionError } = await supabaseClient
    .from('cms_connections')
    .select('*')
    .eq('id', connectionId)
    .eq('user_id', user.id)
    .single();

  if (connectionError || !connection) {
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
    case 'wix':
      publishResult = await publishToWix(article, connection, publishOptions);
      break;
    case 'notion':
      publishResult = await publishToNotion(article, connection, publishOptions);
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

  return new Response(JSON.stringify({
    success: true,
    connections
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
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
  const endpoint = `${connection.site_url}/wp-json/wp/v2/posts`;
  
  const postData = {
    title: article.title,
    content: article.content,
    excerpt: article.meta_description,
    status: options.status || 'draft',
    featured_media: options.featured_media || null
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      ...wpAuthHeaders(connection.api_key || ''),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(postData)
  });

  if (!response.ok) {
    throw new Error(`WordPress publish failed: ${response.statusText}`);
  }

  return await response.json();
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
  const endpoint = `https://www.wixapis.com/blog/v3/posts`;
  
  const postData = {
    title: article.title,
    excerpt: article.meta_description,
    content: {
      type: 'RICH_TEXT',
      nodes: [{
        type: 'PARAGRAPH',
        nodes: [{
          type: 'TEXT',
          textData: {
            text: article.content
          }
        }]
      }]
    },
    status: options.status || 'DRAFT'
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
    throw new Error(`Wix publish failed: ${response.statusText}`);
  }

  return await response.json();
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

// WordPress.com OAuth functions
async function generateWordPressOAuthUrl(siteUrl: string, userId: string): Promise<string> {
  const clientId = Deno.env.get('WORDPRESS_CLIENT_ID');
  if (!clientId) {
    throw new Error('WordPress.com OAuth not configured');
  }

  const baseUrl = 'https://0d84bc4c-60bd-4402-8799-74365f8b638e.sandbox.lovable.dev'; // Use your actual domain
  const redirectUri = `${baseUrl}/dashboard/settings?oauth=wordpress&callback=true`;
  
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'auth',
    state: userId, // Use user ID as state for security
  });

  return `https://public-api.wordpress.com/oauth2/authorize?${params.toString()}`;
}

async function handleOAuthStart(req: Request, supabaseClient: any, user: any) {
  const { platform, siteUrl } = await req.json();
  
  if (platform !== 'wordpress') {
    return new Response(JSON.stringify({
      error: 'OAuth only supported for WordPress.com',
      success: false
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const oauthUrl = await generateWordPressOAuthUrl(siteUrl, user.id);
    
    return new Response(JSON.stringify({
      success: true,
      oauthUrl,
      message: 'Redirect to WordPress.com for authorization'
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

async function handleOAuthCallback(req: Request, supabaseClient: any, user: any) {
  const { code, state, siteUrl } = await req.json();
  
  if (state !== user.id) {
    return new Response(JSON.stringify({
      error: 'Invalid OAuth state',
      success: false
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const clientId = Deno.env.get('WORDPRESS_CLIENT_ID');
    const clientSecret = Deno.env.get('WORDPRESS_CLIENT_SECRET');
    
    if (!clientId || !clientSecret) {
      throw new Error('WordPress.com OAuth credentials not configured');
    }

    const baseUrl = 'https://0d84bc4c-60bd-4402-8799-74365f8b638e.sandbox.lovable.dev';
    const redirectUri = `${baseUrl}/dashboard/settings?oauth=wordpress&callback=true`;

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