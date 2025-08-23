
import React from 'react';

const About = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-20">
      <div className="max-w-4xl mx-auto px-6">
        <div className="bg-white rounded-2xl border-2 border-gray-200 p-12 shadow-sm">
          <div className="flex flex-col md:flex-row items-start gap-8">
            <div className="flex-shrink-0">
              <div className="w-32 h-32 bg-gradient-to-br from-primary to-primary-600 rounded-2xl flex items-center justify-center">
                <span className="text-4xl font-bold text-white">AM</span>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-xl text-gray-700 leading-relaxed mb-8">
                Questions? We're always happy to chat about content strategy, AI, or anything else.
              </p>
              <div className="border-l-4 border-primary pl-6">
                <p className="text-lg font-medium text-gray-900 mb-2">— Alex MacGregor</p>
                <p className="text-gray-600 mb-4">Founder, Content AI</p>
                <a 
                  href="https://www.linkedin.com/in/alexmacgregor2/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-primary hover:text-primary-700 font-medium"
                >
                  Connect with me on LinkedIn
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
