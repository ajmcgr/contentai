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
      tone = 'professional', 
      wordCount = 1000, 
      template_id,
      includeImages = false 
    } = await req.json();

    console.log('Content generation request:', { topic, keywords, tone, wordCount, template_id });

    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicApiKey) {
      throw new Error('Anthropic API key not found');
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

    // Generate content with Claude
    const keywordString = Array.isArray(keywords) ? keywords.join(', ') : keywords;
    
    let prompt = `Write a comprehensive ${wordCount}-word article on "${topic}"`;
    if (keywordString) {
      prompt += ` focusing on these keywords: ${keywordString}`;
    }
    prompt += `. The tone should be ${tone}.`;
    
    if (template) {
      prompt += ` Follow this structure: ${JSON.stringify(template.structure)}`;
    } else {
      prompt += ` Structure the article with:
1. Engaging introduction
2. Well-organized main sections with subheadings
3. Actionable insights and examples
4. Strong conclusion with key takeaways

Include proper H1, H2, and H3 headings. Make it SEO-optimized and engaging for readers.`;
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${anthropicApiKey}`,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
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
    const generatedContent = data.content[0].text;

    // Extract title from content or generate one
    const titleMatch = generatedContent.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : `${topic} - Complete Guide`;

    // Generate meta description
    const metaDescription = generatedContent
      .replace(/#+\s/g, '')
      .substring(0, 160)
      .replace(/\n/g, ' ')
      .trim() + '...';

    // Calculate word count
    const wordCountActual = generatedContent.split(/\s+/).length;

    // Generate slug
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Save article to database
    const { data: article, error: articleError } = await supabaseClient
      .from('articles')
      .insert({
        user_id: user.id,
        title,
        content: generatedContent,
        meta_description: metaDescription,
        keywords: Array.isArray(keywords) ? keywords : [keywords],
        target_keyword: Array.isArray(keywords) ? keywords[0] : keywords,
        word_count: wordCountActual,
        slug: slug,
        status: 'draft'
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