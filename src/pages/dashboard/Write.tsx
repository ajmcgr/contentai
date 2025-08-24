import { useState, useEffect } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { TrialBanner } from "@/components/TrialBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, RefreshCw } from "lucide-react";

export default function Write() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { toast } = useToast();

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

  const generatePrompt = async () => {
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
        const { error } = await supabase
          .from('articles')
          .insert({
            title: title.trim(),
            content: content.trim(),
            status: 'draft',
            user_id: user.id,
          });

        if (error) throw error;

        toast({
          title: "Draft saved!",
          description: "Your article has been saved as a draft.",
        });

        // Clear the form for new articles
        setTitle("");
        setContent("");
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

  return (
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
                      onClick={generatePrompt}
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
                  <Button variant="secondary">Publish</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}