import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface EmailConfig {
  id: string;
  resend_api_key: string | null;
  email_from: string | null;
  updated_at: string;
}

export const useEmailConfig = () => {
  return useQuery({
    queryKey: ['email-config'],
    queryFn: async (): Promise<EmailConfig> => {
      const { data, error } = await supabase
        .from('config')
        .select('*')
        .eq('id', 'global')
        .maybeSingle();

      if (error) throw error;
      
      // Return defaults if no config exists
      if (!data) {
        return {
          id: 'global',
          resend_api_key: '',
          email_from: 'support@trycontent.ai',
          updated_at: new Date().toISOString()
        };
      }
      
      return data;
    },
    staleTime: 60 * 1000, // Cache for 60 seconds
  });
};

export const useUpdateEmailConfig = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (config: Partial<EmailConfig>) => {
      // Use service role for this operation since normal users can't access config table
      const { data, error } = await supabase.functions.invoke('update-email-config', {
        body: { config }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-config'] });
      toast({
        title: "Success",
        description: "Email configuration updated successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update email configuration",
        variant: "destructive"
      });
    }
  });
};

export const useSendTestEmail = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ to, subject, html, text }: {
      to: string;
      subject: string;
      html: string;
      text?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('send-email-with-config', {
        body: { to, subject, html, text }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Test email sent successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send test email",
        variant: "destructive"
      });
    }
  });
};