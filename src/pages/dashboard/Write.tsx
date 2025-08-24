import { useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { TrialBanner } from "@/components/TrialBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function Write() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

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

      const { error } = await supabase
        .from('articles')
        .insert({
          title: title.trim(),
          content: content.trim(),
          status: 'draft',
          user_id: user.id,
        });

      if (error) {
        throw error;
      }

      toast({
        title: "Draft saved!",
        description: "Your article has been saved as a draft.",
      });

      // Clear the form
      setTitle("");
      setContent("");
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
                <CardTitle>Write New Article</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
                    {isSaving ? "Saving..." : "Save Draft"}
                  </Button>
                  <Button variant="outline">Preview</Button>
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