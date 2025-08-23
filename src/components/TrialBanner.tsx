import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { useTrialStatus } from "@/hooks/useTrialStatus";

export const TrialBanner = () => {
  const { isTrialActive, articlesCreated, maxTrialArticles, trialEndDate, hasUpgraded, loading } = useTrialStatus();

  if (loading || hasUpgraded) return null;

  if (!isTrialActive) {
    return (
      <Card className="p-4 mb-6 bg-gradient-to-r from-orange-50 to-red-50 border-orange-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-orange-600" />
            <div>
              <h3 className="font-medium text-orange-900">Trial Expired</h3>
              <p className="text-sm text-orange-700">Your 7-day free trial has ended. Upgrade to continue creating articles.</p>
            </div>
          </div>
          <Button asChild className="bg-orange-600 hover:bg-orange-700">
            <Link to="/pricing">Upgrade Now</Link>
          </Button>
        </div>
      </Card>
    );
  }

  const remainingArticles = maxTrialArticles - articlesCreated;
  const trialEndsAt = trialEndDate ? new Date(trialEndDate) : null;
  const daysRemaining = trialEndsAt ? Math.max(0, Math.ceil((trialEndsAt.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))) : 0;

  return (
    <Card className="p-4 mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Zap className="h-5 w-5 text-blue-600" />
          <div>
            <h3 className="font-medium text-blue-900">Free Trial Active</h3>
            <p className="text-sm text-blue-700">
              {remainingArticles} articles remaining • {daysRemaining} days left
            </p>
          </div>
        </div>
        <Button asChild variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-100">
          <Link to="/pricing">Upgrade Early</Link>
        </Button>
      </div>
    </Card>
  );
};