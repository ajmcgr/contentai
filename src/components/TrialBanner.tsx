import { Clock, Zap, CheckCircle, Crown, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTrialStatus } from '@/hooks/useTrialStatus';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

export const TrialBanner = () => {
  const { isTrialActive, articlesCreated, maxTrialArticles, daysRemaining, loading: trialLoading } = useTrialStatus();
  const { subscribed, planType, loading: subscriptionLoading } = useSubscription();
  const { toast } = useToast();
  const [showUpgradeBanner, setShowUpgradeBanner] = useState(false);
  const [isCreatingPortal, setIsCreatingPortal] = useState(false);

  // Check for upgrade success indicator in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('upgrade') === 'success') {
      setShowUpgradeBanner(true);
      // Remove the parameter from URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleManageSubscription = async () => {
    try {
      setIsCreatingPortal(true);
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      if (error) {
        throw error;
      }

      if (data?.url) {
        window.open(data.url, '_blank');
      } else {
        throw new Error('No portal URL received');
      }
    } catch (error) {
      console.error('Error creating customer portal:', error);
      // Fallback: open Stripe Customer Portal login directly
      window.open('https://billing.stripe.com/p/login/14AaEZ2Bd06k6KXbCYeAg00', '_blank');
      toast({
        title: "Opening Stripe portal",
        description: "Using fallback portal link.",
      });
    } finally {
      setIsCreatingPortal(false);
    }
  };

  if (trialLoading || subscriptionLoading) return null;

  // Show upgrade success banner if just upgraded
  if (showUpgradeBanner && subscribed && planType === 'pro') {
    return (
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 rounded-full p-2">
              <Crown className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-green-800">
                🎉 Welcome to Pro Plan!
              </p>
              <p className="text-sm text-green-600">
                You now have unlimited articles, advanced features, and priority support
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowUpgradeBanner(false)}
            className="text-green-600 hover:text-green-700"
          >
            ×
          </Button>
        </div>
      </div>
    );
  }

  // Show trial banner if trial is active and no subscription
  if (isTrialActive && !subscribed) {
    return (
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary/20 rounded-full p-2">
              <Zap className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">
                Free Trial Active
              </p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} remaining
                </span>
                <span>
                  {articlesCreated}/{maxTrialArticles} articles used
                </span>
              </div>
            </div>
          </div>
          <Button 
            onClick={() => {
              window.open('https://buy.stripe.com/14AaEZ2Bd06k6KXbCYeAg00', '_blank');
            }}
            size="sm" 
            className="bg-primary hover:bg-primary/90"
          >
            Upgrade to Pro
          </Button>
        </div>
      </div>
    );
  }

  return null;
};