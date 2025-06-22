import { Calendar } from "lucide-react";

export const FeaturesSection = () => {
  return (
    <div className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-reckless font-bold text-center mb-12">Features</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center p-6">
            <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-reckless font-bold mb-2">Smart Scheduling</h3>
            <p className="text-gray-600">Schedule your content for the perfect posting time across all platforms.</p>
          </div>
          <div className="text-center p-6">
            <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-reckless font-bold mb-2">Multi-Platform Support</h3>
            <p className="text-gray-600">Post to all major social networks from a single dashboard.</p>
          </div>
          <div className="text-center p-6">
            <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-reckless font-bold mb-2">Analytics</h3>
            <p className="text-gray-600">Track performance and engagement across all your social channels.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
