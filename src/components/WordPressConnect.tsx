import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2, Link, ExternalLink, CheckCircle, XCircle } from "lucide-react";

interface WordPressToken {
  id: string;
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
        description: "Please sign in to connect WordPress.com",
        variant: "destructive",
      });
      return;
    }

    setConnecting(true);

    try {
      const { data, error } = await supabase.functions.invoke('wp-start-connect');

      if (error) throw error;

      if (data.success && data.authorizeUrl) {
        // Open the authorization URL in a popup window
        const popup = window.open(
          data.authorizeUrl,
          'wordpress-auth',
          'width=600,height=700,scrollbars=yes,resizable=yes'
        );

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
          if (!popup?.closed) {
            popup?.close();
          }
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
    if (!user || !token) return;

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
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            WordPress.com Connection
          </CardTitle>
          <CardDescription>
            Please sign in to connect your WordPress.com account.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link className="h-5 w-5" />
          WordPress.com Connection
        </CardTitle>
        <CardDescription>
          {token 
            ? "Your WordPress.com account is connected and ready to use." 
            : "Connect your WordPress.com account to publish articles directly to your blog."
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          {token ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <XCircle className="h-5 w-5 text-gray-400" />
          )}
          <span className="font-medium">Status:</span>
          <span className={token ? "text-green-600" : "text-gray-600"}>
            {token ? "Connected" : "Not Connected"}
          </span>
        </div>

        {token && (
          <div className="space-y-2 p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="font-medium text-green-800">Connected Site:</div>
            {token.blog_url && (
              <div className="flex items-center gap-2">
                <a 
                  href={token.blog_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-green-700 hover:underline flex items-center gap-1"
                >
                  {token.blog_url}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
            <div className="text-sm text-green-600">
              Connected on: {new Date(token.created_at).toLocaleDateString()}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          {token ? (
            <Button 
              variant="outline" 
              onClick={handleDisconnect}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              Disconnect
            </Button>
          ) : (
            <Button 
              onClick={handleConnect} 
              disabled={connecting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {connecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Connect WordPress.com
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};