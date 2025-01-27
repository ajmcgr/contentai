import React from 'react';

const Blog = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-primary-700 mb-6">Blog</h1>
        <div className="space-y-8">
          <article className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-2xl font-bold mb-2">Maximizing Your Social Media Presence</h2>
            <p className="text-gray-500 mb-4">March 15, 2024</p>
            <p className="text-gray-600">Learn how to optimize your social media strategy and increase engagement across platforms.</p>
          </article>
          <article className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-2xl font-bold mb-2">Content Planning Made Easy</h2>
            <p className="text-gray-500 mb-4">March 10, 2024</p>
            <p className="text-gray-600">Discover our top tips for creating and scheduling content efficiently.</p>
          </article>
        </div>
      </div>
    </div>
  );
};

export default Blog;