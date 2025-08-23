
import React from 'react';

const About = () => {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-reckless font-medium mb-6">Our story</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            We started this to empower storytellers around the world with the most advanced AI blog writing technology that just works.
          </p>
        </div>

        <div className="prose prose-lg max-w-none">
          <p className="text-lg mb-8">
            <strong>Hello there!</strong>
          </p>
          
          <p className="mb-8 text-gray-700 leading-relaxed">
            I'm a content strategist who has spent the last decade helping businesses scale their content marketing through various platforms and tools. Those platforms were revolutionary once, but somewhere along the way they traded focus for feature bloat. Pricing climbed, dashboards grew dense, and the content still missed too many key optimization opportunities.
          </p>

          <p className="mb-8 text-gray-700 leading-relaxed">
            I found myself wrestling with complex content management systems while the industry around us moved to natural-language prompts and AI-assisted workflows. That frustration became the spark for our AI Blog Writer platform.
          </p>

          <p className="mb-8 text-gray-700 leading-relaxed">
            We're building a lean, AI-first content generation platform that prizes speed, accuracy, and SEO optimization over shiny add-ons. Imagine describing your content needs the way you'd brief a colleague—"Tech articles for SaaS startups focusing on growth strategies"—and seeing optimized, publish-ready articles in minutes, not hours.
          </p>

          <p className="mb-8 text-gray-700 leading-relaxed">
            Then imagine paying a fair, cancel-anytime rate for that clarity instead of an annual contract padded with modules you'll never use.
          </p>

          <p className="mb-8 text-gray-700 leading-relaxed">
            Our small team writes code during the day and optimizes algorithms at night, propelled by a simple goal: help you create great content without the busywork. We'd rather invest in product improvements than flashy marketing; rather answer a customer email than craft another upsell deck.
          </p>

          <p className="mb-8 text-gray-700 leading-relaxed">
            Every feature we build serves content creators who need results, not complexity. We believe exceptional content should be accessible to ambitious entrepreneurs, not just enterprise teams with unlimited budgets.
          </p>

          <p className="text-gray-700 leading-relaxed">
            Thanks for being part of this journey. We're building something we genuinely wish existed when we were struggling with content creation ourselves.
          </p>
        </div>

        <div className="mt-16 text-center">
          <p className="text-gray-600">
            Questions? We're always happy to chat about content strategy, AI, or anything else.
          </p>
        </div>
      </div>
    </div>
  );
};

export default About;
