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
    console.log('Generate-prompt function invoked');
    
    const authHeader = req.headers.get('Authorization');
    let user = null;
    let brandSettings = null;

    // Try to get user if auth header exists
    if (authHeader) {
      console.log('Auth header found, attempting to authenticate user');
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: userData, error: userError } = await supabaseClient.auth.getUser();
      
      if (!userError && userData?.user) {
        user = userData.user;
        console.log('User authenticated successfully:', user.id);
        
        // Fetch user's brand settings if authenticated
        const { data: settings, error: brandError } = await supabaseClient
          .from('brand_settings')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (brandError) {
          console.error('Error fetching brand settings:', brandError);
        } else {
          brandSettings = settings;
          console.log('Brand settings loaded:', !!brandSettings);
        }
      } else {
        console.log('Authentication failed, proceeding with generic prompt');
      }
    } else {
      console.log('No auth header, proceeding with generic prompt');
    }

    console.log('Generating AI prompt for user:', user?.id || 'anonymous');

    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicApiKey) {
      console.warn('ANTHROPIC_API_KEY not set – will return graceful fallback');
    } else {
      console.log('Anthropic API key found');
    }

    // Generate a full blog article based on brand settings
    let contextPrompt = 'You are an expert content writer and SEO specialist. ';
    
    const brandName = brandSettings?.brand_name || 'our company';
    const industry = brandSettings?.industry || 'business';
    const audience = brandSettings?.target_audience || 'professionals';
    const tone = brandSettings?.tone_of_voice || 'professional';
    const description = brandSettings?.description || 'innovative solutions';
    const topics = brandSettings?.tags?.join(', ') || 'industry trends, best practices';

    contextPrompt += `Write a complete, high-quality blog article for ${brandName} in the ${industry} industry.

TARGET AUDIENCE: ${audience}
TONE: ${tone}
COMPANY DESCRIPTION: ${description}
RELEVANT TOPICS: ${topics}

REQUIREMENTS:
- Write a complete article of 800-1200 words
- Include an SEO-optimized title (under 60 characters)
- Add 5-8 relevant keywords naturally throughout
- Include 3-4 internal link suggestions [use format: [anchor text](internal-link-suggestion)]
- Add 2-3 external link references [use format: [source name](https://example.com)]
- Suggest 2-3 relevant images with descriptions [use format: ![Alt text](image-description)]
- Use proper markdown formatting with headers (##, ###)
- Include actionable tips and insights
- Add a compelling conclusion with call-to-action

FORMAT:
Title: [SEO-optimized title]

[Full article content with proper markdown formatting, keywords, links, and image suggestions]

Keywords used: [list the 5-8 keywords you naturally incorporated]`;

    try {
      console.log('Making request to Anthropic API...');
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${anthropicApiKey}`,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 4000,
          messages: [
            {
              role: 'user',
              content: contextPrompt
            }
          ]
        }),
      });

      console.log('Anthropic API response status:', response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Anthropic API error response:', errorText);
        throw new Error(`Anthropic API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const generatedContent = data.content?.[0]?.text || '';

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
    } catch (aiError) {
      console.error('AI generation failed, returning graceful fallback:', aiError);
      const brandName = brandSettings?.brand_name || 'your brand';
      const tone = brandSettings?.tone_of_voice || 'professional';
      const industry = brandSettings?.industry || 'your industry';

      const fallbackTitle = `5 Proven Strategies to Transform Your ${industry} Business`;
      const fallbackBody = `## Introduction

In today's competitive ${industry} landscape, businesses need more than just good intentions to succeed. They need proven strategies that deliver measurable results.

## 1. Optimize Your Customer Experience

Focus on understanding your customers' pain points and addressing them systematically. Research shows that companies prioritizing customer experience see 60% higher profits.

**Action Steps:**
- Conduct regular customer feedback surveys
- Map your customer journey
- Implement feedback loops

[Learn more about customer experience optimization](customer-experience-guide)

## 2. Leverage Data-Driven Decision Making

Use analytics to guide your business decisions rather than relying on gut feelings alone.

**Key Metrics to Track:**
- Customer acquisition cost
- Lifetime value
- Conversion rates
- Customer satisfaction scores

![Analytics Dashboard](business-analytics-dashboard)

## 3. Invest in Team Development

Your team is your greatest asset. Companies that invest in employee development see 11% greater profitability.

## 4. Embrace Digital Transformation

Stay competitive by adopting new technologies and processes that streamline operations.

[Read about digital transformation trends](https://example.com/digital-trends)

## 5. Build Strategic Partnerships

Collaborate with complementary businesses to expand your reach and capabilities.

![Partnership Network](business-partnerships-diagram)

## Conclusion

Implementing these five strategies can significantly impact your ${industry} business growth. Start with one area and gradually expand your efforts.

**Keywords used: ${industry} business, customer experience, data-driven decisions, digital transformation, strategic partnerships, business growth**`;

      return new Response(JSON.stringify({
        success: true,
        title: fallbackTitle,
        content: fallbackBody,
        fullResponse: `Title: ${fallbackTitle}\n\n${fallbackBody}`,
        brandBased: !!brandSettings,
        fallback: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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