import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ContentOutlineGenerator = () => {
  const [topic, setTopic] = useState("");
  const [contentType, setContentType] = useState("");
  const [outline, setOutline] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const generateOutline = () => {
    if (!topic.trim() || !contentType) return;
    
    setIsLoading(true);
    
    setTimeout(() => {
      const outlineTemplates = {
        "blog-post": {
          title: `The Complete Guide to ${topic}`,
          sections: [
            {
              heading: "Introduction",
              points: [
                `What is ${topic}?`,
                `Why ${topic} matters in 2025`,
                `What you'll learn in this guide`
              ]
            },
            {
              heading: `Getting Started with ${topic}`,
              points: [
                `Basic concepts and terminology`,
                `Essential tools and resources`,
                `Setting up your first ${topic} project`
              ]
            },
            {
              heading: `Advanced ${topic} Strategies`,
              points: [
                `Best practices from experts`,
                `Common mistakes to avoid`,
                `Optimization techniques`
              ]
            },
            {
              heading: `Real-World ${topic} Examples`,
              points: [
                `Case study 1: Success story`,
                `Case study 2: Lessons learned`,
                `Industry-specific applications`
              ]
            },
            {
              heading: "Conclusion",
              points: [
                `Key takeaways`,
                `Next steps and action items`,
                `Additional resources`
              ]
            }
          ]
        },
        "video": {
          title: `${topic}: Complete Tutorial`,
          sections: [
            {
              heading: "Hook & Introduction (0-30 seconds)",
              points: [
                `Attention-grabbing opener`,
                `Promise of value`,
                `Brief preview of what's coming`
              ]
            },
            {
              heading: `${topic} Basics (30 seconds - 2 minutes)`,
              points: [
                `Quick definition and context`,
                `Why viewers should care`,
                `Common misconceptions`
              ]
            },
            {
              heading: `Step-by-Step Tutorial (2-8 minutes)`,
              points: [
                `Step 1: Foundation setup`,
                `Step 2: Core implementation`,
                `Step 3: Advanced techniques`,
                `Tips and tricks`
              ]
            },
            {
              heading: "Examples & Results (8-10 minutes)",
              points: [
                `Live demonstration`,
                `Before and after comparison`,
                `Common troubleshooting`
              ]
            },
            {
              heading: "Call to Action (10-11 minutes)",
              points: [
                `Summarize key points`,
                `Next video recommendation`,
                `Subscribe and engage prompt`
              ]
            }
          ]
        },
        "course": {
          title: `Master ${topic}: Complete Course`,
          sections: [
            {
              heading: "Module 1: Foundation",
              points: [
                `${topic} fundamentals`,
                `Industry overview`,
                `Goal setting and planning`
              ]
            },
            {
              heading: "Module 2: Core Concepts",
              points: [
                `Essential ${topic} principles`,
                `Tools and technologies`,
                `Hands-on exercises`
              ]
            },
            {
              heading: "Module 3: Practical Application",
              points: [
                `Real-world projects`,
                `Best practices`,
                `Quality assessment`
              ]
            },
            {
              heading: "Module 4: Advanced Techniques",
              points: [
                `Expert strategies`,
                `Optimization methods`,
                `Scaling approaches`
              ]
            },
            {
              heading: "Module 5: Mastery & Beyond",
              points: [
                `Certification project`,
                `Career opportunities`,
                `Continued learning path`
              ]
            }
          ]
        }
      };

      const selectedOutline = outlineTemplates[contentType as keyof typeof outlineTemplates];
      setOutline(selectedOutline);
      setIsLoading(false);
    }, 1200);
  };

  const copyOutline = () => {
    if (!outline) return;
    
    let outlineText = `${outline.title}\n\n`;
    outline.sections.forEach((section: any, index: number) => {
      outlineText += `${index + 1}. ${section.heading}\n`;
      section.points.forEach((point: string) => {
        outlineText += `   • ${point}\n`;
      });
      outlineText += '\n';
    });

    navigator.clipboard.writeText(outlineText);
    toast({
      title: "Copied!",
      description: "Content outline copied to clipboard",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-reckless font-medium mb-4">Content Outline Generator</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Create structured, comprehensive outlines for your blog posts, videos, and courses.
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Generate Content Outline
            </CardTitle>
            <CardDescription>
              Enter your topic and choose the content type
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Enter your topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
            <Select value={contentType} onValueChange={setContentType}>
              <SelectTrigger>
                <SelectValue placeholder="Select content type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="blog-post">Blog Post</SelectItem>
                <SelectItem value="video">Video Content</SelectItem>
                <SelectItem value="course">Online Course</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              onClick={generateOutline} 
              disabled={!topic.trim() || !contentType || isLoading}
              className="w-full"
            >
              {isLoading ? "Generating..." : "Generate Outline"}
            </Button>
          </CardContent>
        </Card>

        {outline && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Content Outline</CardTitle>
                <CardDescription>
                  Structured outline for your {contentType.replace('-', ' ')}
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={copyOutline}>
                <Copy className="w-4 h-4 mr-2" />
                Copy Outline
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold text-center">{outline.title}</h2>
                {outline.sections.map((section: any, index: number) => (
                  <div key={index} className="border-l-4 border-primary pl-4">
                    <h3 className="text-lg font-semibold mb-2">
                      {index + 1}. {section.heading}
                    </h3>
                    <ul className="space-y-1">
                      {section.points.map((point: string, pointIndex: number) => (
                        <li key={pointIndex} className="text-muted-foreground ml-4">
                          • {point}
                        </li>
                      ))}
                    </ul>
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

export default ContentOutlineGenerator;