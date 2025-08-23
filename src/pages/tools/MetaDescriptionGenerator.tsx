import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const MetaDescriptionGenerator = () => {
  const [keyword, setKeyword] = useState("");
  const [content, setContent] = useState("");
  const [metaDescriptions, setMetaDescriptions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const generateDescriptions = () => {
    if (!keyword.trim()) return;
    
    setIsLoading(true);
    
    setTimeout(() => {
      const descriptions = [
        `Discover everything about ${keyword}. Expert tips, insights, and strategies to help you succeed. Get started today and see real results.`,
        `Learn ${keyword} with our comprehensive guide. Step-by-step instructions, best practices, and proven techniques for success.`,
        `Master ${keyword} with expert advice and actionable tips. Transform your approach and achieve better results faster than ever before.`,
        `The ultimate ${keyword} resource. Get practical advice, proven strategies, and insider tips from industry experts. Start now!`,
        `Unlock the power of ${keyword}. Professional insights, detailed guides, and practical tips to help you succeed in your goals.`
      ];
      setMetaDescriptions(descriptions);
      setIsLoading(false);
    }, 1000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Meta description copied to clipboard",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-reckless font-medium mb-4">Meta Description Generator</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Create compelling meta descriptions that improve your search engine rankings and click-through rates.
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Generate Meta Descriptions
            </CardTitle>
            <CardDescription>
              Enter your main keyword and optional content summary
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Main keyword or topic"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
            <Textarea
              placeholder="Brief content summary (optional)"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
            />
            <Button 
              onClick={generateDescriptions} 
              disabled={!keyword.trim() || isLoading}
              className="w-full"
            >
              {isLoading ? "Generating..." : "Generate Meta Descriptions"}
            </Button>
          </CardContent>
        </Card>

        {metaDescriptions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Generated Meta Descriptions</CardTitle>
              <CardDescription>
                Each description is optimized for SEO and under 160 characters
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {metaDescriptions.map((description, index) => (
                  <div
                    key={index}
                    className="flex items-start justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted/80 transition-colors cursor-pointer"
                    onClick={() => copyToClipboard(description)}
                  >
                    <div className="flex-1">
                      <p className="text-sm">{description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {description.length} characters
                      </p>
                    </div>
                    <Copy className="w-4 h-4 text-muted-foreground ml-3 mt-1" />
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

export default MetaDescriptionGenerator;