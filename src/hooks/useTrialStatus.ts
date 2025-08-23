import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface TrialStatus {
  isTrialActive: boolean;
  articlesCreated: number;
  maxTrialArticles: number;
  daysRemaining: number;
  loading: boolean;
}

export const useTrialStatus = () => {
  const [trialStatus, setTrialStatus] = useState<TrialStatus>({
    isTrialActive: false,
    articlesCreated: 0,
    maxTrialArticles: 3,
    daysRemaining: 0,
    loading: true,
  });
  const { toast } = useToast();

  const fetchTrialStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: trial, error } = await supabase
        .from('user_trials')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching trial status:', error);
        return;
      }

      if (trial) {
        const now = new Date();
        const trialEnd = new Date(trial.trial_end_date);
        const daysRemaining = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        const isTrialActive = trial.is_trial_active && 
                             trialEnd > now && 
                             trial.articles_created < trial.max_trial_articles &&
                             !trial.has_upgraded;

        setTrialStatus({
          isTrialActive,
          articlesCreated: trial.articles_created,
          maxTrialArticles: trial.max_trial_articles,
          daysRemaining,
          loading: false,
        });
      } else {
        // Create new trial for user
        const { error: insertError } = await supabase
          .from('user_trials')
          .insert({
            user_id: user.id,
          });

        if (insertError) {
          console.error('Error creating trial:', insertError);
        } else {
          // Fetch the newly created trial
          await fetchTrialStatus();
        }
      }
    } catch (error) {
      console.error('Error in fetchTrialStatus:', error);
      setTrialStatus(prev => ({ ...prev, loading: false }));
    }
  };

  const incrementArticleCount = async (): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      if (trialStatus.articlesCreated >= trialStatus.maxTrialArticles) {
        toast({
          title: "Trial Limit Reached",
          description: "You've reached your trial article limit. Please upgrade to continue creating content.",
          variant: "destructive",
        });
        return false;
      }

      const { error } = await supabase.rpc('increment_trial_articles', {
        user_uuid: user.id
      });

      if (error) {
        console.error('Error incrementing article count:', error);
        return false;
      }

      // Refresh trial status
      await fetchTrialStatus();
      return true;
    } catch (error) {
      console.error('Error in incrementArticleCount:', error);
      return false;
    }
  };

  const checkTrialAccess = (): boolean => {
    if (!trialStatus.isTrialActive) {
      toast({
        title: "Trial Expired",
        description: "Your free trial has ended. Please upgrade to continue using Content AI.",
        variant: "destructive",
      });
      return false;
    }

    if (trialStatus.articlesCreated >= trialStatus.maxTrialArticles) {
      toast({
        title: "Trial Limit Reached", 
        description: `You've used all ${trialStatus.maxTrialArticles} trial articles. Upgrade to create unlimited content.`,
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  useEffect(() => {
    fetchTrialStatus();
  }, []);

  return {
    ...trialStatus,
    incrementArticleCount,
    checkTrialAccess,
    refreshTrialStatus: fetchTrialStatus,
  };
};