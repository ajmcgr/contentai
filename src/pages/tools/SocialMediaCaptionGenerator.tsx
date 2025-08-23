import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const SocialMediaCaptionGenerator = () => {
  const [topic, setTopic] = useState("");
  const [platform, setPlatform] = useState("");
  const [tone, setTone] = useState("");
  const [captions, setCaptions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const generateCaptions = () => {
    if (!topic.trim() || !platform || !tone) return;
    
    setIsLoading(true);
    
    setTimeout(() => {
      const captionTemplates = {
        instagram: {
          professional: [
            `Transform your ${topic} game with these expert insights. Swipe to see the difference! ✨ #${topic.replace(/\s+/g, '')} #Growth #Success`,
            `The secret to mastering ${topic}? It's all about consistency and strategy. Here's what works 👇 #${topic.replace(/\s+/g, '')} #Tips`,
            `Ready to level up your ${topic} skills? These proven methods will get you there faster 🚀 #${topic.replace(/\s+/g, '')} #Professional`
          ],
          casual: [
            `Obsessed with ${topic} lately! 😍 Anyone else feeling the same energy? Let's chat in the comments! #${topic.replace(/\s+/g, '')} #Vibes`,
            `Just discovered this ${topic} trick and I'm SHOOK 🤯 Had to share it with you all! #${topic.replace(/\s+/g, '')} #MindBlown`,
            `Sunday mood: diving deep into ${topic} and loving every minute of it ☀️ What's making you happy today? #${topic.replace(/\s+/g, '')}`
          ],
          funny: [
            `Me trying to explain ${topic} to my friends: *confused gestures* 😂 Who can relate? #${topic.replace(/\s+/g, '')} #Relatable #Memes`,
            `POV: You've been researching ${topic} for 3 hours straight and now you're an expert 🤓 #${topic.replace(/\s+/g, '')} #Mood`,
            `${topic} got me like: "I don't need sleep, I need answers" 😴☕ #${topic.replace(/\s+/g, '')} #NightOwl`
          ]
        },
        twitter: {
          professional: [
            `3 key insights about ${topic} that changed my perspective:\n\n1. [Insight 1]\n2. [Insight 2] \n3. [Insight 3]\n\nWhat's been your biggest learning? 🧵`,
            `${topic} isn't just a trend—it's the future. Here's why smart businesses are investing in it now: [thread] 🧵`,
            `Breaking: New research shows ${topic} can increase efficiency by 40%. The implications are huge for industries like [industry]. Thoughts? 💭`
          ],
          casual: [
            `Can we talk about how amazing ${topic} is? Like, where has this been all my life? 🤔`,
            `Current status: completely fascinated by ${topic}. Send help (or more resources) 📚`,
            `That feeling when you finally understand ${topic} 🎯 *chef's kiss*`
          ],
          funny: [
            `${topic} has entered the chat\n\nMe: *pretends to understand everything* 😅`,
            `My brain: Learn about ${topic}\nAlso my brain: But make it complicated\n\nWhy am I like this? 🤦‍♀️`,
            `Me: I'll just quickly check ${topic}\n*3 hours later*\nMe: How did I end up here? 🕳️`
          ]
        },
        linkedin: {
          professional: [
            `After 5 years in the industry, here's what I've learned about ${topic}:\n\n• Key insight 1\n• Key insight 2\n• Key insight 3\n\nWhat has your experience taught you? #${topic.replace(/\s+/g, '')} #Leadership`,
            `The future of ${topic} is here. As professionals, we need to adapt our strategies to stay competitive. Here's my take on what's coming... #Innovation #${topic.replace(/\s+/g, '')}`,
            `Reflecting on my journey with ${topic}: the challenges, the breakthroughs, and the lessons learned. Grateful for the growth. #CareerGrowth #${topic.replace(/\s+/g, '')}`
          ],
          casual: [
            `Excited to share my latest project involving ${topic}! The learning curve has been steep but incredibly rewarding. #${topic.replace(/\s+/g, '')} #Learning`,
            `Weekend reading: diving deep into ${topic} research. Always amazed by how much there is to discover! #ContinuousLearning #${topic.replace(/\s+/g, '')}`,
            `Coffee thought: How is ${topic} transforming the way we work? Would love to hear your perspectives! ☕ #${topic.replace(/\s+/g, '')}`
          ],
          funny: [
            `When someone asks me to explain ${topic} in simple terms... *nervous laughter* 😅 Anyone else relate? #${topic.replace(/\s+/g, '')} #TechLife`,
            `My relationship with ${topic}: It's complicated 📊 But we're working through it! #Learning #Growth #${topic.replace(/\s+/g, '')}`,
            `Plot twist: ${topic} is actually easier than I thought. Who knew? 🤯 #Breakthrough #${topic.replace(/\s+/g, '')}`
          ]
        }
      };

      const platformCaptions = captionTemplates[platform as keyof typeof captionTemplates];
      const toneCaptions = platformCaptions[tone as keyof typeof platformCaptions] || [];
      setCaptions(toneCaptions);
      setIsLoading(false);
    }, 1200);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Caption copied to clipboard",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-reckless font-medium mb-4">Social Media Caption Generator</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Create engaging captions for Instagram, Twitter, LinkedIn, and more. Never run out of content ideas.
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="w-5 h-5" />
              Generate Captions
            </CardTitle>
            <CardDescription>
              Enter your topic and choose platform and tone
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Enter your topic or theme"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger>
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="twitter">Twitter/X</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                </SelectContent>
              </Select>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger>
                  <SelectValue placeholder="Select tone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="funny">Funny</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={generateCaptions} 
              disabled={!topic.trim() || !platform || !tone || isLoading}
              className="w-full"
            >
              {isLoading ? "Generating..." : "Generate Captions"}
            </Button>
          </CardContent>
        </Card>

        {captions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Generated Captions</CardTitle>
              <CardDescription>
                Captions optimized for {platform} with a {tone} tone
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {captions.map((caption, index) => (
                  <div
                    key={index}
                    className="p-4 bg-muted/50 rounded-lg hover:bg-muted/80 transition-colors cursor-pointer"
                    onClick={() => copyToClipboard(caption)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 pr-4">
                        <p className="whitespace-pre-line">{caption}</p>
                      </div>
                      <Copy className="w-4 h-4 text-muted-foreground mt-1" />
                    </div>
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

export default SocialMediaCaptionGenerator;