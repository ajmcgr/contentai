
import React from 'react';

const About = () => {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-reckless font-medium mb-6">Our story</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            We started this to empower storytellers around the world with the most advanced AI blog writing technology that just works.
          </p>
        </div>

        <div className="prose prose-xl max-w-none border-[1px] border-[#e2e8f0] rounded-[7.5px] p-8">
          <p className="text-xl mb-8">
            <strong>Hello there!</strong>
          </p>
          
          <p className="mb-8 text-gray-700 leading-relaxed text-lg">
            I'm a content strategist who has spent the last decade helping businesses scale their content marketing through various platforms and tools. Those platforms were revolutionary once, but somewhere along the way they traded focus for feature bloat. Pricing climbed, dashboards grew dense, and the content still missed too many key optimization opportunities.
          </p>

          <p className="mb-8 text-gray-700 leading-relaxed text-lg">
            I found myself wrestling with complex content management systems while the industry around us moved to natural-language prompts and AI-assisted workflows. That frustration became the spark for our AI Blog Writer platform.
          </p>

          <p className="mb-8 text-gray-700 leading-relaxed text-lg">
            We're building a lean, AI-first content generation platform that prizes speed, accuracy, and SEO optimization over shiny add-ons. Imagine describing your content needs the way you'd brief a colleague—"Tech articles for SaaS startups focusing on growth strategies"—and seeing optimized, publish-ready articles in minutes, not hours.
          </p>

          <p className="mb-8 text-gray-700 leading-relaxed text-lg">
            Then imagine paying a fair, cancel-anytime rate for that clarity instead of an annual contract padded with modules you'll never use.
          </p>

          <p className="mb-8 text-gray-700 leading-relaxed text-lg">
            Our small team writes code during the day and optimizes algorithms at night, propelled by a simple goal: help you create great content without the busywork. We'd rather invest in product improvements than flashy marketing; rather answer a customer email than craft another upsell deck.
          </p>

          <p className="mb-8 text-gray-700 leading-relaxed text-lg">
            Every feature we build serves content creators who need results, not complexity. We believe exceptional content should be accessible to ambitious entrepreneurs, not just enterprise teams with unlimited budgets.
          </p>

          <p className="mb-8 text-gray-700 leading-relaxed text-lg">
            Thanks for being part of this journey. We're building something we genuinely wish existed when we were struggling with content creation ourselves.
          </p>

          <div className="mt-12 flex items-center gap-6">
            <img 
              src="/lovable-uploads/800a1059-73b1-46b2-b518-fd9a71bf73bb.png" 
              alt="Alex MacGregor, Founder of Content AI"
              className="w-32 h-32 object-cover flex-shrink-0"
            />
            <div className="text-gray-700">
              <p className="mb-1 text-lg font-bold">Alex MacGregor, Founder of Content AI</p>
              <p className="mb-2 text-lg font-bold">— Alex MacGregor</p>
              <a 
                href="https://www.linkedin.com/in/alexmacgregor2/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-base"
                style={{ color: '#2563eb' }}
              >
                Connect with me on LinkedIn
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
