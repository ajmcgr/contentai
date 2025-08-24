import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    // Use service role key to bypass RLS for subscription updates
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    logStep("No authorization header provided");
    return new Response(JSON.stringify({ 
      subscribed: false, 
      plan_type: 'free',
      status: 'inactive'
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
  
  const token = authHeader.replace("Bearer ", "");
  const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
  if (userError || !userData?.user?.email) {
    logStep("Auth invalid or user missing", { error: userError?.message });
    return new Response(JSON.stringify({ 
      subscribed: false, 
      plan_type: 'free',
      status: 'inactive'
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
  
  const user = userData.user;
  logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Find Stripe customer by email
    const customers = await stripe.customers.list({ 
      email: user.email, 
      limit: 1 
    });
    
    if (customers.data.length === 0) {
      logStep("No Stripe customer found for user");
      
      // Ensure user has a subscription record with free plan
      await supabaseClient.from("subscriptions").upsert({
        user_id: user.id,
        email: user.email,
        plan_type: 'free',
        status: 'inactive',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

      return new Response(JSON.stringify({ 
        subscribed: false, 
        plan_type: 'free',
        status: 'inactive'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Check for any active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 10,
    });

    let hasActiveSubscription = false;
    let planType = 'free';
    let subscriptionId = null;
    let currentPeriodStart = null;
    let currentPeriodEnd = null;

    if (subscriptions.data.length > 0) {
      const subscription = subscriptions.data[0];
      hasActiveSubscription = true;
      subscriptionId = subscription.id;
      currentPeriodStart = new Date(subscription.current_period_start * 1000).toISOString();
      currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
      
      // Determine plan type from price amount
      const priceId = subscription.items.data[0].price.id;
      const price = await stripe.prices.retrieve(priceId);
      const amount = price.unit_amount || 0;
      
      // Assuming $49/month = Pro plan (4900 cents)
      if (amount >= 4900) {
        planType = 'pro';
      } else {
        planType = 'basic';
      }
      
      logStep("Active subscription found", { 
        subscriptionId, 
        priceId, 
        amount, 
        planType,
        currentPeriodEnd 
      });
    } else {
      // Check for any recent payments in the last 24 hours
      const payments = await stripe.paymentIntents.list({
        customer: customerId,
        limit: 10,
        created: {
          gte: Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000), // Last 24 hours
        },
      });

      for (const payment of payments.data) {
        if (payment.status === 'succeeded' && payment.amount >= 4900) {
          // Found a successful $49+ payment in the last 24 hours
          hasActiveSubscription = true;
          planType = 'pro';
          currentPeriodStart = new Date(payment.created * 1000).toISOString();
          currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days from now
          
          logStep("Recent successful payment found", { 
            paymentId: payment.id, 
            amount: payment.amount, 
            planType 
          });
          break;
        }
      }
    }

    // Update subscription in database
    await supabaseClient.from("subscriptions").upsert({
      user_id: user.id,
      email: user.email,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      plan_type: planType,
      status: hasActiveSubscription ? 'active' : 'inactive',
      current_period_start: currentPeriodStart,
      current_period_end: currentPeriodEnd,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    logStep("Updated subscription in database", { 
      planType, 
      status: hasActiveSubscription ? 'active' : 'inactive' 
    });

    return new Response(JSON.stringify({
      subscribed: hasActiveSubscription,
      plan_type: planType,
      status: hasActiveSubscription ? 'active' : 'inactive',
      current_period_end: currentPeriodEnd
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in verify-payment", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});