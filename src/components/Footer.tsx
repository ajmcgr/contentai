
import React from 'react';
import { Link } from 'react-router-dom';

export const Footer = () => {
  return (
    <footer className="bg-white border-t">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <h3 className="font-semibold text-foreground mb-4 text-sm">Company</h3>
            <ul className="space-y-2">
              <li><Link to="/about" className="text-gray-600 hover:text-primary-700 text-sm">About</Link></li>
              <li><a href="https://discord.gg/whXSXeVJC2" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-primary-700 text-sm">Community</a></li>
              <li><a href="https://blog.works.xyz/" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-primary-700 text-sm">Blog</a></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-4 text-sm">Support</h3>
            <ul className="space-y-2">
              <li><a href="mailto:support@trycontent.ai" className="text-gray-600 hover:text-primary-700 text-sm">Support</a></li>
              <li><Link to="/terms" className="text-gray-600 hover:text-primary-700 text-sm">Terms</Link></li>
              <li><Link to="/privacy" className="text-gray-600 hover:text-primary-700 text-sm">Privacy</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-4 text-sm">Connect</h3>
            <ul className="space-y-2">
              <li><a href="https://x.com/trycontentai" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-primary-700 text-sm">X</a></li>
              <li><a href="https://www.linkedin.com/company/105644042" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-primary-700 text-sm">LinkedIn</a></li>
            </ul>
          </div>
        </div>
        <div className="text-center pt-8 border-t">
          <p className="text-gray-600 text-sm">Copyright © 2025 Works App, Inc. Built with ♥️ by Works.</p>
        </div>
      </div>
    </footer>
  );
};
