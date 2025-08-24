
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export const HeroSection = () => {
  return (
    <div className="py-16 md:py-28 bg-white">
      <div className="max-w-5xl mx-auto px-4 md:px-6">
        <h2 className="text-4xl md:text-6xl font-reckless font-medium text-center mb-4 text-black" style={{ fontFamily: 'Reckless, Georgia, serif' }}>
          Meet Your AI Blog Content<br />Writing Assistant
        </h2>
        <p className="text-lg md:text-xl text-center max-w-2xl mx-auto mb-8 text-black">
          Generate, publish, and scale your blog on auto-pilot with SEO-optimized content, daily.
        </p>
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6 mb-6 md:mb-8">
          <Button 
            asChild
            size="lg" 
            className="no-hover text-sm md:text-base px-6 md:px-8 w-full md:w-auto bg-primary text-primary-foreground hover:bg-primary/90 hover:text-white"
          >
            <Link to="/signup">
              Start Free Trial <ArrowRight className="ml-2" />
            </Link>
          </Button>
          <div className="senja-embed" data-id="77285219-9d5a-4b35-bd39-6e413a1e81e4" data-mode="shadow" data-lazyload="false"></div>
        </div>
        <p className="text-center text-black text-sm md:text-base mb-8">✓ 7 days free trial ✓ Secure payment ✓ Cancel any-time</p>
        
        {/* Dashboard Preview Image */}
        <div className="max-w-4xl mx-auto px-4">
          <div className="relative">
            <img 
              src="/lovable-uploads/7594ded9-ce63-4c8a-b8fb-aa0ec9277526.png" 
              alt="Content AI Dashboard Preview"
              className="w-full h-auto rounded-lg shadow-2xl border border-gray-200"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-white/10 to-transparent rounded-lg"></div>
          </div>
        </div>
      </div>
    </div>
  );
};
