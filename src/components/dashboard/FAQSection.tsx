export const FAQSection = () => {
  return (
    <div className="py-20 bg-white">
      <div className="max-w-4xl mx-auto px-6">
        <h2 className="text-4xl font-reckless font-bold text-center mb-12">Frequently Asked Questions</h2>
        <div className="space-y-8">
          <div>
            <h3 className="text-xl font-reckless font-bold mb-2">How does the scheduling work?</h3>
            <p className="text-gray-600">Our intelligent scheduling system analyzes the best times to post on each platform and allows you to schedule content accordingly.</p>
          </div>
          <div>
            <h3 className="text-xl font-reckless font-bold mb-2">Which platforms do you support?</h3>
            <p className="text-gray-600">We support all major social media platforms including Twitter, Facebook, Instagram, LinkedIn, and TikTok.</p>
          </div>
          <div>
            <h3 className="text-xl font-reckless font-bold mb-2">Can I try it for free?</h3>
            <p className="text-gray-600">Yes! We offer a 14-day free trial with all features included, no credit card required.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
