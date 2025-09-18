import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";

export const PricingSection = () => {
  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <div className="py-20" style={{ backgroundColor: 'hsl(var(--section-white))' }}>
      <div className="max-w-5xl mx-auto px-6">
        <h2 className="text-4xl font-reckless text-center mb-8">Simple, Transparent Pricing</h2>
        
        {/* Pricing Toggle */}
        <div className="flex items-center justify-center mb-12">
          <span className={`mr-3 ${!isAnnual ? 'text-primary font-medium' : 'text-gray-500'}`}>Monthly</span>
          <button
            onClick={() => setIsAnnual(!isAnnual)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isAnnual ? 'bg-primary' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isAnnual ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span className={`ml-3 ${isAnnual ? 'text-primary font-medium' : 'text-gray-500'}`}>
            Annual
            <span className="ml-1 text-sm text-green-600 font-medium">(Save 15%)</span>
          </span>
        </div>
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
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
              <div className="mb-2">
                <p className="text-4xl font-bold">
                  ${isAnnual ? '499' : '49'}
                  <span className="text-xl text-gray-500">/{isAnnual ? 'year' : 'month'}</span>
                </p>
                {isAnnual && (
                  <p className="text-sm text-green-600 font-medium">
                    Save $89 compared to monthly
                  </p>
                )}
              </div>
              <p className="text-gray-600">
                {isAnnual ? '600 articles per year' : '50 articles per month'}, automated publishing
              </p>
            </div>
            
            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-3">
                <Check className="text-primary w-5 h-5 mt-0.5 flex-shrink-0" />
                <span><strong>{isAnnual ? '600 Articles per year' : '50 Articles per month'}</strong> generated and published on autopilot</span>
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