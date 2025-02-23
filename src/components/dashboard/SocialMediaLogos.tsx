
import { Twitter, Facebook, Instagram, Linkedin } from "lucide-react";

export const SocialMediaLogos = () => {
  return (
    <div className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-12 items-center justify-items-center">
          <div className="text-center">
            <Twitter className="w-8 h-8 text-gray-400 hover:text-gray-600 transition-colors mx-auto mb-3" />
            <p className="text-sm text-gray-600">Schedule tweets with perfect timing</p>
          </div>
          <div className="text-center">
            <Facebook className="w-8 h-8 text-gray-400 hover:text-gray-600 transition-colors mx-auto mb-3" />
            <p className="text-sm text-gray-600">Manage Facebook posts effortlessly</p>
          </div>
          <div className="text-center">
            <Instagram className="w-8 h-8 text-gray-400 hover:text-gray-600 transition-colors mx-auto mb-3" />
            <p className="text-sm text-gray-600">Create engaging Instagram content</p>
          </div>
          <div className="text-center">
            <Linkedin className="w-8 h-8 text-gray-400 hover:text-gray-600 transition-colors mx-auto mb-3" />
            <p className="text-sm text-gray-600">Optimize your LinkedIn presence</p>
          </div>
          <div className="text-center">
            <svg 
              viewBox="0 0 24 24" 
              className="w-8 h-8 text-gray-400 hover:text-gray-600 transition-colors mx-auto mb-3"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 8v8a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5V8a5 5 0 0 1 5-5h8a5 5 0 0 1 5 5Z" />
              <path d="m17 8-5 5v5" />
              <path d="m12 13-5-5" />
            </svg>
            <p className="text-sm text-gray-600">Share trending TikTok videos</p>
          </div>
        </div>
      </div>
    </div>
  );
};
