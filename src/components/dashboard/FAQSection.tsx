export const FAQSection = () => {
  return (
    <div className="py-20 bg-gray-50">
      <div className="max-w-4xl mx-auto px-6">
        <h2 className="text-4xl font-reckless font-medium text-center mb-12">Frequently Asked Questions</h2>
        <div className="space-y-8">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-xl font-reckless font-medium mb-3">How does article automation work?</h3>
            <p className="text-gray-600">Our AI system automatically publishes one SEO-optimized article per day to your website. Articles are generated based on keyword research, scheduled for optimal timing, and include images and videos.</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-xl font-reckless font-medium mb-3">Is the content SEO friendly?</h3>
            <p className="text-gray-600">Yes! Every article includes optimized titles, meta descriptions, targeted keywords, proper H2/H3 structure, 1200–1700 words, and both internal and external linking for maximum SEO impact.</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-xl font-reckless font-medium mb-3">Can I manage multiple websites?</h3>
            <p className="text-gray-600">Absolutely! We offer bulk discounts for multiple websites: 10% off for 2-5 sites, 15% off for 6-10 sites, and 20% off for 11+ sites.</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-xl font-reckless font-medium mb-3">What integrations do you support?</h3>
            <p className="text-gray-600">We integrate with WordPress, Webflow, Shopify, Framer, Notion, Wix, and provide API access for custom solutions.</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-xl font-reckless font-medium mb-3">Does it support other languages?</h3>
            <p className="text-gray-600">Yes! Our AI can generate high-quality articles in over 150 languages, maintaining SEO best practices and natural tone in each language.</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-xl font-reckless font-medium mb-3">How often are new articles generated?</h3>
            <p className="text-gray-600">One article per day, totaling 30 articles per month. This consistent publishing schedule helps build domain authority and search rankings.</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-xl font-reckless font-medium mb-3">Can I review articles before publishing?</h3>
            <p className="text-gray-600">Yes! All articles appear as drafts in your CMS for review and approval before going live. You can edit, modify, or approve them as needed.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
