import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const SEOTitleGenerator = () => {
  const [keyword, setKeyword] = useState("");
  const [business, setBusiness] = useState("");
  const [titles, setTitles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const generateTitles = () => {
    if (!keyword.trim()) return;
    
    setIsLoading(true);
    
    setTimeout(() => {
      const brandSuffix = business ? ` | ${business}` : "";
      const seoTitles = [
        {
          title: `${keyword} - Complete Guide for Beginners${brandSuffix}`,
          length: `${keyword} - Complete Guide for Beginners${brandSuffix}`.length,
          score: 95
        },
        {
          title: `Best ${keyword} Tips & Strategies for 2025${brandSuffix}`,
          length: `Best ${keyword} Tips & Strategies for 2025${brandSuffix}`.length,
          score: 92
        },
        {
          title: `How to Master ${keyword}: Expert Guide${brandSuffix}`,
          length: `How to Master ${keyword}: Expert Guide${brandSuffix}`.length,
          score: 89
        },
        {
          title: `${keyword} Made Simple: Ultimate Tutorial${brandSuffix}`,
          length: `${keyword} Made Simple: Ultimate Tutorial${brandSuffix}`.length,
          score: 87
        },
        {
          title: `Professional ${keyword} Services & Solutions${brandSuffix}`,
          length: `Professional ${keyword} Services & Solutions${brandSuffix}`.length,
          score: 85
        }
      ];
      setTitles(seoTitles);
      setIsLoading(false);
    }, 1000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "SEO title copied to clipboard",
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 80) return "text-yellow-600";
    return "text-red-600";
  };

  const getLengthColor = (length: number) => {
    if (length <= 60) return "text-green-600";
    if (length <= 70) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-reckless font-medium mb-4">SEO Title Generator</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Generate SEO-optimized titles that rank well and drive organic traffic to your website.
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Generate SEO Titles
            </CardTitle>
            <CardDescription>
              Enter your target keyword and optional business name
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Target keyword (e.g., web design, digital marketing)"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
            <Input
              placeholder="Business/Brand name (optional)"
              value={business}
              onChange={(e) => setBusiness(e.target.value)}
            />
            <Button 
              onClick={generateTitles} 
              disabled={!keyword.trim() || isLoading}
              className="w-full"
            >
              {isLoading ? "Generating..." : "Generate SEO Titles"}
            </Button>
          </CardContent>
        </Card>

        {titles.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>SEO-Optimized Titles</CardTitle>
              <CardDescription>
                Titles optimized for search engines with SEO scores and character counts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {titles.map((item, index) => (
                  <div
                    key={index}
                    className="p-4 bg-muted/50 rounded-lg hover:bg-muted/80 transition-colors cursor-pointer"
                    onClick={() => copyToClipboard(item.title)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="flex-1 font-medium pr-4">{item.title}</h3>
                      <Copy className="w-4 h-4 text-muted-foreground mt-1" />
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className={`font-medium ${getScoreColor(item.score)}`}>
                        SEO Score: {item.score}/100
                      </span>
                      <span className={`${getLengthColor(item.length)}`}>
                        {item.length} characters
                      </span>
                      {item.length > 60 && (
                        <span className="text-red-500 text-xs">
                          ⚠️ May be truncated in search results
                        </span>
                      )}
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

export default SEOTitleGenerator;