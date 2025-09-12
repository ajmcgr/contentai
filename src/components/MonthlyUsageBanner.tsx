import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Crown, Calendar } from "lucide-react";

interface MonthlyUsage {
  articles_created: number;
  max_articles: number;
  month_year: string;
}

export const MonthlyUsageBanner = () => {
  const [usage, setUsage] = useState<MonthlyUsage | null>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsageData();
  }, []);

  const loadUsageData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get current month usage
      const currentMonth = new Date().toISOString().slice(0, 7) + '-01';
      const { data: monthlyUsage } = await supabase
        .from('monthly_usage')
        .select('*')
        .eq('user_id', user.id)
        .eq('month_year', currentMonth)
        .maybeSingle();

      // Get subscription status
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      setUsage(monthlyUsage || { articles_created: 0, max_articles: 50, month_year: currentMonth });
      setSubscription(sub);
    } catch (error) {
      console.error('Error loading usage data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !usage) return null;

  // Don't show for paid users
  if (subscription?.plan_type === 'pro' && subscription?.status === 'active') {
    return null;
  }

  const percentage = Math.round((usage.articles_created / usage.max_articles) * 100);
  const isNearLimit = percentage >= 80;
  const isAtLimit = usage.articles_created >= usage.max_articles;

  const currentDate = new Date();
  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  const year = currentDate.getFullYear();

  return (
    <Card className={`mb-6 ${isNearLimit ? 'border-orange-200 bg-orange-50' : isAtLimit ? 'border-red-200 bg-red-50' : 'border-blue-200 bg-blue-50'}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">
                {monthName} {year} Usage
              </span>
            </div>
            
            <div className="flex items-center gap-4 mb-3">
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium">
                    {usage.articles_created} of {usage.max_articles} articles
                  </span>
                  <span className="text-xs text-muted-foreground">{percentage}%</span>
                </div>
                <Progress 
                  value={percentage} 
                  className={`h-2 ${isNearLimit ? '[&>div]:bg-orange-500' : isAtLimit ? '[&>div]:bg-red-500' : ''}`}
                />
              </div>
            </div>

            {isAtLimit && (
              <p className="text-sm text-red-600 mb-3">
                You've reached your monthly limit. Upgrade to Pro for unlimited articles.
              </p>
            )}

            {isNearLimit && !isAtLimit && (
              <p className="text-sm text-orange-600 mb-3">
                You're approaching your monthly limit. Consider upgrading to Pro.
              </p>
            )}
          </div>

          {(isNearLimit || isAtLimit) && (
            <div className="ml-4">
              <Button asChild size="sm" className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                <Link to="/pricing" className="flex items-center gap-2">
                  <Crown className="w-4 h-4" />
                  Upgrade to Pro
                </Link>
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};