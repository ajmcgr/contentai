
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export const HeroSection = () => {
  return (
    <div className="py-28 bg-primary">
      <div className="max-w-5xl mx-auto px-6">
        <h2 className="text-6xl font-reckless font-medium text-center mb-4 text-white" style={{ fontFamily: 'Reckless, Georgia, serif' }}>
          Meet Your AI Blog Content Writing Assistant
        </h2>
        <p className="text-xl text-center max-w-2xl mx-auto mb-8 text-white">
          Generate, publish, and scale your blog on auto-pilot with SEO-optimized content, daily.
        </p>
        <div className="flex flex-col md:flex-row items-center justify-center gap-6 mb-8">
          <Button 
            asChild
            size="lg" 
            className="bg-white hover:bg-white/90 text-lg px-8"
            style={{ color: '#222529' }}
          >
            <Link to="/signup">
              Start Free Trial <ArrowRight className="ml-2" />
            </Link>
          </Button>
          <div className="senja-embed" data-id="77285219-9d5a-4b35-bd39-6e413a1e81e4" data-mode="shadow" data-lazyload="false"></div>
        </div>
        <p className="text-center text-white text-base mb-4">✓ 7 days free trial ✓ Secure payment ✓ Cancel any-time</p>
      </div>
    </div>
  );
};
