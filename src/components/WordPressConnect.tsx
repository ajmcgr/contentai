import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface WordPressToken {
  id: string;
  user_id: string;
  access_token: string;
  scope: string;
  blog_id: string;
  blog_url: string;
  created_at: string;
}

export const WordPressConnect = () => {
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [token, setToken] = useState<WordPressToken | null>(null);
  const [user, setUser] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        await fetchWordPressConnection(session.user.id);
      }
      setLoading(false);
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user);
          await fetchWordPressConnection(session.user.id);
        } else {
          setUser(null);
          setToken(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchWordPressConnection = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('wp_tokens')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching WordPress connection:', error);
        return;
      }

      setToken(data);
    } catch (error: any) {
      console.error('Error fetching WordPress connection:', error);
    }
  };

  const handleConnect = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to connect your WordPress.com account.",
        variant: "destructive",
      });
      return;
    }

    setConnecting(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('wp-start-connect', {});
      
      if (!error && data?.authUrl) {
        const popup = window.open(data.authUrl, 'wordpress-auth', 'width=600,height=700');
        
        // Poll for the popup to close (user completed auth)
        const pollTimer = setInterval(() => {
          if (popup?.closed) {
            clearInterval(pollTimer);
            // Refresh the connection status after a short delay
            setTimeout(() => {
              fetchWordPressConnection(user.id);
            }, 1000);
          }
        }, 1000);

        // Clean up if popup is manually closed after 10 minutes
        setTimeout(() => {
          clearInterval(pollTimer);
          setConnecting(false);
        }, 600000);
        
      } else {
        throw new Error(data.error || 'Failed to start OAuth flow');
      }
    } catch (error: any) {
      console.error('Connection error:', error);
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to start WordPress.com connection",
        variant: "destructive",
      });
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      const { error } = await supabase
        .from('wp_tokens')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setToken(null);
      toast({
        title: "Disconnected",
        description: "WordPress.com account has been disconnected",
      });
    } catch (error: any) {
      console.error('Disconnect error:', error);
      toast({
        title: "Disconnect Failed",
        description: "Failed to disconnect WordPress.com account",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-gray-500">Loading...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500">Please sign in to connect WordPress.com</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {!token ? (
        <Button 
          onClick={handleConnect} 
          disabled={connecting}
          variant="default"
        >
          {connecting ? 'Connecting...' : 'Connect WordPress.com'}
        </Button>
      ) : (
        <div className="flex items-center gap-3">
          <Button 
            onClick={handleConnect} 
            disabled={connecting}
            variant="outline"
          >
            {connecting ? 'Connecting...' : 'Re-connect'}
          </Button>
          <Button 
            onClick={handleDisconnect}
            variant="destructive"
          >
            Disconnect
          </Button>
        </div>
      )}
      <span className={`text-sm ${token ? 'text-green-600' : 'text-gray-500'}`}>
        {token ? 'Connected' : 'Not connected'}
      </span>
    </div>
  );
};