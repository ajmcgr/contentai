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

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not found');
    }

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

    // Generate content with GPT-5
    const keywordString = Array.isArray(keywords) ? keywords.join(', ') : keywords;
    
    let prompt = `Write a comprehensive, detailed ${userWordCount}-word article on "${topic}" for ${brandName} in the ${industry} industry. This is very important: the article MUST be approximately ${userWordCount} words - aim for this target precisely.

BRAND CONTEXT:
- Company: ${brandName}
- Industry: ${industry}
- Description: ${brandDescription}
- Target Audience: ${targetAudience}
- Tone: ${userTone}`;

    if (keywordString) {
      prompt += `
- Focus Keywords: ${keywordString}`;
    }

    if (brandSettings?.tags?.length > 0) {
      prompt += `
- Relevant Topics: ${brandSettings.tags.join(', ')}`;
    }

    prompt += `

Write the article specifically for this brand and audience. Make it unique and relevant to their business context.`;
    
    if (template) {
      prompt += ` Follow this structure: ${JSON.stringify(template.structure)}`;
    } else {
      prompt += ` Structure the article with:
1. Engaging introduction that hooks ${targetAudience} (200-300 words)
2. Well-organized main sections with subheadings (use H2 and H3 tags)
3. Detailed explanations with actionable insights and real-world examples relevant to ${industry}
4. Strong conclusion with key takeaways and call-to-action for ${brandName} (150-200 words)

Write in HTML format with proper heading tags (H1, H2, H3). Make it SEO-optimized, engaging, and informative. Include specific examples relevant to the ${industry} industry. Use a ${userTone} tone throughout. Remember: aim for exactly ${userWordCount} words.`;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        max_completion_tokens: 6000,
        messages: [
          {
            role: 'system',
            content: `You are an expert content writer and SEO specialist who creates high-quality, detailed articles for businesses. Always write in HTML format with proper heading tags. Focus on meeting the exact word count specified. Create unique, brand-specific content that resonates with the target audience and reflects the company's voice and industry expertise.`
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedContent = data.choices[0].message.content;

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