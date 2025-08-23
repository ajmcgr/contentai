import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Wand2, FileText, Image, Share, Search } from 'lucide-react';

interface Article {
  id: string;
  title: string;
  content: string;
  meta_description: string;
  keywords: string[];
  status: string;
  word_count: number;
  created_at: string;
}

interface KeywordData {
  primary_keywords: Array<{
    keyword: string;
    volume: number;
    difficulty: string;
    cpc: number;
  }>;
  long_tail_keywords: Array<{
    keyword: string;
    volume: number;
    difficulty: string;
    cpc: number;
  }>;
  related_keywords: string[];
  search_intent: string;
  content_opportunities: string[];
}

export default function ContentGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isResearching, setIsResearching] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [article, setArticle] = useState<Article | null>(null);
  const [keywordData, setKeywordData] = useState<KeywordData | null>(null);
  const [generatedImages, setGeneratedImages] = useState<any[]>([]);

  // Form states
  const [topic, setTopic] = useState('');
  const [keywords, setKeywords] = useState('');
  const [tone, setTone] = useState('professional');
  const [wordCount, setWordCount] = useState(1000);
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageStyle, setImageStyle] = useState('photorealistic');

  const handleKeywordResearch = async () => {
    if (!topic.trim()) {
      toast.error('Please enter a topic first');
      return;
    }

    setIsResearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('keyword-research', {
        body: {
          query: topic,
          industry: 'general',
          region: 'global'
        }
      });

      if (error) throw error;

      setKeywordData(data);
      // Auto-populate keywords field with primary keywords
      const primaryKeywords = data.primary_keywords.map((k: any) => k.keyword).join(', ');
      setKeywords(primaryKeywords);
      toast.success('Keyword research completed!');
    } catch (error: any) {
      console.error('Error:', error);
      toast.error('Failed to research keywords: ' + error.message);
    } finally {
      setIsResearching(false);
    }
  };

  const handleGenerateContent = async () => {
    if (!topic.trim()) {
      toast.error('Please enter a topic');
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-content', {
        body: {
          topic,
          keywords: keywords.split(',').map(k => k.trim()).filter(k => k),
          tone,
          wordCount
        }
      });

      if (error) throw error;

      setArticle(data.article);
      toast.success('Content generated successfully!');
    } catch (error: any) {
      console.error('Error:', error);
      toast.error('Failed to generate content: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) {
      toast.error('Please enter an image prompt');
      return;
    }

    setIsGeneratingImage(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-images', {
        body: {
          prompt: imagePrompt,
          style: imageStyle,
          size: '1024x1024',
          quantity: 1,
          articleId: article?.id
        }
      });

      if (error) throw error;

      setGeneratedImages(data.images);
      toast.success('Images generated successfully!');
    } catch (error: any) {
      console.error('Error:', error);
      toast.error('Failed to generate images: ' + error.message);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">AI Content Generator</h1>
        <p className="text-muted-foreground">
          Create high-quality articles with AI-powered keyword research and image generation
        </p>
      </div>

      <Tabs defaultValue="generate" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="generate" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Generate
          </TabsTrigger>
          <TabsTrigger value="keywords" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Keywords
          </TabsTrigger>
          <TabsTrigger value="images" className="flex items-center gap-2">
            <Image className="h-4 w-4" />
            Images
          </TabsTrigger>
          <TabsTrigger value="publish" className="flex items-center gap-2">
            <Share className="h-4 w-4" />
            Publish
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wand2 className="h-5 w-5" />
                  Content Settings
                </CardTitle>
                <CardDescription>
                  Configure your article generation parameters
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="topic">Article Topic *</Label>
                  <Input
                    id="topic"
                    placeholder="e.g., The Future of Artificial Intelligence"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="keywords">Target Keywords</Label>
                  <Textarea
                    id="keywords"
                    placeholder="e.g., AI, machine learning, automation"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    rows={3}
                  />
                  <p className="text-sm text-muted-foreground">
                    Separate multiple keywords with commas
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tone">Tone</Label>
                    <Select value={tone} onValueChange={setTone}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="casual">Casual</SelectItem>
                        <SelectItem value="academic">Academic</SelectItem>
                        <SelectItem value="conversational">Conversational</SelectItem>
                        <SelectItem value="technical">Technical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="wordCount">Word Count</Label>
                    <Select value={wordCount.toString()} onValueChange={(value) => setWordCount(parseInt(value))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="500">500 words</SelectItem>
                        <SelectItem value="1000">1,000 words</SelectItem>
                        <SelectItem value="1500">1,500 words</SelectItem>
                        <SelectItem value="2000">2,000 words</SelectItem>
                        <SelectItem value="3000">3,000 words</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button 
                  onClick={handleGenerateContent} 
                  disabled={isGenerating || !topic.trim()}
                  className="w-full"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Wand2 className="mr-2 h-4 w-4" />
                      Generate Article
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {article && (
              <Card>
                <CardHeader>
                  <CardTitle>Generated Article</CardTitle>
                  <CardDescription>
                    Preview of your AI-generated content
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">{article.title}</h3>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {article.keywords.map((keyword, index) => (
                        <Badge key={index} variant="secondary">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      {article.meta_description}
                    </p>
                    <div className="text-sm text-muted-foreground">
                      Word count: {article.word_count} | Status: {article.status}
                    </div>
                  </div>
                  <div 
                    className="prose prose-sm max-h-96 overflow-y-auto border rounded p-4"
                    dangerouslySetInnerHTML={{ __html: article.content.replace(/\n/g, '<br>') }}
                  />
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="keywords" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Keyword Research
              </CardTitle>
              <CardDescription>
                Discover the best keywords for your content
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter your topic for keyword research"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  onClick={handleKeywordResearch} 
                  disabled={isResearching || !topic.trim()}
                >
                  {isResearching ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Researching...
                    </>
                  ) : (
                    'Research'
                  )}
                </Button>
              </div>

              {keywordData && (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-3">Primary Keywords</h3>
                    <div className="grid gap-2">
                      {keywordData.primary_keywords.map((keyword, index) => (
                        <div key={index} className="flex justify-between items-center p-3 border rounded">
                          <span className="font-medium">{keyword.keyword}</span>
                          <div className="flex gap-4 text-sm text-muted-foreground">
                            <span>Vol: {keyword.volume.toLocaleString()}</span>
                            <span>Diff: {keyword.difficulty}</span>
                            <span>CPC: ${keyword.cpc}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3">Long-tail Keywords</h3>
                    <div className="grid gap-2">
                      {keywordData.long_tail_keywords.map((keyword, index) => (
                        <div key={index} className="flex justify-between items-center p-3 border rounded">
                          <span>{keyword.keyword}</span>
                          <div className="flex gap-4 text-sm text-muted-foreground">
                            <span>Vol: {keyword.volume.toLocaleString()}</span>
                            <span>Diff: {keyword.difficulty}</span>
                            <span>CPC: ${keyword.cpc}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3">Related Keywords</h3>
                    <div className="flex flex-wrap gap-2">
                      {keywordData.related_keywords.map((keyword, index) => (
                        <Badge key={index} variant="outline">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">Search Intent</h4>
                      <Badge variant="secondary">{keywordData.search_intent}</Badge>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Content Opportunities</h4>
                      <div className="space-y-1">
                        {keywordData.content_opportunities.map((opportunity, index) => (
                          <div key={index} className="text-sm">{opportunity}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="images" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                AI Image Generation
              </CardTitle>
              <CardDescription>
                Create custom images for your content
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="imagePrompt">Image Description</Label>
                  <Textarea
                    id="imagePrompt"
                    placeholder="e.g., A futuristic AI robot working alongside humans in an office"
                    value={imagePrompt}
                    onChange={(e) => setImagePrompt(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="imageStyle">Style</Label>
                  <Select value={imageStyle} onValueChange={setImageStyle}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="photorealistic">Photorealistic</SelectItem>
                      <SelectItem value="illustration">Digital Illustration</SelectItem>
                      <SelectItem value="minimalist">Minimalist</SelectItem>
                      <SelectItem value="artistic">Artistic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button 
                onClick={handleGenerateImage} 
                disabled={isGeneratingImage || !imagePrompt.trim()}
                className="w-full"
              >
                {isGeneratingImage ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Image...
                  </>
                ) : (
                  <>
                    <Image className="mr-2 h-4 w-4" />
                    Generate Image
                  </>
                )}
              </Button>

              {generatedImages.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-semibold">Generated Images</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {generatedImages.map((image, index) => (
                      <div key={index} className="border rounded-lg overflow-hidden">
                        <img 
                          src={image.url} 
                          alt={image.revised_prompt || imagePrompt}
                          className="w-full h-48 object-cover"
                        />
                        <div className="p-3">
                          <p className="text-sm text-muted-foreground">
                            {image.revised_prompt || imagePrompt}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="publish" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share className="h-5 w-5" />
                CMS Integration
              </CardTitle>
              <CardDescription>
                Publish your content to WordPress, Shopify, or Webflow
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Share className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  CMS integration coming soon. You can copy your generated content and publish it manually.
                </p>
                {article && (
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => {
                      navigator.clipboard.writeText(article.content);
                      toast.success('Content copied to clipboard!');
                    }}
                  >
                    Copy Content
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}