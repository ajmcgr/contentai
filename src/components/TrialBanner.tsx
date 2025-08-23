import { Clock, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTrialStatus } from '@/hooks/useTrialStatus';
import { Link } from 'react-router-dom';

export const TrialBanner = () => {
  const { isTrialActive, articlesCreated, maxTrialArticles, daysRemaining, loading } = useTrialStatus();

  if (loading || !isTrialActive) return null;

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
        <Button asChild size="sm" className="bg-primary hover:bg-primary/90">
          <Link to="/pricing">Upgrade Now</Link>
        </Button>
      </div>
    </div>
  );
};