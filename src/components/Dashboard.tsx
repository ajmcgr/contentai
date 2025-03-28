import { Calendar, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContentCard } from "./ContentCard";
import { CreateContentDialog } from "./CreateContentDialog";
import { useState } from "react";

export const Dashboard = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="bg-primary py-20 text-white">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-6xl font-merriweather text-center mb-4">
            Post content at your leisure
          </h2>
          <p className="text-xl text-center max-w-2xl mx-auto">
            Schedule or post content across several of your favorite social networks any-time, anywhere.
          </p>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-4xl font-bold text-center mb-12">Features</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Smart Scheduling</h3>
              <p className="text-gray-600">Schedule your content for the perfect posting time across all platforms.</p>
            </div>
            <div className="text-center p-6">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Multi-Platform Support</h3>
              <p className="text-gray-600">Post to all major social networks from a single dashboard.</p>
            </div>
            <div className="text-center p-6">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Analytics</h3>
              <p className="text-gray-600">Track performance and engagement across all your social channels.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-4xl font-bold text-center mb-12">Simple, Transparent Pricing</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-lg shadow-sm">
              <h3 className="text-2xl font-bold mb-4">Starter</h3>
              <p className="text-4xl font-bold mb-6">$9<span className="text-lg text-gray-500">/month</span></p>
              <ul className="space-y-3 mb-8">
                <li>5 social accounts</li>
                <li>50 scheduled posts</li>
                <li>Basic analytics</li>
              </ul>
              <Button className="w-full">Get Started</Button>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-sm border-2 border-primary">
              <h3 className="text-2xl font-bold mb-4">Professional</h3>
              <p className="text-4xl font-bold mb-6">$29<span className="text-lg text-gray-500">/month</span></p>
              <ul className="space-y-3 mb-8">
                <li>15 social accounts</li>
                <li>Unlimited posts</li>
                <li>Advanced analytics</li>
              </ul>
              <Button className="w-full">Get Started</Button>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-sm">
              <h3 className="text-2xl font-bold mb-4">Enterprise</h3>
              <p className="text-4xl font-bold mb-6">$99<span className="text-lg text-gray-500">/month</span></p>
              <ul className="space-y-3 mb-8">
                <li>Unlimited accounts</li>
                <li>Unlimited posts</li>
                <li>Custom solutions</li>
              </ul>
              <Button className="w-full">Contact Sales</Button>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-4xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          <div className="space-y-8">
            <div>
              <h3 className="text-xl font-semibold mb-2">How does the scheduling work?</h3>
              <p className="text-gray-600">Our intelligent scheduling system analyzes the best times to post on each platform and allows you to schedule content accordingly.</p>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Which platforms do you support?</h3>
              <p className="text-gray-600">We support all major social media platforms including Twitter, Facebook, Instagram, LinkedIn, and TikTok.</p>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Can I try it for free?</h3>
              <p className="text-gray-600">Yes! We offer a 14-day free trial with all features included, no credit card required.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Enterprise Solutions Section */}
      <div className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-6">Enterprise Solutions</h2>
          <p className="text-xl mb-8">
            Custom solutions for high-volume press release needs. Let's discuss how we can help scale your communications.
          </p>
          <Button size="lg" className="bg-primary hover:bg-primary-600">
            Contact Us
          </Button>
        </div>
      </div>

      <CreateContentDialog 
        open={isCreateDialogOpen} 
        onOpenChange={setIsCreateDialogOpen}
      />
    </div>
  );
};