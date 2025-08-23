
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Link, Search, Image, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const DashboardIndex = () => {
  const navigate = useNavigate();

  const features = [
    {
      title: "Content Generation System",
      description: "AI-powered article creation using Claude",
      icon: FileText,
      path: "/content-generator",
      color: "text-blue-600"
    },
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
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate(feature.path)}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-muted ${feature.color}`}>
                    <Icon size={24} />
                  </div>
                  <div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full group">
                  Get Started
                  <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
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
