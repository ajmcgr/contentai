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

    // Optional request body for topic hints and uniqueness seed
    let body: any = {};
    try {
      body = await req.json();
    } catch (_) {
      body = {};
    }
    const topicHint = typeof body?.topicHint === 'string' ? body.topicHint.slice(0, 200) : '';
    const avoidPhrases = typeof body?.avoidPhrases === 'string' ? body.avoidPhrases.slice(0, 300) : '';
    const seed = Number.isFinite(body?.seed) ? body.seed : Math.floor(Math.random() * 1_000_000);

    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!anthropicApiKey) {
      console.warn('ANTHROPIC_API_KEY not set – Anthropic primary disabled');
    } else {
      console.log('Anthropic API key found');
    }
    if (!openAIApiKey) {
      console.warn('OPENAI_API_KEY not set – OpenAI fallback disabled');
    } else {
      console.log('OpenAI API key found (fallback enabled)');
    }
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
    if (topicHint) {
      contextPrompt += `
• Primary Topic Focus: ${topicHint}`;
    }

    contextPrompt += `

🔀 Novelty directive: Use seed ${seed} to choose a fresh, specific angle. Do not repeat phrasing from: ${avoidPhrases || 'N/A'}.

📝 CONTENT EXCELLENCE REQUIREMENTS:`
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
      console.error('AI generation failed on Anthropic, attempting OpenAI fallback:', aiError);
      const brandName = brandSettings?.brand_name || 'your brand';
      const tone = brandSettings?.tone_of_voice || 'professional';
      const industry = brandSettings?.industry || 'your industry';

      // Try OpenAI fallback if configured
      try {
        const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
        if (openAIApiKey) {
          console.log('Calling OpenAI Chat Completions fallback...');
          const oaRes = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openAIApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              max_tokens: 1800,
              temperature: 0.95,
              messages: [
                { role: 'system', content: 'You are a world-class content strategist and copywriter. Follow instructions precisely and return high-quality markdown with genuinely novel angles.' },
                { role: 'user', content: contextPrompt }
              ],
            }),
          });

          console.log('OpenAI response status:', oaRes.status);
          if (!oaRes.ok) {
            const errTxt = await oaRes.text();
            console.error('OpenAI error response:', errTxt);
            throw new Error(`OpenAI API error: ${oaRes.status} - ${errTxt}`);
          }

          const oaData = await oaRes.json();
          const oaText = oaData?.choices?.[0]?.message?.content ?? '';
          const titleMatch = oaText.match(/Title:\s*(.+)/i);
          const title = titleMatch ? titleMatch[1].trim() : "AI-Generated Article Idea";
          const content = oaText.replace(/Title:\s*.+\n?/i, '').trim();

          console.log('OpenAI fallback succeeded');
          return new Response(JSON.stringify({
            success: true,
            title,
            content,
            fullResponse: oaText,
            brandBased: !!brandSettings,
            provider: 'openai'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } else {
          console.warn('OPENAI_API_KEY not available; skipping OpenAI fallback');
        }
      } catch (openAiErr) {
        console.error('OpenAI fallback failed:', openAiErr);
      }

      // Final graceful fallback with variation so it doesn't repeat
      const intros = [
        `In today's competitive ${industry} landscape, ${brandName} teams need proven, ${tone} strategies that drive measurable outcomes.`,
        `The ${industry} space is evolving fast. ${brandName} can win by applying ${tone} playbooks that compound over time.`,
        `Sustainable growth in ${industry} comes from disciplined execution. Here are ${tone} strategies that work.`,
      ];
      const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
      const n = 4 + Math.floor(Math.random() * 3);
      const fallbackTitle = `${n} ${tone.charAt(0).toUpperCase() + tone.slice(1)} Strategies to Elevate Your ${industry} Results`;
      const extra5 = n > 4 ? `\n\n## 5. Level Up Distribution\n- Choose two channels and go deep\n- Collaborate with adjacent brands\n- Track contribution to pipeline, not just clicks\n` : '';
      const extra6 = n > 5 ? `\n## 6. Invest in Platform Foundations\n- Clean data, clear taxonomy, consistent tracking\n- Document systems to reduce single points of failure\n- Monitor leading indicators, not lagging ones\n` : '';

      const fallbackBody = `## Introduction\n\n${pick(intros)}\n\n## 1. Clarify Outcomes, Then Work Backwards\n- Define one north-star metric\n- Align initiatives to measurable outcomes\n- Review weekly and prune distractions\n\n## 2. Make Customer Insights a Habit\n- Run 5-10 interviews per month\n- Instrument key journeys and remove friction\n- Turn insights into small, shippable experiments\n\n## 3. Operationalize Content That Converts\n- Build topic clusters around revenue keywords\n- Repurpose top posts across formats\n- Refresh and internally link quarterly\n\n## 4. Compound Through Enablement\n- Create repeatable playbooks\n- Standardize templates and QA checklists\n- Automate handoffs to reduce cycle time\n${extra5}${extra6}## Conclusion\n\nAdopt one strategy this week, measure impact, and iterate. Consistency beats intensity for ${industry} teams.\n\n**Keywords used:** ${industry} strategy, ${industry} growth, customer insights, content operations, enablement, distribution${n>4?', platform foundations':''}`;

      return new Response(JSON.stringify({
        success: true,
        title: fallbackTitle,
        content: fallbackBody,
        fullResponse: `Title: ${fallbackTitle}\n\n${fallbackBody}`,
        brandBased: !!brandSettings,
        fallback: true,
        provider: 'fallback'
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