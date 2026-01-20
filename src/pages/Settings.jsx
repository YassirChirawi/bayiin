import { useTenant } from "../context/TenantContext";
import { User, Store, CreditCard, Check, Zap, Shield } from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import Button from "../components/Button";
import { useState } from "react";
import { useImageUpload } from "../hooks/useImageUpload";

export default function Settings() {
    const { store, setStore } = useTenant();
    const [loading, setLoading] = useState(false);
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

    const handleUpgrade = async () => {
        if (!store?.id) return;
        try {
            setLoading(true);
            // Simulate Stripe Checkout process
            await new Promise(resolve => setTimeout(resolve, 1500));

            await updateDoc(doc(db, "stores", store.id), {
                plan: 'pro',
                subscriptionStatus: 'active'
            });

            // Optimistic update
            setStore(prev => ({ ...prev, plan: 'pro' }));
            alert("Upgrade successful! You are now on the Pro plan.");
        } catch (error) {
            console.error("Error upgrading:", error);
            alert("Upgrade failed");
        } finally {
            setLoading(false);
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

                    <div className="mt-6 flex flex-col sm:flex-row gap-6 items-start">
                        <div className="flex-1">
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-bold text-gray-900 capitalize">{store?.plan || 'Free'} Plan</span>
                                {store?.plan === 'pro' && (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                        Active
                                    </span>
                                )}
                            </div>
                            <p className="mt-1 text-sm text-gray-500">
                                {store?.plan === 'pro'
                                    ? "You have access to all features including unlimited orders and advanced analytics."
                                    : "You are currently on the Free plan. Upgrade to unlock unlimited potential."
                                }
                            </p>
                        </div>

                        {store?.plan !== 'pro' && (
                            <div className="flex-shrink-0">
                                <Button
                                    onClick={handleUpgrade}
                                    isLoading={loading}
                                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 border-0 shadow-lg shadow-indigo-200"
                                    icon={Zap}
                                >
                                    Upgrade to Pro (179 DH/mo)
                                </Button>
                                <p className="mt-2 text-xs text-center text-gray-500">
                                    Secure payment via Stripe
                                </p>
                            </div>
                        )}
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
