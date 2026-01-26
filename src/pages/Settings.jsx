import { useTenant } from "../context/TenantContext";
import { User, Store, CreditCard, Check, Zap, Shield, Save, Settings as SettingsIcon, Truck, Users, Lock } from "lucide-react";
import { doc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import Button from "../components/Button";
import { useState, useEffect } from "react";
import { useImageUpload } from "../hooks/useImageUpload";
import { useBiometrics } from "../hooks/useBiometrics"; // NEW
import { toast } from "react-hot-toast";

import { PLANS, createCheckoutSession, activateSubscriptionMock } from "../lib/stripeService";
import { DEFAULT_TEMPLATES, DARIJA_TEMPLATES } from "../utils/whatsappTemplates";
import ShippingSettings from "./ShippingSettings";

export default function Settings() {
    const { store, setStore } = useTenant();
    const [activeTab, setActiveTab] = useState("general");
    const [loading, setLoading] = useState(null); // 'starter' | 'pro' | null
    const { uploadImage, uploading, error: uploadError } = useImageUpload();

    // Check for Return from Stripe
    useEffect(() => {
        const query = new URLSearchParams(window.location.search);
        if (query.get("success")) {
            if (store?.id) {
                activateSubscriptionMock(store.id, 'starter'); // Defaulting to starter
                setStore(prev => ({ ...prev, subscriptionStatus: 'trialing', plan: 'starter' }));
                toast.success("Payment Successful! Your subscription is active.");
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        }
    }, [store?.id]);

    const handleLogoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || !store?.id) return;

        const url = await uploadImage(file, `logos/${store.id}`);
        if (url) {
            try {
                await updateDoc(doc(db, "stores", store.id), { logoUrl: url });
                setStore(prev => ({ ...prev, logoUrl: url }));
                toast.success("Logo updated!");
            } catch (err) {
                console.error("Error updating logo:", err);
                toast.error("Failed to update logo");
            }
        }
    };

    const handleUpgrade = async (planId) => {
        if (!store?.id) return;
        try {
            setLoading(planId);
            await createCheckoutSession(store.id, planId);
        } catch (error) {
            console.error("Error upgrading:", error);
            toast.error("Upgrade failed. Please try again.");
            setLoading(null);
        }
    };

    const [recalcMsg, setRecalcMsg] = useState("");
    const handleRecalculateStats = async () => {
        if (!store?.id) return;
        if (!window.confirm("This will scan all orders. Continue?")) return;
        setLoading('recalc');
        setRecalcMsg("Scanning orders...");
        try {
            const ordersRef = collection(db, "orders");
            const q = query(ordersRef, where("storeId", "==", store.id));
            const snapshot = await getDocs(q);
            const orders = snapshot.docs.map(d => d.data());
            const customerStats = {};

            orders.forEach(order => {
                if (!order.customerId) return;
                if (!customerStats[order.customerId]) {
                    customerStats[order.customerId] = { count: 0, spent: 0, dates: [] };
                }
                const amount = (parseFloat(order.price) || 0) * (parseInt(order.quantity) || 1);
                customerStats[order.customerId].count += 1;
                customerStats[order.customerId].spent += amount;
                if (order.date) customerStats[order.customerId].dates.push(order.date);
            });

            setRecalcMsg("Updating customers...");
            const updates = Object.entries(customerStats).map(async ([custId, stats]) => {
                const custRef = doc(db, "customers", custId);
                const lastOrderDate = stats.dates.sort().pop() || new Date().toISOString().split('T')[0];
                await updateDoc(custRef, {
                    orderCount: stats.count,
                    totalSpent: stats.spent,
                    lastOrderDate: lastOrderDate
                });
            });

            await Promise.all(updates);
            toast.success(`Fixed stats for ${updates.length} customers!`);
            setRecalcMsg("");
        } catch (error) {
            console.error("Recalculation error:", error);
            toast.error("Failed to recalculate stats.");
        } finally {
            setLoading(null);
        }
    };

    const tabs = [
        { id: "general", label: "General", icon: Store },
        { id: "shipping", label: "Shipping", icon: Truck },
        { id: "billing", label: "Plans & Billing", icon: CreditCard },
        { id: "security", label: "Security", icon: Shield }, // NEW
        // { id: "team", label: "Team", icon: Users }, // Future
    ];

    // Biometric Logic
    const { isAvailable, register } = useBiometrics();
    const [biometricSupported, setBiometricSupported] = useState(false);
    const [biometricEnabled, setBiometricEnabled] = useState(false);

    useEffect(() => {
        isAvailable().then(setBiometricSupported);
        setBiometricEnabled(localStorage.getItem('biometricEnabled') === 'true');
    }, []);

    const handleToggleBiometric = async () => {
        if (!biometricEnabled) {
            // Enable
            if (!store?.ownerId) {
                toast.error("Error: User ID not found.");
                return;
            }
            const success = await register(store.ownerId); // Use ownerId/userId as key
            if (success) {
                localStorage.setItem('biometricEnabled', 'true');
                setBiometricEnabled(true);
                toast.success("Biometric lock enabled!");
            } else {
                toast.error("Biometric registration failed.");
            }
        } else {
            // Disable
            if (window.confirm("Disable biometric lock?")) {
                localStorage.removeItem('biometricEnabled');
                setBiometricEnabled(false);
                toast.success("Biometric lock disabled.");
            }
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                <p className="mt-1 text-sm text-gray-500">
                    Manage your store configuration
                </p>
            </div>

            {/* Tabs Navigation */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                                    group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm
                                    ${activeTab === tab.id
                                        ? 'border-indigo-500 text-indigo-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                                `}
                            >
                                <Icon className={`
                                    -ml-0.5 mr-2 h-5 w-5
                                    ${activeTab === tab.id ? 'text-indigo-500' : 'text-gray-400 group-hover:text-gray-500'}
                                `} />
                                {tab.label}
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* Tab Content */}
            <div className="mt-6">
                {activeTab === "shipping" && <ShippingSettings />}

                {activeTab === "billing" && (
                    <div className="space-y-6">
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

                        {/* Promo Code */}
                        <div className="bg-white shadow rounded-lg border border-gray-100 overflow-hidden">
                            <div className="px-4 py-5 sm:p-6">
                                <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center gap-2">
                                    <Zap className="h-5 w-5 text-yellow-500" />
                                    Redeem Promo Code
                                </h3>
                                <form
                                    onSubmit={async (e) => {
                                        e.preventDefault();
                                        const code = e.target.elements.promoCode.value.trim().toUpperCase();
                                        if (!code) return;
                                        const VALID_CODES = ['EYA1907', 'VIP2026', 'LAUNCH_PRO', 'ADMIN_ACCESS'];
                                        if (VALID_CODES.includes(code)) {
                                            setLoading('promo');
                                            try {
                                                await updateDoc(doc(db, "stores", store.id), {
                                                    plan: 'pro',
                                                    subscriptionStatus: 'active_promo',
                                                    promoCodeUsed: code
                                                });
                                                setStore(prev => ({ ...prev, plan: 'pro', subscriptionStatus: 'active_promo' }));
                                                toast.success("Code Redeemed! You are now on the PRO plan.");
                                                e.target.reset();
                                            } catch (err) {
                                                console.error(err);
                                                toast.error("Failed to apply code.");
                                            } finally {
                                                setLoading(null);
                                            }
                                        } else {
                                            toast.error("Invalid Promo Code");
                                        }
                                    }}
                                    className="flex gap-2 max-w-md mt-4"
                                >
                                    <input
                                        name="promoCode"
                                        type="text"
                                        placeholder="Enter Code"
                                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                                    />
                                    <Button type="submit" isLoading={loading === 'promo'}>
                                        Apply
                                    </Button>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "general" && (
                    <div className="space-y-6">
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

                                    {/* Invoice & Contact Details */}
                                    <div className="sm:col-span-6 border-t border-gray-100 pt-6">
                                        <h4 className="text-sm font-medium text-gray-900 mb-4">Invoice & Contact Details</h4>
                                        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                                            <div className="sm:col-span-3">
                                                <label className="block text-sm font-medium text-gray-700">Company Phone</label>
                                                <input
                                                    type="text"
                                                    value={store?.phone || ''}
                                                    onChange={(e) => setStore(prev => ({ ...prev, phone: e.target.value }))}
                                                    placeholder="+212 6..."
                                                    className="mt-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                                                />
                                            </div>
                                            <div className="sm:col-span-3">
                                                <label className="block text-sm font-medium text-gray-700">ICE / Tax ID</label>
                                                <input
                                                    type="text"
                                                    value={store?.ice || ''}
                                                    onChange={(e) => setStore(prev => ({ ...prev, ice: e.target.value }))}
                                                    placeholder="Tax ID or ICE"
                                                    className="mt-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                                                />
                                            </div>
                                            <div className="sm:col-span-6">
                                                <label className="block text-sm font-medium text-gray-700">Company Address</label>
                                                <textarea
                                                    rows={2}
                                                    value={store?.address || ''}
                                                    onChange={(e) => setStore(prev => ({ ...prev, address: e.target.value }))}
                                                    placeholder="123 Business St, Casablanca"
                                                    className="mt-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                                                />
                                            </div>
                                            <div className="sm:col-span-6 flex justify-end">
                                                <Button
                                                    onClick={async () => {
                                                        try {
                                                            await updateDoc(doc(db, "stores", store.id), {
                                                                phone: store.phone || "",
                                                                ice: store.ice || "",
                                                                address: store.address || ""
                                                            });
                                                            toast.success("Details saved!");
                                                        } catch (e) {
                                                            console.error(e);
                                                            toast.error("Failed to save.");
                                                        }
                                                    }}
                                                    icon={Save}
                                                >
                                                    Save Details
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* WhatsApp Configuration Section */}
                        <div className="bg-white shadow rounded-lg border border-gray-100 overflow-hidden">
                            <div className="px-4 py-5 sm:p-6">
                                <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center gap-2">
                                    <User className="h-5 w-5 text-gray-400" /> {/* Reusing User icon or import MessageSquare */}
                                    WhatsApp Templates Configuration
                                </h3>
                                <p className="mt-1 text-sm text-gray-500 mb-6">
                                    Customize the automatic messages sent to clients (Variables: [Client], [Store], [Ville], [Produit], [Commande], [Ticket])
                                </p>

                                <div className="space-y-6">
                                    {/* Language Selector */}
                                    <div className="bg-indigo-50 p-4 rounded-md border border-indigo-100 flex items-center justify-between">
                                        <div>
                                            <h4 className="text-sm font-bold text-indigo-900">Message Language / Langue des messages</h4>
                                            <p className="text-xs text-indigo-700">Choose between Standard French or Moroccan Darija.</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${store.whatsappLanguage !== 'darija' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                                                onClick={() => setStore(prev => ({ ...prev, whatsappLanguage: 'fr' }))}
                                            >
                                                Français 🇫🇷
                                            </button>
                                            <button
                                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${store.whatsappLanguage === 'darija' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                                                onClick={() => setStore(prev => ({ ...prev, whatsappLanguage: 'darija' }))}
                                            >
                                                Darija 🇲🇦
                                            </button>
                                        </div>
                                    </div>

                                    {['reçu', 'livraison', 'livré', 'retour', 'pas de réponse'].map(status => {
                                        const currentLang = store?.whatsappLanguage === 'darija' ? 'darija' : 'fr';
                                        const defaultText = currentLang === 'darija' ? DARIJA_TEMPLATES[status] : DEFAULT_TEMPLATES[status];
                                        return (
                                            <div key={status} className="border-b pb-4 last:border-0">
                                                <label className="block text-sm font-medium text-gray-700 mb-2 capitalize">
                                                    Status: {status}
                                                </label>
                                                <div className="flex gap-2">
                                                    <textarea
                                                        rows={3}
                                                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                                                        value={store?.whatsappTemplates?.[status] || ''}
                                                        placeholder={defaultText}
                                                        onChange={(e) => {
                                                            const newTemplates = { ...(store?.whatsappTemplates || {}), [status]: e.target.value };
                                                            setStore(prev => ({ ...prev, whatsappTemplates: newTemplates }));
                                                        }}
                                                    />
                                                    <button
                                                        title="Reset to Default"
                                                        className="p-2 text-gray-400 hover:text-gray-600 self-start"
                                                        onClick={() => {
                                                            const newTemplates = { ...(store?.whatsappTemplates || {}) };
                                                            delete newTemplates[status];
                                                            setStore(prev => ({ ...prev, whatsappTemplates: newTemplates }));
                                                        }}
                                                    >
                                                        <Zap className="h-4 w-4" /> {/* Reset Icon substitute */}
                                                    </button>
                                                </div>
                                                <p className="mt-1 text-xs text-gray-400">Default ({currentLang}): {defaultText?.substring(0, 50)}...</p>
                                            </div>
                                        )
                                    })}
                                </div>

                                <div className="mt-6 flex justify-end">
                                    <Button
                                        onClick={async () => {
                                            try {
                                                await updateDoc(doc(db, "stores", store.id), {
                                                    whatsappTemplates: store.whatsappTemplates,
                                                    whatsappLanguage: store.whatsappLanguage || 'fr'
                                                });
                                                toast.success(`Saved! Language: ${store.whatsappLanguage === 'darija' ? 'Darija' : 'French'}`);
                                            } catch (e) {
                                                console.error(e);
                                                toast.error("Error saving templates.");
                                            }
                                        }}
                                        icon={Save}
                                    >
                                        Save Configuration
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white shadow rounded-lg border border-gray-100 p-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                                <SettingsIcon className="h-5 w-5 text-gray-500" />
                                System Maintenance
                            </h3>
                            <Button
                                onClick={handleRecalculateStats}
                                isLoading={loading === 'recalc'}
                                variant="secondary"
                                className="w-full sm:w-auto"
                            >
                                {recalcMsg || "Recalculate Customer Stats"}
                            </Button>
                        </div>
                    </div>
                )}

                {activeTab === "security" && (
                    <div className="bg-white shadow rounded-lg border border-gray-100 overflow-hidden">
                        <div className="px-4 py-5 sm:p-6">
                            <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center gap-2">
                                <Shield className="h-5 w-5 text-gray-400" />
                                App Security
                            </h3>
                            <div className="mt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="text-base font-medium text-gray-900">Biometric App Lock</h4>
                                        <p className="text-sm text-gray-500">
                                            Require FaceID or TouchID when opening the app.
                                        </p>
                                    </div>
                                    <div className="flex items-center">
                                        {!biometricSupported ? (
                                            <span className="text-sm text-red-500 bg-red-50 px-2 py-1 rounded">Not Supported on this device</span>
                                        ) : (
                                            <button
                                                onClick={handleToggleBiometric}
                                                className={`
                                                    relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
                                                    ${biometricEnabled ? 'bg-indigo-600' : 'bg-gray-200'}
                                                `}
                                            >
                                                <span
                                                    aria-hidden="true"
                                                    className={`
                                                        pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200
                                                        ${biometricEnabled ? 'translate-x-5' : 'translate-x-0'}
                                                    `}
                                                />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="mt-4 bg-yellow-50 p-4 rounded-md border border-yellow-100">
                                    <div className="flex">
                                        <Lock className="h-5 w-5 text-yellow-400" aria-hidden="true" />
                                        <div className="ml-3">
                                            <h3 className="text-sm font-medium text-yellow-800">Note</h3>
                                            <div className="mt-2 text-sm text-yellow-700">
                                                <p>
                                                    This locks the app interface on this specific device. It does not change your account password.
                                                    If you clear your browser cache, you may need to re-enable this.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
}
