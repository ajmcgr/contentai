import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, Shield, TestTube, CheckCircle, XCircle, Copy } from "lucide-react";
import { Navigate } from "react-router-dom";

interface ConfigData {
  hasClientId: boolean;
  hasClientSecret: boolean;
  clientId: string;
  redirectUri: string;
  updatedAt: string | null;
  updatedByUserId: string | null;
}

export const IntegrationSettings = () => {
  const [session, setSession] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [configData, setConfigData] = useState<ConfigData | null>(null);
  const [formData, setFormData] = useState({
    clientId: '',
    clientSecret: ''
  });

  useEffect(() => {
    // Check authentication and admin role
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      
      if (session?.user) {
        // Check if user is admin
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .eq('role', 'admin')
          .maybeSingle();
        
        setIsAdmin(!!roleData);
        
        if (roleData) {
          fetchConfigData();
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const fetchConfigData = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('wp-config');
      
      if (error) throw error;
      
      if (data.success) {
        setConfigData(data);
        setFormData(prev => ({
          ...prev,
          clientId: data.clientId || ''
        }));
      }
    } catch (error: any) {
      console.error('Error fetching config:', error);
      toast({
        title: "Error",
        description: "Failed to load configuration data",
        variant: "destructive",
      });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { data, error } = await supabase.functions.invoke('wp-config', {
        body: {
          clientId: formData.clientId,
          clientSecret: formData.clientSecret
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Success",
          description: "Configuration updated successfully",
        });
        
        // Clear the secret field and refresh data
        setFormData(prev => ({ ...prev, clientSecret: '' }));
        await fetchConfigData();
      } else {
        throw new Error(data.error || 'Update failed');
      }
    } catch (error: any) {
      console.error('Error updating config:', error);
      toast({
        title: "Error", 
        description: error.message || "Failed to update configuration",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);

    try {
      const { data, error } = await supabase.functions.invoke('wp-config');

      if (error) throw error;

      if (data.success && data.hasClientId && data.hasClientSecret) {
        toast({
          title: "Connection Test Successful",
          description: "WordPress.com OAuth configuration is valid",
        });
      } else {
        throw new Error('Configuration incomplete - missing Client ID or Client Secret');
      }
    } catch (error: any) {
      console.error('Connection test error:', error);
      toast({
        title: "Connection Test Failed",
        description: error.message || "Failed to test connection",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleCopyRedirectUri = async () => {
    if (configData?.redirectUri) {
      await navigator.clipboard.writeText(configData.redirectUri);
      toast({
        title: "Copied!",
        description: "Redirect URI copied to clipboard",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/signin" />;
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-destructive">Access Denied</CardTitle>
            <CardDescription className="text-center">
              You need admin privileges to access this page.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Integration Settings</h1>
        <p className="text-muted-foreground">
          Manage WordPress-Supabase OAuth credentials and integration settings.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Configuration Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              WordPress-Supabase OAuth Configuration
            </CardTitle>
            <CardDescription>
              Manage the OAuth credentials for WordPress.com integration.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="clientId">WordPress.com Client ID</Label>
                <Input
                  id="clientId"
                  type="text"
                  value={formData.clientId}
                  onChange={(e) => setFormData(prev => ({ ...prev, clientId: e.target.value }))}
                  placeholder="Enter client ID"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientSecret">WordPress.com Client Secret</Label>
                <Input
                  id="clientSecret"
                  type="password"
                  value={formData.clientSecret}
                  onChange={(e) => setFormData(prev => ({ ...prev, clientSecret: e.target.value }))}
                  placeholder="••••••••"
                />
                <p className="text-sm text-muted-foreground">
                  Leave blank to keep the current secret unchanged.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="redirectUri">Redirect URI (Read-only)</Label>
                <div className="flex gap-2">
                  <Input
                    id="redirectUri"
                    type="text"
                    value={configData?.redirectUri || 'https://hmrzmafwvhifjhsoizil.supabase.co/functions/v1/wp-oauth-callback'}
                    readOnly
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopyRedirectUri}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Use this URL as the redirect URI in your WordPress.com app settings.
                </p>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Configuration
                </Button>
                
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleTestConnection}
                  disabled={testing}
                >
                  {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {!testing && <TestTube className="mr-2 h-4 w-4" />}
                  Test Connection
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Diagnostics Panel */}
        {configData && (
          <Card>
            <CardHeader>
              <CardTitle>Configuration Diagnostics</CardTitle>
              <CardDescription>
                Current status of your WordPress-Supabase integration configuration.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center gap-2">
                  {configData.hasClientId ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <span className="font-medium">Has Client ID:</span>
                  <span className={configData.hasClientId ? "text-green-600" : "text-red-600"}>
                    {configData.hasClientId ? "Yes" : "No"}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {configData.hasClientSecret ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <span className="font-medium">Has Client Secret:</span>
                  <span className={configData.hasClientSecret ? "text-green-600" : "text-red-600"}>
                    {configData.hasClientSecret ? "Yes" : "No"}
                  </span>
                </div>

                {configData.updatedAt && (
                  <div className="md:col-span-2 space-y-1">
                    <div><span className="font-medium">Last Updated:</span> {new Date(configData.updatedAt).toLocaleString()}</div>
                    {configData.updatedByUserId && (
                      <div><span className="font-medium">Updated By:</span> {configData.updatedByUserId}</div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Security Notice */}
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-800">Security Notice</CardTitle>
          </CardHeader>
          <CardContent className="text-yellow-700">
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Client secrets are never displayed in the UI for security reasons</li>
              <li>All credential operations are performed server-side only</li>
              <li>Access to this page requires admin privileges</li>
              <li>All configuration changes are logged with user information</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};