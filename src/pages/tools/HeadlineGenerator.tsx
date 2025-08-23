import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const HeadlineGenerator = () => {
  const [topic, setTopic] = useState("");
  const [headlines, setHeadlines] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const generateHeadlines = () => {
    if (!topic.trim()) return;
    
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      const generatedHeadlines = [
        `10 ${topic} Tips That Will Transform Your Business`,
        `The Ultimate Guide to ${topic}: Everything You Need to Know`,
        `Why ${topic} Is the Secret to Success in 2025`,
        `${topic} Made Simple: A Beginner's Complete Guide`,
        `The Science Behind ${topic}: What Studies Reveal`,
        `5 Common ${topic} Mistakes That Are Costing You Money`,
        `How to Master ${topic} in Just 30 Days`,
        `The Future of ${topic}: Trends to Watch This Year`
      ];
      setHeadlines(generatedHeadlines);
      setIsLoading(false);
    }, 1000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Headline copied to clipboard",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-reckless font-medium mb-4">Headline Generator</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Generate compelling headlines that grab attention and drive clicks for your content.
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Generate Headlines
            </CardTitle>
            <CardDescription>
              Enter your topic or keyword to generate engaging headlines
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Enter your topic (e.g., AI, Marketing, Health)"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && generateHeadlines()}
            />
            <Button 
              onClick={generateHeadlines} 
              disabled={!topic.trim() || isLoading}
              className="w-full"
            >
              {isLoading ? "Generating..." : "Generate Headlines"}
            </Button>
          </CardContent>
        </Card>

        {headlines.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Generated Headlines</CardTitle>
              <CardDescription>
                Click to copy any headline to your clipboard
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {headlines.map((headline, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted/80 transition-colors cursor-pointer"
                    onClick={() => copyToClipboard(headline)}
                  >
                    <span className="flex-1">{headline}</span>
                    <Copy className="w-4 h-4 text-muted-foreground" />
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

export default HeadlineGenerator;