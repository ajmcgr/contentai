
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { Link } from "react-router-dom";

export const PricingSection = () => {
  return (
    <div className="py-20 bg-gray-50">
      <div className="max-w-4xl mx-auto px-6">
        <h2 className="text-4xl font-reckless font-medium text-center mb-12">Simple, Transparent Pricing</h2>
        <div className="max-w-2xl mx-auto">
          <div className="bg-white p-10 rounded-xl shadow-lg border-2 border-primary">
            <div className="text-center mb-8">
              <h3 className="text-3xl font-reckless font-medium mb-4">Content AI Pro</h3>
              <p className="text-5xl font-bold mb-2">$49<span className="text-xl text-gray-500">/month</span></p>
              <p className="text-gray-600">30 SEO-optimized articles per month, published automatically</p>
            </div>
            
            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-3">
                <Check className="text-primary w-5 h-5 mt-0.5 flex-shrink-0" />
                <span>30 Articles a month generated and published on autopilot</span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="text-primary w-5 h-5 mt-0.5 flex-shrink-0" />
                <span>Unlimited Users per Organization</span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="text-primary w-5 h-5 mt-0.5 flex-shrink-0" />
                <span>Automatic Keyword Research</span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="text-primary w-5 h-5 mt-0.5 flex-shrink-0" />
                <span>Integrations: WordPress, Webflow, Shopify, Framer, Notion, Wix, API</span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="text-primary w-5 h-5 mt-0.5 flex-shrink-0" />
                <span>High DR Backlinks via Backlink Exchange</span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="text-primary w-5 h-5 mt-0.5 flex-shrink-0" />
                <span>AI Images in multiple styles</span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="text-primary w-5 h-5 mt-0.5 flex-shrink-0" />
                <span>Relevant YouTube videos embedded into articles</span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="text-primary w-5 h-5 mt-0.5 flex-shrink-0" />
                <span>Articles in 150+ languages</span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="text-primary w-5 h-5 mt-0.5 flex-shrink-0" />
                <span>Unlimited AI Rewrites</span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="text-primary w-5 h-5 mt-0.5 flex-shrink-0" />
                <span>Custom feature requests</span>
              </div>
            </div>
            
            <Button asChild className="w-full text-lg py-3">
              <Link to="/signup">Start Free Trial</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
