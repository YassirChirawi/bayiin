import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';

export default function Terms() {
    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <SEO title="Terms of Service" description="Terms of Service for BayIIn Commerce SaaS." />
            <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow-sm">
                <div className="mb-6">
                    <Link to="/" className="text-indigo-600 hover:text-indigo-500 text-sm font-medium">← Back to Home</Link>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Terms of Service</h1>

                <div className="prose prose-indigo max-w-none text-gray-600">
                    <p className="mb-4">Last updated: {new Date().toLocaleDateString()}</p>

                    <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-4">1. Acceptance of Terms</h2>
                    <p>By accessing or using our services, you agree to be bound by these Terms. If you disagree with any part of the terms, then you may not access the service.</p>

                    <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-4">2. Use License</h2>
                    <p>Permission is granted to temporarily download one copy of the materials (information or software) on BayIIn's website for personal, non-commercial transitory viewing only.</p>

                    <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-4">3. Disclaimer</h2>
                    <p>The materials on BayIIn's website are provided on an 'as is' basis. BayIIn makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.</p>

                    <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-4">4. Limitations</h2>
                    <p>In no event shall BayIIn or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on BayIIn's website.</p>
                </div>
            </div>
        </div>
    );
}
