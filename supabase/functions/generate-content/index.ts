import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { marked } from 'https://esm.sh/marked@14.1.3';

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

    const { 
      topic, 
      keywords, 
      tone, // Will use user settings if not provided
      wordCount, // Will use user settings if not provided
      template_id,
      includeImages = false 
    } = await req.json();

    // Get user's brand settings and content preferences
    const { data: brandSettings } = await supabaseClient
      .from('brand_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    // Get user's content settings from content_templates
    const { data: contentSettings } = await supabaseClient
      .from('content_templates')
      .select('structure')
      .eq('user_id', user.id)
      .eq('template_type', 'content_settings')
      .eq('name', 'default')
      .maybeSingle();

    // Use user preferences or fallback to defaults
    const userTone = tone || contentSettings?.structure?.tone || brandSettings?.tone_of_voice || 'professional';
    const userWordCount = wordCount || contentSettings?.structure?.wordCount || 1000;
    const targetAudience = brandSettings?.target_audience || 'professionals';
    const brandName = brandSettings?.brand_name || 'our company';
    const industry = brandSettings?.industry || 'business';
    const brandDescription = brandSettings?.description || 'innovative solutions';

    console.log('Content generation request:', { topic, keywords, tone, wordCount, template_id });

    // Create generation job
    const { data: job, error: jobError } = await supabaseClient
      .from('generation_jobs')
      .insert({
        user_id: user.id,
        job_type: 'article',
        status: 'processing',
        input_data: { topic, keywords, tone, wordCount, template_id }
      })
      .select()
      .single();

    if (jobError) {
      throw new Error(`Failed to create job: ${jobError.message}`);
    }

    // Get template if specified
    let template = null;
    if (template_id) {
      const { data: templateData } = await supabaseClient
        .from('content_templates')
        .select('*')
        .eq('id', template_id)
        .single();
      template = templateData;
    }

    // Generate premium content with Claude Opus 4 - the most capable model
    const keywordString = Array.isArray(keywords) ? keywords.join(', ') : keywords;
    
    let prompt = `You are an elite content strategist and master copywriter creating premium-quality content for ${brandName}. This will be a comprehensive, expertly-crafted ${userWordCount}-word article that positions ${brandName} as the definitive authority in ${industry}.

BRAND IDENTITY (CRITICAL - Must be reflected throughout):
🏢 Company: ${brandName}
🎯 Industry: ${industry} 
📝 Brand Description: ${brandDescription}
👥 Target Audience: ${targetAudience}
🗣️ Brand Voice & Tone: ${userTone}
📰 Article Topic: "${topic}"`;

    if (keywordString) {
      prompt += `
🔍 Priority SEO Keywords: ${keywordString}`;
    }

    if (brandSettings?.tags?.length > 0) {
      prompt += `
🎨 Brand Focus Areas: ${brandSettings.tags.join(', ')}`;
    }

    if (brandSettings?.internal_links?.length > 0) {
      prompt += `
🔗 Internal Link Opportunities: ${brandSettings.internal_links.join(', ')}`;
    }

    prompt += `

CONTENT EXCELLENCE STANDARDS:
✅ EXACTLY ${userWordCount} words (verify final count)
✅ HTML format with semantic structure (H1, H2, H3, H4)
✅ Demonstrate deep ${industry} expertise and thought leadership
✅ Include 3-5 data-driven insights with specific statistics
✅ Provide 5-7 actionable strategies readers can implement immediately
✅ Naturally weave SEO keywords throughout (density: 1-2%)
✅ Maintain consistent ${userTone} voice that reflects ${brandName}'s personality
✅ Include real-world examples and case studies from ${industry}
✅ Add expert tips and industry best practices
✅ Strong, compelling call-to-action that drives ${brandName} engagement

PREMIUM ARTICLE STRUCTURE:`;
    
    if (template) {
      prompt += ` Follow this exact structure: ${JSON.stringify(template.structure)}`;
    } else {
      prompt += `

1. 📍 COMPELLING H1 TITLE
   - Include primary keyword naturally
   - Promise clear value to ${targetAudience}
   - Under 60 characters for SEO

2. 🎯 POWERFUL INTRODUCTION (250-300 words)
   - Hook with industry statistic or compelling question
   - Establish ${brandName}'s authority and credibility
   - Preview the value readers will gain
   - Include primary keyword in first paragraph

3. 💡 MAIN CONTENT SECTIONS (4-6 H2 sections)
   - Each section: 200-300 words
   - Start each with data/statistic
   - Include actionable strategies
   - Use H3 subheadings for complex topics
   - Integrate keywords naturally

4. 🏆 EXPERT INSIGHTS & CASE STUDIES
   - Include 2-3 real-world examples
   - Add industry-specific best practices
   - Quote relevant statistics and research

5. 📈 STRONG CONCLUSION (200-250 words)
   - Summarize key takeaways
   - Reinforce ${brandName}'s expertise
   - Clear, compelling call-to-action
   - Encourage engagement (contact, consultation, etc.)

OUTPUT REQUIREMENTS:
🔧 Pure HTML with semantic structure (start with <h1>)
🎨 Rich formatting: bold, italic, lists, blockquotes
📊 Include specific metrics and data points
🔗 Suggest internal link opportunities where relevant
💬 Write in authentic ${userTone} voice throughout

QUALITY CHECK: This article should position ${brandName} as the go-to expert in ${industry}, providing immense value to ${targetAudience} while subtly showcasing ${brandName}'s solutions and expertise.`;
    }

    // Use Claude 4 for superior content quality
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicApiKey) {
      throw new Error('Anthropic API key not found');
    }

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
            content: prompt
          }
        ]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Anthropic API error:', errorText);
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedContent = data.content?.[0]?.text || '';

    // Extract title from content or generate one
    const titleMatch = generatedContent.match(/<h1[^>]*>(.+?)<\/h1>/i) || generatedContent.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '') : `${topic} - Complete Guide`;

    // Generate meta description
    const metaDescription = generatedContent
      .replace(/#+\s/g, '')
      .substring(0, 160)
      .replace(/\n/g, ' ')
      .trim() + '...';

    // Calculate word count
    const wordCountActual = generatedContent.replace(/<[^>]*>/g, '').split(/\s+/).filter(word => word.length > 0).length;

    // Generate slug
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Generate featured image if includeImages is true
    let featuredImageUrl = null;
    if (includeImages) {
      try {
        const imageResponse = await supabaseClient.functions.invoke('generate-images', {
          body: { 
            prompt: `Professional image representing: ${topic}`,
            style: 'photorealistic',
            size: '1024x1024',
            quantity: 1
          }
        });
        
        if (imageResponse.data?.success && imageResponse.data.images?.length > 0) {
          featuredImageUrl = imageResponse.data.images[0].url;
        }
      } catch (imageError) {
        console.warn('Failed to generate featured image:', imageError);
      }
    }

    // Save article to database
    const { data: article, error: articleError } = await supabaseClient
      .from('articles')
      .insert({
        user_id: user.id,
        title,
        content: generatedContent, // Already in HTML format
        meta_description: metaDescription,
        keywords: Array.isArray(keywords) ? keywords : [keywords],
        target_keyword: Array.isArray(keywords) ? keywords[0] : keywords,
        word_count: wordCountActual,
        slug: slug,
        status: 'draft',
        featured_image_url: featuredImageUrl
      })
      .select()
      .single();

    if (articleError) {
      throw new Error(`Failed to save article: ${articleError.message}`);
    }

    // Update job status
    await supabaseClient
      .from('generation_jobs')
      .update({
        status: 'completed',
        output_data: { article_id: article.id },
        progress: 100,
        completed_at: new Date().toISOString()
      })
      .eq('id', job.id);

    console.log('Content generation completed successfully');

    return new Response(JSON.stringify({
      success: true,
      article,
      job_id: job.id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-content function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});