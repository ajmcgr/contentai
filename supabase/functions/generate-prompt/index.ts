import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { marked } from 'https://esm.sh/marked@14.1.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Convert markdown to proper HTML with enhanced formatting
async function convertMarkdownToHtml(markdown: string): Promise<string> {
  // Configure marked for rich HTML output
  marked.setOptions({
    breaks: true,
    gfm: true,
  });
  
  let html = await marked(markdown);
  
  // Enhance HTML for better WordPress/WYSIWYG compatibility
  html = html
    // Ensure proper paragraph tags
    .replace(/<p><\/p>/g, '<p>&nbsp;</p>')
    // Ensure proper line breaks
    .replace(/<br>/g, '<br />')
    // Add proper spacing after headings
    .replace(/(<\/h[1-6]>)/g, '$1\n')
    // Ensure proper list formatting
    .replace(/(<\/li>)/g, '$1\n')
    // Clean up extra whitespace
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();
    
  return html;
}

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
    const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY') || '';
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
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
    if (!perplexityApiKey) {
      console.warn('PERPLEXITY_API_KEY not set – external backlink discovery disabled');
    } else {
      console.log('Perplexity API key found');
    }

    // Generate a comprehensive, brand-aligned blog article
    const brandName = brandSettings?.brand_name || 'our company';
    const industry = brandSettings?.industry || 'business';
    const audience = brandSettings?.target_audience || 'professionals';
    const tone = brandSettings?.tone_of_voice || 'professional';
    const description = brandSettings?.description || 'innovative solutions';
    const topics = brandSettings?.tags?.join(', ') || 'industry trends, best practices';
    const internalLinks = brandSettings?.internal_links?.join(', ') || '';

    // Discover authoritative external URLs with Perplexity
    let relevantUrls: string[] = [];
    try {
      if (perplexityApiKey) {
        const query = `${topicHint || topics} ${industry} resources articles guides ${new Date().getUTCFullYear()}`.slice(0, 200);
        const pxRes = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${perplexityApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.1-sonar-small-128k-online',
            messages: [
              { role: 'system', content: 'Return only high-quality, relevant URLs—one per line. No commentary.' },
              { role: 'user', content: query }
            ],
            temperature: 0.2,
            max_tokens: 500,
            return_images: false,
            return_related_questions: false,
            search_recency_filter: 'month'
          }),
        });
        if (pxRes.ok) {
          const pxJson = await pxRes.json();
          const urlsText = pxJson?.choices?.[0]?.message?.content || '';
          relevantUrls = urlsText.split('\n').map((l: string) => l.trim()).filter((l: string) => /^https?:\/\//.test(l)).slice(0, 3);
        }
      }
    } catch (e) {
      console.warn('Perplexity URL discovery failed:', e);
    }

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

📝 CONTENT EXCELLENCE REQUIREMENTS:
- Length: 1000-1500 words of premium-quality content
- SEO Title: Under 60 characters, compelling, keyword-optimized
- Voice & Tone: Consistently ${tone} throughout, reflecting ${brandName}'s personality
- Expertise Level: Demonstrate deep ${industry} knowledge and authority
- Value Delivery: Every paragraph must provide genuine, actionable insights

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
- Rich markdown: **bold**, *italic*, > blockquotes, - lists
- Strategic keyword integration (8-12 keywords, 1-2% density)
- 4-5 internal link suggestions: [anchor text](internal-page-suggestion)
- 3-4 external references: [Source Name](https://example.com)
- 3-4 image suggestions: ![Professional alt text](detailed-image-description)
- Data-driven insights with specific statistics
- Compelling storytelling elements

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

    // Override with refined prompt enforcing real backlinks and no boilerplate
    contextPrompt = `You are a world-class content strategist. Generate a premium-quality 1200-1600 word article for ${brandName} in ${industry}.

BRAND:
- Name: ${brandName}
- Industry: ${industry}
- Audience: ${audience}
- Voice: ${tone}
- Focus: ${topics}

TOPIC: ${topicHint || 'Choose a high-value angle within the focus areas'}

REQUIREMENTS:
- Use rich markdown with H1 title, H2/H3 structure, lists, and quotes
- Include specific recent statistics with source attribution
- NO meta sections like 'Keywords Used' or 'Brand Alignment'
- NO placeholder text or example.com links
${relevantUrls.length > 0 ? `- Include 2-3 natural backlinks using ONLY these URLs: ${relevantUrls.join(', ')}. Use descriptive anchor text.` : '- If no relevant URLs available, do not add external links.'}

OUTPUT FORMAT:
Title: [Compelling SEO title under 60 chars]

[Body markdown starts here]
`;

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

      // Parse the generated content to extract title and content (robust)
      let extractedTitle = '';
      let extractedContent = generatedContent;

      // Normalize common sections like a leading "body:" label
      extractedContent = extractedContent.replace(/^\s*body:\s*/i, '');

      // Try explicit "Title:" format (case-insensitive)
      const t1 = generatedContent.match(/^\s*Title:\s*(.+)$/im);
      // Try Markdown H1 as title
      const t2 = generatedContent.match(/^\s*#\s+(.+)\s*$/m);

      extractedTitle = t1?.[1]?.trim() || t2?.[1]?.trim() || '';

      // If the extracted title looks generic, prefer the H1 heading
      const isGeneric = /ai[-\s]?generated article (idea|title)/i.test(extractedTitle || '');
      if ((!extractedTitle || isGeneric) && t2?.[1]) {
        extractedTitle = t2[1].trim();
      }

      // Remove title line ("Title:" or first H1) from content
      extractedContent = extractedContent
        .replace(/^\s*Title:\s*.+\n?/im, '')
        .replace(/^\s*#\s+.+\n?/, '')
        .trim();

      // Clean and enhance content (remove boilerplate, ensure backlinks, add image)
      const removeSection = (source: string, heading: string) => {
        const regex = new RegExp(`(^|\n)#{1,6}\\s*${heading}[\\s\\S]*?(?=\n#{1,6}\\s|$)`, 'gi');
        return source.replace(regex, '\n');
      };

      let clean = content;
      clean = removeSection(clean, 'Keywords Used');
      clean = removeSection(clean, 'Brand Alignment');
      clean = clean.replace(/.*This article demonstrates[^\n]*\n?/gi, '');
      clean = clean.replace(/.*positions our company as[^\n]*\n?/gi, '');

      try {
        const linkMatches = clean.match(/\[[^\]]+\]\(https?:\/\/[^)]+\)/g) || [];
        if (relevantUrls.length > 0 && linkMatches.length < 2) {
          const linksToAdd = relevantUrls.slice(0, 3);
          const list = linksToAdd.map((u) => `- [${u.replace(/^https?:\/\//, '').split('/')[0]}](${u})`).join("\n");
          clean += `\n\n## Further reading\n${list}\n`;
        }
      } catch (_) {}

      let finalContent = clean;
      try {
        if (openAIApiKey && supabaseUrl && serviceRoleKey) {
          const imagePrompt = `A professional, high-quality image representing: ${title}. Style: ${industry} related, clean, modern, suitable for business content.`;
          const imageResponse = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${openAIApiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'gpt-image-1', prompt: imagePrompt, n: 1, size: '1024x1024', quality: 'high', response_format: 'b64_json' })
          });
          if (imageResponse.ok) {
            const imageData = await imageResponse.json();
            const b64 = imageData?.data?.[0]?.b64_json as string | undefined;
            if (b64) {
              const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
              const fileName = `editor-generated/${user?.id || 'anonymous'}/${Date.now()}.png`;
              const admin = createClient(supabaseUrl, serviceRoleKey);
              const { error: uploadError } = await admin.storage
                .from('generated-images')
                .upload(fileName, bytes, { contentType: 'image/png', upsert: false });
              if (!uploadError) {
                const { data: publicUrlData } = admin.storage.from('generated-images').getPublicUrl(fileName);
                const imageUrl = publicUrlData.publicUrl;
                finalContent = `![${title} — featured image](${imageUrl})\n\n${clean}`;
              }
            }
          }
        }
      } catch (err) {
        console.warn('Image generation failed:', err);
      }

      // Convert markdown to HTML for proper WYSIWYG display
      const htmlContent = await convertMarkdownToHtml(finalContent);
      
      return new Response(JSON.stringify({
        success: true,
        title,
        content: htmlContent,
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

          // Parse title/content robustly
          let extractedTitle = '';
          let extractedContent = oaText.replace(/^\s*body:\s*/i, '');

          const t1 = oaText.match(/^\s*Title:\s*(.+)$/im);
          const t2 = oaText.match(/^\s*#\s+(.+)\s*$/m);

          extractedTitle = t1?.[1]?.trim() || t2?.[1]?.trim() || '';
          const isGeneric = /ai[-\s]?generated article (idea|title)/i.test(extractedTitle || '');
          if ((!extractedTitle || isGeneric) && t2?.[1]) {
            extractedTitle = t2[1].trim();
          }

          const title = extractedTitle || "New Article";
          const content = extractedContent
            .replace(/^\s*Title:\s*.+\n?/im, '')
            .replace(/^\s*#\s+.+\n?/, '')
            .trim();

          // Clean and enhance content in OpenAI fallback
          const removeSection = (source: string, heading: string) => {
            const regex = new RegExp(`(^|\n)#{1,6}\\s*${heading}[\\s\\S]*?(?=\n#{1,6}\\s|$)`, 'gi');
            return source.replace(regex, '\n');
          };
          let clean = content;
          clean = removeSection(clean, 'Keywords Used');
          clean = removeSection(clean, 'Brand Alignment');
          clean = clean.replace(/.*This article demonstrates[^\n]*\n?/gi, '');
          clean = clean.replace(/.*positions our company as[^\n]*\n?/gi, '');
          try {
            const linkMatches = clean.match(/\[[^\]]+\]\(https?:\/\/[^)]+\)/g) || [];
            if (relevantUrls.length > 0 && linkMatches.length < 2) {
              const linksToAdd = relevantUrls.slice(0, 3);
              const list = linksToAdd.map((u) => `- [${u.replace(/^https?:\/\//, '').split('/')[0]}](${u})`).join("\n");
              clean += `\n\n## Further reading\n${list}\n`;
            }
          } catch (_) {}

          let finalContent = clean;
          try {
            if (openAIApiKey && supabaseUrl && serviceRoleKey) {
              const imagePrompt = `A professional, high-quality image representing: ${title}. Style: ${industry} related, clean, modern, suitable for business content.`;
              const imageResponse = await fetch('https://api.openai.com/v1/images/generations', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${openAIApiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: 'gpt-image-1', prompt: imagePrompt, n: 1, size: '1024x1024', quality: 'high', response_format: 'b64_json' })
              });
              if (imageResponse.ok) {
                const imageData = await imageResponse.json();
                const b64 = imageData?.data?.[0]?.b64_json as string | undefined;
                if (b64) {
                  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
                  const fileName = `editor-generated/${user?.id || 'anonymous'}/${Date.now()}.png`;
                  const admin = createClient(supabaseUrl, serviceRoleKey);
                  const { error: uploadError } = await admin.storage
                    .from('generated-images')
                    .upload(fileName, bytes, { contentType: 'image/png', upsert: false });
                  if (!uploadError) {
                    const { data: publicUrlData } = admin.storage.from('generated-images').getPublicUrl(fileName);
                    const imageUrl = publicUrlData.publicUrl;
                    finalContent = `![${title} — featured image](${imageUrl})\n\n${clean}`;
                  }
                }
              }
            }
          } catch (err) {
            console.warn('Image generation failed (fallback path):', err);
          }

          console.log('OpenAI fallback succeeded');
          
          // Convert markdown to HTML for OpenAI fallback
          const htmlContent = await convertMarkdownToHtml(finalContent);
          
          return new Response(JSON.stringify({
            success: true,
            title,
            content: htmlContent,
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

      // Convert markdown to HTML for fallback
      const htmlFallbackContent = await convertMarkdownToHtml(fallbackBody);
      
      return new Response(JSON.stringify({
        success: true,
        title: fallbackTitle,
        content: htmlFallbackContent,
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