import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, industry, region } = await req.json();
    
    console.log('Keyword research request:', { query, industry, region });

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not found');
    }

    // Call OpenAI API for keyword research
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an SEO expert with access to current search trends and keyword data. Provide comprehensive keyword research including realistic search volume estimates, keyword difficulty assessments, and strategic keyword recommendations. Always respond with valid JSON format.'
          },
          {
            role: 'user',
            content: `Perform detailed keyword research for "${query}" in the ${industry} industry${region ? ` targeting ${region}` : ''}. 

Provide:
1. Primary keywords (3-5 high-volume, relevant keywords)
2. Long-tail keywords (5-10 specific, lower competition phrases)
3. Related keywords (semantic keywords and variations)

Format as JSON:
{
  "primary_keywords": [
    {"keyword": "example", "volume": 10000, "difficulty": "high", "cpc": 2.50},
    {"keyword": "example two", "volume": 5000, "difficulty": "medium", "cpc": 1.80}
  ],
  "long_tail_keywords": [
    {"keyword": "how to example tutorial", "volume": 800, "difficulty": "low", "cpc": 1.20}
  ],
  "related_keywords": ["keyword1", "keyword2", "keyword3"],
  "search_intent": "informational|commercial|navigational|transactional",
  "content_opportunities": ["blog post ideas", "page types"]
}`
          }
        ],
        max_tokens: 2000,
        temperature: 0.3
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('OpenAI response:', data);

    let keywordData;
    try {
      // Try to parse JSON from the response
      const content = data.choices[0].message.content;
      // Remove any markdown formatting if present
      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
      keywordData = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse keyword data:', parseError);
      // Fallback: structure the response manually
      keywordData = {
        primary_keywords: [
          { keyword: query, volume: 1000, difficulty: "medium", cpc: 1.50 }
        ],
        long_tail_keywords: [
          { keyword: `${query} guide`, volume: 500, difficulty: "low", cpc: 1.20 },
          { keyword: `best ${query}`, volume: 800, difficulty: "medium", cpc: 1.80 },
          { keyword: `how to ${query}`, volume: 600, difficulty: "low", cpc: 1.10 }
        ],
        related_keywords: [`${query} tips`, `${query} strategies`, `${query} tools`],
        search_intent: "informational",
        content_opportunities: ["beginner guide", "comparison article", "tutorial content"]
      };
    }

    return new Response(JSON.stringify(keywordData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in keyword research function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      primary_keywords: [],
      long_tail_keywords: [],
      related_keywords: [],
      search_intent: "unknown",
      content_opportunities: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});