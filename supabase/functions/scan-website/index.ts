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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { 
        auth: { 
          persistSession: false,
          autoRefreshToken: false 
        }
      }
    );

    // Extract JWT token from Bearer header
    const token = authHeader.replace('Bearer ', '');
    
    // Verify and get user from JWT
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      console.error('Auth error:', authError);
      throw new Error('Authentication failed');
    }

    const { url } = await req.json();
    if (!url) {
      throw new Error('URL is required');
    }

    console.log('Scanning website:', url);

    // Fetch the website content
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ContentAI Bot)'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch website: ${response.status}`);
    }

    const html = await response.text();

    // Extract basic information from HTML
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const descriptionMatch = html.match(/<meta[^>]*name=["\']description["\'][^>]*content=["\']([^"']+)["\'][^>]*>/i);
    const keywordsMatch = html.match(/<meta[^>]*name=["\']keywords["\'][^>]*content=["\']([^"']+)["\'][^>]*>/i);
    
    // Extract headings for content analysis
    const h1Matches = html.match(/<h1[^>]*>([^<]+)<\/h1>/gi);
    const h2Matches = html.match(/<h2[^>]*>([^<]+)<\/h2>/gi);

    // Use Claude to analyze the content and extract brand information
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicApiKey) {
      throw new Error('Anthropic API key not found');
    }

    const analysisPrompt = `Analyze this website content and extract brand information:

Website URL: ${url}
Title: ${titleMatch ? titleMatch[1] : 'Not found'}
Meta Description: ${descriptionMatch ? descriptionMatch[1] : 'Not found'}
Keywords: ${keywordsMatch ? keywordsMatch[1] : 'Not found'}
Main Headings: ${h1Matches ? h1Matches.join(', ') : 'Not found'}
Sub Headings: ${h2Matches ? h2Matches.slice(0, 5).join(', ') : 'Not found'}

Please extract and return the following information in JSON format:
{
  "brand_name": "Company/Brand name",
  "description": "Brief description of what the company does",
  "industry": "Industry sector",
  "target_audience": "Who their target customers are",
  "tone_of_voice": "Professional tone (e.g., professional, friendly, casual, authoritative)",
  "tags": ["relevant", "industry", "keywords"]
}

Be concise and accurate. If information isn't clearly available, use your best judgment based on the content provided.`;

    const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${anthropicApiKey}`,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: analysisPrompt
          }
        ]
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Anthropic API error:', errorText);
      throw new Error(`AI analysis failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const analysisResult = aiData.content[0].text;

    // Parse the JSON response from Claude
    let brandInfo;
    try {
      // Extract JSON from the response if it's wrapped in markdown
      const jsonMatch = analysisResult.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : analysisResult;
      brandInfo = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Fallback to extracted basic info
      brandInfo = {
        brand_name: titleMatch ? titleMatch[1].replace(/\s*[-|]\s*.*$/, '') : url.replace(/https?:\/\//, '').replace(/www\./, ''),
        description: descriptionMatch ? descriptionMatch[1] : '',
        industry: '',
        target_audience: '',
        tone_of_voice: 'professional',
        tags: keywordsMatch ? keywordsMatch[1].split(',').map(k => k.trim()) : []
      };
    }

    // Save or update brand settings in database
    const brandData = {
      user_id: user.id,
      brand_name: brandInfo.brand_name || '',
      description: brandInfo.description || '',
      industry: brandInfo.industry || '',
      target_audience: brandInfo.target_audience || '',
      tone_of_voice: brandInfo.tone_of_voice || 'professional',
      website_url: url,
      language: 'en-US',
      tags: Array.isArray(brandInfo.tags) ? brandInfo.tags : []
    };

    // Check if brand settings already exist
    const { data: existing } = await supabaseClient
      .from('brand_settings')
      .select('id')
      .eq('user_id', user.id)
      .single();

    let result;
    if (existing) {
      // Update existing settings
      const { data, error } = await supabaseClient
        .from('brand_settings')
        .update(brandData)
        .eq('user_id', user.id)
        .select()
        .single();
      
      if (error) throw error;
      result = data;
    } else {
      // Create new settings
      const { data, error } = await supabaseClient
        .from('brand_settings')
        .insert(brandData)
        .select()
        .single();
      
      if (error) throw error;
      result = data;
    }

    console.log('Brand settings saved successfully');

    return new Response(JSON.stringify({
      success: true,
      brand_settings: result,
      extracted_info: brandInfo
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in scan-website function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});