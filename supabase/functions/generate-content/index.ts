import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { marked } from 'https://esm.sh/marked@14.1.3';

// Helper functions for the blog generation pipeline

// Helper functions for the blog generation pipeline
async function fetchUnsplashImages(query: string, count = 3): Promise<{url: string, alt: string}[]> {
  const unsplashKey = Deno.env.get('UNSPLASH_ACCESS_KEY');
  if (!unsplashKey) {
    console.warn('Unsplash API key not configured');
    return [];
  }

  try {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&orientation=landscape&order_by=relevant&content_filter=high&per_page=${Math.max(10, count * 5)}`;
    const response = await fetch(url, {
      headers: { 'Authorization': `Client-ID ${unsplashKey}` }
    });

    if (!response.ok) {
      throw new Error(`Unsplash API error: ${response.status}`);
    }

    const data = await response.json();

    // Score results by relevance to query terms
    const terms = String(query).toLowerCase().split(/[^a-z0-9]+/).filter((w: string) => w.length > 3);
    const scored = (data.results || []).map((photo: any) => {
      const text = `${photo.alt_description || ''} ${photo.description || ''} ${(photo.tags || []).map((t: any) => t?.title || '').join(' ')}`.toLowerCase();
      let score = 0;
      for (const t of terms) { if (text.includes(t)) score += 2; }
      // Prefer photos with descriptive alt/desc
      if ((photo.alt_description || photo.description)) score += 1;
      return { photo, score };
    }).sort((a: any, b: any) => b.score - a.score);

    const chosen = scored.slice(0, count).map(({ photo }: any) => ({
      url: photo.urls.regular,
      alt: photo.alt_description || photo.description || `Image related to ${query}`
    }));

    return chosen;
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
      .select('id, title, slug, keywords, meta_description, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!articles || articles.length === 0) return [];

    const safeKeywords = (keywords || []).map((kw) => String(kw).toLowerCase());
    const topicWords = String(topic).toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3);

    // Score by overlap
    const scored = articles
      .filter((a: any) => a.slug && a.slug.trim().length > 0)
      .map((article: any) => {
        let score = 0;
        const articleKeywords = (article.keywords || []).map((x: string) => x.toLowerCase());

        for (const kw of safeKeywords) {
          if (articleKeywords.some((ak: string) => ak.includes(kw))) score += 3;
          if (article.title?.toLowerCase().includes(kw)) score += 2;
          if (article.meta_description?.toLowerCase().includes(kw)) score += 1;
        }
        for (const w of topicWords) {
          if (article.title?.toLowerCase().includes(w)) score += 1;
          if (article.meta_description?.toLowerCase().includes(w)) score += 1;
        }
        return { ...article, score };
      })
      .sort((a: any, b: any) => b.score - a.score);

    // Take top-k with score > 0, else fallback to recent posts
    const top = scored.filter((a: any) => a.score > 0).slice(0, k);
    if (top.length >= Math.min(2, k)) return top;

    // Fallback: recent posts with slugs (dedup)
    const seen = new Set<string>();
    const fallback = scored
      .filter((a: any) => {
        if (!a.slug) return false; const s = a.slug.trim();
        if (seen.has(s)) return false; seen.add(s); return true;
      })
      .slice(0, k);

    return fallback;
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

function insertInternalLinks(content: string, relatedPosts: Array<{ slug: string; title?: string }>): string {
  if (!relatedPosts?.length) return content;
  const paras = content.split('\n\n');
  const maxLinks = Math.min(4, relatedPosts.length);
  let idx = 0;

  // Distribute links across the article
  const step = Math.max(1, Math.floor(paras.length / (maxLinks + 1)));
  for (let i = step; i < paras.length && idx < maxLinks; i += step) {
    const p = paras[i];
    if (!p || p.startsWith('#')) continue;
    if (/\[(.*?)\]\((.*?)\)/.test(p)) continue; // already has a link
    const words = p.split(' ');
    if (words.length < 12) continue;
    const start = Math.max(1, Math.floor(words.length * 0.2));
    const end = Math.min(words.length - 1, start + 4);
    const anchor = words.slice(start, end).join(' ').replace(/[.,!?;:]$/, '');
    const slug = relatedPosts[idx++]?.slug;
    if (!slug) break;
    paras[i] = `${words.slice(0, start).join(' ')} [${anchor}](/blog/${slug}) ${words.slice(end).join(' ')}`;
  }

  // Guarantee at least 2 links by appending a Related reading block
  if (idx < 2) {
    const extra = relatedPosts.slice(idx, Math.min(maxLinks, idx + (2 - idx))).map(r => `- [${(r.title || r.slug).replace(/-/g, ' ')}](/blog/${r.slug})`).join('\n');
    if (extra) paras.push(`## Related reading\n${extra}`);
  }

  return paras.join('\n\n');
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
const primaryKeywords = Array.isArray(keywords) ? keywords.filter(Boolean) : (keywords ? [String(keywords)] : []);
const baseQueries = [...primaryKeywords.slice(0, 2), `${topic} ${industry || ''}`.trim()].filter(Boolean);
const seenUrls = new Set<string>();
const allImages: {url: string, alt: string}[] = [];

for (const q of baseQueries) {
  const images = await fetchUnsplashImages(q, 8);
  for (const img of images) {
    if (!seenUrls.has(img.url)) {
      seenUrls.add(img.url);
      allImages.push(img);
      if (allImages.length >= 2) break;
    }
  }
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
    console.log('Images available:', allImages.length);
    console.log('Related posts available:', relatedPosts.length);

    // Extract metadata from YAML front-matter first
    const titleMatch = generatedContent.match(/^---\s*\ntitle:\s*["']?([^"'\n]+)["']?\s*\n/m);
    const title = titleMatch ? titleMatch[1] : `${topic} - Complete Guide`;
    
    const slugMatch = generatedContent.match(/slug:\s*["']?([^"'\n]+)["']?\s*\n/);
    const slug = slugMatch ? slugMatch[1] : title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
    
    const descMatch = generatedContent.match(/description:\s*["']?([^"'\n]+)["']?\s*\n/);
    const metaDescription = descMatch ? descMatch[1] : title.substring(0, 150);

    // Remove YAML front-matter to get clean markdown body
    let markdownBody = generatedContent.replace(/^---[\s\S]*?---\n/, '');
    
    console.log('Original markdown body length:', markdownBody.length);

    // STEP 1: Improve image relevance using title, keywords and top H2s, then insert exactly 2 images
    console.log('Generating AI images...');
    let selectedImages = allImages.slice(0, 2);
    
    try {
      // Generate AI images for the article
      const h2Matches = Array.from(markdownBody.matchAll(/^##\s+(.+)$/gim) as IterableIterator<RegExpMatchArray>).map(m => m[1]).slice(0, 2);
      const primaryKeywords = Array.isArray(keywords) ? keywords.filter(Boolean) : (keywords ? [String(keywords)] : []);
      const imagePrompts = [...primaryKeywords.slice(0, 1), title]
        .filter(Boolean)
        .map(q => `${q} ${industry || ''}`.trim())
        .slice(0, 2);
        
      const generatedImages: {url: string, alt: string}[] = [];
      
      // Generate images using the AI image generation function
      for (const prompt of imagePrompts) {
        try {
          console.log(`Generating AI image for prompt: ${prompt}`);
          
          const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
          if (!openaiApiKey) {
            console.warn('OpenAI API key not found, skipping AI image generation');
            continue;
          }
          
          const imageResponse = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openaiApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'dall-e-3',
              prompt: prompt,
              n: 1,
              size: '1024x1024',
              quality: 'hd',
              style: 'natural'
            })
          });
          
          if (imageResponse.ok) {
            const imageData = await imageResponse.json();
            if (imageData.data && imageData.data.length > 0) {
              generatedImages.push({
                url: imageData.data[0].url,
                alt: `${title} - ${prompt}`
              });
            }
          } else {
            console.warn(`Failed to generate AI image for prompt: ${prompt}`, await imageResponse.text());
          }
        } catch (e) {
          console.warn(`Error generating AI image for prompt "${prompt}":`, e);
        }
        
        if (generatedImages.length >= 2) break;
      }
      
      // If we generated AI images, use them; otherwise fallback to Unsplash
      if (generatedImages.length > 0) {
        selectedImages = generatedImages;
        console.log(`Using ${generatedImages.length} AI-generated images`);
      } else {
        console.log('AI image generation failed, falling back to Unsplash images...');
        // Fallback to Unsplash images
        const imageQueries = [...primaryKeywords.slice(0, 2), title, ...h2Matches]
          .filter(Boolean)
          .map(q => `${q} ${industry || ''}`.trim());
        const seen = new Set<string>();
        const refetch: {url: string, alt: string}[] = [];
        for (const q of imageQueries) {
          const imgs = await fetchUnsplashImages(q, 6);
          for (const img of imgs) {
            if (!seen.has(img.url)) {
              seen.add(img.url);
              refetch.push({ url: img.url, alt: img.alt || `${title} - ${q}` });
              if (refetch.length >= 2) break;
            }
          }
          if (refetch.length >= 2) break;
        }
        if (refetch.length) {
          selectedImages = refetch.slice(0, 2);
        }
      }
    } catch (e) {
      console.warn('AI image generation failed, using fallback images', e);
    }

    console.log('Inserting images...');
    markdownBody = insertImagesInContent(markdownBody, selectedImages);
    console.log('After image insertion, markdown length:', markdownBody.length);

    // STEP 2: Insert 2-4 internal links naturally distributed, with guaranteed fallback
    console.log('Inserting internal links...');
    markdownBody = insertInternalLinks(markdownBody, relatedPosts);
    const internalBlogLinkCount = (markdownBody.match(/\[.*?\]\(\/blog\/.*?\)/g) || []).length;

    // Fallback: ensure at least 2 internal links using brand settings or a related reading block
    if (internalBlogLinkCount < 2) {
      const brandLinks = Array.isArray(brandSettings?.internal_links) ? brandSettings.internal_links.filter(Boolean) : [];
      const extraLinks: string[] = [];
      // Prefer relatedPosts slugs if any
      if (relatedPosts?.length) {
        for (const r of relatedPosts.slice(0, Math.max(2, 4))) {
          extraLinks.push(`- [${(r.title || r.slug).replace(/-/g, ' ')}](/blog/${r.slug})`);
        }
      }
      // Then add brand links
      for (const url of brandLinks.slice(0, Math.max(2 - extraLinks.length, 0))) {
        try {
          const u = String(url);
          const readable = u.replace(/^https?:\/\/(www\.)?/, '').replace(/[-_]/g, ' ');
          extraLinks.push(`- [${readable}](${u})`);
        } catch {
          // ignore malformed
        }
      }
      if (extraLinks.length) {
        markdownBody += `\n\n## Related reading\n${extraLinks.join('\n')}\n`;
      }
    }
    console.log('After links insertion, markdown length:', markdownBody.length);

    // Convert markdown to HTML using proper markdown parser
    console.log('Converting markdown to HTML...');
    let htmlContent = await marked.parse(markdownBody);
    
    // Ensure images have proper styling
    htmlContent = htmlContent.replace(
      /<img([^>]*?)>/g, 
      '<img$1 style="max-width: 100%; height: auto;" />'
    );
    
    console.log('Final HTML content length:', htmlContent.length);
    
    // Calculate word count from markdown (excluding images and links)
    const wordCountActual = markdownBody.replace(/!\[.*?\]\(.*?\)/g, '').replace(/\[.*?\]\(.*?\)/g, '').split(/\s+/).filter((word: string) => word.length > 0).length;

    // Set featured image from first image
    const featuredImageUrl = selectedImages[0]?.url || null;

    console.log('Final article stats:', {
      title,
      wordCount: wordCountActual,
      imagesInserted: (markdownBody.match(/!\[.*?\]\(.*?\)/g) || []).length,
      linksInserted: (markdownBody.match(/\[.*?\]\(\/blog\/.*?\)/g) || []).length,
      featuredImage: !!featuredImageUrl
    });

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
      images_count: selectedImages.length,
      internal_links_count: relatedPosts.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-content function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});