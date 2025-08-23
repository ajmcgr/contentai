import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, TrendingUp } from "lucide-react";

const KeywordResearch = () => {
  const [seed, setSeed] = useState("");
  const [keywords, setKeywords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const searchKeywords = () => {
    if (!seed.trim()) return;
    
    setIsLoading(true);
    
    setTimeout(() => {
      const mockKeywords = [
        { keyword: `${seed} tips`, volume: 12100, difficulty: "Easy", cpc: 1.20 },
        { keyword: `best ${seed}`, volume: 8300, difficulty: "Medium", cpc: 2.15 },
        { keyword: `${seed} guide`, volume: 6500, difficulty: "Easy", cpc: 0.85 },
        { keyword: `how to ${seed}`, volume: 15200, difficulty: "Medium", cpc: 1.75 },
        { keyword: `${seed} strategy`, volume: 4200, difficulty: "Hard", cpc: 3.20 },
        { keyword: `${seed} tools`, volume: 7800, difficulty: "Medium", cpc: 2.40 },
        { keyword: `${seed} examples`, volume: 3600, difficulty: "Easy", cpc: 1.10 },
        { keyword: `${seed} benefits`, volume: 5400, difficulty: "Easy", cpc: 1.60 }
      ];
      setKeywords(mockKeywords);
      setIsLoading(false);
    }, 1500);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy": return "bg-green-100 text-green-800";
      case "Medium": return "bg-yellow-100 text-yellow-800";
      case "Hard": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-reckless font-medium mb-4">Keyword Research Tool</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Discover high-value keywords to boost your SEO strategy and content planning.
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Keyword Research
            </CardTitle>
            <CardDescription>
              Enter a seed keyword to find related search terms
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Enter seed keyword (e.g., digital marketing)"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchKeywords()}
            />
            <Button 
              onClick={searchKeywords} 
              disabled={!seed.trim() || isLoading}
              className="w-full"
            >
              {isLoading ? "Researching..." : "Find Keywords"}
            </Button>
          </CardContent>
        </Card>

        {keywords.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Keyword Opportunities
              </CardTitle>
              <CardDescription>
                Keywords ranked by search volume and competition
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2">Keyword</th>
                      <th className="text-left py-3 px-2">Monthly Volume</th>
                      <th className="text-left py-3 px-2">Difficulty</th>
                      <th className="text-left py-3 px-2">CPC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {keywords.map((kw, index) => (
                      <tr key={index} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-2 font-medium">{kw.keyword}</td>
                        <td className="py-3 px-2">{kw.volume.toLocaleString()}</td>
                        <td className="py-3 px-2">
                          <Badge className={getDifficultyColor(kw.difficulty)}>
                            {kw.difficulty}
                          </Badge>
                        </td>
                        <td className="py-3 px-2">${kw.cpc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default KeywordResearch;