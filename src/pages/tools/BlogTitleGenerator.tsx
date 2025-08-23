import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, PenTool } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BlogTitleGenerator = () => {
  const [topic, setTopic] = useState("");
  const [style, setStyle] = useState("");
  const [titles, setTitles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const generateTitles = () => {
    if (!topic.trim() || !style) return;
    
    setIsLoading(true);
    
    setTimeout(() => {
      const titleTemplates = {
        "listicle": [
          `10 ${topic} Secrets That Will Change Everything`,
          `7 Essential ${topic} Tips for Beginners`,
          `15 ${topic} Hacks You Need to Know`,
          `5 ${topic} Mistakes That Are Costing You`,
          `12 Proven ${topic} Strategies for Success`
        ],
        "how-to": [
          `How to Master ${topic} in 30 Days`,
          `Step-by-Step Guide to ${topic}`,
          `How to ${topic} Like a Pro`,
          `The Complete ${topic} Tutorial`,
          `How to Get Started with ${topic} Today`
        ],
        "question": [
          `What is ${topic}? Everything You Need to Know`,
          `Why ${topic} Matters More Than You Think`,
          `When Should You Start ${topic}?`,
          `Which ${topic} Method Works Best?`,
          `How Does ${topic} Actually Work?`
        ],
        "ultimate": [
          `The Ultimate ${topic} Guide for 2025`,
          `The Complete ${topic} Handbook`,
          `Everything About ${topic} in One Place`,
          `The Only ${topic} Resource You'll Ever Need`,
          `The Definitive ${topic} Encyclopedia`
        ]
      };

      const selectedTitles = titleTemplates[style as keyof typeof titleTemplates] || [];
      setTitles(selectedTitles);
      setIsLoading(false);
    }, 1000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Blog title copied to clipboard",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-reckless font-medium mb-4">Blog Title Generator</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Create catchy, SEO-friendly blog titles that attract readers and rank well in search engines.
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PenTool className="w-5 h-5" />
              Generate Blog Titles
            </CardTitle>
            <CardDescription>
              Enter your topic and choose a title style
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Enter your blog topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
            <Select value={style} onValueChange={setStyle}>
              <SelectTrigger>
                <SelectValue placeholder="Select title style" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="listicle">Listicle (10 Ways, 5 Tips...)</SelectItem>
                <SelectItem value="how-to">How-To Guide</SelectItem>
                <SelectItem value="question">Question-Based</SelectItem>
                <SelectItem value="ultimate">Ultimate Guide</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              onClick={generateTitles} 
              disabled={!topic.trim() || !style || isLoading}
              className="w-full"
            >
              {isLoading ? "Generating..." : "Generate Titles"}
            </Button>
          </CardContent>
        </Card>

        {titles.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Generated Blog Titles</CardTitle>
              <CardDescription>
                Click to copy any title to your clipboard
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {titles.map((title, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted/80 transition-colors cursor-pointer"
                    onClick={() => copyToClipboard(title)}
                  >
                    <span className="flex-1 font-medium">{title}</span>
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

export default BlogTitleGenerator;