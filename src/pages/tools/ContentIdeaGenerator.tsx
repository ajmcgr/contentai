import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, BookOpen } from "lucide-react";

const ContentIdeaGenerator = () => {
  const [niche, setNiche] = useState("");
  const [contentType, setContentType] = useState("");
  const [ideas, setIdeas] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const generateIdeas = () => {
    if (!niche.trim() || !contentType) return;
    
    setIsLoading(true);
    
    setTimeout(() => {
      const ideaTemplates = {
        "blog-post": [
          `10 Essential ${niche} Tips for Beginners`,
          `The Complete Guide to ${niche} in 2025`,
          `5 Common ${niche} Mistakes to Avoid`,
          `How ${niche} Changed My Life (Personal Story)`,
          `${niche} vs Alternatives: Which is Better?`,
          `The Future of ${niche}: Trends and Predictions`,
          `${niche} Tools Every Professional Should Know`,
          `Case Study: How I Mastered ${niche} in 30 Days`
        ],
        "video": [
          `${niche} Tutorial: Step by Step Guide`,
          `Day in the Life of a ${niche} Expert`,
          `${niche} Equipment Review and Recommendations`,
          `Common ${niche} Questions Answered`,
          `${niche} Before and After Transformation`,
          `Live ${niche} Q&A Session`,
          `${niche} Myths Debunked`,
          `Behind the Scenes: ${niche} Process Revealed`
        ],
        "social-media": [
          `Quick ${niche} tip of the day`,
          `${niche} inspiration Monday`,
          `Share your ${niche} wins`,
          `${niche} quote and motivation`,
          `Poll: What's your biggest ${niche} challenge?`,
          `${niche} before/after showcase`,
          `Ask me anything about ${niche}`,
          `${niche} resource recommendation`
        ]
      };

      const selectedTemplates = ideaTemplates[contentType as keyof typeof ideaTemplates] || [];
      setIdeas(selectedTemplates);
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-reckless font-medium mb-4">Content Idea Generator</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Never run out of content ideas again. Generate fresh, engaging topics for your audience.
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5" />
              Generate Content Ideas
            </CardTitle>
            <CardDescription>
              Choose your niche and content type to get tailored ideas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Enter your niche (e.g., fitness, cooking, business)"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
            />
            <Select value={contentType} onValueChange={setContentType}>
              <SelectTrigger>
                <SelectValue placeholder="Select content type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="blog-post">Blog Post</SelectItem>
                <SelectItem value="video">Video Content</SelectItem>
                <SelectItem value="social-media">Social Media</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              onClick={generateIdeas} 
              disabled={!niche.trim() || !contentType || isLoading}
              className="w-full"
            >
              {isLoading ? "Generating..." : "Generate Ideas"}
            </Button>
          </CardContent>
        </Card>

        {ideas.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Content Ideas
              </CardTitle>
              <CardDescription>
                Fresh ideas tailored to your niche and content type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {ideas.map((idea, index) => (
                  <div
                    key={index}
                    className="p-4 bg-muted/50 rounded-lg hover:bg-muted/80 transition-colors"
                  >
                    <h3 className="font-medium">{idea}</h3>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ContentIdeaGenerator;