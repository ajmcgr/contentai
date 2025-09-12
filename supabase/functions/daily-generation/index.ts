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

      // Build a strong prompt (markdown output)
      let contextPrompt = `You are an elite content strategist. Generate a premium-quality ${wordCount}-word article for ${brandName} in ${industry}.

BRAND:
- Name: ${brandName}
- Industry: ${industry}
- Description: ${brandDescription}
- Audience: ${audience}
- Tone: ${tone}
- Focus Areas: ${tagList.join(", ") || "general insights"}
${internalLinksList.length ? `- Internal Links: ${internalLinksList.join(", ")}` : ""}

TOPIC: ${topic}

REQUIREMENTS:
- Rich markdown with H1 title, H2/H3 sections, lists, and quotes
- Include specific statistics and references
- Provide actionable steps and real-world examples
- Strong conclusion with call-to-action for ${brandName}
- Keep the voice consistently ${tone}

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
            model: "claude-opus-4-20250514",
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

      // Update job status
      if (jobId) {
        await admin
          .from("generation_jobs")
          .update({ status: "completed", output_data: { article_id: article.id } })
          .eq("id", jobId);
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
