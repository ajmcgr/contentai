import { Search, FileText, Zap } from "lucide-react";

export const FeaturesSection = () => {
  return (
    <div className="py-16 md:py-20 bg-white">
      <div className="max-w-4xl mx-auto px-4 md:px-6">
        <h2 className="text-3xl md:text-4xl font-reckless text-center mb-12 md:mb-16">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-8 md:gap-12">
          <div className="text-center">
            <div className="bg-primary/10 w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
              <Search className="h-8 w-8 md:h-10 md:w-10 text-primary" />
            </div>
            <h3 className="text-xl md:text-2xl font-reckless mb-3 md:mb-4">1. Deep Business Analysis</h3>
            <p className="text-muted-foreground text-base md:text-lg">We analyze your business niche, competitors, and discover hidden keywords with the highest growth potential.</p>
          </div>
          <div className="text-center">
            <div className="bg-primary/10 w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
              <FileText className="h-8 w-8 md:h-10 md:w-10 text-primary" />
            </div>
            <h3 className="text-xl md:text-2xl font-reckless mb-3 md:mb-4">2. 30-Day Content Plan</h3>
            <p className="text-muted-foreground text-base md:text-lg">Get a comprehensive content calendar with daily keywords optimized for maximum organic reach.</p>
          </div>
          <div className="text-center">
            <div className="bg-primary/10 w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
              <Zap className="h-8 w-8 md:h-10 md:w-10 text-primary" />
            </div>
            <h3 className="text-xl md:text-2xl font-reckless mb-3 md:mb-4">3. Automated Publishing</h3>
            <p className="text-muted-foreground text-base md:text-lg">SEO-optimized articles with human-like tone, AI images, and embedded videos published automatically.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
