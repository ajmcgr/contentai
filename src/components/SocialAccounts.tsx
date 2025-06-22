
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Twitter, Youtube, Instagram, Linkedin, Facebook } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface SocialAccount {
  id: string;
  name: string;
  icon: React.ComponentType;
  connected: boolean;
}

export const SocialAccounts = () => {
  const [accounts, setAccounts] = useState<SocialAccount[]>([
    { id: 'twitter', name: 'X (Twitter)', icon: Twitter, connected: false },
    { id: 'instagram', name: 'Instagram', icon: Instagram, connected: false },
    { id: 'youtube', name: 'YouTube', icon: Youtube, connected: false },
    { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, connected: false },
    { id: 'facebook', name: 'Facebook', icon: Facebook, connected: false },
  ]);
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    // Get current user session
    const getCurrentSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // Fetch existing connection status
        fetchConnectionStatus(session.access_token);
      }
    };
    
    getCurrentSession();
  }, []);
  
  const fetchConnectionStatus = async (token: string) => {
    try {
      const response = await supabase.functions.invoke('twitter-connect', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: { action: 'status' }
      });
      
      if (response.error) {
        console.error('Error fetching connection status:', response.error);
        return;
      }
      
      const connections = response.data?.connections || [];
      
      // Update accounts with connection status
      setAccounts(prev => 
        prev.map(account => {
          const connection = connections.find(
            (c: any) => c.platform === account.id && c.connected
          );
          return { ...account, connected: !!connection };
        })
      );
    } catch (error) {
      console.error('Error fetching connections:', error);
    }
  };

  const handleConnect = async (accountId: string) => {
    setLoading(accountId);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("Please sign in to connect your social accounts");
        setLoading(null);
        return;
      }
      
      // Get current connection status
      const currentAccount = accounts.find(a => a.id === accountId);
      const action = currentAccount?.connected ? 'disconnect' : 'connect';
      
      if (accountId === 'twitter') {
        // Handle Twitter connection through our edge function
        const response = await supabase.functions.invoke('twitter-connect', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: { 
            platform: accountId,
            action: action
          }
        });
        
        if (response.error) {
          throw new Error(response.error.message || 'Failed to connect account');
        }
        
        // Update the accounts state with the new connection status
        setAccounts(prev => 
          prev.map(account => 
            account.id === accountId 
              ? { ...account, connected: action === 'connect' } 
              : account
          )
        );
        
        toast.success(
          action === 'connect' 
            ? `${currentAccount?.name} connected successfully!` 
            : `${currentAccount?.name} disconnected successfully!`
        );
      } else {
        // For other platforms, show coming soon message
        toast.info(`${currentAccount?.name} integration coming soon!`);
      }
    } catch (error: any) {
      console.error(`Error ${accountId} connection:`, error);
      toast.error(error.message || `Failed to connect ${accountId}`);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Social Accounts</h1>
      <div className="grid gap-6">
        {accounts.map((account) => (
          <Card key={account.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <span className="h-6 w-6">
                  <account.icon />
                </span>
                {account.name}
              </CardTitle>
              <CardDescription>
                {account.connected
                  ? "Connected and ready to post"
                  : "Connect your account to start posting"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant={account.connected ? "outline" : "default"}
                onClick={() => handleConnect(account.id)}
                disabled={loading === account.id}
              >
                {loading === account.id 
                  ? "Processing..." 
                  : account.connected 
                    ? "Disconnect" 
                    : "Connect Account"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
