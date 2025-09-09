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

    // Always try to get user and brand settings if auth header exists
    if (authHeader) {
      console.log('Auth header found, attempting to authenticate user');
      try {
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
            console.log('Brand settings loaded:', brandSettings ? 'Yes' : 'No');
            if (brandSettings) {
              console.log('Brand details:', {
                name: brandSettings.brand_name,
                industry: brandSettings.industry,
                tone: brandSettings.tone_of_voice,
                hasDescription: !!brandSettings.description,
                hasTags: brandSettings.tags?.length > 0
              });
            }
          }
        } else {
          console.log('Authentication failed:', userError?.message || 'Unknown error');
        }
      } catch (authErr) {
        console.error('Auth attempt failed:', authErr);
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

    // Generate a comprehensive, brand-aligned blog article
    const brandName = brandSettings?.brand_name || 'our company';
    const industry = brandSettings?.industry || 'business';
    const audience = brandSettings?.target_audience || 'professionals';
    const tone = brandSettings?.tone_of_voice || 'professional';
    const description = brandSettings?.description || 'innovative solutions';
    const topics = brandSettings?.tags?.join(', ') || 'industry trends, best practices';
    const internalLinks = brandSettings?.internal_links?.join(', ') || '';

    let contextPrompt = `You are Claude Opus 4, the world's most advanced AI content strategist and copywriter. You're tasked with creating an exceptional, comprehensive blog article that positions ${brandName} as the definitive thought leader in ${industry}.

🎯 BRAND IDENTITY & VOICE (CRITICAL - Must be reflected throughout):
• Company: ${brandName}
• Industry: ${industry}
• Target Audience: ${audience}
• Brand Voice: ${tone}
• Brand Description: ${description}
• Core Focus Areas: ${topics}`;

    if (internalLinks) {
      contextPrompt += `
• Internal Link Opportunities: ${internalLinks}`;
    }

    contextPrompt += `

📝 CONTENT EXCELLENCE REQUIREMENTS:
• Length: 1000-1500 words of premium-quality content
• SEO Title: Under 60 characters, compelling, keyword-optimized
• Voice & Tone: Consistently ${tone} throughout, reflecting ${brandName}'s personality
• Expertise Level: Demonstrate deep ${industry} knowledge and authority
• Value Delivery: Every paragraph must provide genuine, actionable insights

🏗️ CONTENT STRUCTURE:
1. **Compelling H1 Title** (Include primary keyword, under 60 chars)
2. **Engaging Introduction** (250-300 words)
   - Hook with industry statistic or compelling question
   - Establish ${brandName}'s credibility
   - Preview article value
3. **4-6 Main Content Sections** (H2 headings)
   - Each 200-300 words
   - Start with data/statistics
   - Include actionable strategies
   - Use H3 subheadings for complex topics
4. **Expert Insights Section**
   - Real-world examples and case studies
   - Industry best practices
   - Professional tips
5. **Strong Conclusion** (200-250 words)
   - Summarize key takeaways
   - Reinforce ${brandName}'s expertise
   - Compelling call-to-action

🎨 FORMATTING & ENHANCEMENT:
• Rich markdown: **bold**, *italic*, > blockquotes, - lists
• Strategic keyword integration (8-12 keywords, 1-2% density)
• 4-5 internal link suggestions: [anchor text](internal-page-suggestion)
• 3-4 external references: [Source Name](https://example.com)
• 3-4 image suggestions: ![Professional alt text](detailed-image-description)
• Data-driven insights with specific statistics
• Compelling storytelling elements

🎯 BRAND ALIGNMENT CHECKLIST:
✅ Does this sound like ${brandName}?
✅ Is the ${tone} voice consistent throughout?
✅ Are we showcasing ${industry} expertise?
✅ Will ${audience} find this valuable?
✅ Does this reinforce our brand description: "${description}"?

OUTPUT FORMAT:
Title: [Your compelling SEO-optimized title here]

[Your exceptional article content with sophisticated formatting and strategic enhancements]

---
Keywords Used: [List 8-12 strategically integrated keywords]
Brand Alignment: [Brief note on how this serves ${audience} and reflects ${brandName}'s expertise]

Create content that doesn't just inform but positions ${brandName} as the go-to authority in ${industry}, driving engagement and establishing thought leadership.`;

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
          model: 'claude-opus-4-20250514',
          max_tokens: 8000,
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