import React from 'react';

const HelpCenter = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-primary-700 mb-6">Help Center</h1>
        <div className="space-y-6">
          <section className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-2xl font-bold mb-4">Frequently Asked Questions</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">How do I schedule a post?</h3>
                <p className="text-gray-600">Click the "Create Content" button, select your platforms, compose your content, and set your desired date and time.</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Can I edit scheduled posts?</h3>
                <p className="text-gray-600">Yes, you can edit any scheduled post up until its publishing time.</p>
              </div>
            </div>
          </section>
          <section className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-2xl font-bold mb-4">Need More Help?</h2>
            <p className="text-gray-600">Contact our support team at support@worksapp.com</p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default HelpCenter;