import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Store, Settings, BarChart3 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { startShopifyOAuth } from '@/lib/integrationsClient';
const ShopifyApp = () => {
  const [searchParams] = useSearchParams();
  const shop = searchParams.get('shop');
  const [isEmbedded, setIsEmbedded] = useState(false);

  useEffect(() => {
    // Check if we're embedded in Shopify admin
    setIsEmbedded(window.top !== window);
    
    // Set up Shopify App Bridge if embedded
    if (window.top !== window && shop) {
      document.title = 'Content AI - Shopify App';
    }
  }, [shop]);

  useEffect(() => {
    const installed = searchParams.get('installed');
    if (shop && !installed) {
      try {
        startShopifyOAuth({ shop, userId: 'unknown-user' });
      } catch (e) {
        console.error('Failed to start Shopify OAuth:', e);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop]);

  const features = [
    {
      icon: <Store className="h-5 w-5" />,
      title: 'Blog Management',
      description: 'Create and publish blog posts directly to your Shopify store',
      status: 'active'
    },
    {
      icon: <Settings className="h-5 w-5" />,
      title: 'Content Generation',
      description: 'AI-powered content creation for your products and blog',
      status: 'active'
    },
    {
      icon: <BarChart3 className="h-5 w-5" />,
      title: 'Analytics',
      description: 'Track your content performance and SEO metrics',
      status: 'coming-soon'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
              <Store className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Content AI</h1>
              <p className="text-muted-foreground">
                AI-powered content creation for Shopify
              </p>
            </div>
          </div>
          
          {shop && (
            <div className="flex items-center justify-center gap-2">
              <Badge variant="secondary">
                <CheckCircle className="h-3 w-3 mr-1" />
                Connected to {shop}
              </Badge>
            </div>
          )}
        </div>

        {/* Welcome Message */}
        <Card>
          <CardHeader>
            <CardTitle>Welcome to Content AI!</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Your app has been successfully installed and is ready to use. 
              Start creating amazing content for your Shopify store with AI assistance.
            </p>
            <div className="flex gap-3">
              <Button 
                onClick={() => window.open('/dashboard/write', '_blank')}
                className="flex-1"
              >
                Start Writing
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.open('/dashboard/settings', '_blank')}
                className="flex-1"
              >
                Configure Settings
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    {feature.icon}
                  </div>
                  <span className="text-lg">{feature.title}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-3">
                  {feature.description}
                </p>
                <Badge 
                  variant={feature.status === 'active' ? 'default' : 'secondary'}
                >
                  {feature.status === 'active' ? 'Available' : 'Coming Soon'}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => window.open('/dashboard/articles', '_blank')}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              View Your Articles
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => window.open('/dashboard/topics', '_blank')}
            >
              <Settings className="h-4 w-4 mr-2" />
              Manage Content Topics
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => window.open('/help-center', '_blank')}
            >
              <Store className="h-4 w-4 mr-2" />
              Get Help & Support
            </Button>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center pt-8 border-t">
          <p className="text-sm text-muted-foreground">
            Need help? Visit our{' '}
            <a 
              href="/help-center" 
              target="_blank" 
              className="underline hover:no-underline"
            >
              Help Center
            </a>{' '}
            or contact support.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ShopifyApp;