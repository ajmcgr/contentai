import { Clock, Zap, CheckCircle, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTrialStatus } from '@/hooks/useTrialStatus';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { Link } from 'react-router-dom';

export const TrialBanner = () => {
  const { isTrialActive, articlesCreated, maxTrialArticles, daysRemaining, loading: trialLoading } = useTrialStatus();
  const { subscribed, planType, loading: subscriptionLoading } = useSubscription();

  if (trialLoading || subscriptionLoading) return null;

  // Show Pro banner if user has active subscription
  if (subscribed && planType === 'pro') {
    return (
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 rounded-full p-2">
              <Crown className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-green-800">
                Pro Plan Active
              </p>
              <p className="text-sm text-green-600">
                Unlimited articles, advanced features, and priority support
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Active</span>
          </div>
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