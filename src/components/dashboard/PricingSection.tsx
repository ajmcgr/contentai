import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { Link } from "react-router-dom";

export const PricingSection = () => {
  return (
    <div className="py-20" style={{ backgroundColor: 'hsl(var(--section-white))' }}>
      <div className="max-w-5xl mx-auto px-6">
        <h2 className="text-4xl font-reckless text-center mb-12">Simple, Transparent Pricing</h2>
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Free Plan */}
          <div className="bg-white p-8 rounded-xl shadow-lg border-2 border-gray-200">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-reckless mb-4">Free</h3>
              <p className="text-4xl font-bold mb-2">$0<span className="text-xl text-gray-500">/month</span></p>
              <p className="text-gray-600">Perfect for getting started</p>
            </div>
            
            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-3">
                <Check className="text-primary w-5 h-5 mt-0.5 flex-shrink-0" />
                <span>3 Articles per month</span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="text-primary w-5 h-5 mt-0.5 flex-shrink-0" />
                <span>AI-powered content generation</span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="text-primary w-5 h-5 mt-0.5 flex-shrink-0" />
                <span>Basic integrations</span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="text-primary w-5 h-5 mt-0.5 flex-shrink-0" />
                <span>WYSIWYG editor</span>
              </div>
            </div>
            
            <Button asChild className="w-full text-lg py-3" variant="outline">
              <Link to="/signup">Start Free</Link>
            </Button>
          </div>

          {/* Trial Plan */}
          <div className="bg-white p-8 rounded-xl shadow-lg border-2 border-blue-200">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-reckless mb-4">7-Day Trial</h3>
              <p className="text-4xl font-bold mb-2">$0<span className="text-xl text-gray-500">/7 days</span></p>
              <p className="text-gray-600">Try Pro features risk-free</p>
            </div>
            
            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-3">
                <Check className="text-primary w-5 h-5 mt-0.5 flex-shrink-0" />
                <span>3 Articles during trial</span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="text-primary w-5 h-5 mt-0.5 flex-shrink-0" />
                <span>Full Pro feature access</span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="text-primary w-5 h-5 mt-0.5 flex-shrink-0" />
                <span>Auto-generation & publishing</span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="text-primary w-5 h-5 mt-0.5 flex-shrink-0" />
                <span>No credit card required</span>
              </div>
            </div>
            
            <Button asChild className="w-full text-lg py-3" variant="outline">
              <Link to="/signup">Start Trial</Link>
            </Button>
          </div>

          {/* Pro Plan */}
          <div className="bg-white p-8 rounded-xl shadow-lg border-2 border-primary relative">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <span className="bg-primary text-white px-4 py-1 rounded-full text-sm font-medium">Most Popular</span>
            </div>
            <div className="text-center mb-6">
              <h3 className="text-2xl font-reckless mb-4">Pro</h3>
              <p className="text-4xl font-bold mb-2">$49<span className="text-xl text-gray-500">/month</span></p>
              <p className="text-gray-600">50 articles per month, automated publishing</p>
            </div>
            
            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-3">
                <Check className="text-primary w-5 h-5 mt-0.5 flex-shrink-0" />
                <span><strong>50 Articles per month</strong> generated and published on autopilot</span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="text-primary w-5 h-5 mt-0.5 flex-shrink-0" />
                <span>Daily auto-generation & publishing</span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="text-primary w-5 h-5 mt-0.5 flex-shrink-0" />
                <span>Automatic Keyword Research & SEO</span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="text-primary w-5 h-5 mt-0.5 flex-shrink-0" />
                <span>All integrations: WordPress, Webflow, Shopify, etc.</span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="text-primary w-5 h-5 mt-0.5 flex-shrink-0" />
                <span>High DR Backlinks via Exchange</span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="text-primary w-5 h-5 mt-0.5 flex-shrink-0" />
                <span>AI Images in multiple styles</span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="text-primary w-5 h-5 mt-0.5 flex-shrink-0" />
                <span>YouTube videos embedded</span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="text-primary w-5 h-5 mt-0.5 flex-shrink-0" />
                <span>Articles in 150+ languages</span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="text-primary w-5 h-5 mt-0.5 flex-shrink-0" />
                <span>Priority support & custom features</span>
              </div>
            </div>
            
            <Button asChild className="w-full text-base py-3">
              <Link to="/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};