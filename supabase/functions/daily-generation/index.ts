import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function pad2(n: number) {
  return n.toString().padStart(2, "0");
}

function utcHHmm(date = new Date()) {
  return `${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())}`;
}

function startOfUTCDay(date = new Date()): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
  return d.toISOString();
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
  const openAIApiKey = Deno.env.get("OPENAI_API_KEY") ?? "";
  const perplexityApiKey = Deno.env.get("PERPLEXITY_API_KEY") ?? "";

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars");
    return new Response(
      JSON.stringify({ success: false, error: "Server not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);

  try {
    const now = new Date();
    const nowStr = utcHHmm(now); // Using UTC for scheduling
    const todayStart = startOfUTCDay(now);

    // Load all users' content settings that have autoGeneration enabled
    const { data: templates, error: tplErr } = await admin
      .from("content_templates")
      .select("id, user_id, structure")
      .eq("template_type", "content_settings")
      .eq("name", "default");

    if (tplErr) throw tplErr;

    const toProcess = (templates || []).filter((t: any) => {
      const s = t?.structure || {};
      return s.autoGeneration === true;
    });

    let processed = 0;
    const results: any[] = [];

    for (const t of toProcess) {
      const userId = t.user_id as string;
      const s = (t.structure || {}) as any;
      const scheduledTime: string = (s.autoGenTime as string) || "09:00"; // HH:mm in UTC

      if (scheduledTime !== nowStr) {
        // Not time yet for this user
        continue;
      }

      // Ensure we only run once per day per user (use generation_jobs if available)
      let alreadyRan = false;
      try {
        const { data: jobs } = await admin
          .from("generation_jobs")
          .select("id,status,created_at")
          .eq("user_id", userId)
          .eq("job_type", "auto_daily")
          .gte("created_at", todayStart)
          .limit(1);
        if (jobs && jobs.length > 0) {
          const st = jobs[0].status;
          if (st === "processing" || st === "completed") alreadyRan = true;
        }
      } catch (e) {
        console.warn("generation_jobs check failed; proceeding without it", e);
      }

      if (alreadyRan) {
        results.push({ userId, skipped: true, reason: "already_ran_today" });
        continue;
      }

      // Check if user can create more articles (monthly limit check)
      let canCreate = false;
      try {
        const { data: canCreateResult, error: limitError } = await admin.rpc('can_create_article', {
          user_uuid: userId
        });
        if (limitError) {
          console.error('Error checking monthly limit for user:', userId, limitError);
          results.push({ userId, skipped: true, reason: "limit_check_failed", error: limitError.message });
          continue;
        }
        canCreate = canCreateResult;
      } catch (limitErr) {
        console.error('Monthly limit check failed for user:', userId, limitErr);
        results.push({ userId, skipped: true, reason: "limit_check_error" });
        continue;
      }

      if (!canCreate) {
        results.push({ userId, skipped: true, reason: "monthly_limit_reached" });
        continue;
      }

      // Insert job record (best-effort)
      let jobId: string | null = null;
      try {
        const { data: job } = await admin
          .from("generation_jobs")
          .insert({
            user_id: userId,
            job_type: "auto_daily",
            status: "processing",
            input_data: { autoGenTime: scheduledTime },
          })
          .select()
          .single();
        jobId = job?.id || null;
      } catch (_) {}

      // Load brand settings
      const { data: brand } = await admin
        .from("brand_settings")
        .select("brand_name, industry, description, target_audience, tone_of_voice, tags, internal_links")
        .eq("user_id", userId)
        .maybeSingle();

      const brandName = brand?.brand_name || "your brand";
      const industry = brand?.industry || "your industry";
      const brandDescription = brand?.description || "innovative solutions";
      const audience = brand?.target_audience || "professionals";
      const tone = brand?.tone_of_voice || "professional";
      const tagList: string[] = Array.isArray(brand?.tags) ? brand!.tags as string[] : [];
      const internalLinksList: string[] = Array.isArray(brand?.internal_links) ? brand!.internal_links as string[] : [];

      // Determine topic & word count from settings
      const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
      const topic = tagList.length > 0 ? pick(tagList) : `Latest ${industry} insights`;
      const articleLength = (s.articleLength as string) || "medium";
      const wordCount = articleLength === "short" ? 1000 : articleLength === "long" ? 1800 : 1400;
      const shouldAutoPublish = s.autoPublish === true;

      // Fetch relevant URLs using Perplexity API
      let relevantUrls: string[] = [];
      try {
        if (perplexityApiKey) {
          const searchQuery = `${topic} ${industry} resources articles guides 2024`;
          const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${perplexityApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'llama-3.1-sonar-small-128k-online',
              messages: [
                {
                  role: 'system',
                  content: 'Find 3-5 high-quality, authoritative URLs related to the search query. Return only the URLs, one per line, without any additional text or formatting.'
                },
                {
                  role: 'user',
                  content: searchQuery
                }
              ],
              temperature: 0.2,
              max_tokens: 500,
              return_images: false,
              return_related_questions: false,
              search_recency_filter: 'month'
            }),
          });

          if (perplexityResponse.ok) {
            const perplexityData = await perplexityResponse.json();
            const urlsText = perplexityData?.choices?.[0]?.message?.content || "";
            relevantUrls = urlsText
              .split('\n')
              .filter((line: string) => line.trim().startsWith('http'))
              .slice(0, 3); // Limit to 3 URLs
          }
        }
      } catch (urlError) {
        console.warn('Failed to fetch relevant URLs:', urlError);
        // Continue without external URLs
      }

      // Build a strong prompt (markdown output)
      let contextPrompt = `You are an elite content strategist. Generate a premium-quality ${wordCount}-word article for ${brandName} in ${industry}.

BRAND:
- Name: ${brandName}
- Industry: ${industry}
- Description: ${brandDescription}
- Audience: ${audience}
- Tone: ${tone}
- Focus Areas: ${tagList.join(", ") || "general insights"}

TOPIC: ${topic}

REQUIREMENTS:
- Rich markdown with H1 title, H2/H3 sections, lists, and quotes
- Include specific statistics and references from reputable sources
- Provide actionable steps and real-world examples
- Strong conclusion with call-to-action for ${brandName}
- Keep the voice consistently ${tone}
- DO NOT include any placeholder images or example.com links
- DO NOT suggest image uploads or external image links
- Do NOT include meta sections like 'Keywords Used', 'Brand Alignment', or any marketing boilerplate (e.g., 'This article demonstrates our expertise')
${relevantUrls.length > 0 ? `- IMPORTANT: Include 2-3 natural backlinks using these authoritative URLs: ${relevantUrls.join(", ")}. Format as: [relevant anchor text](URL)` : "- Focus on valuable content without external links"}

OUTPUT FORMAT:
Title: [Compelling SEO title under 60 chars]

[Body markdown starts here]
`;

      // Generate with Anthropic, fallback to OpenAI
      let aiText = "";
      try {
        if (!anthropicApiKey) throw new Error("No Anthropic API key");
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${anthropicApiKey}`,
            "Content-Type": "application/json",
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 6000,
            messages: [{ role: "user", content: contextPrompt }],
          }),
        });
        if (!res.ok) {
          const t = await res.text();
          throw new Error(`Anthropic error ${res.status}: ${t}`);
        }
        const data = await res.json();
        aiText = data?.content?.[0]?.text || "";
      } catch (anthErr) {
        console.error("Anthropic failed, trying OpenAI fallback:", anthErr);
        if (!openAIApiKey) throw anthErr;
        const oa = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${openAIApiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            max_tokens: 1800,
            temperature: 0.9,
            messages: [
              { role: "system", content: "You are a world-class content strategist. Return high-quality markdown." },
              { role: "user", content: contextPrompt },
            ],
          }),
        });
        if (!oa.ok) {
          const t = await oa.text();
          throw new Error(`OpenAI error ${oa.status}: ${t}`);
        }
        const j = await oa.json();
        aiText = j?.choices?.[0]?.message?.content || "";
      }

      // Parse title and body
      const t1 = aiText.match(/^\s*Title:\s*(.+)$/im);
      const t2 = aiText.match(/^\s*#\s+(.+)$/m);
      let title = (t1?.[1] || t2?.[1] || `${topic} - Insights`).trim();
      let body = aiText
        .replace(/^\s*Title:\s*.+\n?/im, "")
        .replace(/^\s*#\s+.+\n?/, "")
        .trim();

      // Remove unwanted meta sections
      const removeSection = (source: string, heading: string) => {
        const regex = new RegExp(`(^|\n)#{1,6}\\s*${heading}[\\s\\S]*?(?=\n#{1,6}\\s|$)`, "gi");
        return source.replace(regex, "\n");
      };
      body = removeSection(body, "Keywords Used");
      body = removeSection(body, "Brand Alignment");

      // Remove boilerplate marketing lines
      body = body.replace(/.*This article demonstrates[^\n]*\n?/gi, "");
      body = body.replace(/.*positions our company as[^\n]*\n?/gi, "");

      // Ensure backlinks exist (fallback insertion)
      try {
        const linkMatches = body.match(/\[[^\]]+\]\(https?:\/\/[^)]+\)/g) || [];
        if (relevantUrls.length > 0 && linkMatches.length < 2) {
          const linksToAdd = relevantUrls.slice(0, 3);
          const list = linksToAdd.map((u) => `- [${u.replace(/^https?:\/\//, '').split('/')[0]}](${u})`).join("\n");
          body += `\n\n## Further reading\n${list}\n`;
        }
      } catch (e) {
        console.warn('Failed to inject fallback backlinks:', e);
      }


      // Insert article with appropriate status based on user preference
      const articleStatus = shouldAutoPublish ? "published" : "draft";
      const publishedAt = shouldAutoPublish ? new Date().toISOString() : null;
      
      const { data: article, error: articleErr } = await admin
        .from("articles")
        .insert({
          user_id: userId,
          title,
          content: body,
          status: articleStatus,
          published_at: publishedAt,
        })
        .select()
        .single();

      if (articleErr) throw articleErr;

      // Generate and add featured image
      try {
        console.log(`Generating image for article: ${title}`);
        const imagePrompt = `A professional, high-quality image representing: ${title}. Style: ${industry} related, clean, modern, suitable for business content.`;
        
        const imageResponse = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-image-1',
            prompt: imagePrompt,
            n: 1,
            size: '1024x1024',
            quality: 'high',
            output_format: 'png',
            response_format: 'b64_json'
          }),
        });

        if (imageResponse.ok) {
          const imageData = await imageResponse.json();
          console.log('Image generation response received:', { success: true, hasData: !!imageData.data });
          
          if (imageData.data && imageData.data[0]) {
            const b64 = imageData?.data?.[0]?.b64_json as string | undefined;
            let imageBytes: Uint8Array | null = null;
            if (b64) {
              console.log('Converting base64 to blob for storage');
              imageBytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
            } else if (imageData?.data?.[0]?.url) {
              console.log('Downloading image from URL for storage');
              const urlResp = await fetch(imageData.data[0].url);
              const arr = new Uint8Array(await urlResp.arrayBuffer());
              imageBytes = arr;
            }

            if (imageBytes) {
              const fileName = `auto-generated/${userId}/${Date.now()}.png`;
              // Store in Supabase Storage
              const { error: uploadError } = await admin.storage
                .from('generated-images')
                .upload(fileName, imageBytes, {
                  contentType: 'image/png',
                  upsert: false
                });

              if (!uploadError) {
                console.log('Image uploaded successfully:', fileName);
                // Get public URL and update article
                const { data: publicUrlData } = admin.storage
                  .from('generated-images')
                  .getPublicUrl(fileName);

                const imageUrl = publicUrlData.publicUrl;
                const imageMarkdown = `![${title} — featured image](${imageUrl})`;
                const updatedContent = `${imageMarkdown}\n\n${body}`;
                await admin
                  .from('articles')
                  .update({ featured_image_url: imageUrl, content: updatedContent })
                  .eq('id', article.id);

                console.log('Article updated with image URL and embedded image');
              } else {
                console.error('Storage upload error:', uploadError);
              }
            } else {
              console.warn('No image bytes available from generation response');
            }
          } else {
            console.warn('No image data in response');
          }
        } else {
          const errorText = await imageResponse.text();
          console.error('Image generation failed:', imageResponse.status, errorText);
        }
      } catch (imageError) {
        console.error('Failed to generate image for article:', imageError);
        // Continue without image - don't fail the entire process
      }

      // Update job status
      if (jobId) {
        await admin
          .from("generation_jobs")
          .update({ status: "completed", output_data: { article_id: article.id } })
          .eq("id", jobId);
      }

      // Increment monthly usage counter
      try {
        await admin.rpc('increment_monthly_usage', {
          user_uuid: userId
        });
      } catch (usageErr) {
        console.warn('Failed to increment monthly usage for user:', userId, usageErr);
      }

      // If auto-publish is enabled, also publish to connected CMS platforms
      if (shouldAutoPublish) {
        try {
          // Get all types of CMS connections for this user
          const connections: any[] = [];
          
          // Get CMS connections (regular integrations)
          const { data: cmsConnections } = await admin
            .from('cms_connections')
            .select('id, platform, site_url')
            .eq('user_id', userId)
            .eq('is_active', true);
          
          if (cmsConnections) {
            connections.push(...cmsConnections);
          }
          
          // Get Wix connections
          const { data: wixConnections } = await admin
            .from('wix_connections')
            .select('id, instance_id, access_token')
            .eq('user_id', userId);
          
          if (wixConnections && wixConnections.length > 0) {
            connections.push(...wixConnections.map(wix => ({
              id: wix.id,
              platform: 'wix',
              site_url: `wix-site-${wix.instance_id}`
            })));
          }
          
          // Get WordPress.com connections
          const { data: wpConnections } = await admin
            .from('wp_tokens')
            .select('blog_id, blog_url')
            .eq('user_id', userId);
          
          if (wpConnections && wpConnections.length > 0) {
            connections.push(...wpConnections.map(wp => ({
              id: `wp-${wp.blog_id}`,
              platform: 'wordpress',
              site_url: wp.blog_url
            })));
          }
          
          // Get Shopify connections
          const { data: shopifyConnections } = await admin
            .from('cms_installs')
            .select('id, external_id')
            .eq('user_id', userId)
            .eq('provider', 'shopify');
          
          if (shopifyConnections && shopifyConnections.length > 0) {
            connections.push(...shopifyConnections.map(shopify => ({
              id: shopify.id,
              platform: 'shopify',
              site_url: shopify.external_id
            })));
          }

          if (connections && connections.length > 0) {
            console.log(`Auto-publishing article ${article.id} to ${connections.length} connected platforms for user ${userId}`);
            
            // Publish to each connected platform
            for (const connection of connections) {
              try {
                // Create a user-scoped supabase client for this operation
                const userAdmin = createClient(supabaseUrl, serviceRoleKey, {
                  auth: { persistSession: false },
                  global: { 
                    headers: { 
                      'Authorization': `Bearer ${serviceRoleKey}`
                    } 
                  }
                });

                // Call the publish function directly instead of through HTTP
                const publishResponse = await fetch(`${supabaseUrl}/functions/v1/cms-integration`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'Content-Type': 'application/json',
                    'X-User-Id': userId, // Pass user ID in header for cms-integration to use
                  },
                  body: JSON.stringify({
                    action: 'publish',
                    articleId: article.id,
                    connectionId: connection.id,
                    publishOptions: { status: 'publish' } // Publish immediately
                  })
                });

                if (publishResponse.ok) {
                  console.log(`Successfully published article ${article.id} to ${connection.platform} (${connection.site_url})`);
                } else {
                  const errorText = await publishResponse.text();
                  console.error(`Failed to publish article ${article.id} to ${connection.platform}:`, errorText);
                }
              } catch (publishError) {
                console.error(`Error publishing article ${article.id} to ${connection.platform}:`, publishError);
              }
            }
          } else {
            console.log(`Auto-publish enabled for user ${userId} but no active CMS connections found`);
          }
        } catch (cmsError) {
          console.error('Error during CMS auto-publishing:', cmsError);
          // Don't fail the entire process if CMS publishing fails
        }
      }

      results.push({ userId, generated: true, articleId: article.id });
      processed += 1;
    }

    return new Response(
      JSON.stringify({ success: true, processed, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("daily-generation error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
