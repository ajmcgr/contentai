import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';

const ShopifyDebug = () => {
  const [shop, setShop] = useState('');
  const [debugUrl, setDebugUrl] = useState('');
  const [userId, setUserId] = useState('');

  React.useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        setUserId(session.user.id);
      }
    };
    getCurrentUser();
  }, []);

  const generateDebugUrl = () => {
    if (!shop || !shop.endsWith('.myshopify.com')) {
      alert('Please enter a valid shop domain ending with .myshopify.com');
      return;
    }
    if (!userId) {
      alert('Not authenticated');
      return;
    }

    const url = `https://hmrzmafwvhifjhsoizil.supabase.co/functions/v1/shopify-oauth-start?shop=${encodeURIComponent(shop)}&userId=${encodeURIComponent(userId)}`;
    setDebugUrl(url);
  };

  const testDirectNavigation = () => {
    if (!debugUrl) {
      alert('Generate URL first');
      return;
    }
    console.log('🔍 Testing direct navigation to:', debugUrl);
    window.open(debugUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Shopify OAuth Debug</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Debug Shopify OAuth Flow</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Shop Domain</label>
            <Input
              placeholder="mystore.myshopify.com"
              value={shop}
              onChange={(e) => setShop(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">User ID</label>
            <Input
              value={userId}
              disabled
              className="bg-muted"
            />
          </div>

          <Button onClick={generateDebugUrl} className="w-full">
            Generate OAuth URL
          </Button>

          {debugUrl && (
            <div className="space-y-3">
              <Alert>
                <AlertDescription>
                  <div className="space-y-2">
                    <strong>Generated URL:</strong>
                    <div className="p-2 bg-muted rounded text-sm font-mono break-all">
                      {debugUrl}
                    </div>
                  </div>
                </AlertDescription>
              </Alert>

              <Button onClick={testDirectNavigation} variant="outline" className="w-full">
                Test in New Tab
              </Button>

              <Alert>
                <AlertDescription>
                  <strong>Expected behavior:</strong>
                  <ol className="list-decimal ml-4 mt-2 space-y-1">
                    <li>Should redirect to your shop's OAuth page: <code>https://{shop}/admin/oauth/authorize</code></li>
                    <li>Should NOT go to <code>accounts.shopify.com</code></li>
                    <li>Should show your app's OAuth consent screen</li>
                  </ol>
                </AlertDescription>
              </Alert>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Troubleshooting</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div>
              <strong>If you see accounts.shopify.com:</strong>
              <ul className="list-disc ml-4 mt-1 space-y-1">
                <li>You're seeing Shopify Partners OAuth, not app OAuth</li>
                <li>Check if you clicked the right integration button</li>
                <li>Verify your Shopify app configuration</li>
              </ul>
            </div>
            <div>
              <strong>If you get blocked/refused to connect:</strong>
              <ul className="list-disc ml-4 mt-1 space-y-1">
                <li>Shopify blocks OAuth in iframes for security</li>
                <li>Our function uses iframe-busting to redirect to top window</li>
                <li>Try testing in a new tab using the button above</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ShopifyDebug;