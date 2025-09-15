import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, CheckCircle, XCircle, ExternalLink, Plus, Activity } from 'lucide-react';

interface CmsInstall {
  id: string;
  provider: 'shopify' | 'wix';
  external_id: string;
  created_at: string;
  scope?: string;
  extra?: any;
}

interface HealthCheckResult {
  ok: boolean;
  error?: string;
  details?: any;
  blogs?: any[];
  postsCount?: number;
  shop?: string;
  siteId?: string;
  connectedAt?: string;
}

const Integrations = () => {
  const [installs, setInstalls] = useState<CmsInstall[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [shopDomain, setShopDomain] = useState('');
  const [healthChecks, setHealthChecks] = useState<Record<string, HealthCheckResult>>({});
  const [runningHealthCheck, setRunningHealthCheck] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadInstalls();
  }, []);

  const loadInstalls = async () => {
    try {
      const { data, error } = await supabase
        .from('cms_installs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInstalls((data || []) as CmsInstall[]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load integrations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const startOAuth = async (provider: 'shopify' | 'wix', shop?: string) => {
    setConnecting(provider);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      let functionName: string;
      let params = new URLSearchParams();
      
      if (provider === 'shopify') {
        if (!shop || !shop.endsWith('.myshopify.com')) {
          toast({
            title: "Invalid Shop Domain",
            description: "Please enter a valid Shopify domain (e.g., yourstore.myshopify.com)",
            variant: "destructive",
          });
          return;
        }
        functionName = 'shopify-oauth-start';
        params.set('shop', shop);
      } else {
        functionName = 'wix-oauth-start';
      }

      const response = await supabase.functions.invoke(functionName, {
        body: {},
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'OAuth start failed');
      }

      const { authUrl } = response.data;
      
      // Open OAuth in popup
      const popup = window.open(
        authUrl,
        'oauth_popup',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      // Listen for popup messages
      const messageHandler = (event: MessageEvent) => {
        if (event.data?.type === `${provider}_connected`) {
          toast({
            title: "Success",
            description: `${provider.charAt(0).toUpperCase() + provider.slice(1)} connected successfully!`,
          });
          loadInstalls(); // Refresh the list
          popup?.close();
          window.removeEventListener('message', messageHandler);
        } else if (event.data?.type === `${provider}_error`) {
          toast({
            title: "Connection Failed",
            description: `Failed to connect ${provider}. Please try again.`,
            variant: "destructive",
          });
          popup?.close();
          window.removeEventListener('message', messageHandler);
        }
      };

      window.addEventListener('message', messageHandler);

      // Check if popup was closed manually
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', messageHandler);
        }
      }, 1000);

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to start OAuth flow",
        variant: "destructive",
      });
    } finally {
      setConnecting(null);
    }
  };

  const runHealthCheck = async (install: CmsInstall) => {
    setRunningHealthCheck(install.id);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const functionName = `${install.provider}-health`;
      
      const response = await supabase.functions.invoke(functionName, {
        body: {},
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Health check failed');
      }

      setHealthChecks(prev => ({
        ...prev,
        [install.id]: response.data
      }));

      if (response.data.ok) {
        toast({
          title: "Health Check Passed",
          description: `${install.provider.charAt(0).toUpperCase() + install.provider.slice(1)} connection is healthy`,
        });
      } else {
        toast({
          title: "Health Check Failed",
          description: response.data.error || "Connection appears to have issues",
          variant: "destructive",
        });
      }

    } catch (error: any) {
      const errorResult: HealthCheckResult = {
        ok: false,
        error: error.message || 'Health check failed'
      };
      
      setHealthChecks(prev => ({
        ...prev,
        [install.id]: errorResult
      }));

      toast({
        title: "Health Check Failed",
        description: error.message || "Failed to run health check",
        variant: "destructive",
      });
    } finally {
      setRunningHealthCheck(null);
    }
  };

  const disconnect = async (install: CmsInstall) => {
    try {
      const { error } = await supabase
        .from('cms_installs')
        .delete()
        .eq('id', install.id);

      if (error) throw error;

      toast({
        title: "Disconnected",
        description: `${install.provider.charAt(0).toUpperCase() + install.provider.slice(1)} has been disconnected`,
      });
      
      loadInstalls();
      setHealthChecks(prev => {
        const newChecks = { ...prev };
        delete newChecks[install.id];
        return newChecks;
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to disconnect",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  const shopifyInstalls = installs.filter(install => install.provider === 'shopify');
  const wixInstalls = installs.filter(install => install.provider === 'wix');

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
        <p className="text-muted-foreground">
          Connect your favorite platforms to publish content automatically
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Shopify Integration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-600 rounded flex items-center justify-center text-white text-sm font-bold">
                S
              </div>
              Shopify
            </CardTitle>
            <CardDescription>
              Publish blog posts directly to your Shopify store
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {shopifyInstalls.length === 0 ? (
              <div className="space-y-3">
                <Input
                  placeholder="yourstore.myshopify.com"
                  value={shopDomain}
                  onChange={(e) => setShopDomain(e.target.value)}
                />
                <Button 
                  onClick={() => startOAuth('shopify', shopDomain)}
                  disabled={connecting === 'shopify' || !shopDomain}
                  className="w-full"
                >
                  {connecting === 'shopify' ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Connect Shopify
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {shopifyInstalls.map((install) => {
                  const health = healthChecks[install.id];
                  return (
                    <div key={install.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{install.external_id}</div>
                          <div className="text-sm text-muted-foreground">
                            Connected {new Date(install.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <Badge variant="secondary">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      </div>
                      
                      {health && (
                        <Alert variant={health.ok ? "default" : "destructive"}>
                          <AlertDescription>
                            {health.ok ? (
                              <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <span>Connection healthy</span>
                                {health.blogs && (
                                  <span className="text-sm text-muted-foreground">
                                    • {health.blogs.length} blog(s) available
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <XCircle className="h-4 w-4" />
                                <span>{health.error}</span>
                              </div>
                            )}
                          </AlertDescription>
                        </Alert>
                      )}
                      
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => runHealthCheck(install)}
                          disabled={runningHealthCheck === install.id}
                        >
                          {runningHealthCheck === install.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Activity className="h-4 w-4" />
                          )}
                          Health Check
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`https://${install.external_id}`, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                          Open Store
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => disconnect(install)}
                        >
                          Disconnect
                        </Button>
                      </div>
                    </div>
                  );
                })}
          <Button 
            variant="outline"
            onClick={() => setShopDomain("")}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Connect Another Store
          </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Wix Integration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white text-sm font-bold">
                W
              </div>
              Wix
            </CardTitle>
            <CardDescription>
              Publish blog posts to your Wix website
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {wixInstalls.length === 0 ? (
              <Button 
                onClick={() => startOAuth('wix')}
                disabled={connecting === 'wix'}
                className="w-full"
              >
                {connecting === 'wix' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Connect Wix
                  </>
                )}
              </Button>
            ) : (
              <div className="space-y-3">
                {wixInstalls.map((install) => {
                  const health = healthChecks[install.id];
                  return (
                    <div key={install.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">Site ID: {install.external_id}</div>
                          <div className="text-sm text-muted-foreground">
                            Connected {new Date(install.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <Badge variant="secondary">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      </div>
                      
                      {health && (
                        <Alert variant={health.ok ? "default" : "destructive"}>
                          <AlertDescription>
                            {health.ok ? (
                              <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <span>Connection healthy</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <XCircle className="h-4 w-4" />
                                <span>{health.error}</span>
                              </div>
                            )}
                          </AlertDescription>
                        </Alert>
                      )}
                      
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => runHealthCheck(install)}
                          disabled={runningHealthCheck === install.id}
                        >
                          {runningHealthCheck === install.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Activity className="h-4 w-4" />
                          )}
                          Health Check
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => disconnect(install)}
                        >
                          Disconnect
                        </Button>
                      </div>
                    </div>
                  );
                })}
                <Button 
                  variant="outline"
                  onClick={() => startOAuth('wix')}
                  disabled={connecting === 'wix'}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Connect Another Site
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Alert>
        <AlertDescription>
          <strong>Note:</strong> After connecting your platforms, you can publish articles directly from the Write page using the "Publish to CMS" feature.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default Integrations;