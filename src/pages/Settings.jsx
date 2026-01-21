import { useTenant } from "../context/TenantContext";
import { User, Store, CreditCard, Check, Zap, Shield } from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import Button from "../components/Button";
import { useState } from "react";
import { useImageUpload } from "../hooks/useImageUpload";

import { PLANS, createCheckoutSession, activateSubscriptionMock } from "../lib/stripeService";

export default function Settings() {
    const { store, setStore } = useTenant();
    const [loading, setLoading] = useState(null); // 'starter' | 'pro' | null
    const { uploadImage, uploading, error: uploadError } = useImageUpload();

    const handleLogoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || !store?.id) return;

        const url = await uploadImage(file, `logos/${store.id}`);
        if (url) {
            try {
                // Update Firestore
                await updateDoc(doc(db, "stores", store.id), {
                    logoUrl: url
                });
                // Update local state
                setStore(prev => ({ ...prev, logoUrl: url }));
            } catch (err) {
                console.error("Error updating logo:", err);
                alert("Failed to update logo");
            }
        }
    };

    const handleUpgrade = async (planId) => {
        if (!store?.id) return;
        const plan = planId === 'starter' ? PLANS.STARTER : PLANS.PRO;

        try {
            setLoading(planId);

            // 1. Create Checkout Session (Mocked)
            const session = await createCheckoutSession(store.id, plan.priceId);

            if (session.success) {
                // 2. Activate Subscription (Mocked Webhook)
                await activateSubscriptionMock(store.id, plan.id);

                // 3. Optimistic UI Update
                setStore(prev => ({
                    ...prev,
                    plan: plan.id,
                    subscriptionStatus: 'trialing'
                }));

                alert(`Success! You have started your 14-day free trial for the ${plan.name} plan.`);
            }

        } catch (error) {
            console.error("Error upgrading:", error);
            alert("Upgrade failed. Please try again.");
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                <p className="mt-1 text-sm text-gray-500">
                    Manage your store and account preferences
                </p>
            </div>

            <div className="bg-white shadow rounded-lg border border-gray-100 overflow-hidden">
                <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center gap-2">
                        <Store className="h-5 w-5 text-gray-400" />
                        Store Information
                    </h3>
                    <div className="mt-4 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                        <div className="sm:col-span-6">
                            <label className="block text-sm font-medium text-gray-700">Store Logo</label>
                            <div className="mt-1 flex items-center gap-4">
                                <div className="h-16 w-16 rounded-full overflow-hidden bg-gray-100 border border-gray-200">
                                    {store?.logoUrl ? (
                                        <img src={store.logoUrl} alt="Store Logo" className="h-full w-full object-cover" />
                                    ) : (
                                        <Store className="h-8 w-8 text-gray-400 m-auto mt-4" />
                                    )}
                                </div>
                                <div>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleLogoUpload}
                                        disabled={uploading}
                                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                                    />
                                    {uploading && <p className="text-xs text-indigo-600 mt-1">Uploading...</p>}
                                    {uploadError && <p className="text-xs text-red-600 mt-1">{uploadError}</p>}
                                </div>
                            </div>
                        </div>

                        <div className="sm:col-span-3">
                            <label className="block text-sm font-medium text-gray-700">Store Name</label>
                            <div className="mt-1">
                                <input
                                    type="text"
                                    disabled
                                    value={store?.name || ''}
                                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md bg-gray-50 text-gray-500 p-2 border"
                                />
                            </div>
                        </div>

                        <div className="sm:col-span-3">
                            <label className="block text-sm font-medium text-gray-700">Currency</label>
                            <div className="mt-1">
                                <input
                                    type="text"
                                    disabled
                                    value={store?.currency || 'USD'}
                                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md bg-gray-50 text-gray-500 p-2 border"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white shadow rounded-lg border border-gray-100 overflow-hidden">
                <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center gap-2">
                        <User className="h-5 w-5 text-gray-400" />
                        Owner Information
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                        Owner ID: {store?.ownerId}
                    </p>
                </div>
            </div>

            {/* Subscription Section */}
            <div className="bg-white shadow rounded-lg border border-gray-100 overflow-hidden">
                <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-gray-400" />
                        Subscription Plan
                    </h3>

                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Starter Plan */}
                        <div className={`border rounded-lg p-6 relative flex flex-col ${store?.plan === 'starter' ? 'border-indigo-600 ring-1 ring-indigo-600 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300'}`}>
                            {store?.plan === 'starter' && (
                                <div className="absolute top-0 right-0 -mt-2 -mr-2">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 border border-indigo-200">
                                        Active
                                    </span>
                                </div>
                            )}
                            <h4 className="text-lg font-bold text-gray-900">Starter</h4>
                            <p className="mt-2 text-sm text-gray-500 flex-1">
                                Perfect for getting started with your business.
                            </p>
                            <div className="mt-4 mb-6">
                                <span className="text-4xl font-extrabold text-gray-900">79 DH</span>
                                <span className="text-base font-medium text-gray-500">/mo</span>
                                <p className="text-xs text-green-600 font-semibold mt-1">14 Days Free Trial</p>
                            </div>
                            <ul className="space-y-3 mb-6 text-sm text-gray-600">
                                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Up to 50 Orders/mo</li>
                                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Basic Analytics</li>
                                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> WhatsApp Integration</li>
                            </ul>
                            <Button
                                onClick={() => handleUpgrade('starter')}
                                isLoading={loading === 'starter'}
                                disabled={store?.plan === 'starter'}
                                className={`w-full justify-center ${store?.plan === 'starter' ? 'bg-indigo-200 text-indigo-700 cursor-default' : 'bg-white text-indigo-600 border border-indigo-600 hover:bg-indigo-50'}`}
                            >
                                {store?.plan === 'starter' ? 'Current Plan' : 'Start Trial'}
                            </Button>
                        </div>

                        {/* Pro Plan */}
                        <div className={`border rounded-lg p-6 relative flex flex-col ${store?.plan === 'pro' ? 'border-purple-600 ring-1 ring-purple-600 bg-purple-50' : 'border-gray-200 hover:border-purple-300'}`}>
                            {store?.plan === 'pro' && (
                                <div className="absolute top-0 right-0 -mt-2 -mr-2">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                                        Active
                                    </span>
                                </div>
                            )}
                            <h4 className="text-lg font-bold text-gray-900">Pro</h4>
                            <p className="mt-2 text-sm text-gray-500 flex-1">
                                For growing businesses that need more power.
                            </p>
                            <div className="mt-4 mb-6">
                                <span className="text-4xl font-extrabold text-gray-900">179 DH</span>
                                <span className="text-base font-medium text-gray-500">/mo</span>
                                <p className="text-xs text-green-600 font-semibold mt-1">14 Days Free Trial</p>
                            </div>
                            <ul className="space-y-3 mb-6 text-sm text-gray-600">
                                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Unlimited Orders</li>
                                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Advanced Analytics</li>
                                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Priority Support</li>
                                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Remove Branding</li>
                            </ul>
                            <Button
                                onClick={() => handleUpgrade('pro')}
                                isLoading={loading === 'pro'}
                                disabled={store?.plan === 'pro'}
                                className={`w-full justify-center ${store?.plan === 'pro' ? 'bg-purple-200 text-purple-700 cursor-default' : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-md shadow-indigo-200'}`}
                                icon={Zap}
                            >
                                {store?.plan === 'pro' ? 'Current Plan' : 'Start Trial'}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
            {/* Legal Information Section */}
            <div className="bg-white shadow rounded-lg border border-gray-100 overflow-hidden">
                <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center gap-2">
                        <Shield className="h-5 w-5 text-gray-400" />
                        Legal Information
                    </h3>
                    <div className="mt-4 flex flex-col gap-2">
                        <a href="/privacy" target="_blank" className="text-sm text-indigo-600 hover:text-indigo-500 hover:underline">
                            Privacy Policy
                        </a>
                        <a href="/terms" target="_blank" className="text-sm text-indigo-600 hover:text-indigo-500 hover:underline">
                            Terms of Service
                        </a>
                    </div>
                </div>
            </div>
        </div >
    );
}
