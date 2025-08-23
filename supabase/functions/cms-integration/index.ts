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
      throw new Error('No authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('No user found');
    }

    const url = new URL(req.url);
    const action = url.pathname.split('/').pop();

    switch (action) {
      case 'connect':
        return await handleConnect(req, supabaseClient, user);
      case 'publish':
        return await handlePublish(req, supabaseClient, user);
      case 'status':
        return await handleStatus(req, supabaseClient, user);
      default:
        throw new Error('Invalid action');
    }

  } catch (error) {
    console.error('Error in cms-integration function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function handleConnect(req: Request, supabaseClient: any, user: any) {
  const { platform, siteUrl, apiKey, accessToken } = await req.json();

  console.log('CMS connection request:', { platform, siteUrl });

  // Validate connection based on platform
  let connectionValid = false;
  let config = {};

  switch (platform) {
    case 'wordpress':
      connectionValid = await validateWordPressConnection(siteUrl, apiKey);
      config = { endpoint: `${siteUrl}/wp-json/wp/v2/` };
      break;
    case 'shopify':
      connectionValid = await validateShopifyConnection(siteUrl, accessToken);
      config = { endpoint: `https://${siteUrl}/admin/api/2023-10/` };
      break;
    case 'webflow':
      connectionValid = await validateWebflowConnection(siteUrl, accessToken);
      config = { endpoint: 'https://api.webflow.com/' };
      break;
  }

  if (!connectionValid) {
    throw new Error(`Failed to validate ${platform} connection`);
  }

  // Save connection
  const { data: connection, error } = await supabaseClient
    .from('cms_connections')
    .upsert({
      user_id: user.id,
      platform,
      site_url: siteUrl,
      api_key: platform === 'wordpress' ? apiKey : null,
      access_token: platform !== 'wordpress' ? accessToken : null,
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
    const response = await fetch(`${siteUrl}/wp-json/wp/v2/users/me`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function validateShopifyConnection(siteUrl: string, accessToken: string): Promise<boolean> {
  try {
    const response = await fetch(`https://${siteUrl}/admin/api/2023-10/shop.json`, {
      headers: {
        'X-Shopify-Access-Token': accessToken
      }
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function validateWebflowConnection(siteUrl: string, accessToken: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.webflow.com/sites', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    return response.ok;
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
      'Authorization': `Bearer ${connection.api_key}`,
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
  const endpoint = `https://${connection.site_url}/admin/api/2023-10/blogs/${options.blogId || 'default'}/articles.json`;
  
  const articleData = {
    article: {
      title: article.title,
      body_html: article.content,
      summary: article.meta_description,
      published: options.published || false
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
    throw new Error(`Shopify publish failed: ${response.statusText}`);
  }

  return await response.json();
}

async function publishToWebflow(article: any, connection: any, options: any) {
  const endpoint = `https://api.webflow.com/collections/${options.collectionId}/items`;
  
  const itemData = {
    name: article.title,
    slug: article.slug,
    'post-body': article.content,
    'post-summary': article.meta_description,
    '_archived': false,
    '_draft': options.draft || true
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${connection.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(itemData)
  });

  if (!response.ok) {
    throw new Error(`Webflow publish failed: ${response.statusText}`);
  }

  return await response.json();
}