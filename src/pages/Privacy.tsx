import React from 'react';

const Privacy = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-primary-700 mb-6">Privacy Policy</h1>
        <div className="bg-white p-6 rounded-lg shadow-sm space-y-6">
          <section>
            <h2 className="text-2xl font-bold mb-4">Information Collection</h2>
            <p className="text-gray-600">
              We collect information that you provide directly to us when you create an account, use our services, or communicate with us.
            </p>
          </section>
          <section>
            <h2 className="text-2xl font-bold mb-4">Data Usage</h2>
            <p className="text-gray-600">
              We use the information we collect to provide, maintain, and improve our services, and to develop new ones.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Privacy;