import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';

export default function Privacy() {
    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <SEO title="Privacy Policy" description="Privacy Policy for BayIIn Commerce SaaS." />
            <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow-sm">
                <div className="mb-6">
                    <Link to="/" className="text-indigo-600 hover:text-indigo-500 text-sm font-medium">← Back to Home</Link>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Privacy Policy</h1>

                <div className="prose prose-indigo max-w-none text-gray-600">
                    <p className="mb-4">Last updated: {new Date().toLocaleDateString()}</p>

                    <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-4">1. Information We Collect</h2>
                    <p>We collect information you provide directly to us, such as when you create an account, subscribe to our newsletter, request customer support, or otherwise communicate with us.</p>

                    <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-4">2. How We Use Information</h2>
                    <p>We use the information we collect to provide, maintain, and improve our services, such as to measure and analyze data to improve our services and understand how our services are used.</p>

                    <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-4">3. Data Security</h2>
                    <p>We take reasonable measures to help protect information about you from loss, theft, misuse and unauthorized access, disclosure, alteration and destruction.</p>

                    <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-4">4. Contact Us</h2>
                    <p>If you have any questions about this Privacy Policy, please contact us at support@bayiin.com.</p>
                </div>
            </div>
        </div>
    );
}
