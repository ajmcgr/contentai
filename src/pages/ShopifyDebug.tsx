import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

const ShopifyDebug = () => {
  const [shop, setShop] = useState('content-ai-2.myshopify.com');
  const [loading, setLoading] = useState(false);
  const [debugData, setDebugData] = useState<any>(null);
  const { toast } = useToast();

  const runDiagnostic = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await supabase.functions.invoke('shopify-debug', {
        body: { shop },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Debug failed');
      }

      setDebugData(response.data);
    } catch (error: any) {
      toast({
        title: "Debug Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const testOAuthStart = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      // This should start the OAuth flow
      const { data, error } = await supabase.functions.invoke('shopify-oauth-start', {
        body: { shop, userId: session.user.id }
      });

      if (error) {
        throw new Error(error.message);
      }

      toast({
        title: "OAuth Started",
        description: "Check the Network tab for the redirect response",
      });
    } catch (error: any) {
      toast({
        title: "OAuth Start Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Shopify Integration Debug</h1>
        <p className="text-muted-foreground">
          Diagnostic tool to troubleshoot Shopify OAuth issues
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Test Shopify Store Connection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Input
              placeholder="your-store.myshopify.com"
              value={shop}
              onChange={(e) => setShop(e.target.value)}
              className="flex-1"
            />
            <Button 
              onClick={runDiagnostic}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Run Diagnostic'}
            </Button>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={testOAuthStart}>
              Test OAuth Start
            </Button>
            <Button 
              variant="outline"
              onClick={() => window.open('https://supabase.com/dashboard/project/hmrzmafwvhifjhsoizil/functions/shopify-oauth-callback/logs', '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View Callback Logs
            </Button>
          </div>
        </CardContent>
      </Card>

      {debugData && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {debugData.installation.exists ? 
                  <CheckCircle className="h-5 w-5 text-green-600" /> : 
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                }
                Installation Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {debugData.installation.exists ? (
                <div className="space-y-2">
                  <Badge variant="default">Connected</Badge>
                  <div className="text-sm space-y-1">
                    <p><strong>Shop:</strong> {debugData.installation.details.external_id}</p>
                    <p><strong>Connected:</strong> {new Date(debugData.installation.details.created_at).toLocaleString()}</p>
                    <p><strong>Scope:</strong> {debugData.installation.details.scope}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Badge variant="destructive">Not Connected</Badge>
                  <p className="text-sm text-muted-foreground">
                    No installation found for {debugData.shop}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>OAuth States</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Badge variant="secondary">
                  {debugData.oauth_states.count} states found
                </Badge>
                <div className="text-xs space-y-1 max-h-32 overflow-y-auto">
                  {debugData.oauth_states.states.map((state: any, i: number) => (
                    <div key={i} className="font-mono text-xs bg-muted p-1 rounded">
                      {state.state.substring(0, 8)}... - {new Date(state.expires_at).toLocaleString()}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Recent Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {debugData.logs.entries.map((log: any, i: number) => (
                  <div key={i} className="text-xs bg-muted p-2 rounded">
                    <div className="flex justify-between items-start">
                      <span className="font-mono">{log.stage}</span>
                      <Badge variant="outline" className="text-xs">
                        {log.level}
                      </Badge>
                    </div>
                    {log.correlation_id && (
                      <div className="text-muted-foreground mt-1">
                        ID: {log.correlation_id}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Common Issues:</strong>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>OAuth callback URL not matching in Shopify Partner Dashboard</li>
            <li>App not approved for the development store</li>
            <li>HMAC verification failing in callback</li>
            <li>State parameter not found or expired</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default ShopifyDebug;