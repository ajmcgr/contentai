import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Article {
  id: string;
  title: string;
  status: string;
  created_at: string;
  published_at?: string;
}

export function ArticleScheduler() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedArticles, setSelectedArticles] = useState<string[]>([]);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("18:00");
  const [timezone, setTimezone] = useState("UTC");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchArticles = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('articles')
        .select('id, title, status, created_at, published_at')
        .eq('user_id', user.id)
        .in('status', ['draft', 'scheduled'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setArticles(data || []);
    } catch (error) {
      console.error('Error fetching articles:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  const handleArticleToggle = (articleId: string) => {
    setSelectedArticles(prev => 
      prev.includes(articleId) 
        ? prev.filter(id => id !== articleId)
        : [...prev, articleId]
    );
  };

  const handleSelectAll = () => {
    const draftArticles = articles.filter(article => article.status === 'draft');
    setSelectedArticles(
      selectedArticles.length === draftArticles.length 
        ? [] 
        : draftArticles.map(article => article.id)
    );
  };

  const handleScheduleArticles = async () => {
    if (selectedArticles.length === 0) {
      toast({
        title: "No articles selected",
        description: "Please select at least one article to schedule.",
        variant: "destructive",
      });
      return;
    }

    if (!scheduledDate || !scheduledTime) {
      toast({
        title: "Missing schedule details",
        description: "Please set both date and time for scheduling.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Combine date and time into ISO string
      const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();

      // Update selected articles
      const { error } = await supabase
        .from('articles')
        .update({ 
          status: 'scheduled',
          published_at: scheduledDateTime
        })
        .in('id', selectedArticles)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Articles scheduled!",
        description: `${selectedArticles.length} article${selectedArticles.length !== 1 ? 's' : ''} scheduled for ${new Date(scheduledDateTime).toLocaleString()}.`,
      });

      // Reset selections and refresh
      setSelectedArticles([]);
      fetchArticles();
    } catch (error: any) {
      console.error('Error scheduling articles:', error);
      toast({
        title: "Error scheduling articles",
        description: error.message || "Failed to schedule articles. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleUnschedule = async (articleId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('articles')
        .update({ 
          status: 'draft',
          published_at: null
        })
        .eq('id', articleId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Article unscheduled",
        description: "The article has been moved back to draft status.",
      });

      fetchArticles();
    } catch (error: any) {
      console.error('Error unscheduling article:', error);
      toast({
        title: "Error unscheduling article",
        description: error.message || "Failed to unschedule article. Please try again.",
        variant: "destructive",
      });
    }
  };

  const draftArticles = articles.filter(article => article.status === 'draft');
  const scheduledArticles = articles.filter(article => article.status === 'scheduled');

  if (loading) {
    return <div className="text-center py-4">Loading articles...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Scheduling Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Schedule Articles
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="time"
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger>
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UTC">GMT+00:00 (UTC)</SelectItem>
                  <SelectItem value="EST">GMT-05:00 (EST)</SelectItem>
                  <SelectItem value="PST">GMT-08:00 (PST)</SelectItem>
                  <SelectItem value="CET">GMT+01:00 (CET)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Button 
            onClick={handleScheduleArticles}
            disabled={selectedArticles.length === 0 || !scheduledDate || !scheduledTime}
            className="w-full"
          >
            Schedule {selectedArticles.length} Selected Article{selectedArticles.length !== 1 ? 's' : ''}
          </Button>
        </CardContent>
      </Card>

      {/* Draft Articles */}
      {draftArticles.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Draft Articles ({draftArticles.length})
              </CardTitle>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleSelectAll}
              >
                {selectedArticles.length === draftArticles.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {draftArticles.map((article) => (
                <div 
                  key={article.id} 
                  className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50"
                >
                  <Checkbox
                    checked={selectedArticles.includes(article.id)}
                    onCheckedChange={() => handleArticleToggle(article.id)}
                  />
                  <div className="flex-1">
                    <h4 className="font-medium">{article.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      Created {new Date(article.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="secondary">Draft</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scheduled Articles */}
      {scheduledArticles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Scheduled Articles ({scheduledArticles.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {scheduledArticles.map((article) => (
                <div 
                  key={article.id} 
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <h4 className="font-medium">{article.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      Scheduled for {article.published_at ? new Date(article.published_at).toLocaleString() : 'Unknown'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Scheduled</Badge>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleUnschedule(article.id)}
                    >
                      Unschedule
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {articles.length === 0 && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No articles to schedule</h3>
              <p className="text-muted-foreground">
                Create some draft articles first to schedule them for publishing.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}