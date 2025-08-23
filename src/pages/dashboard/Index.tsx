
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Link, Search, Image, ArrowRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

const DashboardIndex = () => {
  const navigate = useNavigate();

  const otherFeatures = [
    {
      title: "CMS Integrations", 
      description: "Connection to WordPress, Shopify, Webflow and API",
      icon: Link,
      path: "/cms-integrations",
      color: "text-green-600"
    },
    {
      title: "Keyword Research Engine",
      description: "Integration with SEO tools",
      icon: Search,
      path: "/tools/keyword-research",
      color: "text-purple-600"
    },
    {
      title: "Image Generation",
      description: "AI image creation and optimization", 
      icon: Image,
      path: "/image-generator",
      color: "text-orange-600"
    }
  ];

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Manage your AI-powered content creation workflow</p>
      </div>
      
      {/* Main Feature - Content Generation */}
      <div className="mb-8">
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/5 hover:shadow-xl transition-all duration-300 cursor-pointer" 
              onClick={() => navigate("/content-generator")}>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10 text-primary">
                <FileText size={32} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <CardTitle className="text-2xl">Content Generation System</CardTitle>
                  <Sparkles className="text-primary" size={20} />
                </div>
                <CardDescription className="text-base">
                  AI-powered article creation using Claude - Create high-quality, SEO-optimized content in minutes
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button size="lg" className="w-full md:w-auto group">
              Start Creating Content
              <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Other Features */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">Additional Tools</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {otherFeatures.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate(feature.path)}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-muted ${feature.color}`}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </div>
                </div>
                <CardDescription className="text-sm">{feature.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button variant="outline" size="sm" className="w-full group">
                  Access Tool
                  <ArrowRight size={14} className="ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default DashboardIndex;
