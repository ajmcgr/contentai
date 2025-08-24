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

    console.log('Generating AI prompt for user:', user.id);

    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicApiKey) {
      throw new Error('Anthropic API key not found');
    }

    // Fetch user's brand settings
    const { data: brandSettings } = await supabaseClient
      .from('brand_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Generate a personalized prompt based on brand settings
    let contextPrompt = 'You are a professional content strategist. ';
    
    if (brandSettings) {
      contextPrompt += `Generate a compelling blog article idea for ${brandSettings.brand_name || 'this company'}`;
      
      if (brandSettings.industry) {
        contextPrompt += ` in the ${brandSettings.industry} industry`;
      }
      
      if (brandSettings.target_audience) {
        contextPrompt += `. The target audience is: ${brandSettings.target_audience}`;
      }
      
      if (brandSettings.description) {
        contextPrompt += `. Company description: ${brandSettings.description}`;
      }
      
      contextPrompt += `. Use a ${brandSettings.tone_of_voice || 'professional'} tone.`;
      
      if (brandSettings.tags && brandSettings.tags.length > 0) {
        contextPrompt += ` Consider these relevant topics: ${brandSettings.tags.join(', ')}.`;
      }
    } else {
      contextPrompt += `Generate a compelling blog article idea. Since no brand information is available, create a general business-focused topic.`;
    }

    contextPrompt += `

Generate the following:
1. An engaging, SEO-optimized title (under 60 characters)
2. A brief article outline with 3-4 main sections
3. Target keywords to focus on
4. A suggested introduction paragraph

Make it actionable, engaging, and valuable for the target audience.

Respond in this format:
Title: [Your title here]

Outline:
1. [Section 1]
2. [Section 2]  
3. [Section 3]
4. [Section 4]

Keywords: [keyword1, keyword2, keyword3]

Introduction:
[Write a compelling introduction paragraph here]`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${anthropicApiKey}`,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: contextPrompt
          }
        ]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Anthropic API error:', errorText);
      throw new Error(`Anthropic API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const generatedContent = data.content[0].text;

    console.log('Personalized AI prompt generated successfully');

    // Parse the generated content to extract title and content
    const titleMatch = generatedContent.match(/Title:\s*(.+)/i);
    const title = titleMatch ? titleMatch[1].trim() : "AI-Generated Article Idea";
    
    // Remove the title from content and clean it up
    const content = generatedContent
      .replace(/Title:\s*.+\n?/i, '')
      .trim();

    return new Response(JSON.stringify({
      success: true,
      title,
      content,
      fullResponse: generatedContent,
      brandBased: !!brandSettings
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-prompt function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});