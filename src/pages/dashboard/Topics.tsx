import { useState, useEffect } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { TrialBanner } from "@/components/TrialBanner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2, Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Topic {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  category: string;
  color: string;
  created_at: string;
  _count?: { articles: number };
}

export default function Topics() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    keywords: "",
    category: "",
    color: "#3B82F6"
  });
  const { toast } = useToast();

  const fetchTopics = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('topics')
        .select(`
          *,
          articles:articles(count)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform the data to include article count
      const topicsWithCount = data?.map(topic => ({
        ...topic,
        _count: { articles: topic.articles?.length || 0 }
      })) || [];
      
      setTopics(topicsWithCount);
    } catch (error) {
      console.error('Error fetching topics:', error);
      toast({
        title: "Error loading topics",
        description: "Failed to load your topics. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopics();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const topicData = {
        user_id: user.id,
        name: formData.name,
        description: formData.description,
        keywords: formData.keywords.split(',').map(k => k.trim()).filter(Boolean),
        category: formData.category,
        color: formData.color
      };

      if (editingTopic) {
        const { error } = await supabase
          .from('topics')
          .update(topicData)
          .eq('id', editingTopic.id);
        
        if (error) throw error;
        
        toast({
          title: "Topic updated!",
          description: "Your topic has been updated successfully.",
        });
      } else {
        const { error } = await supabase
          .from('topics')
          .insert(topicData);
        
        if (error) throw error;
        
        toast({
          title: "Topic created!",
          description: "Your new topic has been created successfully.",
        });
      }

      setDialogOpen(false);
      setEditingTopic(null);
      setFormData({ name: "", description: "", keywords: "", category: "", color: "#3B82F6" });
      fetchTopics();
    } catch (error: any) {
      console.error('Error saving topic:', error);
      toast({
        title: "Error saving topic",
        description: error.message || "Failed to save topic. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (topic: Topic) => {
    setEditingTopic(topic);
    setFormData({
      name: topic.name,
      description: topic.description || "",
      keywords: topic.keywords?.join(', ') || "",
      category: topic.category || "",
      color: topic.color || "#3B82F6"
    });
    setDialogOpen(true);
  };

  const handleDelete = async (topicId: string) => {
    try {
      const { error } = await supabase
        .from('topics')
        .delete()
        .eq('id', topicId);
      
      if (error) throw error;
      
      toast({
        title: "Topic deleted!",
        description: "The topic has been deleted successfully.",
      });
      
      fetchTopics();
    } catch (error: any) {
      console.error('Error deleting topic:', error);
      toast({
        title: "Error deleting topic",
        description: error.message || "Failed to delete topic. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar />
        
        <div className="flex-1 flex flex-col">
          <div className="flex items-center gap-4 p-6">
            <span className="text-sm text-muted-foreground">
              Dashboard / Topics
            </span>
          </div>

          <div className="flex-1 p-6">
            <TrialBanner />
            
            <div className="mb-6">
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-reckless text-foreground">Content Topics</h1>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      className="bg-primary hover:bg-primary/90"
                      onClick={() => {
                        setEditingTopic(null);
                        setFormData({ name: "", description: "", keywords: "", category: "", color: "#3B82F6" });
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Topic
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingTopic ? 'Edit Topic' : 'Create New Topic'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Topic Name</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="e.g., Web Development, Marketing Tips"
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Brief description of this topic..."
                          rows={3}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="keywords">Keywords</Label>
                        <Input
                          id="keywords"
                          value={formData.keywords}
                          onChange={(e) => setFormData(prev => ({ ...prev, keywords: e.target.value }))}
                          placeholder="keyword1, keyword2, keyword3"
                        />
                        <p className="text-sm text-muted-foreground">Separate keywords with commas</p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <Input
                          id="category"
                          value={formData.category}
                          onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                          placeholder="e.g., Technology, Business, Lifestyle"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="color">Color</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            id="color"
                            type="color"
                            value={formData.color}
                            onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                            className="w-16 h-10"
                          />
                          <Input
                            value={formData.color}
                            onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                            placeholder="#3B82F6"
                            className="flex-1"
                          />
                        </div>
                      </div>
                      
                      <div className="flex gap-2 pt-4">
                        <Button type="submit" className="flex-1">
                          {editingTopic ? 'Update Topic' : 'Create Topic'}
                        </Button>
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              {loading ? (
                <div className="text-center py-8">Loading topics...</div>
              ) : topics.length === 0 ? (
                <Card>
                  <CardContent className="py-8">
                    <div className="text-center">
                      <Tag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No topics yet</h3>
                      <p className="text-muted-foreground mb-4">
                        Create your first topic to organize your content better.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {topics.map((topic) => (
                    <Card key={topic.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: topic.color }}
                            />
                            <CardTitle className="text-lg">{topic.name}</CardTitle>
                          </div>
                          <div className="flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleEdit(topic)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Topic</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{topic.name}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleDelete(topic.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {topic.description && (
                          <p className="text-sm text-muted-foreground mb-3">
                            {topic.description}
                          </p>
                        )}
                        
                        {topic.keywords && topic.keywords.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {topic.keywords.slice(0, 3).map((keyword, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {keyword}
                              </Badge>
                            ))}
                            {topic.keywords.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{topic.keywords.length - 3} more
                              </Badge>
                            )}
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>{topic.category || 'Uncategorized'}</span>
                          <span>{topic._count?.articles || 0} articles</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}