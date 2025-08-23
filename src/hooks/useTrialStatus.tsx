import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface TrialStatus {
  isTrialActive: boolean;
  articlesCreated: number;
  maxTrialArticles: number;
  trialEndDate: string | null;
  hasUpgraded: boolean;
  loading: boolean;
}

export const useTrialStatus = () => {
  const [trialStatus, setTrialStatus] = useState<TrialStatus>({
    isTrialActive: false,
    articlesCreated: 0,
    maxTrialArticles: 3,
    trialEndDate: null,
    hasUpgraded: false,
    loading: true,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchTrialStatus();
  }, []);

  const fetchTrialStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setTrialStatus(prev => ({ ...prev, loading: false }));
        return;
      }

      // Check if user has a trial record
      const { data: trial, error } = await supabase
        .from('user_trials')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching trial status:', error);
        setTrialStatus(prev => ({ ...prev, loading: false }));
        return;
      }

      if (!trial) {
        // Create a new trial for the user
        const { data: newTrial, error: createError } = await supabase
          .from('user_trials')
          .insert({
            user_id: user.id,
            articles_created: 0,
            max_trial_articles: 3,
            is_trial_active: true,
            has_upgraded: false,
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating trial:', createError);
          setTrialStatus(prev => ({ ...prev, loading: false }));
          return;
        }

        setTrialStatus({
          isTrialActive: true,
          articlesCreated: 0,
          maxTrialArticles: 3,
          trialEndDate: newTrial.trial_end_date,
          hasUpgraded: false,
          loading: false,
        });
      } else {
        // Check if trial is still active
        const isActive = trial.is_trial_active && 
                         new Date(trial.trial_end_date) > new Date() && 
                         trial.articles_created < trial.max_trial_articles;

        setTrialStatus({
          isTrialActive: isActive,
          articlesCreated: trial.articles_created,
          maxTrialArticles: trial.max_trial_articles,
          trialEndDate: trial.trial_end_date,
          hasUpgraded: trial.has_upgraded,
          loading: false,
        });
      }
    } catch (error) {
      console.error('Error in fetchTrialStatus:', error);
      setTrialStatus(prev => ({ ...prev, loading: false }));
    }
  };

  const incrementTrialArticles = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data, error } = await supabase.rpc('increment_trial_articles', {
        user_uuid: user.id
      });

      if (error) {
        console.error('Error incrementing trial articles:', error);
        return false;
      }

      // Refresh trial status
      await fetchTrialStatus();
      return true;
    } catch (error) {
      console.error('Error in incrementTrialArticles:', error);
      return false;
    }
  };

  const checkTrialLimit = () => {
    if (trialStatus.hasUpgraded) return true;
    
    if (!trialStatus.isTrialActive) {
      toast({
        title: "Trial Expired",
        description: "Your 7-day free trial has ended. Please upgrade to continue creating articles.",
        variant: "destructive",
      });
      return false;
    }

    if (trialStatus.articlesCreated >= trialStatus.maxTrialArticles) {
      toast({
        title: "Trial Limit Reached",
        description: `You've reached the limit of ${trialStatus.maxTrialArticles} articles for your free trial. Please upgrade to continue.`,
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  return {
    ...trialStatus,
    incrementTrialArticles,
    checkTrialLimit,
    refreshTrialStatus: fetchTrialStatus,
  };
};