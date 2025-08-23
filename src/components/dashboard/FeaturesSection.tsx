import { Search, FileText, Zap } from "lucide-react";

export const FeaturesSection = () => {
  return (
    <div className="py-20 bg-white">
      <div className="max-w-4xl mx-auto px-6">
        <h2 className="text-4xl font-reckless font-medium text-center mb-16">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-12">
          <div className="text-center">
            <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-2xl font-reckless font-medium mb-4">1. Deep Business Analysis</h3>
            <p className="text-gray-600 text-lg">We analyze your business niche, competitors, and discover hidden keywords with the highest growth potential.</p>
          </div>
          <div className="text-center">
            <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-2xl font-reckless font-medium mb-4">2. 30-Day Content Plan</h3>
            <p className="text-gray-600 text-lg">Get a comprehensive content calendar with daily keywords optimized for maximum organic reach.</p>
          </div>
          <div className="text-center">
            <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Zap className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-2xl font-reckless font-medium mb-4">3. Automated Publishing</h3>
            <p className="text-gray-600 text-lg">SEO-optimized articles with human-like tone, AI images, and embedded videos published automatically.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
