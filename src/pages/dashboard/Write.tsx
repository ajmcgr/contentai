import { useState, useEffect } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { TrialBanner } from "@/components/TrialBanner";
import { GenerationWarningDialog } from "@/components/GenerationWarningDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export default function Write() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const { toast } = useToast();
  const [isPublishOpen, setIsPublishOpen] = useState(false);
  const [connections, setConnections] = useState<any[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<string>("");
  const [publishing, setPublishing] = useState(false);

  // Check for edit mode on load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get('edit');
    if (editId) {
      setEditingId(editId);
      loadArticleForEditing(editId);
    }
  }, []);

  const loadArticleForEditing = async (articleId: string) => {
    try {
      const { data: article, error } = await supabase
        .from('articles')
        .select('*')
        .eq('id', articleId)
        .single();

      if (error) throw error;

      setTitle(article.title || "");
      setContent(article.content || "");
    } catch (error) {
      console.error('Error loading article for editing:', error);
      toast({
        title: "Error loading article",
        description: "Failed to load the article for editing.",
        variant: "destructive",
      });
    }
  };

  const handleGenerateClick = () => {
    setShowWarningDialog(true);
  };

  const generatePrompt = async () => {
    setShowWarningDialog(false);
    setIsGenerating(true);
    try {
      // Get the current session to pass authorization
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Please sign in to generate AI articles');
      }

      const { data, error } = await supabase.functions.invoke('generate-prompt', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to generate prompt');
      }

      if (data.title) {
        setTitle(data.title);
      }
      if (data.content) {
        setContent(data.content);
      }

      const brandBasedMessage = data.brandBased 
        ? "Your personalized article prompt has been generated based on your brand settings!"
        : "Generic article prompt generated. Add your brand info in Settings for personalized prompts.";

      toast({
        title: "AI Article Generated!",
        description: brandBasedMessage,
      });
    } catch (error) {
      console.error('Error generating prompt:', error);
      toast({
        title: "Error generating article",
        description: error instanceof Error ? error.message : "Failed to generate AI article. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const saveDraft = async () => {
    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for your article.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to save articles.",
          variant: "destructive",
        });
        return;
      }

      if (editingId) {
        // Update existing article
        const { error } = await supabase
          .from('articles')
          .update({
            title: title.trim(),
            content: content.trim(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingId);

        if (error) throw error;

        toast({
          title: "Article updated!",
          description: "Your article has been updated successfully.",
        });
      } else {
        // Create new article
        const { data: inserted, error } = await supabase
          .from('articles')
          .insert({
            title: title.trim(),
            content: content.trim(),
            status: 'draft',
            user_id: user.id,
          })
          .select('id')
          .single();

        if (error) throw error;
        if (inserted?.id) setEditingId(inserted.id);

        toast({
          title: "Draft saved!",
          description: "Your article has been saved as a draft.",
        });
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      toast({
        title: "Error saving draft",
        description: "Failed to save your article. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Open publish dialog if URL contains ?publish=1
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('publish') === '1') {
      setIsPublishOpen(true);
    }
  }, []);

  // Load active CMS connections when publish dialog opens
  useEffect(() => {
    if (!isPublishOpen) return;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('cms-integration/status', { method: 'GET' });
        if (!error && data?.success) {
          const list = data.connections || [];
          if (list.length > 0) {
            setConnections(list);
            if (list.length === 1) setSelectedConnection((list[0] as any).id);
            return;
          }
        }

        // Fallback: if no cms_connections yet, try syncing from wp_tokens (WordPress.com OAuth)
        const { data: wpToken } = await supabase
          .from('wp_tokens')
          .select('access_token, blog_url, scope')
          .maybeSingle();

        if (wpToken?.access_token && wpToken?.blog_url) {
          // Create or update a cms_connections record so publish flow can see it
          const payload: any = {
            platform: 'wordpress',
            site_url: wpToken.blog_url,
            access_token: wpToken.access_token,
            api_key: null,
            is_active: true,
            config: { wpcom: true, scope: wpToken.scope || 'global', endpoint: 'https://public-api.wordpress.com/rest/v1.1/' },
            last_sync: new Date().toISOString(),
          };
          // Check if exists
          const { data: existing } = await supabase
            .from('cms_connections')
            .select('id')
            .eq('platform', 'wordpress')
            .eq('site_url', wpToken.blog_url)
            .maybeSingle();

          if (existing?.id) {
            await supabase.from('cms_connections').update(payload).eq('id', existing.id);
          } else {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              await supabase.from('cms_connections').insert({ ...payload, user_id: user.id });
            }
          }

          // Refetch connections after sync
          const { data: afterSync } = await supabase.functions.invoke('cms-integration/status', { method: 'GET' });
          if (afterSync?.success) {
            const list2 = afterSync.connections || [];
            setConnections(list2);
            if (list2.length === 1) setSelectedConnection((list2[0] as any).id);
          }
        }
      } catch (e) {
        console.error('Failed to load connections', e);
      }
    })();
  }, [isPublishOpen]);

  const handlePublish = async () => {
    try {
      if (!selectedConnection) {
        toast({ title: 'Select a platform', description: 'Choose a connected platform to publish.', variant: 'destructive' });
        return;
      }
      setPublishing(true);

      let articleId = editingId;
      if (!articleId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Please sign in to publish');
        const { data: inserted, error } = await supabase
          .from('articles')
          .insert({ title: title.trim(), content: content.trim(), status: 'draft', user_id: user.id })
          .select('id')
          .single();
        if (error) throw error;
        articleId = inserted?.id as string;
        setEditingId(articleId || null);
      }

      const { data, error } = await supabase.functions.invoke('cms-integration/publish', {
        body: {
          articleId,
          connectionId: selectedConnection,
          publishOptions: { status: 'publish' }
        }
      });

      if (error || !data?.success) {
        throw new Error(data?.error || 'Publish failed');
      }

      toast({ title: 'Published!', description: data.message || 'Article published successfully.' });
      setIsPublishOpen(false);
    } catch (err: any) {
      console.error('Publish error:', err);
      toast({ title: 'Publish failed', description: err.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <DashboardSidebar />
          
          <div className="flex-1 flex flex-col">
            <div className="flex items-center gap-4 p-6">
              <span className="text-sm text-muted-foreground">
                Dashboard / Write
              </span>
            </div>

            <div className="flex-1 p-6">
              <TrialBanner />
            
            <Card>
              <CardHeader>
                <CardTitle>{editingId ? "Edit Article" : "Write New Article"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!editingId && !title && !content && (
                  <div className="text-center py-8 border-2 border-dashed border-muted rounded-lg">
                    <Sparkles className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Get AI-Powered Article Ideas</h3>
                    <p className="text-muted-foreground mb-4">
                      Let Content AI generate compelling article prompts and outlines for you
                    </p>
                    <Button 
                      onClick={handleGenerateClick}
                      disabled={isGenerating}
                      className="mb-4"
                    >
                      {isGenerating ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Generate AI Article
                        </>
                      )}
                    </Button>
                    <div className="border-t pt-4">
                      <p className="text-sm text-muted-foreground">Or start writing manually below</p>
                    </div>
                  </div>
                )}
                
                <div>
                  <label className="text-sm font-medium">Title</label>
                  <Input 
                    placeholder="Enter article title..." 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Content</label>
                  <Textarea 
                    placeholder="Start writing your article..." 
                    className="min-h-[300px]"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={saveDraft}
                    disabled={isSaving}
                  >
                    {isSaving ? "Saving..." : editingId ? "Update Article" : "Save Draft"}
                  </Button>
                  {!isGenerating && (title || content) && (
                    <Button 
                      variant="outline" 
                      onClick={generatePrompt}
                      disabled={isGenerating}
                    >
                      {isGenerating ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Regenerating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Regenerate with AI
                        </>
                      )}
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      const blob = new Blob([`# ${title}\n\n${content}`], { type: 'text/markdown' });
                      const url = URL.createObjectURL(blob);
                      window.open(url, '_blank');
                      URL.revokeObjectURL(url);
                    }}
                  >
                    Preview
                  </Button>
                  <Button variant="secondary" onClick={() => setIsPublishOpen(true)}>Publish</Button>
                </div>
              </CardContent>
            </Card>

            <Dialog open={isPublishOpen} onOpenChange={setIsPublishOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Publish article</DialogTitle>
                </DialogHeader>
                {connections.length === 0 ? (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      No platforms connected. Connect WordPress, Shopify, Webflow and more in Settings → Integrations.
                    </p>
                    <Button asChild variant="outline">
                      <a href="/dashboard/settings">Open Settings</a>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Choose a platform</label>
                      <div className="grid gap-2">
                        {connections.map((c: any) => (
                          <Button
                            key={c.id}
                            variant={selectedConnection === c.id ? 'default' : 'outline'}
                            className="justify-start"
                            onClick={() => setSelectedConnection(c.id)}
                          >
                            {c.platform} • {c.site_url}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsPublishOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handlePublish} disabled={publishing || !selectedConnection}>
                    {publishing ? 'Publishing…' : 'Publish now'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </SidebarProvider>

    <GenerationWarningDialog
      open={showWarningDialog}
      onOpenChange={setShowWarningDialog}
      onConfirm={generatePrompt}
    />
    </>
  );
}