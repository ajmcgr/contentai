import React from 'react';

const Terms = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-primary-700 mb-6">Terms of Service</h1>
        <div className="bg-white p-6 rounded-lg shadow-sm space-y-6">
          <section>
            <h2 className="text-2xl font-bold mb-4">1. Terms</h2>
            <p className="text-gray-600">
              By accessing this website, you are agreeing to be bound by these terms of service, all applicable laws and regulations, and agree that you are responsible for compliance with any applicable local laws.
            </p>
          </section>
          <section>
            <h2 className="text-2xl font-bold mb-4">2. Use License</h2>
            <p className="text-gray-600">
              Permission is granted to temporarily download one copy of the materials (information or software) on Works App's website for personal, non-commercial transitory viewing only.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Terms;