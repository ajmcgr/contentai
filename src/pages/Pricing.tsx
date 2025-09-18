import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check } from "lucide-react";
import { Link } from "react-router-dom";

const Pricing = () => {
  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 py-20">
      <div className="max-w-6xl mx-auto px-6">
        <h1 className="text-4xl font-reckless font-medium text-center mb-8">Simple, Transparent Pricing</h1>
        
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
          
          {/* Free Trial Plan */}
          <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-reckless font-medium mb-4">Free Trial</h3>
              <p className="text-4xl font-bold mb-2">$0<span className="text-lg text-gray-500">/7 days</span></p>
              <p className="text-gray-600">Try Content AI for free with 3 articles</p>
            </div>
            
            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-3">
                <Check className="text-primary w-5 h-5 mt-0.5 flex-shrink-0" />
                <span>3 Articles during trial period</span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="text-primary w-5 h-5 mt-0.5 flex-shrink-0" />
                <span>AI-powered content generation</span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="text-primary w-5 h-5 mt-0.5 flex-shrink-0" />
                <span>SEO optimization</span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="text-primary w-5 h-5 mt-0.5 flex-shrink-0" />
                <span>Basic keyword research</span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="text-primary w-5 h-5 mt-0.5 flex-shrink-0" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="text-primary w-5 h-5 mt-0.5 flex-shrink-0" />
                <span>7-day trial period</span>
              </div>
            </div>
            
            <Button asChild variant="outline" className="w-full text-lg py-3">
              <Link to="/signup">Start Free Trial</Link>
            </Button>
          </div>

          {/* Pro Plan */}
          <div className="bg-white p-8 rounded-xl shadow-lg border-2 border-primary relative">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <span className="bg-primary text-white px-4 py-1 rounded-full text-sm font-medium">Most Popular</span>
            </div>
            <div className="text-center mb-8">
              <h3 className="text-2xl font-reckless font-medium mb-4">Pro</h3>
              <div className="mb-2">
                <p className="text-4xl font-bold">
                  ${isAnnual ? '499' : '49'}
                  <span className="text-lg text-gray-500">/{isAnnual ? 'year' : 'month'}</span>
                </p>
                {isAnnual && (
                  <p className="text-sm text-green-600 font-medium">
                    Save $89 compared to monthly
                  </p>
                )}
              </div>
              <p className="text-gray-600">
                {isAnnual ? '600 articles per year' : '50 articles per month'}, published automatically
              </p>
            </div>
            
            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-3">
                <Check className="text-primary w-5 h-5 mt-0.5 flex-shrink-0" />
                <span><strong>{isAnnual ? '600 Articles per year' : '50 Articles per month'}</strong> generated and published on autopilot</span>
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
              <Link to="/signup">Upgrade to Pro</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pricing;