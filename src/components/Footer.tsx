
import React from 'react';
import { Link } from 'react-router-dom';

export const Footer = () => {
  return (
    <footer className="bg-white border-t">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <h3 className="font-semibold text-primary-700 mb-4">Company</h3>
            <ul className="space-y-2">
              <li><Link to="/about" className="text-gray-600 hover:text-primary-700">About</Link></li>
              <li><Link to="/pricing" className="text-gray-600 hover:text-primary-700">Pricing</Link></li>
              <li><Link to="/blog" className="text-gray-600 hover:text-primary-700">Blog</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-primary-700 mb-4">Support</h3>
            <ul className="space-y-2">
              <li><Link to="/help-center" className="text-gray-600 hover:text-primary-700">Help Center</Link></li>
              <li><Link to="/terms" className="text-gray-600 hover:text-primary-700">Terms</Link></li>
              <li><Link to="/privacy" className="text-gray-600 hover:text-primary-700">Privacy</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-primary-700 mb-4">Connect</h3>
            <ul className="space-y-2">
              <li><a href="https://x.com/trycontentai" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-primary-700">Follow on X</a></li>
              <li><a href="mailto:support@trycontent.ai" className="text-gray-600 hover:text-primary-700">Email Support</a></li>
            </ul>
          </div>
        </div>
        <div className="text-center pt-8 border-t">
          <p className="text-gray-600">Copyright © 2025 Works App, Inc. Built with ♥️ by Works.</p>
        </div>
      </div>
    </footer>
  );
};
