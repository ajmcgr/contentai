import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, CheckCircle, XCircle, ExternalLink, Plus, Activity, FileText, Clock } from 'lucide-react';
import { startShopifyOAuth, startWixOAuth, getIntegrationStatus } from '@/lib/integrationsClient';
import WixConnectSection from '@/components/Integrations/WixConnectSection';

type Install = { 
  provider: 'shopify' | 'wix'; 
  external_id: string; 
  scope?: string; 
  updated_at?: string; 
  extra?: any 
} | null;

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
  correlationId?: string;
}

interface LogEntry {
  id: number;
  created_at: string;
  provider: string;
  stage: string;
  level: string;
  correlation_id: string;
  detail: string;
}

const Integrations = () => {
  const [installs, setInstalls] = useState<CmsInstall[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [shopifyInstall, setShopifyInstall] = useState<Install>(null);
  const [wixInstall, setWixInstall] = useState<Install>(null);
  const [shopInput, setShopInput] = useState('');
  const [healthChecks, setHealthChecks] = useState<Record<string, HealthCheckResult>>({});
  const [runningHealthCheck, setRunningHealthCheck] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [highlightedCorrelationId, setHighlightedCorrelationId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const { toast: showToast } = useToast();
  const [wixSiteIdInput, setWixSiteIdInput] = useState('');
  const [savingWixSiteId, setSavingWixSiteId] = useState(false);

  useEffect(() => {
    loadInstalls();
    loadStatus();
    
    // Get current user ID
    const getCurrentUserId = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        setCurrentUserId(session.user.id);
      }
    };
    getCurrentUserId();
    
    const onFocus = () => loadStatus();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  useEffect(() => {
    const loadWix = async () => {
      if (!currentUserId) return;
      const { data } = await supabase
        .from('wix_connections')
        .select('wix_site_id')
        .eq('user_id', currentUserId)
        .maybeSingle();
      setWixSiteIdInput(data?.wix_site_id || '');
    };
    loadWix();
  }, [currentUserId]);

  const loadInstalls = async () => {
    try {
      const { data, error } = await supabase
        .from('cms_installs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInstalls((data || []) as CmsInstall[]);
    } catch (error: any) {
      showToast({
        title: "Error",
        description: "Failed to load integrations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStatus = async () => {
    try {
      setStatusLoading(true);
      const status = await getIntegrationStatus();
      console.log('Integration status response:', status);
      console.log('Shopify install:', status.installs.shopify);
      console.log('Wix install:', status.installs.wix);
      setShopifyInstall(status.installs.shopify);
      setWixInstall(status.installs.wix);
    } catch (error: any) {
      console.error('Status load error:', error);
      setToast(`Status error: ${error?.message || error}`);
    } finally {
      setStatusLoading(false);
    }
  };

  const saveWixSiteId = async () => {
    try {
      setSavingWixSiteId(true);
      const val = wixSiteIdInput.trim();
      await supabase
        .from('wix_connections')
        .update({ wix_site_id: val || null })
        .eq('user_id', currentUserId);
      showToast({ title: 'Saved', description: 'Wix Site ID saved. Try publishing again.' });
    } catch (error: any) {
      showToast({ title: 'Save failed', description: error.message || 'Could not save Wix Site ID', variant: 'destructive' });
    } finally {
      setSavingWixSiteId(false);
    }
  };
  const onShopifyConnect = async () => {
    try {
      setConnecting('shopify');
      console.log('[Integrations] Shopify connect clicked', { shop: shopInput });
      
      // Get user ID from auth session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }
      
      startShopifyOAuth({ shop: shopInput.trim(), userId: session.user.id });
    } catch (error: any) {
      setConnecting(null);
      setToast(error?.message || 'Shopify start failed');
      console.error(error);
    }
  };

  const onWixConnect = async () => {
    try {
      setConnecting('wix');
      console.log('[Integrations] Wix connect clicked');
      
      // Get user ID from auth session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }
      
      // Reset the button after launching the flow so UI doesn't stay stuck
      setTimeout(() => setConnecting(null), 1500);
      
      startWixOAuth({ userId: session.user.id });
    } catch (error: any) {
      setConnecting(null);
      setToast(error?.message || 'Wix start failed');
      console.error(error);
    }
  };

  const loadLogs = async () => {
    setLoadingLogs(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await supabase.functions.invoke('diag-logs', {
        body: {},
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to load logs');
      }

      setLogs(response.data || []);
    } catch (error: any) {
      showToast({
        title: "Error",
        description: "Failed to load diagnostic logs",
        variant: "destructive",
      });
    } finally {
      setLoadingLogs(false);
    }
  };

  const runHealthCheck = async (install: CmsInstall) => {
    setRunningHealthCheck(install.id);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await supabase.functions.invoke(`diag-health-${install.provider}`, {
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

      // Highlight correlation ID in logs
      if (response.data.correlationId) {
        setHighlightedCorrelationId(response.data.correlationId);
        setTimeout(() => setHighlightedCorrelationId(null), 5000);
      }

      if (response.data.ok) {
        showToast({
          title: "Health Check Passed",
          description: `${install.provider.charAt(0).toUpperCase() + install.provider.slice(1)} connection is healthy`,
        });
      } else {
        showToast({
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

      showToast({
        title: "Health Check Failed",
        description: error.message || "Failed to run health check",
        variant: "destructive",
      });
    } finally {
      setRunningHealthCheck(null);
    }
  };

  const runTestPublish = async (install: CmsInstall) => {
    setRunningHealthCheck(install.id);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await supabase.functions.invoke('diag-test-publish', {
        body: { provider: install.provider },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Test publish failed');
      }

      showToast({
        title: "Test Publish Successful",
        description: `Test post created on ${install.provider}. Correlation ID: ${response.data.correlationId}`,
      });

      // Highlight correlation ID in logs
      if (response.data.correlationId) {
        setHighlightedCorrelationId(response.data.correlationId);
        setTimeout(() => setHighlightedCorrelationId(null), 5000);
      }

    } catch (error: any) {
      showToast({
        title: "Test Publish Failed",
        description: `${error.message} (see diagnostics for details)`,
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

      showToast({
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
      showToast({
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

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-semibold">Integrations</h1>

      {toast && (
        <div className="rounded border p-3 bg-yellow-50 text-yellow-900">
          {toast} <button className="underline ml-2" onClick={() => setToast(null)}>dismiss</button>
        </div>
      )}

      <section className="border rounded-xl p-4">
        <h2 className="text-lg font-medium">Shopify Blog</h2>
        <p className="text-sm opacity-80">Create and publish articles via Shopify Admin API.</p>
        <div className="mt-3 flex items-center gap-3">
          <Input
            className="border rounded px-3 py-2 flex-1"
            placeholder="mystore.myshopify.com"
            value={shopInput}
            onChange={(e) => setShopInput(e.target.value)}
          />
          <Button
            disabled={connecting === 'shopify'}
            onClick={onShopifyConnect}
            variant="default"
          >
            {connecting === 'shopify' ? 'Redirecting…' : (shopifyInstall ? 'Re-connect' : 'Connect')}
          </Button>
        </div>
        {shopifyInstall && (
          <div className="mt-3 space-y-2 p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="font-medium text-green-800">Connected Store:</div>
            <div className="flex items-center gap-2">
              <a 
                href={`https://${shopifyInstall.external_id}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-green-700 hover:underline flex items-center gap-1"
              >
                {shopifyInstall.external_id}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <div className="text-sm text-green-600">
              Connected on: {shopifyInstall.updated_at ? new Date(shopifyInstall.updated_at).toLocaleDateString() : 'Recently'}
            </div>
          </div>
        )}
        <div className="mt-2 text-sm">
          {statusLoading ? 'Loading status…' : shopifyInstall
            ? <span className="text-green-700">Connected</span>
            : <span className="text-red-700">Not connected</span>}
        </div>
      </section>

      <section className="border rounded-xl p-4">
        <h2 className="text-lg font-medium">Wix Blog</h2>
        <p className="text-sm opacity-80">Draft → Publish via Wix Blog API (Manage Blog permission required).</p>
        <div className="mt-3">
          <WixConnectSection userId={currentUserId} />
        </div>
        {wixInstall && (
          <div className="mt-3 space-y-2 p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="font-medium text-green-800">Connected Site:</div>
            <div className="flex items-center gap-2">
              <span className="text-green-700">
                Instance ID: {wixInstall.external_id}
              </span>
            </div>
            {wixSiteIdInput && (
              <div className="flex items-center gap-2">
                <span className="text-green-700 text-sm">
                  Site ID: {wixSiteIdInput}
                </span>
              </div>
            )}
            <div className="text-sm text-green-600">
              Connected on: {wixInstall.updated_at ? new Date(wixInstall.updated_at).toLocaleDateString() : 'Recently'}
            </div>
          </div>
        )}
        <div className="mt-4 space-y-2">
          <label className="text-sm font-medium">Wix Site ID (required for Blog API)</label>
          <div className="flex gap-2">
            <Input
              placeholder="e.g. 1234abcd-..."
              value={wixSiteIdInput}
              onChange={(e) => setWixSiteIdInput(e.target.value)}
            />
            <Button variant="outline" disabled={!currentUserId || savingWixSiteId} onClick={saveWixSiteId}>
              {savingWixSiteId ? 'Saving…' : 'Save'}
            </Button>
          </div>
          <p className="text-xs opacity-70">Find it in Wix Dashboard → Site Settings → Advanced → Site ID. We’ll send it as the wix-site-id header.</p>
        </div>
      </section>

      <section className="border rounded-xl p-4">
        <h3 className="text-base font-medium">Troubleshooting</h3>
        <ol className="list-decimal ml-5 text-sm space-y-1 mt-2">
          <li>Make sure pop-up blockers are off (we use full-page redirect, not popup).</li>
          <li>Enter the full Shopify domain ending in <code className="bg-gray-100 px-1 rounded">.myshopify.com</code>.</li>
          <li>On redirect hang, check DevTools → Console and Network for the last request.</li>
        </ol>
      </section>

      {/* Diagnostics section */}
      {installs.length > 0 && (
        <div className="space-y-6">
          <h3 className="text-lg font-medium">Diagnostics</h3>
          
          <div className="grid gap-6 md:grid-cols-2">
            {installs.map((install) => {
              const health = healthChecks[install.id];
              return (
                <Card key={install.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded flex items-center justify-center text-white text-sm font-bold ${
                        install.provider === 'shopify' ? 'bg-green-600' : 'bg-blue-600'
                      }`}>
                        {install.provider === 'shopify' ? 'S' : 'W'}
                      </div>
                      {install.provider.charAt(0).toUpperCase() + install.provider.slice(1)}
                    </CardTitle>
                    <CardDescription>
                      {install.external_id}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        Connected {new Date(install.created_at).toLocaleDateString()}
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
                    
                    <div className="flex flex-wrap gap-2">
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
                        onClick={() => runTestPublish(install)}
                        disabled={runningHealthCheck === install.id}
                      >
                        {runningHealthCheck === install.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Activity className="h-4 w-4" />
                        )}
                        Test Publish
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => disconnect(install)}
                      >
                        Disconnect
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Recent Logs</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={loadLogs}
                disabled={loadingLogs}
              >
                {loadingLogs ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                Load Logs
              </Button>
            </div>
            
            {logs.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <div className="max-h-64 overflow-y-auto">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className={`p-2 border-b text-sm ${
                        highlightedCorrelationId === log.correlation_id 
                          ? 'bg-yellow-100' 
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(log.created_at).toLocaleString()}
                        <Badge variant="outline" className="text-xs">
                          {log.provider}
                        </Badge>
                        <Badge variant={log.level === 'error' ? 'destructive' : 'secondary'} className="text-xs">
                          {log.level}
                        </Badge>
                        {log.correlation_id && (
                          <span className="font-mono text-xs">
                            {log.correlation_id.slice(0, 8)}...
                          </span>
                        )}
                      </div>
                      <div className="mt-1">
                        <span className="font-medium">{log.stage}</span>
                        {log.detail && (
                          <div className="text-xs text-muted-foreground mt-1 font-mono">
                            {log.detail.length > 200 ? `${log.detail.slice(0, 200)}...` : log.detail}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Integrations;