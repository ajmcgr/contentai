
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { Link } from "react-router-dom";

export const PricingSection = () => {
  return (
    <div className="py-20 bg-gray-50">
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="text-4xl font-reckless font-medium text-center mb-12">Simple, Transparent Pricing</h2>
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Free Trial Card */}
          <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-reckless font-medium mb-4">Free Trial</h3>
              <p className="text-4xl font-bold mb-2">$0<span className="text-lg text-gray-500">/7 days</span></p>
              <p className="text-gray-600">Try Content AI for 7 days with 3 free articles</p>
            </div>
            
            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-3">
                <Check className="text-primary w-5 h-5 mt-0.5 flex-shrink-0" />
                <span>3 Articles generated during trial</span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="text-primary w-5 h-5 mt-0.5 flex-shrink-0" />
                <span>Full access to all AI tools</span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="text-primary w-5 h-5 mt-0.5 flex-shrink-0" />
                <span>SEO optimization features</span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="text-primary w-5 h-5 mt-0.5 flex-shrink-0" />
                <span>No credit card required</span>
              </div>
            </div>
            
            <Button asChild className="w-full">
              <Link to="/signup">Start Free Trial</Link>
            </Button>
          </div>

          {/* Pro Plan Card */}
          <div className="bg-white p-8 rounded-xl shadow-lg border-2 border-primary">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-reckless font-medium mb-4">Content AI Pro</h3>
              <p className="text-4xl font-bold mb-2">$49<span className="text-lg text-gray-500">/month</span></p>
              <p className="text-gray-600">30 SEO-optimized articles per month, published automatically</p>
            </div>
            
            <div className="space-y-3 mb-6">
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
            
            <Button asChild className="w-full">
              <Link to="/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
