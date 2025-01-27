import React from 'react';
import { Button } from '@/components/ui/button';

const Pricing = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-primary-700 mb-6 text-center">Pricing Plans</h1>
        <div className="grid md:grid-cols-3 gap-8 mt-12">
          <div className="bg-white p-8 rounded-lg shadow-sm">
            <h2 className="text-2xl font-bold mb-4">Starter</h2>
            <p className="text-3xl font-bold mb-6">$9<span className="text-lg text-gray-500">/month</span></p>
            <ul className="space-y-3 mb-8">
              <li>5 social accounts</li>
              <li>50 scheduled posts</li>
              <li>Basic analytics</li>
            </ul>
            <Button className="w-full">Get Started</Button>
          </div>
          <div className="bg-white p-8 rounded-lg shadow-sm border-2 border-primary">
            <h2 className="text-2xl font-bold mb-4">Professional</h2>
            <p className="text-3xl font-bold mb-6">$29<span className="text-lg text-gray-500">/month</span></p>
            <ul className="space-y-3 mb-8">
              <li>15 social accounts</li>
              <li>Unlimited posts</li>
              <li>Advanced analytics</li>
            </ul>
            <Button className="w-full">Get Started</Button>
          </div>
          <div className="bg-white p-8 rounded-lg shadow-sm">
            <h2 className="text-2xl font-bold mb-4">Enterprise</h2>
            <p className="text-3xl font-bold mb-6">$99<span className="text-lg text-gray-500">/month</span></p>
            <ul className="space-y-3 mb-8">
              <li>Unlimited accounts</li>
              <li>Unlimited posts</li>
              <li>Custom solutions</li>
            </ul>
            <Button className="w-full">Contact Sales</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pricing;