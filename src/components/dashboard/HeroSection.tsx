
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export const HeroSection = () => {
  return (
    <div className="bg-[#F1F0FB] py-28">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-6xl font-merriweather font-bold text-center mb-4 text-black">
          Meet your AI social media scheduling assistant
        </h2>
        <p className="text-xl text-center max-w-2xl mx-auto mb-8 text-black">
          Schedule or post content across several of your favorite social networks any-time, anywhere.
        </p>
        <div className="flex flex-col md:flex-row items-center justify-center gap-6 mb-8">
          <Button 
            asChild
            size="lg" 
            className="bg-primary text-white hover:bg-primary/90 text-lg px-8"
          >
            <Link to="/signup">
              Sign Up <ArrowRight className="ml-2" />
            </Link>
          </Button>
          <div className="senja-embed" data-id="77285219-9d5a-4b35-bd39-6e413a1e81e4" data-mode="shadow" data-lazyload="false"></div>
        </div>
        <div className="flex flex-wrap justify-center gap-6 text-sm text-black">
          <div className="flex items-center gap-2">
            <Check className="text-primary w-4 h-4" />
            <span>7 days free trial</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="text-primary w-4 h-4" />
            <span>No credit card required</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="text-primary w-4 h-4" />
            <span>Cancel any-time</span>
          </div>
        </div>
      </div>
    </div>
  );
};
