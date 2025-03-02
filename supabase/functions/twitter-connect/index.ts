
import { createHmac } from "node:crypto";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.1";

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Twitter API credentials from environment variables
const API_KEY = Deno.env.get("TWITTER_CONSUMER_KEY")?.trim();
const API_SECRET = Deno.env.get("TWITTER_CONSUMER_SECRET")?.trim();
const ACCESS_TOKEN = Deno.env.get("TWITTER_ACCESS_TOKEN")?.trim();
const ACCESS_TOKEN_SECRET = Deno.env.get("TWITTER_ACCESS_TOKEN_SECRET")?.trim();

// Supabase client initialization
const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;
const supabase = createClient(supabaseUrl, supabaseKey);

function validateEnvironmentVariables() {
  if (!API_KEY) {
    throw new Error("Missing TWITTER_CONSUMER_KEY environment variable");
  }
  if (!API_SECRET) {
    throw new Error("Missing TWITTER_CONSUMER_SECRET environment variable");
  }
  if (!ACCESS_TOKEN) {
    throw new Error("Missing TWITTER_ACCESS_TOKEN environment variable");
  }
  if (!ACCESS_TOKEN_SECRET) {
    throw new Error("Missing TWITTER_ACCESS_TOKEN_SECRET environment variable");
  }
}

// Generate OAuth signature for Twitter API requests
function generateOAuthSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string
): string {
  const signatureBaseString = `${method}&${encodeURIComponent(
    url
  )}&${encodeURIComponent(
    Object.entries(params)
      .sort()
      .map(([k, v]) => `${k}=${v}`)
      .join("&")
  )}`;
  const signingKey = `${encodeURIComponent(
    consumerSecret
  )}&${encodeURIComponent(tokenSecret)}`;
  const hmacSha1 = createHmac("sha1", signingKey);
  const signature = hmacSha1.update(signatureBaseString).digest("base64");

  console.log("Signature Base String:", signatureBaseString);
  console.log("Signing Key:", signingKey);
  console.log("Generated Signature:", signature);

  return signature;
}

// Generate OAuth header for Twitter API
function generateOAuthHeader(method: string, url: string): string {
  const oauthParams = {
    oauth_consumer_key: API_KEY!,
    oauth_nonce: Math.random().toString(36).substring(2),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: ACCESS_TOKEN!,
    oauth_version: "1.0",
  };

  const signature = generateOAuthSignature(
    method,
    url,
    oauthParams,
    API_SECRET!,
    ACCESS_TOKEN_SECRET!
  );

  const signedOAuthParams = {
    ...oauthParams,
    oauth_signature: signature,
  };

  const entries = Object.entries(signedOAuthParams).sort((a, b) =>
    a[0].localeCompare(b[0])
  );

  return (
    "OAuth " +
    entries
      .map(([k, v]) => `${encodeURIComponent(k)}="${encodeURIComponent(v)}"`)
      .join(", ")
  );
}

const BASE_URL = "https://api.x.com/2";

// Get Twitter user profile
async function getUser() {
  const url = `${BASE_URL}/users/me`;
  const method = "GET";
  const oauthHeader = generateOAuthHeader(method, url);
  console.log("OAuth Header:", oauthHeader);
  const response = await fetch(url, {
    method: method,
    headers: {
      Authorization: oauthHeader,
      "Content-Type": "application/json",
    },
  });
  const responseText = await response.text();
  console.log("Response Body:", responseText);
  return JSON.parse(responseText);
}

// Send a test tweet to verify connection
async function sendTestTweet(): Promise<any> {
  const url = `${BASE_URL}/tweets`;
  const method = "POST";
  const tweetText = `Testing Content AI integration ${new Date().toISOString()}`;
  const params = { text: tweetText };

  const oauthHeader = generateOAuthHeader(method, url);
  console.log("OAuth Header:", oauthHeader);

  const response = await fetch(url, {
    method: method,
    headers: {
      Authorization: oauthHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  const responseText = await response.text();
  console.log("Response Body:", responseText);

  if (!response.ok) {
    throw new Error(
      `HTTP error! status: ${response.status}, body: ${responseText}`
    );
  }

  return JSON.parse(responseText);
}

// Store user's connection status in Supabase
async function storeUserConnection(userId: string, platform: string, connected: boolean) {
  // First check if the connection already exists
  const { data: existingConnection, error: fetchError } = await supabase
    .from('social_connections')
    .select('*')
    .eq('user_id', userId)
    .eq('platform', platform)
    .single();

  if (fetchError && fetchError.code !== 'PGSQL_ERROR_NO_ROWS') {
    console.error('Error fetching connection:', fetchError);
    throw new Error(`Database error: ${fetchError.message}`);
  }

  if (existingConnection) {
    // Update existing connection
    const { error } = await supabase
      .from('social_connections')
      .update({ connected, updated_at: new Date().toISOString() })
      .eq('id', existingConnection.id);

    if (error) {
      console.error('Error updating connection:', error);
      throw new Error(`Database error: ${error.message}`);
    }
  } else {
    // Create new connection
    const { error } = await supabase
      .from('social_connections')
      .insert([
        { 
          user_id: userId,
          platform,
          connected,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]);

    if (error) {
      console.error('Error creating connection:', error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  return { success: true };
}

// Get user's connection status
async function getUserConnections(userId: string) {
  const { data, error } = await supabase
    .from('social_connections')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching connections:', error);
    throw new Error(`Database error: ${error.message}`);
  }

  return data || [];
}

// Main request handler
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    validateEnvironmentVariables();
    
    // Extract auth token to get user ID
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }
    
    // Get the JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const userId = user.id;
    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();
    
    if (req.method === 'GET' && path === 'status') {
      // Get connection status
      const connections = await getUserConnections(userId);
      return new Response(
        JSON.stringify({ connections }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } 
    else if (req.method === 'POST' && path === 'connect') {
      // Connect Twitter account
      const body = await req.json();
      const platform = body.platform || 'twitter';
      const action = body.action || 'connect';

      if (action === 'connect') {
        // Try to verify Twitter connection
        try {
          const userData = await getUser();
          console.log('Twitter user data:', userData);
          
          // Send a test tweet to verify full access
          const tweetData = await sendTestTweet();
          console.log('Test tweet sent:', tweetData);
          
          // Store connection in database
          await storeUserConnection(userId, platform, true);
          
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: 'Twitter account connected successfully',
              userData,
              tweetData
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (error: any) {
          console.error('Twitter API error:', error);
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: error.message || 'Failed to connect Twitter account' 
            }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
      } else if (action === 'disconnect') {
        // Disconnect Twitter account
        await storeUserConnection(userId, platform, false);
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Twitter account disconnected successfully' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Default response for invalid requests
    return new Response(
      JSON.stringify({ error: 'Invalid request' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error: any) {
    console.error('General error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
