import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, XCircle, BookOpen } from "lucide-react";

const ReadabilityChecker = () => {
  const [text, setText] = useState("");
  const [analysis, setAnalysis] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const analyzeText = () => {
    if (!text.trim()) return;
    
    setIsLoading(true);
    
    setTimeout(() => {
      // Calculate basic readability metrics
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
      const words = text.split(/\s+/).filter(w => w.length > 0);
      const syllables = words.reduce((total, word) => {
        return total + countSyllables(word);
      }, 0);

      const avgWordsPerSentence = words.length / sentences.length;
      const avgSyllablesPerWord = syllables / words.length;
      
      // Flesch Reading Ease Score
      const fleschScore = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
      
      // Flesch-Kincaid Grade Level
      const gradeLevel = (0.39 * avgWordsPerSentence) + (11.8 * avgSyllablesPerWord) - 15.59;

      const analysisResult = {
        wordCount: words.length,
        sentenceCount: sentences.length,
        paragraphCount: text.split('\n\n').filter(p => p.trim().length > 0).length,
        avgWordsPerSentence: Math.round(avgWordsPerSentence * 10) / 10,
        fleschScore: Math.round(fleschScore),
        gradeLevel: Math.round(gradeLevel * 10) / 10,
        readingTime: Math.ceil(words.length / 200), // assuming 200 WPM
        suggestions: generateSuggestions(avgWordsPerSentence, fleschScore)
      };

      setAnalysis(analysisResult);
      setIsLoading(false);
    }, 1000);
  };

  const countSyllables = (word: string): number => {
    word = word.toLowerCase();
    if (word.length <= 3) return 1;
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');
    const matches = word.match(/[aeiouy]{1,2}/g);
    return matches ? matches.length : 1;
  };

  const generateSuggestions = (avgWords: number, flesch: number) => {
    const suggestions = [];
    
    if (avgWords > 20) {
      suggestions.push("Consider breaking up long sentences for better readability");
    }
    if (flesch < 60) {
      suggestions.push("Use simpler words and shorter sentences to improve readability");
    }
    if (flesch > 90) {
      suggestions.push("Great! Your text is very easy to read");
    }
    
    return suggestions;
  };

  const getFleschGrade = (score: number) => {
    if (score >= 90) return { grade: "Very Easy", color: "bg-green-500", icon: CheckCircle };
    if (score >= 80) return { grade: "Easy", color: "bg-green-400", icon: CheckCircle };
    if (score >= 70) return { grade: "Fairly Easy", color: "bg-yellow-400", icon: CheckCircle };
    if (score >= 60) return { grade: "Standard", color: "bg-yellow-500", icon: AlertCircle };
    if (score >= 50) return { grade: "Fairly Difficult", color: "bg-orange-500", icon: AlertCircle };
    if (score >= 30) return { grade: "Difficult", color: "bg-red-500", icon: XCircle };
    return { grade: "Very Difficult", color: "bg-red-600", icon: XCircle };
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-reckless font-medium mb-4">Readability Checker</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Analyze your content's readability and get suggestions to make it more accessible to your audience.
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Text Analysis
            </CardTitle>
            <CardDescription>
              Paste your content below to analyze its readability
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Paste your content here..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
              className="min-h-[200px]"
            />
            <Button 
              onClick={analyzeText} 
              disabled={!text.trim() || isLoading}
              className="w-full"
            >
              {isLoading ? "Analyzing..." : "Check Readability"}
            </Button>
          </CardContent>
        </Card>

        {analysis && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Readability Score</CardTitle>
                <CardDescription>
                  Based on the Flesch Reading Ease formula
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-4">
                  <div className="text-4xl font-bold">{analysis.fleschScore}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {(() => {
                        const { grade, color, icon: Icon } = getFleschGrade(analysis.fleschScore);
                        return (
                          <>
                            <Icon className="w-5 h-5" />
                            <Badge className={color}>{grade}</Badge>
                          </>
                        );
                      })()}
                    </div>
                    <Progress value={Math.min(analysis.fleschScore, 100)} className="w-full" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Grade Level: {analysis.gradeLevel} (requires {analysis.gradeLevel}th grade education)
                </p>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Content Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Words:</span>
                      <span className="font-medium">{analysis.wordCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sentences:</span>
                      <span className="font-medium">{analysis.sentenceCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Paragraphs:</span>
                      <span className="font-medium">{analysis.paragraphCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Avg words/sentence:</span>
                      <span className="font-medium">{analysis.avgWordsPerSentence}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Reading time:</span>
                      <span className="font-medium">{analysis.readingTime} min</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Improvement Suggestions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analysis.suggestions.map((suggestion: string, index: number) => (
                      <div key={index} className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                        <span className="text-sm">{suggestion}</span>
                      </div>
                    ))}
                    {analysis.suggestions.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        Your content has good readability! Keep up the great work.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReadabilityChecker;