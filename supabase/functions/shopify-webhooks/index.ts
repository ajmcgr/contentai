import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-shopify-hmac-sha256, x-shopify-topic, x-shopify-shop-domain',
}

async function getShopifySecret() {
  const supabaseServiceRole = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // Try dedicated webhook secret first
  const { data: wh, error: whErr } = await supabaseServiceRole
    .from('app_secrets')
    .select('key,value')
    .eq('namespace', 'cms_integrations')
    .in('key', ['SHOPIFY_WEBHOOK_SECRET','SHOPIFY_API_SECRET'])

  if (whErr) throw new Error('Failed to fetch Shopify secret: ' + whErr.message)
  const map = Object.fromEntries((wh || []).map(r => [r.key, String(r.value).trim()]))

  const secret = map['SHOPIFY_WEBHOOK_SECRET'] || map['SHOPIFY_API_SECRET']
  if (!secret) throw new Error('Missing Shopify webhook/API secret')
  return secret
}

async function verifyWebhookHmac(body: string, hmacHeader: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(secret)
  const messageData = encoder.encode(body)
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData)
  const digest = btoa(String.fromCharCode(...new Uint8Array(signature)))
  
  return digest === hmacHeader
}

async function logWebhookEvent(topic: string, shop: string, data: any) {
  try {
    const supabaseServiceRole = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    await supabaseServiceRole.from('app_logs').insert({
      provider: 'shopify',
      stage: `webhook.${topic}`,
      level: 'info',
      detail: JSON.stringify({ shop, topic, data }).slice(0, 8000)
    })
  } catch (e) {
    console.error('Failed to log webhook event:', e)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    })
  }

  try {
    const body = await req.text()
    const hmacHeader = req.headers.get('x-shopify-hmac-sha256')
    const topic = req.headers.get('x-shopify-topic')
    const shop = req.headers.get('x-shopify-shop-domain')

    if (!hmacHeader || !topic || !shop) {
      return new Response('Missing required headers', { 
        status: 400, 
        headers: corsHeaders 
      })
    }

    // Verify webhook signature
    const secret = await getShopifySecret()
    const isValid = await verifyWebhookHmac(body, hmacHeader, secret)
    
    if (!isValid) {
      return new Response('Invalid webhook signature', { 
        status: 401, 
        headers: corsHeaders 
      })
    }

    const webhookData = body ? JSON.parse(body) : {}
    
    // Log the webhook event
    await logWebhookEvent(topic, shop, webhookData)

    // Handle GDPR compliance webhooks
    switch (topic) {
      case 'customers/data_request':
        console.log(`[WEBHOOK] Data request for customer in shop: ${shop}`)
        // Handle customer data request - you should implement data export
        // For now, just acknowledge receipt
        break
        
      case 'customers/redact':
        console.log(`[WEBHOOK] Customer data deletion request for shop: ${shop}`)
        // Handle customer data deletion
        // Remove any customer data you've stored
        const customerId = webhookData?.customer?.id
        if (customerId) {
          // TODO: Implement customer data deletion from your database
          console.log(`Should delete data for customer: ${customerId}`)
        }
        break
        
      case 'shop/redact':
        console.log(`[WEBHOOK] Shop deletion request: ${shop}`)
        // Handle shop data deletion - remove all shop data
        try {
          const supabaseServiceRole = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
          )
          
          // Remove shop installation data
          await supabaseServiceRole
            .from('cms_installs')
            .delete()
            .eq('provider', 'shopify')
            .eq('external_id', shop)
            
          console.log(`Deleted shop data for: ${shop}`)
        } catch (error) {
          console.error(`Failed to delete shop data for ${shop}:`, error)
        }
        break
        
      case 'app/uninstalled':
        console.log(`[WEBHOOK] App uninstalled from shop: ${shop}`)
        // Handle app uninstallation
        try {
          const supabaseServiceRole = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
          )
          
          await supabaseServiceRole
            .from('cms_installs')
            .delete()
            .eq('provider', 'shopify')
            .eq('external_id', shop)
            
          console.log(`Removed installation for uninstalled shop: ${shop}`)
        } catch (error) {
          console.error(`Failed to remove installation for ${shop}:`, error)
        }
        break
        
      default:
        console.log(`[WEBHOOK] Received webhook: ${topic} from ${shop}`)
    }

    // Always return 200 OK to acknowledge receipt
    return new Response('OK', { 
      status: 200, 
      headers: corsHeaders 
    })

  } catch (error) {
    console.error('Webhook processing error:', error)
    return new Response('Internal server error', { 
      status: 500, 
      headers: corsHeaders 
    })
  }
})