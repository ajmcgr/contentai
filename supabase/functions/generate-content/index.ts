import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

// Helper functions for the blog generation pipeline

// Helper functions for the blog generation pipeline
async function fetchUnsplashImages(query: string, count = 3): Promise<{url: string, alt: string}[]> {
  const unsplashKey = Deno.env.get('UNSPLASH_ACCESS_KEY');
  if (!unsplashKey) {
    console.warn('Unsplash API key not configured');
    return [];
  }

  try {
    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&orientation=landscape&per_page=${count}`,
      {
        headers: {
          'Authorization': `Client-ID ${unsplashKey}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Unsplash API error: ${response.status}`);
    }

    const data = await response.json();
    return data.results.map((photo: any) => ({
      url: photo.urls.regular,
      alt: photo.alt_description || photo.description || `Image related to ${query}`
    }));
  } catch (error) {
    console.error('Unsplash fetch failed:', error);
    return [];
  }
}

async function getRelatedPostsByEmbedding(supabase: any, topic: string, k: number): Promise<any[]> {
  // Placeholder for vector similarity search when available
  return [];
}

async function getRelatedPostsByTagsAndKeywords(supabase: any, userId: string, topic: string, keywords: string[], k: number): Promise<any[]> {
  try {
    const { data: articles } = await supabase
      .from('articles')
      .select('id, title, slug, keywords, meta_description')
      .eq('user_id', userId)
      .limit(20);

    if (!articles || articles.length === 0) return [];

    // Score articles based on keyword and topic overlap
    const scored = articles.map((article: any) => {
      let score = 0;
      const articleKeywords = article.keywords || [];
      
      // Check keyword overlap
      keywords.forEach(keyword => {
        if (articleKeywords.some((ak: string) => ak.toLowerCase().includes(keyword.toLowerCase()))) {
          score += 3;
        }
        if (article.title.toLowerCase().includes(keyword.toLowerCase())) {
          score += 2;
        }
        if (article.meta_description?.toLowerCase().includes(keyword.toLowerCase())) {
          score += 1;
        }
      });

      // Check topic overlap in title
      const topicWords = topic.toLowerCase().split(' ').filter(word => word.length > 3);
      topicWords.forEach(word => {
        if (article.title.toLowerCase().includes(word)) {
          score += 1;
        }
      });

      return { ...article, score };
    })
    .filter(article => article.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);

    return scored;
  } catch (error) {
    console.error('Error fetching related posts:', error);
    return [];
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function insertImagesInContent(content: string, images: {url: string, alt: string}[]): string {
  const lines = content.split('\n');
  const targets = [0.25, 0.65].map(p => Math.floor(lines.length * p));
  let used = 0;

  const insertAt = (pos: number, img?: {url: string, alt: string}) => {
    let i = pos;
    while (i < lines.length && (lines[i].startsWith('#') || lines[i].trim() === '')) i++;
    const block = img ? `![${img.alt}](${img.url})` : `> [image could not be fetched]`;
    lines.splice(Math.min(i, lines.length), 0, '', block, '');
  };

  insertAt(targets[0], images[used]); used++;
  insertAt(targets[1] + 3, images[used]);

  return lines.join('\n');
}

function insertInternalLinks(content: string, relatedPosts: Array<{ slug: string }>): string {
  if (!relatedPosts?.length) return content;
  const lines = content.split('\n');
  let idx = 0; const maxLinks = Math.min(4, relatedPosts.length);
  let last = -10;

  for (let i = 0; i < lines.length && idx < maxLinks; i++) {
    const line = lines[i];
    if (!line || line.startsWith('#') || line.trim() === '' || (i - last) < 6) continue;
    const sentences = line.split('. ');
    for (let s = 0; s < sentences.length && idx < maxLinks; s++) {
      const sentence = sentences[s];
      if (sentence.length < 60 || /\[(.*?)\]\((.*?)\)/.test(sentence)) continue;
      const words = sentence.split(' ');
      if (words.length < 7) continue;
      const start = Math.max(1, Math.floor(words.length * 0.25));
      const end = Math.min(words.length - 1, start + 4);
      const anchor = words.slice(start, end).join(' ').replace(/[.,!?;:]$/, '');
      const slug = relatedPosts[idx++].slug;
      sentences[s] = `${words.slice(0, start).join(' ')} [${anchor}](/blog/${slug}) ${words.slice(end).join(' ')}`;
      lines[i] = sentences.join('. ');
      last = i;
      break;
    }
  }

  return lines.join('\n');
}


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

    // Get related posts for internal linking
    console.log('Fetching related posts for internal linking...');
    const relatedPosts = await getRelatedPostsByTagsAndKeywords(supabaseClient, user.id, topic, keywords || [], 4);
    console.log(`Found ${relatedPosts.length} related posts for internal linking`);

    // Fetch images from Unsplash
    console.log('Fetching images from Unsplash...');
    const imageQueries = [topic, ...(keywords || []).slice(0, 2)];
    const allImages: {url: string, alt: string}[] = [];
    
    for (const query of imageQueries) {
      const images = await fetchUnsplashImages(query, 2);
      allImages.push(...images);
      if (allImages.length >= 2) break;
    }

    // Fallback if no images found
    if (allImages.length === 0) {
      const fallbackQuery = encodeURIComponent(topic);
      allImages.push(
        {
          url: `https://source.unsplash.com/featured/1024x576/?${fallbackQuery}`,
          alt: `Featured image for ${topic}`
        },
        {
          url: `https://source.unsplash.com/featured/1024x576/?business`,
          alt: 'Business related image'
        }
      );
    }

    console.log(`Using ${allImages.length} images for article`);

    // Generate content following the exact pipeline
    const keywordString = Array.isArray(keywords) ? keywords.join(', ') : keywords || '';
    
    let prompt = `You are an expert content writer creating a blog article following this EXACT pipeline:

INPUTS:
- Topic: ${topic}
- Keywords: ${keywordString}
- Word Count: ${userWordCount}

RULES - FOLLOW EXACTLY:
1. Content format: YAML front-matter + Markdown body
2. Insert exactly 2 images: I will add these after generation
3. Insert 2-4 internal links: I will add these after generation  
4. SEO: H1 includes primary keyword once, subheads every 200-300 words
5. Style: Clear, specific, contrarian where useful, short paragraphs

OUTPUT SHAPE REQUIRED:
---
title: "Article Title Here"
slug: "kebab-case-slug"
tags: ["tag1", "tag2", "tag3"]
description: "Meta description under 150 chars"
cover_image: "${allImages[0]?.url || ''}"
---

# Article Title

Content body in Markdown format with proper H2 and H3 subheadings every 200-300 words.

BRAND CONTEXT:
- Brand: ${brandName}
- Industry: ${industry} 
- Tone: ${userTone}
- Target Audience: ${targetAudience}
- Brand Description: ${brandDescription}

REQUIREMENTS:
- Exactly ${userWordCount} words
- Include primary keyword in H1 title once
- Use H2/H3 subheadings every 200-300 words  
- Create engaging, valuable content
- No AI disclaimers or filler
- Clear, specific writing style
- Short paragraphs and bullets where appropriate
- Meta description under 150 characters
- 3-5 relevant tags

Generate the article about: ${topic}`;

    // Enrich with external sources via Perplexity for backlinks
    let externalSources: Array<{ url: string; title?: string }> = [];
    const perplexityKey = Deno.env.get('PERPLEXITY_API_KEY');
    if (perplexityKey) {
      try {
        const px = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${perplexityKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.1-sonar-small-128k-online',
            messages: [
              { role: 'system', content: 'Be precise and concise. Return only JSON.' },
              { role: 'user', content: `Find 5 authoritative, recent sources with URLs for: ${topic}. Respond as JSON array of { url, title }.` }
            ],
            temperature: 0.2,
            top_p: 0.9,
            max_tokens: 600,
            return_images: false,
            return_related_questions: false,
            search_recency_filter: 'year'
          }),
        });
        const pxData = await px.json();
        const raw = pxData?.choices?.[0]?.message?.content || pxData?.choices?.[0]?.message?.[0]?.content || '';
        const jsonStart = String(raw).indexOf('[');
        const jsonEnd = String(raw).lastIndexOf(']');
        if (jsonStart !== -1 && jsonEnd !== -1) {
          externalSources = JSON.parse(String(raw).slice(jsonStart, jsonEnd + 1)).filter((s: any) => s?.url);
        }
      } catch (_e) {
        console.warn('Perplexity enrichment failed');
      }
    }

    // If sources found, augment prompt to force backlinks
    if (externalSources.length) {
      prompt += `

EXTERNAL SOURCES (use at least 3 as backlinks in the body with descriptive anchor text):
${externalSources.map((s, i) => `- [${i+1}] ${s.title || s.url} -> ${s.url}`).join('\n')}
`;
    }

    // Generate content using Claude
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicApiKey) {
      throw new Error('Anthropic API key not found');
    }

    console.log('Generating content with Claude...');
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
    let generatedContent = data.content?.[0]?.text || '';

    console.log('Processing generated content...');

    // Insert images at specific positions (25% and 65% through content)
    generatedContent = insertImagesInContent(generatedContent, allImages.slice(0, 2));

    // Insert internal links (2-4 links naturally distributed)
    generatedContent = insertInternalLinks(generatedContent, relatedPosts);

    // Extract metadata from YAML front-matter
    const titleMatch = generatedContent.match(/^---\s*\ntitle:\s*["']?([^"'\n]+)["']?\s*\n/m);
    const title = titleMatch ? titleMatch[1] : `${topic} - Complete Guide`;
    
    const slugMatch = generatedContent.match(/slug:\s*["']?([^"'\n]+)["']?\s*\n/);
    const slug = slugMatch ? slugMatch[1] : title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
    
    const descMatch = generatedContent.match(/description:\s*["']?([^"'\n]+)["']?\s*\n/);
    const metaDescription = descMatch ? descMatch[1] : title.substring(0, 150);

    // Convert markdown to HTML for storage
    const htmlContent = convertMarkdownToHtml(generatedContent);
    
    // Calculate word count
    const wordCountActual = generatedContent.replace(/[---\n\r]/g, ' ').split(/\s+/).filter(word => word.length > 0).length;

    // Set featured image from first image
    const featuredImageUrl = allImages[0]?.url || null;

    console.log('Saving article to database...');
    const { data: article, error: articleError } = await supabaseClient
      .from('articles')
      .insert({
        user_id: user.id,
        title,
        content: htmlContent,
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

    console.log('Content generation completed successfully with images and internal links');

    return new Response(JSON.stringify({
      success: true,
      article,
      job_id: job.id,
      images_count: allImages.length,
      internal_links_count: relatedPosts.length
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