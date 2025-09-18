import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
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
import { WordPressConnect } from "@/components/WordPressConnect";
import { ArticleScheduler } from "@/components/ArticleScheduler";
import { startShopifyOAuth, getIntegrationStatus } from "@/lib/integrationsClient";
import { startWixFromSettings } from "@/lib/wixConnect";

export default function Settings() {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => {
    const tabParam = searchParams.get('tab');
    return ['brand', 'content', 'account', 'integrations', 'publishing'].includes(tabParam || '') 
      ? tabParam || 'brand' 
      : 'brand';
  });
  
  // Relay Shopify OAuth params to Supabase Edge Function to satisfy Shopify host rule
  const EDGE_BASE = 'https://hmrzmafwvhifjhsoizil.supabase.co/functions/v1';
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hasShopifyOAuthParams =
      params.has('hmac') && params.has('code') && params.has('state') && params.has('shop');
    if (hasShopifyOAuthParams) {
      const relay = `${EDGE_BASE}/shopify-oauth-callback${window.location.search}`;
      try {
        (window.top || window).location.replace(relay);
      } catch {
        window.location.replace(relay);
      }
    }
  }, []);
  
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

        // Load publishing settings from content_templates
        const { data: publishingTemplate } = await supabase
          .from('content_templates')
          .select('id, structure')
          .eq('user_id', user.id)
          .eq('template_type', 'publishing_settings')
          .eq('name', 'default')
          .maybeSingle();

        if (publishingTemplate && (publishingTemplate as any).structure) {
          const p = (publishingTemplate as any).structure as any;
          setPublishingSettings(prev => ({
            ...prev,
            ...p,
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
  
  const handleManageSubscription = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Please sign in',
          description: 'You need to be signed in to manage your subscription.',
          variant: 'destructive',
        });
        window.location.href = '/signin';
        return;
      }
      const { data, error } = await supabase.functions.invoke('customer-portal', { body: {} });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      } else {
        throw new Error('No portal URL received');
      }
    } catch (err: any) {
      console.error('Manage subscription error:', err);
      // Fallback: open Stripe Customer Portal login directly
      window.open('https://billing.stripe.com/p/login/14AaEZ2Bd06k6KXbCYeAg00', '_blank');
      toast({
        title: 'Opening Stripe portal',
        description: 'Using fallback portal link.',
      });
    }
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

  const applySchedulerToDrafts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Authentication required',
          description: 'Please sign in to apply settings.',
          variant: 'destructive',
        });
        return;
      }

      if (!publishingSettings.scheduledDate || !publishingSettings.scheduledTime) {
        toast({
          title: 'Missing schedule settings',
          description: 'Please set both date and time before applying to drafts.',
          variant: 'destructive',
        });
        return;
      }

      // Combine date and time into ISO string
      const scheduledDateTime = new Date(`${publishingSettings.scheduledDate}T${publishingSettings.scheduledTime}`).toISOString();

      // Update all draft articles with the scheduled time
      const { data: updatedArticles, error } = await supabase
        .from('articles')
        .update({ 
          status: 'scheduled',
          published_at: scheduledDateTime
        })
        .eq('user_id', user.id)
        .eq('status', 'draft')
        .select();

      if (error) throw error;

      const count = updatedArticles?.length || 0;
      toast({
        title: 'Scheduler applied successfully!',
        description: `${count} draft article${count !== 1 ? 's' : ''} scheduled for ${new Date(scheduledDateTime).toLocaleString()}.`,
      });
    } catch (error: any) {
      console.error('Error applying scheduler to drafts:', error);
      toast({
        title: 'Error applying scheduler',
        description: error.message || 'Failed to apply scheduler settings to drafts.',
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
    imageStyle: "",
    autoGeneration: false,
    autoGenTime: "09:00",
    autoPublish: false
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

  const [shopifyDomain, setShopifyDomain] = useState('');
  const [busy, setBusy] = useState<'shopify'|'wix'|null>(null);

  // New OAuth handlers using direct navigation
  const onConnectShopify = async () => {
    console.log('🔵 Shopify connect clicked, domain:', shopifyDomain);
    try {
      setBusy('shopify');
      const { data: { user } } = await supabase.auth.getUser();
      console.log('🔵 User check:', user?.id);
      if (!user) throw new Error('Not signed in');
      if (!shopifyDomain || !shopifyDomain.endsWith('.myshopify.com')) {
        throw new Error('Enter full shop domain like mystore.myshopify.com');
      }
      console.log('🔵 Starting OAuth for:', shopifyDomain.trim());
      // Full-page redirect to Supabase Edge Function → Provider OAuth
      startShopifyOAuth({ shop: shopifyDomain.trim(), userId: user.id });
    } catch (e: any) {
      console.error('🔴 Shopify connect failed:', e);
      toast({
        title: "Error",
        description: e?.message || 'Shopify connect failed',
        variant: "destructive",
      });
      setBusy(null);
    }
  };

  const onConnectWix = async () => {
    try {
      setBusy('wix');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in');
      
      console.log('[Wix Settings] Starting OAuth with user:', user.id);
      
      // Use the same approach as WixConnectButton with proper popup
      const q = `?uid=${encodeURIComponent(user.id)}`;
      const startUrl = `https://hmrzmafwvhifjhsoizil.supabase.co/functions/v1/wix-oauth-start${q}`;
      
      console.log('[Wix Settings] Fetching from:', startUrl);
      
      const res = await fetch(startUrl, { 
        method: "GET",
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('[Wix Settings] Response status:', res.status);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('[Wix Settings] Error response:', errorText);
        throw new Error(`HTTP ${res.status}: ${errorText}`);
      }
      
      const data = await res.json();
      console.log("[Wix Settings] start debug", data.debug);

      // Always open in new window with better popup settings
      const popup = window.open(
        data.installerUrl, 
        '_blank', 
        'width=600,height=700,scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=no,directories=no,status=no'
      );
      
      if (!popup) {
        alert('Popup blocked! Please allow popups for this site and try again.');
        return;
      }
    } catch (e: any) {
      console.error('Wix connect failed:', e);
      toast({
        title: "Error",
        description: e?.message || 'Wix connect failed',
        variant: "destructive",
      });
      setBusy(null);
    }
  };


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
    console.log('[DEBUG] openConnectionDialog called for platform:', platform);
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
      const status = await getIntegrationStatus();
      if (status?.success && Array.isArray(status.connections)) {
        setIntegrations(prev => {
          const next: typeof prev = { ...prev };
          for (const c of status.connections as any[]) {
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
    } catch (error) {
      console.error('Error fetching connections:', error);
    }
  };

  useEffect(() => {
    fetchConnections();
    const params = new URLSearchParams(window.location.search);
    const connected = params.get('connected');
    const platform = params.get('platform');
    const success = params.get('success');
    
    // Handle OAuth return for new flow
    if (connected) {
      toast({
        title: 'Connection successful',
        description: `Connected to ${connected.charAt(0).toUpperCase() + connected.slice(1)} successfully.`
      });
      fetchConnections();
      window.history.replaceState(null, '', window.location.pathname);
    }
    
    // Handle legacy WordPress flow
    if (platform === 'wordpress' && success === '1') {
      toast({
        title: 'Connection successful',
        description: 'Connected to WordPress successfully.'
      });
      fetchConnections();
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [toast]);

  const handleOAuthFlow = async (platform: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: 'Please sign in', description: 'You need to be signed in to connect integrations.', variant: 'destructive' });
        setConnectionDialog(prev => ({ ...prev, loading: false }));
        return;
      }

      // Open a blank popup immediately to avoid blockers, then set its URL once we have it
      const features = 'width=500,height=650,scrollbars=yes,resizable=yes';
      const popup = window.open('', `${platform}_oauth`, features);

      let targetUrl: string | null = null;

      if (platform === 'wix') {
        // Use dedicated Edge Function for Wix to guarantee function activity + redirect
        targetUrl = `https://hmrzmafwvhifjhsoizil.supabase.co/functions/v1/wix-oauth-start?userId=${encodeURIComponent(session.user.id)}`;
        console.log('[OAuth] Redirecting via wix-oauth-start', { targetUrl });
      } else {
        console.log(`[OAuth] Starting ${platform} oauth-start with`, { siteUrl: connectionDialog.siteUrl });
        const { data, error } = await supabase.functions.invoke('cms-integration', {
          body: { action: 'oauth-start', platform, siteUrl: connectionDialog.siteUrl },
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (error || !data?.success || !data?.oauthUrl) {
          if (popup) popup.close();
          throw new Error(data?.error || `Failed to start ${platform} OAuth flow`);
        }

        targetUrl = data.oauthUrl;
        console.log('[OAuth] Received oauthUrl', { platform, oauthUrl: targetUrl });
      }

      if (popup) {
        popup.location.href = targetUrl!;

        const handleMessage = (event: MessageEvent) => {
          if (event.data?.type === `${platform}_connected` && event.data?.success) {
            window.removeEventListener('message', handleMessage);
            popup.close();
            toast({ title: 'Connected!', description: `Successfully connected to ${platform}` });
            fetchConnections();
            setConnectionDialog(prev => ({ ...prev, open: false, loading: false }));
          } else if (event.data?.type === `${platform}_oauth_error`) {
            window.removeEventListener('message', handleMessage);
            popup.close();
            toast({ title: 'Connection Failed', description: event.data?.error || `Failed to complete ${platform} connection`, variant: 'destructive' });
            setConnectionDialog(prev => ({ ...prev, loading: false }));
          }
        };
        window.addEventListener('message', handleMessage);

        // Safety: if popup gets closed without a message, stop loading
        const checkClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkClosed);
            window.removeEventListener('message', handleMessage);
            setConnectionDialog(prev => ({ ...prev, loading: false }));
          }
        }, 1000);
      } else {
        // Popup blocked: navigate current tab
        toast({ title: 'Popup blocked', description: 'Opening in this tab instead.' });
        window.location.href = targetUrl!;
      }
    } catch (error: any) {
      console.error('[OAuth] Error starting flow', { platform, error });
      toast({ title: 'OAuth Error', description: error.message, variant: 'destructive' });
      setConnectionDialog(prev => ({ ...prev, loading: false }));
    }
  };

  const handleConnect = async () => {
    console.log('[DEBUG] handleConnect called for platform:', connectionDialog.platform);
    setConnectionDialog(prev => ({ ...prev, loading: true }));

    try {
      // Basic client-side validation
      if (!connectionDialog.platform) throw new Error('Please choose a platform.');
      const requiresSiteUrl = !['wix'].includes(connectionDialog.platform);
      if (requiresSiteUrl && !connectionDialog.siteUrl) throw new Error('Please enter your site URL.');
      
      // Handle OAuth flows for specific platforms
      if (connectionDialog.platform === 'wordpress' && 
          (connectionDialog.siteUrl.includes('wordpress.com') || connectionDialog.siteUrl.includes('.wordpress.com'))) {
        // Start OAuth flow for WordPress.com
        await handleWordPressComOAuth();
        return;
      }
      
      if (connectionDialog.platform === 'shopify') {
        console.log('Shopify connection attempt with:', {
          siteUrl: connectionDialog.siteUrl,
          hasAccessToken: !!connectionDialog.accessToken
        });

        // Attempt connection; function will respond with requiresOAuth
        const { data, error } = await supabase.functions.invoke('cms-integration', {
          body: {
            action: 'connect',
            platform: 'shopify',
            siteUrl: connectionDialog.siteUrl,
            // pass token if provided (legacy private app flow); backend will ignore if OAuth is required
            accessToken: connectionDialog.accessToken || ''
          }
        });

        console.log('Shopify connection response:', { data, error });

        if (error) {
          console.error('Shopify connection error:', error);
          throw new Error(error.message || 'Failed to connect to Shopify');
        }

        if (data?.requiresOAuth && data?.oauthUrl) {
          toast({
            title: 'Authorization Required',
            description: 'Please complete the Shopify authorization in the popup window.',
          });

          const popup = window.open(
            data.oauthUrl,
            'shopify_oauth',
            'width=500,height=650,scrollbars=yes,resizable=yes'
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
            if (event.data?.type === 'shopify_connected' && event.data?.success) {
              window.removeEventListener('message', handleMessage);
              popup.close();
              toast({ title: 'Shopify Connected!', description: 'Successfully connected to your Shopify store.' });
              fetchConnections();
              setConnectionDialog(prev => ({ ...prev, open: false, loading: false }));
            } else if (event.data?.type === 'shopify_oauth_error') {
              window.removeEventListener('message', handleMessage);
              popup.close();
              toast({ title: 'Connection Failed', description: event.data?.error || 'Failed to complete Shopify connection', variant: 'destructive' });
              setConnectionDialog(prev => ({ ...prev, loading: false }));
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
            shopify: {
              connected: true,
              siteUrl: connectionDialog.siteUrl,
              accessToken: connectionDialog.accessToken,
              name: connectionDialog.siteUrl
            }
          }));

          toast({
            title: 'Shopify connected!',
            description: 'Successfully connected to your Shopify store.',
          });

          closeConnectionDialog();
          fetchConnections();
        } else {
          throw new Error(data?.error || 'Failed to connect to Shopify');
        }
        return;
      }
      
      if (connectionDialog.platform === 'wix') {
        // Start OAuth flow for Wix
        await handleOAuthFlow('wix');
        return;
      }
      
      if ((connectionDialog.platform === 'wordpress' || connectionDialog.platform === 'webhook') && !connectionDialog.apiKey) {
        throw new Error(connectionDialog.platform === 'wordpress'
          ? 'Enter WordPress credentials: username:application_password'
          : 'Enter your webhook secret/key');
      }
      if (!(connectionDialog.platform === 'wordpress' || connectionDialog.platform === 'webhook') && !connectionDialog.accessToken) {
        throw new Error('Please enter an access token.');
      }

      const { data, error } = await supabase.functions.invoke('cms-integration', {
        body: {
          action: 'connect',
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
          if ((event.data.type === 'wordpress_connected' || 
               event.data.type === 'shopify_connected' || 
               event.data.type === 'wix_connected') && event.data.success) {
            window.removeEventListener('message', handleMessage);
            popup.close();
            const platformName = event.data.type.replace('_connected', '');
            toast({ title: `${platformName.charAt(0).toUpperCase() + platformName.slice(1)} Connected!`, description: `Successfully connected to your ${platformName} site.` });
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
      const { data, error } = await supabase.functions.invoke('cms-integration', {
        body: {
          action: 'oauth-start',
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
            const { data, error } = await supabase.functions.invoke('cms-integration', {
              body: {
                action: 'oauth-callback',
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
        else if ((event.data.type === 'wordpress_connected' || 
                  event.data.type === 'shopify_connected' || 
                  event.data.type === 'wix_connected') && event.data.success) {
          window.removeEventListener('message', handleMessage);
          popup.close();
          const platformName = event.data.type.replace('_connected', '');
          toast({ title: `${platformName.charAt(0).toUpperCase() + platformName.slice(1)} Connected!`, description: `Successfully connected to your ${platformName} site.` });
          fetchConnections();
          setConnectionDialog(prev => ({ ...prev, open: false, loading: false }));
        }
        else if (event.data.type === 'wordpress_oauth_error' || 
                 event.data.type === 'shopify_oauth_error' || 
                 event.data.type === 'wix_oauth_error') {
          window.removeEventListener('message', handleMessage);
          popup.close();
          const platformName = event.data.type.replace('_oauth_error', '');
          toast({ title: 'OAuth Error', description: event.data.error || `${platformName} authorization failed`, variant: 'destructive' });
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

    const { data, error } = await supabase.functions.invoke('cms-integration', {
      body: { action: 'disconnect', platform, siteUrl }
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
              
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
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

                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <Label>Automatic Daily Generation</Label>
                            <p className="text-sm text-muted-foreground">
                              Automatically generate one article daily based on your topics and settings
                            </p>
                          </div>
                          <Switch
                            checked={contentSettings.autoGeneration || false}
                            onCheckedChange={(checked) => setContentSettings(prev => ({ ...prev, autoGeneration: checked }))}
                          />
                        </div>

                        {contentSettings.autoGeneration && (
                          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                            <div className="flex items-center gap-2 text-sm font-medium">
                              <Clock className="h-4 w-4" />
                              Generation Schedule
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="autoGenTime">Daily generation time</Label>
                              <Select
                                value={contentSettings.autoGenTime || "09:00"}
                                onValueChange={(value) => setContentSettings(prev => ({ ...prev, autoGenTime: value }))}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select time" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="06:00">6:00 AM</SelectItem>
                                  <SelectItem value="09:00">9:00 AM</SelectItem>
                                  <SelectItem value="12:00">12:00 PM</SelectItem>
                                  <SelectItem value="15:00">3:00 PM</SelectItem>
                                  <SelectItem value="18:00">6:00 PM</SelectItem>
                                  <SelectItem value="21:00">9:00 PM</SelectItem>
                                </SelectContent>
                              </Select>
                             </div>
                             <div className="flex items-center justify-between">
                               <div className="space-y-1">
                                 <Label>Auto-publish articles</Label>
                                 <p className="text-xs text-muted-foreground">
                                   When enabled, generated articles will be published automatically. When disabled, they'll be saved as drafts for review.
                                 </p>
                               </div>
                               <Switch
                                 checked={contentSettings.autoPublish || false}
                                 onCheckedChange={(checked) => setContentSettings(prev => ({ ...prev, autoPublish: checked }))}
                               />
                             </div>
                             <p className="text-xs text-muted-foreground">
                               {contentSettings.autoPublish 
                                 ? "Articles will be generated and published automatically." 
                                 : "Articles will be generated automatically and saved as drafts. You can review and publish them manually."
                               }
                             </p>
                           </div>
                        )}
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
                      <div className="space-y-6">
                        <div>
                          <h3 className="text-lg font-semibold">Available Integrations</h3>
                          <p className="text-muted-foreground">Connect to your favorite CMS and auto-publish your SEO blogs</p>
                        </div>
                        
                        <div className="grid gap-4">
                          {/* WordPress Integration - Featured */}
                          <div className="relative">
                            <div className="absolute top-4 right-4 z-10">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Live
                              </span>
                            </div>
                            <div className="border border-green-200 bg-green-50/50 rounded-lg">
                              <WordPressConnect />
                            </div>
                          </div>

                          {/* Wix Integration - Featured */}
                          <div className="relative border border-green-200 bg-green-50/50 rounded-lg p-4">
                            <div className="absolute top-4 right-4">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Live
                              </span>
                            </div>
                            <div className="flex items-center gap-3 mb-4">
                              <img 
                                src="/lovable-uploads/4a03d01f-8a2e-4efb-9cbc-a7fd87e0ce20.png"
                                alt="Wix logo"
                                className="w-12 h-12 object-contain"
                              />
                              <div className="flex-1 pr-16">
                                <h4 className="font-semibold text-lg">Wix</h4>
                                <p className="text-sm text-muted-foreground">
                                  Publish your blogs directly to your Wix site blog.
                                </p>
                              </div>
                            </div>
                            {integrations.wix?.connected ? (
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-green-600 font-medium">Connected</span>
                                <Button 
                                  variant="outline"
                                  onClick={() => handleDisconnect('wix')}
                                >
                                  Disconnect
                                </Button>
                              </div>
                            ) : (
                              <Button
                                onClick={onConnectWix}
                                disabled={busy === 'wix'}
                                className="bg-primary hover:bg-primary/90"
                              >
                                {busy === 'wix' ? 'Redirecting…' : 'Connect'}
                              </Button>
                            )}
                          </div>

                          {/* Shopify Integration - Featured */}
                          <div className="relative border border-green-200 bg-green-50/50 rounded-lg p-4">
                            <div className="absolute top-4 right-4">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Live
                              </span>
                            </div>
                            <div className="flex items-center gap-3 mb-4">
                              <img 
                                src="/lovable-uploads/93b6287a-d091-4ee7-b4ae-e45ea7a3e122.png"
                                alt="Shopify logo"
                                className="w-12 h-12 object-contain"
                              />
                              <div className="flex-1 pr-16">
                                <h4 className="font-semibold text-lg">Shopify</h4>
                                <p className="text-sm text-muted-foreground">
                                  Add a blog to your Shopify store and boost your SEO with ease.
                                </p>
                              </div>
                            </div>
                            {integrations.shopify?.connected ? (
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-green-600 font-medium">Connected</span>
                                <Button 
                                  variant="outline"
                                  onClick={() => handleDisconnect('shopify')}
                                >
                                  Disconnect
                                </Button>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                  <Input
                                    placeholder="mystore.myshopify.com"
                                    value={shopifyDomain}
                                    onChange={(e) => setShopifyDomain(e.target.value)}
                                    className="flex-1"
                                  />
                                  <Button
                                    onClick={onConnectShopify}
                                    disabled={busy === 'shopify'}
                                    className="bg-primary hover:bg-primary/90"
                                  >
                                    {busy === 'shopify' ? 'Redirecting…' : 'Connect'}
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <Separator />

                        <div>
                          <h3 className="text-lg font-medium text-muted-foreground">Coming Soon</h3>
                          <p className="text-sm text-muted-foreground">More integrations in development</p>
                        </div>

                        <div className="grid gap-3">
                          {/* Webflow Integration - Coming Soon */}
                          <div className="flex items-center justify-between p-3 border rounded-lg opacity-60 bg-muted/30">
                            <div className="flex items-center gap-3">
                              <img 
                                src="/lovable-uploads/dea3f4ce-82f3-48a3-af08-5c64d570b629.png"
                                alt="Webflow logo"
                                className="w-8 h-8 object-contain grayscale"
                              />
                              <div className="flex-1">
                                <h4 className="font-medium text-sm flex items-center gap-2">
                                  Webflow
                                  <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">Coming Soon</span>
                                </h4>
                                <p className="text-xs text-muted-foreground">
                                  Integrate Content AI with Webflow to publish blogs.
                                </p>
                              </div>
                            </div>
                            <Button 
                              variant="outline"
                              disabled
                              size="sm"
                              className="cursor-not-allowed"
                            >
                              Connect
                            </Button>
                          </div>

                          {/* Notion Integration - Coming Soon */}
                          <div className="flex items-center justify-between p-3 border rounded-lg opacity-60 bg-muted/30">
                            <div className="flex items-center gap-3">
                              <img 
                                src="/lovable-uploads/3668248b-f746-4b84-85a3-9a25cf2a937e.png"
                                alt="Notion logo"
                                className="w-8 h-8 object-contain grayscale"
                              />
                              <div className="flex-1">
                                <h4 className="font-medium text-sm flex items-center gap-2">
                                  Notion
                                  <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">Coming Soon</span>
                                </h4>
                                <p className="text-xs text-muted-foreground">
                                  Create pages in your Notion database from your articles.
                                </p>
                              </div>
                            </div>
                            <Button 
                              variant="outline"
                              disabled
                              size="sm"
                              className="cursor-not-allowed"
                            >
                              Connect
                            </Button>
                          </div>

                          {/* Ghost Integration - Coming Soon */}
                          <div className="flex items-center justify-between p-3 border rounded-lg opacity-60 bg-muted/30">
                            <div className="flex items-center gap-3">
                              <img 
                                src="/lovable-uploads/af07b7e4-6f3c-4202-8e50-f810cca951bc.png"
                                alt="Ghost logo"
                                className="w-8 h-8 object-contain grayscale"
                              />
                              <div className="flex-1">
                                <h4 className="font-medium text-sm flex items-center gap-2">
                                  Ghost
                                  <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">Coming Soon</span>
                                </h4>
                                <p className="text-xs text-muted-foreground">
                                  Publish directly to your Ghost blog platform.
                                </p>
                              </div>
                            </div>
                            <Button 
                              variant="outline"
                              disabled
                              size="sm"
                              className="cursor-not-allowed"
                            >
                              Connect
                            </Button>
                          </div>

                          {/* Zapier Integration - Coming Soon */}
                          <div className="flex items-center justify-between p-3 border rounded-lg opacity-60 bg-muted/30">
                            <div className="flex items-center gap-3">
                              <img 
                                src="/lovable-uploads/28858514-61f5-43b3-8eec-762b7b23c1b7.png"
                                alt="Zapier logo"
                                className="w-8 h-8 object-contain grayscale"
                              />
                              <div className="flex-1">
                                <h4 className="font-medium text-sm flex items-center gap-2">
                                  Zapier
                                  <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">Coming Soon</span>
                                </h4>
                                <p className="text-xs text-muted-foreground">
                                  Automate publishing to 5000+ apps via Zapier webhooks.
                                </p>
                              </div>
                            </div>
                            <Button 
                              variant="outline"
                              disabled
                              size="sm"
                              className="cursor-not-allowed"
                            >
                              Connect
                            </Button>
                          </div>

                          {/* Webhook Integration - Coming Soon */}
                          <div className="flex items-center justify-between p-3 border rounded-lg opacity-60 bg-muted/30">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-indigo-400 rounded flex items-center justify-center text-white text-sm grayscale">
                                🔗
                              </div>
                              <div className="flex-1">
                                <h4 className="font-medium text-sm flex items-center gap-2">
                                  Webhook
                                  <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">Coming Soon</span>
                                </h4>
                                <p className="text-xs text-muted-foreground">
                                  Send article data to any webhook URL for custom integrations.
                                </p>
                              </div>
                            </div>
                            <Button 
                              variant="outline"
                              disabled
                              size="sm"
                              className="cursor-not-allowed"
                            >
                              Connect
                            </Button>
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
            disabled={
              connectionDialog.loading ||
              (connectionDialog.platform !== 'wix' && !connectionDialog.siteUrl) ||
              (
                ['wordpress', 'ghost'].includes(connectionDialog.platform)
                  ? !connectionDialog.apiKey
                  : ['zapier', 'webhook', 'shopify', 'wix'].includes(connectionDialog.platform)
                    ? false
                    : !connectionDialog.accessToken
              )
            }
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

                            <div className="flex gap-3">
                              <Button onClick={savePublishingSettings}>Save Publishing Settings</Button>
                              <Button 
                                variant="outline" 
                                onClick={applySchedulerToDrafts}
                                disabled={!publishingSettings.scheduledDate || !publishingSettings.scheduledTime}
                              >
                                Apply to Existing Drafts
                              </Button>
                            </div>
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