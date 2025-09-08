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
      prompt, 
      style = 'photorealistic',
      size = '1024x1024',
      quantity = 1,
      articleId = null 
    } = await req.json();

    console.log('Image generation request:', { prompt, style, size, quantity });

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not found');
    }

    // Create generation job
    const { data: job, error: jobError } = await supabaseClient
      .from('generation_jobs')
      .insert({
        user_id: user.id,
        job_type: 'image_generation',
        status: 'processing',
        input_data: { prompt, style, size, quantity, articleId }
      })
      .select()
      .single();

    if (jobError) {
      throw new Error(`Failed to create job: ${jobError.message}`);
    }

    // Enhance prompt based on style
    let enhancedPrompt = prompt;
    switch (style) {
      case 'photorealistic':
        enhancedPrompt = `High-quality photorealistic image of ${prompt}, professional photography, sharp focus, good lighting`;
        break;
      case 'illustration':
        enhancedPrompt = `Beautiful digital illustration of ${prompt}, clean art style, vibrant colors`;
        break;
      case 'minimalist':
        enhancedPrompt = `Minimalist clean design of ${prompt}, simple, modern, clean background`;
        break;
      case 'artistic':
        enhancedPrompt = `Artistic creative interpretation of ${prompt}, unique style, creative composition`;
        break;
    }

    // Generate images using OpenAI DALL-E
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: enhancedPrompt,
        n: Math.min(quantity, 1), // DALL-E 3 only supports n=1
        size: size,
        quality: 'hd',
        style: style === 'photorealistic' ? 'natural' : 'vivid'
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedImages = data.data;

    console.log('Generated images:', generatedImages.length);

    // If we need multiple images and DALL-E 3 only gave us one, generate more
    const allImages = [];
    allImages.push(...generatedImages);

    if (quantity > 1) {
      for (let i = 1; i < quantity; i++) {
        try {
          const additionalResponse = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openaiApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'dall-e-3',
              prompt: enhancedPrompt,
              n: 1,
              size: size,
              quality: 'hd',
              style: style === 'photorealistic' ? 'natural' : 'vivid'
            }),
          });

          if (additionalResponse.ok) {
            const additionalData = await additionalResponse.json();
            allImages.push(...additionalData.data);
          }
        } catch (error) {
          console.warn(`Failed to generate additional image ${i + 1}:`, error);
        }
      }
    }

    // Download and store images permanently in Supabase Storage
    const storedImages = [];
    for (let i = 0; i < allImages.length; i++) {
      try {
        const imageUrl = allImages[i].url;
        const imageResponse = await fetch(imageUrl);
        
        if (imageResponse.ok) {
          const imageBlob = await imageResponse.arrayBuffer();
          const fileName = `generated-images/${user.id}/${Date.now()}-${i}.png`;
          
          // Store in Supabase Storage
          const { data: uploadData, error: uploadError } = await supabaseClient.storage
            .from('generated-images')
            .upload(fileName, imageBlob, {
              contentType: 'image/png',
              upsert: false
            });

          if (uploadError) {
            console.warn('Failed to upload image to storage:', uploadError);
            storedImages.push(allImages[i]); // Fallback to original URL
          } else {
            // Get public URL
            const { data: publicUrlData } = supabaseClient.storage
              .from('generated-images')
              .getPublicUrl(fileName);
            
            storedImages.push({
              url: publicUrlData.publicUrl,
              revised_prompt: allImages[i].revised_prompt
            });
          }
        } else {
          console.warn('Failed to download image from OpenAI');
          storedImages.push(allImages[i]); // Fallback to original URL
        }
      } catch (error) {
        console.warn('Error processing image:', error);
        storedImages.push(allImages[i]); // Fallback to original URL
      }
    }

    // If articleId is provided, update the article with the first image as featured image
    if (articleId && storedImages.length > 0) {
      await supabaseClient
        .from('articles')
        .update({
          featured_image_url: storedImages[0].url
        })
        .eq('id', articleId)
        .eq('user_id', user.id);
    }

    // Update job status
    await supabaseClient
      .from('generation_jobs')
      .update({
        status: 'completed',
        output_data: { 
          images: storedImages
        },
        progress: 100,
        completed_at: new Date().toISOString()
      })
      .eq('id', job.id);

    console.log('Image generation completed successfully');

    return new Response(JSON.stringify({
      success: true,
      images: storedImages,
      job_id: job.id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-images function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});