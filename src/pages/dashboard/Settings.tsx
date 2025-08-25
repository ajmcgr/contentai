import { useState, useEffect } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { TrialBanner } from "@/components/TrialBanner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Upload, Globe, Clock, Key, Trash2, Check, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const { toast } = useToast();
  
  // Load existing brand settings on component mount
  useEffect(() => {
    const loadBrandSettings = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: settingsArray } = await supabase
          .from('brand_settings')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false });
        
        const settings = settingsArray?.[0];

        if (settings) {
          setBrandSettings({
            logo: null,
            logoUrl: settings.logo_url,
            brandName: settings.brand_name || '',
            description: settings.description || '',
            targetAudience: settings.target_audience || '',
            language: settings.language || 'en-US',
            toneOfVoice: settings.tone_of_voice || '',
            industry: settings.industry || '',
            tags: settings.tags ? settings.tags.join(', ') : '',
            internalLinks: settings.internal_links ? settings.internal_links.join(', ') : ''
          });
        }

        // Load content settings from content_templates
        const { data: contentTemplate } = await supabase
          .from('content_templates')
          .select('id, structure')
          .eq('user_id', user.id)
          .eq('template_type', 'content_settings')
          .eq('name', 'default')
          .maybeSingle();

        if (contentTemplate && (contentTemplate as any).structure) {
          const s = (contentTemplate as any).structure as any;
          setContentSettings(prev => ({
            ...prev,
            ...s,
          }));
        }

        // Load existing profile with avatar
        const { data: profile } = await supabase
          .from('profiles')
          .select('avatar_url, full_name')
          .eq('id', user.id)
          .maybeSingle();

        if (profile) {
          const nameParts = (profile.full_name || '').split(' ');
          setAccountSettings(prev => ({
            ...prev,
            avatarUrl: profile.avatar_url,
            firstName: nameParts[0] || '',
            lastName: nameParts.slice(1).join(' ') || '',
          }));
        }
      } catch (error) {
        console.error('Error loading brand/content settings:', error);
      }
    };

    loadBrandSettings();
    fetchConnections();
    
    const params = new URLSearchParams(window.location.search);
    const platform = params.get('platform');
    const success = params.get('success');
    if (platform === 'wordpress' && success === '1') {
      toast({
        title: 'Connection successful',
        description: 'Connected to WordPress successfully.'
      });
      fetchConnections();
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [toast]);

  const saveBrandSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to save settings.",
          variant: "destructive",
        });
        return;
      }

      const brandData = {
        user_id: user.id,
        brand_name: brandSettings.brandName,
        description: brandSettings.description,
        target_audience: brandSettings.targetAudience,
        industry: brandSettings.industry,
        tone_of_voice: brandSettings.toneOfVoice,
        language: brandSettings.language,
        tags: brandSettings.tags ? brandSettings.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        internal_links: brandSettings.internalLinks ? brandSettings.internalLinks.split(',').map(l => l.trim()).filter(Boolean) : []
      };

      // Upsert by user_id to avoid duplicates
      const { error: upsertError } = await supabase
        .from('brand_settings')
        .upsert({
          ...brandData,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (upsertError) throw upsertError;

      toast({
        title: "Brand settings saved!",
        description: "Your brand information has been updated successfully.",
      });
    } catch (error: any) {
      console.error('Error saving brand settings:', error);
      toast({
        title: "Error saving settings",
        description: error.message || "Failed to save brand settings. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const saveContentSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Authentication required',
          description: 'Please sign in to save settings.',
          variant: 'destructive',
        });
        return;
      }

      const structure = { ...contentSettings };

      const { data: existing } = await supabase
        .from('content_templates')
        .select('id')
        .eq('user_id', user.id)
        .eq('template_type', 'content_settings')
        .eq('name', 'default')
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('content_templates')
          .update({ structure, updated_at: new Date().toISOString(), description: 'Content settings' })
          .eq('id', (existing as any).id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('content_templates')
          .insert({ user_id: user.id, structure, variables: [], is_public: false, name: 'default', description: 'Content settings', template_type: 'content_settings' });
        if (error) throw error;
      }

      toast({
        title: 'Content settings saved!',
        description: 'Your content preferences have been updated.',
      });
    } catch (error: any) {
      console.error('Error saving content settings:', error);
      toast({
        title: 'Error saving content settings',
        description: error.message || 'Failed to save content settings. Please try again.',
        variant: 'destructive',
      });
    }
  };
  
  const handleManageSubscription = () => {
    // Navigate to billing portal or subscription management
    window.open('https://billing.stripe.com/p/login', '_blank');
  };

  const handleDeleteAccount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // This would typically involve more complex deletion logic
      // For now, we'll just show a confirmation that it would delete
      toast({
        title: "Account deletion initiated",
        description: "Account deletion process has been started. This feature requires additional implementation.",
        variant: "destructive",
      });
    } catch (error: any) {
      console.error('Error deleting account:', error);
      toast({
        title: "Error",
        description: "Failed to delete account. Please try again.",
        variant: "destructive",
      });
    }
  };

  const saveAccountSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to save settings.",
          variant: "destructive",
        });
        return;
      }

      // Update user profile in profiles table
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: `${accountSettings.firstName} ${accountSettings.lastName}`.trim(),
          username: accountSettings.email.split('@')[0], // Use email prefix as username
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: "Account settings saved!",
        description: "Your profile information has been updated successfully.",
      });
    } catch (error: any) {
      console.error('Error saving account settings:', error);
      toast({
        title: "Error saving account settings",
        description: error.message || "Failed to save account settings. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const savePublishingSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Authentication required',
          description: 'Please sign in to save settings.',
          variant: 'destructive',
        });
        return;
      }

      const structure = { ...publishingSettings };

      const { data: existing } = await supabase
        .from('content_templates')
        .select('id')
        .eq('user_id', user.id)
        .eq('template_type', 'publishing_settings')
        .eq('name', 'default')
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('content_templates')
          .update({ structure, updated_at: new Date().toISOString(), description: 'Publishing settings' })
          .eq('id', (existing as any).id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('content_templates')
          .insert({ user_id: user.id, structure, variables: [], is_public: false, name: 'default', description: 'Publishing settings', template_type: 'publishing_settings' });
        if (error) throw error;
      }

      toast({
        title: 'Publishing settings saved!',
        description: 'Your scheduling preferences have been updated.',
      });
    } catch (error: any) {
      console.error('Error saving publishing settings:', error);
      toast({
        title: 'Error saving publishing settings',
        description: error.message || 'Failed to save publishing settings. Please try again.',
        variant: 'destructive',
      });
    }
  };
  
  const [brandSettings, setBrandSettings] = useState({
    logo: null as File | null,
    logoUrl: null as string | null,
    brandName: "",
    description: "",
    targetAudience: "",
    language: "en-US",
    toneOfVoice: "",
    industry: "",
    tags: "",
    internalLinks: ""
  });

  const [contentSettings, setContentSettings] = useState({
    useBrandInfo: true,
    articleLength: "medium",
    brandMentions: "minimal",
    internalLinksCount: "regular",
    externalSearch: true,
    externalLinks: "regular",
    language: "en-US",
    specificInstructions: "",
    exclusions: "",
    imageStyle: ""
  });

  const [accountSettings, setAccountSettings] = useState({
    profilePicture: null as File | null,
    avatarUrl: null as string | null,
    email: "alex@alexmacgregor.com",
    firstName: "Alexander",
    lastName: "MacGregor",
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const [publishingSettings, setPublishingSettings] = useState({
    scheduledDate: "",
    scheduledTime: "18:30",
    timezone: "UTC"
  });

  const [integrations, setIntegrations] = useState({
    wordpress: { connected: false, siteUrl: "", apiKey: "", name: "" },
    shopify: { connected: false, siteUrl: "", accessToken: "", name: "" },
    webflow: { connected: false, siteUrl: "", accessToken: "", name: "" },
    wix: { connected: false, siteUrl: "", accessToken: "", name: "" },
    notion: { connected: false, siteUrl: "", accessToken: "", name: "" },
    ghost: { connected: false, siteUrl: "", apiKey: "", name: "" },
    squarespace: { connected: false, siteUrl: "", accessToken: "", name: "" },
    zapier: { connected: false, siteUrl: "", apiKey: "", name: "" },
    webhook: { connected: false, siteUrl: "", apiKey: "", name: "" }
  });

  const [connectionDialog, setConnectionDialog] = useState({
    open: false,
    platform: "",
    siteUrl: "",
    apiKey: "",
    accessToken: "",
    loading: false
  });


  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    console.log('Logo upload triggered, file:', file);
    if (!file) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to upload logo.",
          variant: "destructive",
        });
        return;
      }

      // Create file path with user ID
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/logo.${fileExt}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('brand-logos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('brand-logos')
        .getPublicUrl(fileName);

      // Update brand settings with logo URL (upsert on user_id)
      const { error: updateError } = await supabase
        .from('brand_settings')
        .upsert({
          user_id: user.id,
          logo_url: publicUrl,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      if (updateError) {
        throw updateError;
      }

      console.log('Logo uploaded successfully, URL:', publicUrl);
      setBrandSettings(prev => ({ ...prev, logo: file, logoUrl: publicUrl }));

      toast({
        title: "Logo uploaded successfully!",
        description: "Your brand logo has been saved.",
      });
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      toast({
        title: "Error uploading logo",
        description: error.message || "Failed to upload logo. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleProfilePictureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    console.log('Profile picture upload triggered, file:', file);
    if (!file) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to upload profile picture.",
          variant: "destructive",
        });
        return;
      }

      // Create file path with user ID
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profiles with avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          avatar_url: publicUrl,
          updated_at: new Date().toISOString()
        });

      if (updateError) {
        throw updateError;
      }

      console.log('Profile picture uploaded successfully, URL:', publicUrl);
      setAccountSettings(prev => ({ ...prev, profilePicture: file, avatarUrl: publicUrl }));

      toast({
        title: "Profile picture uploaded successfully!",
        description: "Your profile picture has been saved.",
      });
    } catch (error: any) {
      console.error('Error uploading profile picture:', error);
      toast({
        title: "Error uploading profile picture",
        description: error.message || "Failed to upload profile picture. Please try again.",
        variant: "destructive",
      });
    }
  };

  const openConnectionDialog = (platform: string) => {
    setConnectionDialog({
      open: true,
      platform,
      siteUrl: "",
      apiKey: "",
      accessToken: "",
      loading: false
    });
  };

  const closeConnectionDialog = () => {
    setConnectionDialog({
      open: false,
      platform: "",
      siteUrl: "",
      apiKey: "",
      accessToken: "",
      loading: false
    });
  };

  // Fetch existing connections and handle OAuth return
  const fetchConnections = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('cms-integration/status', { method: 'GET' });
      if (!error && data?.success && Array.isArray(data.connections)) {
        setIntegrations(prev => {
          const next: typeof prev = { ...prev };
          for (const c of data.connections as any[]) {
            if ((next as any)[c.platform]) {
              (next as any)[c.platform] = {
                connected: true,
                siteUrl: c.site_url,
                apiKey: '',
                accessToken: '',
                name: c.site_url
              } as any;
            }
          }
          return next;
        });
      }
    } catch {}
  };

  useEffect(() => {
    fetchConnections();
    const params = new URLSearchParams(window.location.search);
    const platform = params.get('platform');
    const success = params.get('success');
    if (platform === 'wordpress' && success === '1') {
      toast({
        title: 'Connection successful',
        description: 'Connected to WordPress successfully.'
      });
      fetchConnections();
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  const handleConnect = async () => {
    setConnectionDialog(prev => ({ ...prev, loading: true }));

    try {
      // Basic client-side validation
      if (!connectionDialog.platform) throw new Error('Please choose a platform.');
      if (!connectionDialog.siteUrl) throw new Error('Please enter your site URL.');
      if ((connectionDialog.platform === 'wordpress' || connectionDialog.platform === 'webhook') && !connectionDialog.apiKey) {
        // Check if it's WordPress.com (requires OAuth)
        if (connectionDialog.platform === 'wordpress' && 
            (connectionDialog.siteUrl.includes('wordpress.com') || connectionDialog.siteUrl.includes('.wordpress.com'))) {
          // Start OAuth flow for WordPress.com
          await handleWordPressComOAuth();
          return;
        }
        throw new Error(connectionDialog.platform === 'wordpress'
          ? 'Enter WordPress credentials: username:application_password'
          : 'Enter your webhook secret/key');
      }
      if (!(connectionDialog.platform === 'wordpress' || connectionDialog.platform === 'webhook') && !connectionDialog.accessToken) {
        throw new Error('Please enter an access token.');
      }

      const { data, error } = await supabase.functions.invoke('cms-integration/connect', {
        body: {
          platform: connectionDialog.platform,
          siteUrl: connectionDialog.siteUrl,
          ...(connectionDialog.platform === 'wordpress' || connectionDialog.platform === 'webhook'
            ? { apiKey: connectionDialog.apiKey }
            : { accessToken: connectionDialog.accessToken }
          )
        }
      });

      if (error) {
        const status = (error as any)?.context?.response?.status;
        // Try to extract error details from function response
        let details = (error as any)?.message || 'Failed to connect to the platform.';
        try {
          const text = await (error as any)?.context?.response?.text();
          const json = text ? JSON.parse(text) : null;
          if (json?.error) details = json.error;
        } catch {}

        if (status === 401) {
          toast({
            title: 'Please sign in',
            description: 'Your session expired. Sign in and try connecting again.',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Connection failed',
            description: details,
            variant: 'destructive',
          });
        }
        return;
      }

      // Check if OAuth is required
      if (data?.requiresOAuth && data?.oauthUrl) {
        toast({
          title: 'Authorization Required',
          description: 'Please complete the authorization in the popup window.',
        });

        const popup = window.open(
          data.oauthUrl,
          'wordpress_oauth',
          'width=500,height=600,scrollbars=yes,resizable=yes'
        );

        if (!popup) {
          toast({
            title: 'Popup blocked',
            description: 'Please allow popups and try again.',
            variant: 'destructive',
          });
          return;
        }

        const handleMessage = (event: MessageEvent) => {
          if (event.data.type === 'wordpress_connected' && event.data.success) {
            window.removeEventListener('message', handleMessage);
            popup.close();
            toast({ title: 'WordPress Connected!', description: 'Successfully connected to your WordPress site.' });
            fetchConnections();
            setConnectionDialog(prev => ({ ...prev, open: false, loading: false }));
          }
        };

        window.addEventListener('message', handleMessage);

        const checkClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkClosed);
            window.removeEventListener('message', handleMessage);
            setConnectionDialog(prev => ({ ...prev, loading: false }));
          }
        }, 1000);
        return;
      }

      if (data?.success) {
        setIntegrations(prev => ({
          ...prev,
          [connectionDialog.platform]: {
            connected: true,
            siteUrl: connectionDialog.siteUrl,
            ...(['wordpress', 'ghost', 'zapier', 'webhook'].includes(connectionDialog.platform)
              ? { apiKey: connectionDialog.apiKey }
              : { accessToken: connectionDialog.accessToken }
            ),
            name: connectionDialog.siteUrl
          }
        }));

        toast({
          title: 'Connection successful!',
          description: `Successfully connected to your ${connectionDialog.platform} site.`,
        });

        closeConnectionDialog();
      } else {
        toast({
          title: 'Connection failed',
          description: data?.error || 'Failed to connect to the platform. Please check your credentials.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Connection error:', error);
      toast({
        title: 'Connection failed',
        description: error.message || 'Failed to connect to the platform. Please check your credentials.',
        variant: 'destructive',
      });
    } finally {
      setConnectionDialog(prev => ({ ...prev, loading: false }));
    }
  };

  const handleWordPressComOAuth = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('cms-integration/oauth-start', {
        body: {
          platform: 'wordpress',
          siteUrl: connectionDialog.siteUrl
        }
      });

      if (error || !data?.success) {
        throw new Error(data?.error || 'Failed to start OAuth flow');
      }

      // Open OAuth URL in popup
      const popup = window.open(
        data.oauthUrl,
        'wordpress_oauth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      if (!popup) {
        throw new Error('Popup blocked. Please allow popups and try again.');
      }

      toast({
        title: 'Authorization Required',
        description: 'Please complete the authorization in the popup window.',
      });

      // Listen for popup messages
      const handleMessage = async (event: MessageEvent) => {
        // New flow: popup sends code/state back to parent
        if (event.data.type === 'wordpress_oauth_callback' && event.data.code && event.data.state) {
          try {
            const { data, error } = await supabase.functions.invoke('cms-integration/oauth-callback', {
              body: {
                code: event.data.code,
                state: event.data.state,
                siteUrl: connectionDialog.siteUrl
              }
            });

            if (error || !data?.success) {
              throw new Error(data?.error || 'OAuth callback failed');
            }

            window.removeEventListener('message', handleMessage);
            popup.close();
            toast({ title: 'WordPress Connected!', description: 'Successfully connected to your WordPress site.' });
            fetchConnections();
            setConnectionDialog(prev => ({ ...prev, open: false, loading: false }));
          } catch (error: any) {
            console.error('OAuth callback error:', error);
            toast({ title: 'Connection Failed', description: error.message || 'Failed to complete WordPress connection', variant: 'destructive' });
            setConnectionDialog(prev => ({ ...prev, loading: false }));
          }
        }
        // Legacy flow: popup already saved connection and just signals success
        else if (event.data.type === 'wordpress_connected' && event.data.success) {
          window.removeEventListener('message', handleMessage);
          popup.close();
          toast({ title: 'WordPress Connected!', description: 'Successfully connected to your WordPress site.' });
          fetchConnections();
          setConnectionDialog(prev => ({ ...prev, open: false, loading: false }));
        }
        else if (event.data.type === 'wordpress_oauth_error') {
          window.removeEventListener('message', handleMessage);
          popup.close();
          toast({ title: 'OAuth Error', description: event.data.error || 'OAuth authorization failed', variant: 'destructive' });
          setConnectionDialog(prev => ({ ...prev, loading: false }));
        }
      };

      window.addEventListener('message', handleMessage);

      // Check if popup was closed manually
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', handleMessage);
          setConnectionDialog(prev => ({ ...prev, loading: false }));
        }
      }, 1000);

    } catch (error: any) {
      console.error('WordPress OAuth error:', error);
      toast({
        title: 'OAuth Error',
        description: error.message || 'Failed to start WordPress.com OAuth flow',
        variant: 'destructive',
      });
      setConnectionDialog(prev => ({ ...prev, loading: false }));
    }
  };

const handleDisconnect = async (platform: string) => {
  try {
    const siteUrl = (integrations as any)[platform]?.siteUrl || '';

    const { data, error } = await supabase.functions.invoke('cms-integration/disconnect', {
      body: { platform, siteUrl }
    });

    if (error || !data?.success) {
      throw new Error(data?.error || 'Failed to disconnect');
    }

    setIntegrations(prev => ({
      ...prev,
      [platform]: { connected: false, siteUrl: '', apiKey: '', accessToken: '', name: '' }
    }));

    toast({ title: 'Disconnected', description: `Successfully disconnected from ${platform}.` });
  } catch (error: any) {
    console.error('Disconnect error:', error);
    toast({ title: 'Error', description: error.message || 'Failed to disconnect from the platform.', variant: 'destructive' });
  }
};

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar />
        
        <div className="flex-1 flex flex-col">
          <div className="flex items-center gap-4 p-6">
            <span className="text-sm text-muted-foreground">
              Dashboard / Settings
            </span>
          </div>

          <div className="flex-1 p-6">
            <TrialBanner />
            
            <div className="max-w-4xl mx-auto">
              <h1 className="text-3xl font-bold mb-8">Settings</h1>
              
              <Tabs defaultValue="brand" className="space-y-6">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="brand">Brand</TabsTrigger>
                  <TabsTrigger value="content">Content</TabsTrigger>
                  <TabsTrigger value="account">Account</TabsTrigger>
                  <TabsTrigger value="integrations">Integrations</TabsTrigger>
                  <TabsTrigger value="publishing">Publishing</TabsTrigger>
                </TabsList>

                <TabsContent value="brand" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Brand Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="logo">Upload Logo</Label>
                        <div className="flex items-center gap-4">
                           <div className="w-20 h-20 border-2 border-dashed border-muted-foreground rounded-lg flex items-center justify-center">
                             {brandSettings.logo || brandSettings.logoUrl ? (
                               <img 
                                 src={brandSettings.logo ? URL.createObjectURL(brandSettings.logo) : brandSettings.logoUrl!} 
                                 alt="Logo" 
                                 className="w-full h-full object-cover rounded-lg"
                               />
                             ) : (
                               <Upload className="w-8 h-8 text-muted-foreground" />
                             )}
                           </div>
                          <Input
                            id="logo"
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            className="max-w-xs"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="brandName">Brand Name (used by customers)</Label>
                          <Input
                            id="brandName"
                            value={brandSettings.brandName}
                            onChange={(e) => setBrandSettings(prev => ({ ...prev, brandName: e.target.value }))}
                            placeholder="Enter your brand name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="industry">Industry</Label>
                          <Input
                            id="industry"
                            value={brandSettings.industry}
                            onChange={(e) => setBrandSettings(prev => ({ ...prev, industry: e.target.value }))}
                            placeholder="e.g., Technology, Healthcare"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={brandSettings.description}
                          onChange={(e) => setBrandSettings(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Describe your brand and what it does"
                          rows={3}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="targetAudience">Target Audience</Label>
                        <Textarea
                          id="targetAudience"
                          value={brandSettings.targetAudience}
                          onChange={(e) => setBrandSettings(prev => ({ ...prev, targetAudience: e.target.value }))}
                          placeholder="Describe your target audience"
                          rows={2}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Language by default</Label>
                          <Select value={brandSettings.language} onValueChange={(value) => setBrandSettings(prev => ({ ...prev, language: value }))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="en-US">🇺🇸 English (United States)</SelectItem>
                              <SelectItem value="en-GB">🇬🇧 English (United Kingdom)</SelectItem>
                              <SelectItem value="es-ES">🇪🇸 Spanish (Spain)</SelectItem>
                              <SelectItem value="fr-FR">🇫🇷 French (France)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="toneOfVoice">Tone of voice</Label>
                          <Input
                            id="toneOfVoice"
                            value={brandSettings.toneOfVoice}
                            onChange={(e) => setBrandSettings(prev => ({ ...prev, toneOfVoice: e.target.value }))}
                            placeholder="e.g., Professional, Friendly, Casual"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="tags">Tags</Label>
                        <Input
                          id="tags"
                          value={brandSettings.tags}
                          onChange={(e) => setBrandSettings(prev => ({ ...prev, tags: e.target.value }))}
                          placeholder="Enter tags separated by commas"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="internalLinks">Internal links</Label>
                        <Textarea
                          id="internalLinks"
                          value={brandSettings.internalLinks}
                          onChange={(e) => setBrandSettings(prev => ({ ...prev, internalLinks: e.target.value }))}
                          placeholder="Add important internal links (one per line)"
                          rows={3}
                        />
                      </div>

                      <Button onClick={saveBrandSettings}>Save Brand Settings</Button>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="content" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Content Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <Label>Use brand info</Label>
                            <p className="text-sm text-muted-foreground">
                              When selected, Content AI uses both the topic brief and your brand info (description, activity, audience, internal links) to tailor the article. If not, only the brief is used.
                            </p>
                          </div>
                          <Switch
                            checked={contentSettings.useBrandInfo}
                            onCheckedChange={(checked) => setContentSettings(prev => ({ ...prev, useBrandInfo: checked }))}
                          />
                        </div>
                        <div className="text-sm">
                          {contentSettings.useBrandInfo ? (
                            <span className="text-green-600">Using brand info</span>
                          ) : (
                            <span className="text-muted-foreground">Not using brand info</span>
                          )}
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-3">
                        <Label>Article Length Target</Label>
                        <p className="text-sm text-muted-foreground">Set the word count of your articles.</p>
                        <RadioGroup
                          value={contentSettings.articleLength}
                          onValueChange={(value) => setContentSettings(prev => ({ ...prev, articleLength: value }))}
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="short" id="short" />
                            <Label htmlFor="short">Short (800 - 1,200 words)</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="medium" id="medium" />
                            <Label htmlFor="medium">Medium (1,200 - 1,600 words)</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="long" id="long" />
                            <Label htmlFor="long">Long (1,600 - 2,000 words)</Label>
                          </div>
                        </RadioGroup>
                      </div>

                      <div className="space-y-3">
                        <Label>Brand mentions</Label>
                        <p className="text-sm text-muted-foreground">How often mentions to your brand/product should appear in the content.</p>
                        <RadioGroup
                          value={contentSettings.brandMentions}
                          onValueChange={(value) => setContentSettings(prev => ({ ...prev, brandMentions: value }))}
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="none" id="mentions-none" />
                            <Label htmlFor="mentions-none">None</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="minimal" id="mentions-minimal" />
                            <Label htmlFor="mentions-minimal">Minimal</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="regular" id="mentions-regular" />
                            <Label htmlFor="mentions-regular">Regular</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="maximal" id="mentions-maximal" />
                            <Label htmlFor="mentions-maximal">Maximal</Label>
                          </div>
                        </RadioGroup>
                      </div>

                      <div className="space-y-3">
                        <Label>Internal Links</Label>
                        <p className="text-sm text-muted-foreground">Number of links to other pages of your website to include.</p>
                        <RadioGroup
                          value={contentSettings.internalLinksCount}
                          onValueChange={(value) => setContentSettings(prev => ({ ...prev, internalLinksCount: value }))}
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="none" id="internal-none" />
                            <Label htmlFor="internal-none">None</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="few" id="internal-few" />
                            <Label htmlFor="internal-few">Few (1-2)</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="regular" id="internal-regular" />
                            <Label htmlFor="internal-regular">Regular (3-4)</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="many" id="internal-many" />
                            <Label htmlFor="internal-many">Many (over 5)</Label>
                          </div>
                        </RadioGroup>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <Label>External Search</Label>
                            <p className="text-sm text-muted-foreground">
                              Auto-search for latest news, data, reports related to your topic.
                            </p>
                          </div>
                          <Switch
                            checked={contentSettings.externalSearch}
                            onCheckedChange={(checked) => setContentSettings(prev => ({ ...prev, externalSearch: checked }))}
                          />
                        </div>
                        <div className="text-sm">
                          <span className={contentSettings.externalSearch ? "text-green-600" : "text-muted-foreground"}>
                            {contentSettings.externalSearch ? "Yes" : "No"}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Label>External Links</Label>
                        <p className="text-sm text-muted-foreground">Number of links to external references related to your topics (media, research, blogs).</p>
                        <RadioGroup
                          value={contentSettings.externalLinks}
                          onValueChange={(value) => setContentSettings(prev => ({ ...prev, externalLinks: value }))}
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="none" id="external-none" />
                            <Label htmlFor="external-none">None</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="few" id="external-few" />
                            <Label htmlFor="external-few">Few (1-2)</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="regular" id="external-regular" />
                            <Label htmlFor="external-regular">Regular (3-4)</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="many" id="external-many" />
                            <Label htmlFor="external-many">Many (over 5)</Label>
                          </div>
                        </RadioGroup>
                      </div>

                      <div className="space-y-2">
                        <Label>Language by default</Label>
                        <p className="text-sm text-muted-foreground">The default targeted language and market for your articles.</p>
                        <Select value={contentSettings.language || "en-US"} onValueChange={(value) => setContentSettings(prev => ({ ...prev, language: value }))}>
                          <SelectTrigger className="max-w-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="en-US">🇺🇸 English (United States)</SelectItem>
                            <SelectItem value="en-GB">🇬🇧 English (United Kingdom)</SelectItem>
                            <SelectItem value="es-ES">🇪🇸 Spanish (Spain)</SelectItem>
                            <SelectItem value="fr-FR">🇫🇷 French (France)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="specificInstructions">Specific Instructions</Label>
                        <p className="text-sm text-muted-foreground">Additional rules the articles will follow.</p>
                        <Textarea
                          id="specificInstructions"
                          value={contentSettings.specificInstructions}
                          onChange={(e) => setContentSettings(prev => ({ ...prev, specificInstructions: e.target.value }))}
                          placeholder="e.g., Be super friendly"
                          rows={3}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="exclusions">Exclusions</Label>
                        <p className="text-sm text-muted-foreground">Elements to avoid in the articles.</p>
                        <Textarea
                          id="exclusions"
                          value={contentSettings.exclusions}
                          onChange={(e) => setContentSettings(prev => ({ ...prev, exclusions: e.target.value }))}
                          placeholder="e.g., Never mention this or this"
                          rows={3}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="imageStyle">Image Style</Label>
                        <p className="text-sm text-muted-foreground">Visuals style of images generated within the articles.</p>
                        <Input
                          id="imageStyle"
                          value={contentSettings.imageStyle}
                          onChange={(e) => setContentSettings(prev => ({ ...prev, imageStyle: e.target.value }))}
                          placeholder="e.g., Modern, Professional, Minimalist"
                        />
                      </div>

                      <Button onClick={saveContentSettings}>Save Content Settings</Button>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="account" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Account Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="profilePicture">Profile Picture</Label>
                        <div className="flex items-center gap-4">
                           <div className="w-20 h-20 border-2 border-dashed border-muted-foreground rounded-full flex items-center justify-center overflow-hidden">
                             {accountSettings.profilePicture || accountSettings.avatarUrl ? (
                               <img 
                                 src={accountSettings.profilePicture ? URL.createObjectURL(accountSettings.profilePicture) : accountSettings.avatarUrl!} 
                                 alt="Profile" 
                                 className="w-full h-full object-cover"
                               />
                             ) : (
                               <Upload className="w-8 h-8 text-muted-foreground" />
                             )}
                           </div>
                          <Input
                            id="profilePicture"
                            type="file"
                            accept="image/*"
                            onChange={handleProfilePictureUpload}
                            className="max-w-xs"
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Manage your account settings</h3>
                        
                        <div className="p-4 border rounded-lg space-y-2">
                          <p className="text-sm font-medium">Preview</p>
                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4" />
                            <span className="text-sm">Google account</span>
                          </div>
                          <p className="text-xs text-muted-foreground">google</p>
                          <Button variant="outline" size="sm">Link Google Account</Button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="email">Email Address</Label>
                            <Input
                              id="email"
                              type="email"
                              value={accountSettings.email}
                              onChange={(e) => setAccountSettings(prev => ({ ...prev, email: e.target.value }))}
                            />
                          </div>
                          <div></div>
                          <div className="space-y-2">
                            <Label htmlFor="firstName">First name</Label>
                            <Input
                              id="firstName"
                              value={accountSettings.firstName}
                              onChange={(e) => setAccountSettings(prev => ({ ...prev, firstName: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="lastName">Last name</Label>
                            <Input
                              id="lastName"
                              value={accountSettings.lastName}
                              onChange={(e) => setAccountSettings(prev => ({ ...prev, lastName: e.target.value }))}
                            />
                          </div>
                        </div>

                         <div className="flex gap-4">
                           <Button variant="outline" onClick={handleManageSubscription}>Manage subscription</Button>
                         </div>

                         <Button onClick={saveAccountSettings}>Save Account Settings</Button>
                       </div>

                      <Separator />

                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Password</h3>
                        
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="currentPassword">Current Password</Label>
                            <p className="text-sm text-muted-foreground">Reinforce account security</p>
                            <Input
                              id="currentPassword"
                              type="password"
                              value={accountSettings.currentPassword}
                              onChange={(e) => setAccountSettings(prev => ({ ...prev, currentPassword: e.target.value }))}
                              placeholder="Enter current password"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="newPassword">New Password</Label>
                            <Input
                              id="newPassword"
                              type="password"
                              value={accountSettings.newPassword}
                              onChange={(e) => setAccountSettings(prev => ({ ...prev, newPassword: e.target.value }))}
                              placeholder="Enter new password"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirm New Password</Label>
                            <Input
                              id="confirmPassword"
                              type="password"
                              value={accountSettings.confirmPassword}
                              onChange={(e) => setAccountSettings(prev => ({ ...prev, confirmPassword: e.target.value }))}
                              placeholder="Confirm new password"
                            />
                          </div>

                           <Button>Update Password</Button>
                         </div>
                       </div>

                       <Separator />

                       <div className="space-y-4">
                         <h3 className="text-lg font-semibold text-destructive">Danger Zone</h3>
                         <p className="text-sm text-muted-foreground">
                           Once you delete your account, there is no going back. Please be certain.
                         </p>
                         
                         <AlertDialog>
                           <AlertDialogTrigger asChild>
                             <Button variant="outline" className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground">
                               <Trash2 className="w-4 h-4 mr-2" />
                               Delete Account
                             </Button>
                           </AlertDialogTrigger>
                           <AlertDialogContent>
                             <AlertDialogHeader>
                               <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                               <AlertDialogDescription>
                                 This action cannot be undone. This will permanently delete your account,
                                 remove all your data, and cancel any active subscriptions.
                               </AlertDialogDescription>
                             </AlertDialogHeader>
                             <AlertDialogFooter>
                               <AlertDialogCancel>Cancel</AlertDialogCancel>
                               <AlertDialogAction
                                 onClick={handleDeleteAccount}
                                 className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                               >
                                 Yes, delete my account
                               </AlertDialogAction>
                             </AlertDialogFooter>
                           </AlertDialogContent>
                         </AlertDialog>
                       </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="integrations" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Integrations</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Connections</h3>
                        <p className="text-muted-foreground">Connect to your favorite CMS and auto-publish your SEO blogs</p>
                        
                        <div className="grid gap-4">
                          {/* WordPress Integration */}
                          <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <img 
                                src="/lovable-uploads/d8fa0a46-f1a4-4e86-a9fa-f2102a039436.png"
                                alt="WordPress logo"
                                className="w-10 h-10 object-contain"
                              />
                              <div className="flex-1">
                                <h4 className="font-medium flex items-center gap-2">
                                  WordPress
                                  {integrations.wordpress.connected && <Check className="w-4 h-4 text-green-600" />}
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  Publish your blogs directly to your WordPress site. No plugins or coding required.
                                </p>
                                {integrations.wordpress.connected && (
                                  <p className="text-xs text-green-600 mt-1">
                                    Connected to: {integrations.wordpress.siteUrl}
                                  </p>
                                )}
                              </div>
                            </div>
                            {integrations.wordpress.connected ? (
                              <div className="flex gap-2">
                                <Button variant="outline" size="sm">
                                  <ExternalLink className="w-4 h-4 mr-2" />
                                  Manage
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleDisconnect('wordpress')}
                                >
                                  Disconnect
                                </Button>
                              </div>
                            ) : (
                              <Button 
                                variant="outline"
                                onClick={() => openConnectionDialog('wordpress')}
                              >
                                Connect
                              </Button>
                            )}
                          </div>

                          {/* Shopify Integration */}
                          <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <img 
                                src="/lovable-uploads/93b6287a-d091-4ee7-b4ae-e45ea7a3e122.png"
                                alt="Shopify logo"
                                className="w-10 h-10 object-contain"
                              />
                              <div className="flex-1">
                                <h4 className="font-medium flex items-center gap-2">
                                  Shopify
                                  {integrations.shopify.connected && <Check className="w-4 h-4 text-green-600" />}
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  Add a blog to your Shopify store and boost your SEO with ease.
                                </p>
                                {integrations.shopify.connected && (
                                  <p className="text-xs text-green-600 mt-1">
                                    Connected to: {integrations.shopify.siteUrl}
                                  </p>
                                )}
                              </div>
                            </div>
                            {integrations.shopify.connected ? (
                              <div className="flex gap-2">
                                <Button variant="outline" size="sm">
                                  <ExternalLink className="w-4 h-4 mr-2" />
                                  Manage
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleDisconnect('shopify')}
                                >
                                  Disconnect
                                </Button>
                              </div>
                            ) : (
                              <Button 
                                variant="outline"
                                onClick={() => openConnectionDialog('shopify')}
                              >
                                Connect
                              </Button>
                            )}
                          </div>

                          {/* Webflow Integration */}
                          <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <img 
                                src="/lovable-uploads/dea3f4ce-82f3-48a3-af08-5c64d570b629.png"
                                alt="Webflow logo"
                                className="w-10 h-10 object-contain"
                              />
                              <div className="flex-1">
                                <h4 className="font-medium flex items-center gap-2">
                                  Webflow
                                  {integrations.webflow.connected && <Check className="w-4 h-4 text-green-600" />}
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  Integrate Content AI with Webflow to publish blogs.
                                </p>
                                {integrations.webflow.connected && (
                                  <p className="text-xs text-green-600 mt-1">
                                    Connected to: {integrations.webflow.siteUrl}
                                  </p>
                                )}
                              </div>
                            </div>
                            {integrations.webflow.connected ? (
                              <div className="flex gap-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => window.open(integrations.webflow.siteUrl, '_blank')}
                                >
                                  <ExternalLink className="w-4 h-4 mr-2" />
                                  Manage
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleDisconnect('webflow')}
                                >
                                  Disconnect
                                </Button>
                              </div>
                            ) : (
                              <Button 
                                variant="outline"
                                onClick={() => openConnectionDialog('webflow')}
                              >
                                Connect
                              </Button>
                            )}
                           </div>

                          {/* Wix Integration */}
                          <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <img 
                                src="/lovable-uploads/c661dec1-2ebf-4dad-ac81-56fd058c7266.png"
                                alt="Wix logo"
                                className="w-10 h-10 object-contain"
                              />
                              <div className="flex-1">
                                <h4 className="font-medium flex items-center gap-2">
                                  Wix
                                  {integrations.wix.connected && <Check className="w-4 h-4 text-green-600" />}
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  Publish your blogs directly to your Wix site blog.
                                </p>
                                {integrations.wix.connected && (
                                  <p className="text-xs text-green-600 mt-1">
                                    Connected to: {integrations.wix.siteUrl}
                                  </p>
                                )}
                              </div>
                            </div>
                            {integrations.wix.connected ? (
                              <div className="flex gap-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => window.open(integrations.wix.siteUrl, '_blank')}
                                >
                                  <ExternalLink className="w-4 h-4 mr-2" />
                                  Manage
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleDisconnect('wix')}
                                >
                                  Disconnect
                                </Button>
                              </div>
                            ) : (
                              <Button 
                                variant="outline"
                                onClick={() => openConnectionDialog('wix')}
                              >
                                Connect
                              </Button>
                            )}
                          </div>

                          {/* Notion Integration */}
                          <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <img 
                                src="/lovable-uploads/3668248b-f746-4b84-85a3-9a25cf2a937e.png"
                                alt="Notion logo"
                                className="w-10 h-10 object-contain"
                              />
                              <div className="flex-1">
                                <h4 className="font-medium flex items-center gap-2">
                                  Notion
                                  {integrations.notion.connected && <Check className="w-4 h-4 text-green-600" />}
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  Create pages in your Notion database from your articles.
                                </p>
                                {integrations.notion.connected && (
                                  <p className="text-xs text-green-600 mt-1">
                                    Connected to Notion workspace
                                  </p>
                                )}
                              </div>
                            </div>
                            {integrations.notion.connected ? (
                              <div className="flex gap-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => window.open('https://notion.so', '_blank')}
                                >
                                  <ExternalLink className="w-4 h-4 mr-2" />
                                  Manage
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleDisconnect('notion')}
                                >
                                  Disconnect
                                </Button>
                              </div>
                            ) : (
                              <Button 
                                variant="outline"
                                onClick={() => openConnectionDialog('notion')}
                              >
                                Connect
                              </Button>
                            )}
                          </div>

                          {/* Ghost Integration */}
                          <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <img 
                                src="/lovable-uploads/af07b7e4-6f3c-4202-8e50-f810cca951bc.png"
                                alt="Ghost logo"
                                className="w-10 h-10 object-contain"
                              />
                              <div className="flex-1">
                                <h4 className="font-medium flex items-center gap-2">
                                  Ghost
                                  {integrations.ghost?.connected && <Check className="w-4 h-4 text-green-600" />}
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  Publish directly to your Ghost blog platform.
                                </p>
                                {integrations.ghost?.connected && (
                                  <p className="text-xs text-green-600 mt-1">
                                    Connected to: {integrations.ghost.siteUrl}
                                  </p>
                                )}
                              </div>
                            </div>
                            {integrations.ghost?.connected ? (
                              <div className="flex gap-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => window.open(integrations.ghost.siteUrl, '_blank')}
                                >
                                  <ExternalLink className="w-4 h-4 mr-2" />
                                  Manage
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleDisconnect('ghost')}
                                >
                                  Disconnect
                                </Button>
                              </div>
                            ) : (
                              <Button 
                                variant="outline"
                                onClick={() => openConnectionDialog('ghost')}
                              >
                                Connect
                              </Button>
                            )}
                          </div>

                          {/* Squarespace Integration */}
                          <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <img 
                                src="/lovable-uploads/94e1830f-eb6c-4c1d-aa6e-42152232cf2f.png"
                                alt="Squarespace logo"
                                className="w-10 h-10 object-contain"
                              />
                              <div className="flex-1">
                                <h4 className="font-medium flex items-center gap-2">
                                  Squarespace
                                  {integrations.squarespace?.connected && <Check className="w-4 h-4 text-green-600" />}
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  Publish blog posts to your Squarespace website.
                                </p>
                                {integrations.squarespace?.connected && (
                                  <p className="text-xs text-green-600 mt-1">
                                    Connected to: {integrations.squarespace.siteUrl}
                                  </p>
                                )}
                              </div>
                            </div>
                            {integrations.squarespace?.connected ? (
                              <div className="flex gap-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => window.open(integrations.squarespace.siteUrl, '_blank')}
                                >
                                  <ExternalLink className="w-4 h-4 mr-2" />
                                  Manage
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleDisconnect('squarespace')}
                                >
                                  Disconnect
                                </Button>
                              </div>
                            ) : (
                              <Button 
                                variant="outline"
                                onClick={() => openConnectionDialog('squarespace')}
                              >
                                Connect
                              </Button>
                            )}
                          </div>

                          {/* Zapier Integration */}
                          <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <img 
                                src="/lovable-uploads/28858514-61f5-43b3-8eec-762b7b23c1b7.png"
                                alt="Zapier logo"
                                className="w-10 h-10 object-contain"
                              />
                              <div className="flex-1">
                                <h4 className="font-medium flex items-center gap-2">
                                  Zapier
                                  {integrations.zapier?.connected && <Check className="w-4 h-4 text-green-600" />}
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  Automate publishing to 5000+ apps via Zapier webhooks.
                                </p>
                                {integrations.zapier?.connected && (
                                  <p className="text-xs text-green-600 mt-1">
                                    Connected to Zapier webhook
                                  </p>
                                )}
                              </div>
                            </div>
                            {integrations.zapier?.connected ? (
                              <div className="flex gap-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => window.open('https://zapier.com/app/dashboard', '_blank')}
                                >
                                  <ExternalLink className="w-4 h-4 mr-2" />
                                  Manage
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleDisconnect('zapier')}
                                >
                                  Disconnect
                                </Button>
                              </div>
                            ) : (
                              <Button 
                                variant="outline"
                                onClick={() => openConnectionDialog('zapier')}
                              >
                                Connect
                              </Button>
                            )}
                          </div>

                          {/* Webhook Integration */}
                          <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-indigo-600 rounded flex items-center justify-center text-white font-bold">
                                🔗
                              </div>
                              <div className="flex-1">
                                <h4 className="font-medium flex items-center gap-2">
                                  Webhook
                                  {integrations.webhook.connected && <Check className="w-4 h-4 text-green-600" />}
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  Send article data to any webhook URL for custom integrations.
                                </p>
                                {integrations.webhook.connected && (
                                  <p className="text-xs text-green-600 mt-1">
                                    Connected to: {integrations.webhook.siteUrl}
                                  </p>
                                )}
                              </div>
                            </div>
                            {integrations.webhook.connected ? (
                              <div className="flex gap-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => window.open(integrations.webhook.siteUrl, '_blank')}
                                >
                                  <ExternalLink className="w-4 h-4 mr-2" />
                                  Manage
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleDisconnect('webhook')}
                                >
                                  Disconnect
                                </Button>
                              </div>
                            ) : (
                              <Button 
                                variant="outline"
                                onClick={() => openConnectionDialog('webhook')}
                              >
                                Connect
                              </Button>
                            )}
                          </div>
                         </div>
                      </div>

                      <Separator />

                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Developer API</h3>
                        <p className="text-muted-foreground">Connect with your custom website. Check our docs.</p>
                        
                        <div className="space-y-2">
                          <Label htmlFor="apiKey">Your API Key</Label>
                          <div className="flex gap-2">
                            <Input
                              id="apiKey"
                              value="••••••••••••••••••••••••••••••••"
                              readOnly
                              className="font-mono"
                            />
                            <Button variant="outline">
                              <Key className="w-4 h-4 mr-2" />
                              Generate
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Connection Dialog */}
                  <Dialog open={connectionDialog.open} onOpenChange={(open) => !open && closeConnectionDialog()}>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>
                          Connect to {connectionDialog.platform}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                             <Label htmlFor="siteUrl">
                              {connectionDialog.platform === 'wordpress' ? 'WordPress Site URL' : 
                               connectionDialog.platform === 'shopify' ? 'Shopify Store URL' : 
                               connectionDialog.platform === 'webflow' ? 'Webflow Site URL' :
                               connectionDialog.platform === 'wix' ? 'Wix Site URL' :
                               connectionDialog.platform === 'notion' ? 'Notion Database ID' :
                               connectionDialog.platform === 'ghost' ? 'Ghost Site URL' :
                               connectionDialog.platform === 'squarespace' ? 'Squarespace Site URL' :
                               connectionDialog.platform === 'zapier' ? 'Zapier Webhook URL' :
                               connectionDialog.platform === 'webhook' ? 'Webhook URL' : 'Site URL'}
                           </Label>
                          <Input
                            id="siteUrl"
                            value={connectionDialog.siteUrl}
                            onChange={(e) => setConnectionDialog(prev => ({ ...prev, siteUrl: e.target.value }))}
                              placeholder={
                                connectionDialog.platform === 'wordpress' ? 'https://yoursite.com' :
                                connectionDialog.platform === 'shopify' ? 'https://your-shop.myshopify.com' :
                                connectionDialog.platform === 'webflow' ? 'https://yoursite.webflow.io' :
                                connectionDialog.platform === 'wix' ? 'https://yoursite.wixsite.com' :
                                connectionDialog.platform === 'notion' ? 'database_id_here' :
                                connectionDialog.platform === 'ghost' ? 'https://yourblog.ghost.io' :
                                connectionDialog.platform === 'squarespace' ? 'https://yoursite.squarespace.com' :
                                connectionDialog.platform === 'zapier' ? 'https://hooks.zapier.com/hooks/catch/...' :
                                connectionDialog.platform === 'webhook' ? 'https://your-webhook-url.com/endpoint' :
                                'https://yoursite.com'
                              }
                          />
                        </div>
                        
                         {(connectionDialog.platform === 'wordpress' || connectionDialog.platform === 'ghost' || connectionDialog.platform === 'zapier' || connectionDialog.platform === 'webhook') ? (
                            <div className="space-y-2">
                              <Label htmlFor="apiKey">
                                {connectionDialog.platform === 'wordpress' ? 'Application Password' : 
                                 connectionDialog.platform === 'ghost' ? 'Admin API Key' :
                                 connectionDialog.platform === 'zapier' ? 'API Key (Optional)' :
                                 'API Key (Optional)'}
                              </Label>
                              <Input
                                id="apiKey"
                                type="password"
                                value={connectionDialog.apiKey}
                                onChange={(e) => setConnectionDialog(prev => ({ ...prev, apiKey: e.target.value }))}
                                placeholder={
                                  connectionDialog.platform === 'wordpress' 
                                    ? 'Your WordPress application password'
                                    : connectionDialog.platform === 'ghost'
                                    ? 'Your Ghost Admin API key'
                                    : connectionDialog.platform === 'zapier'
                                    ? 'Optional API key for Zapier authentication'
                                    : 'Optional API key for webhook authentication'
                                }
                              />
                              <p className="text-xs text-muted-foreground">
                                {connectionDialog.platform === 'wordpress'
                                  ? 'Create an application password in your WordPress admin under Users → Profile'
                                  : connectionDialog.platform === 'ghost'
                                  ? 'Get your Admin API key from Ghost Admin → Settings → Integrations'
                                  : connectionDialog.platform === 'zapier'
                                  ? 'Optional: Add an API key if your Zapier webhook requires authentication'
                                  : 'Optional: Add an API key if your webhook requires authentication'
                                }
                              </p>
                            </div>
                         ) : (
                            <div className="space-y-2">
                              <Label htmlFor="accessToken">
                                {connectionDialog.platform === 'shopify' ? 'Private App Access Token' : 
                                 connectionDialog.platform === 'webflow' ? 'API Token' :
                                 connectionDialog.platform === 'wix' ? 'API Key' :
                                 connectionDialog.platform === 'squarespace' ? 'API Key' :
                                 connectionDialog.platform === 'notion' ? 'Integration Token' : 'API Token'}
                             </Label>
                             <Input
                               id="accessToken"
                               type="password"
                               value={connectionDialog.accessToken}
                               onChange={(e) => setConnectionDialog(prev => ({ ...prev, accessToken: e.target.value }))}
                                placeholder={
                                  connectionDialog.platform === 'shopify' 
                                    ? 'Your Shopify private app access token'
                                    : connectionDialog.platform === 'webflow' 
                                    ? 'Your Webflow API token'
                                    : connectionDialog.platform === 'wix'
                                    ? 'Your Wix API key'
                                    : connectionDialog.platform === 'squarespace'
                                    ? 'Your Squarespace API key'
                                    : connectionDialog.platform === 'notion'
                                    ? 'Your Notion integration token'
                                    : 'Your API token'
                                }
                             />
                              <p className="text-xs text-muted-foreground">
                                {connectionDialog.platform === 'shopify' 
                                  ? 'Create a private app in your Shopify admin to get an access token'
                                  : connectionDialog.platform === 'webflow'
                                  ? 'Generate an API token in your Webflow project settings'
                                  : connectionDialog.platform === 'wix'
                                  ? 'Get your API key from the Wix Developers dashboard'
                                  : connectionDialog.platform === 'squarespace'
                                  ? 'Get your API key from the Squarespace developer platform'
                                  : connectionDialog.platform === 'notion'
                                  ? 'Create an integration in your Notion workspace to get a token'
                                  : 'Check your platform\'s API documentation for token generation'
                                }
                             </p>
                           </div>
                         )}

                        <div className="flex gap-2 pt-4">
                          <Button 
                            onClick={handleConnect}
                             disabled={connectionDialog.loading || !connectionDialog.siteUrl || 
                                ((['wordpress', 'ghost'].includes(connectionDialog.platform)) ? !connectionDialog.apiKey : 
                                 (['zapier', 'webhook'].includes(connectionDialog.platform)) ? false : !connectionDialog.accessToken)}
                            className="flex-1"
                          >
                            {connectionDialog.loading ? 'Connecting...' : 'Connect'}
                          </Button>
                          <Button variant="outline" onClick={closeConnectionDialog}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </TabsContent>

                <TabsContent value="publishing" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Publishing</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Scheduler</h3>
                        <p className="text-muted-foreground">Choose the date and time to schedule</p>
                        
                         <div className="space-y-4">
                           <div className="space-y-2">
                             <Label>Date</Label>
                             <Input
                               type="date"
                               value={publishingSettings.scheduledDate}
                               onChange={(e) => setPublishingSettings(prev => ({ ...prev, scheduledDate: e.target.value }))}
                               className="max-w-xs"
                             />
                           </div>

                           <div className="space-y-2">
                             <Label>Times</Label>
                             <div className="flex items-center gap-2">
                               <Clock className="w-4 h-4" />
                               <Input
                                 type="time"
                                 value={publishingSettings.scheduledTime}
                                 onChange={(e) => setPublishingSettings(prev => ({ ...prev, scheduledTime: e.target.value }))}
                                 className="max-w-xs"
                               />
                             </div>
                             <Button variant="outline" size="sm">Add new daily time</Button>
                           </div>

                           <div className="space-y-2">
                             <Label>Select timezone</Label>
                             <Select value={publishingSettings.timezone} onValueChange={(value) => setPublishingSettings(prev => ({ ...prev, timezone: value }))}>
                               <SelectTrigger className="max-w-xs">
                                 <SelectValue />
                               </SelectTrigger>
                               <SelectContent>
                                 <SelectItem value="UTC">GMT+00:00 (UTC)</SelectItem>
                                 <SelectItem value="EST">GMT-05:00 (EST)</SelectItem>
                                 <SelectItem value="PST">GMT-08:00 (PST)</SelectItem>
                                 <SelectItem value="CET">GMT+01:00 (CET)</SelectItem>
                               </SelectContent>
                             </Select>
                           </div>

                           <Button onClick={savePublishingSettings}>Save Publishing Settings</Button>
                         </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}