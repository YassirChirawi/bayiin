import { useTenant } from "../context/TenantContext";
import { useLanguage } from "../context/LanguageContext"; // NEW
import { User, Store, CreditCard, Check, Zap, Shield, Save, Settings as SettingsIcon, Truck, Users, Lock, Activity, Sparkles } from "lucide-react";
import { doc, updateDoc, setDoc, collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "../lib/firebase";
import Button from "../components/Button";
import { useState, useEffect } from "react";
import { useImageUpload } from "../hooks/useImageUpload";
import { useBiometrics } from "../hooks/useBiometrics"; // NEW
import { toast } from "react-hot-toast";
import { Navigate } from "react-router-dom"; // Security
import { format } from "date-fns"; // For Audit Dates

import { PLANS, createCheckoutSession } from "../lib/stripeService";
import { DEFAULT_TEMPLATES, DARIJA_TEMPLATES } from "../utils/whatsappTemplates";
import { reconcileStoreStats } from "../utils/reconcileStats";
import ShippingSettings from "./ShippingSettings";



export default function Settings() {
    const { store, setStore } = useTenant();
    const { t } = useLanguage(); // NEW

    // Security: Redirect Staff //
    if (store?.role === 'staff') {
        return <Navigate to="/dashboard" replace />;
    }

    const [activeTab, setActiveTab] = useState("general");
    const [loading, setLoading] = useState(null); // 'starter' | 'pro' | null
    const { uploadImage, uploading, error: uploadError } = useImageUpload();

    // Check for Return from Stripe
    // Check for Return from Stripe
    useEffect(() => {
        const query = new URLSearchParams(window.location.search);
        if (query.get("success")) {
            toast.success(t('msg_payment_received'));
            window.history.replaceState({}, document.title, window.location.pathname);
            // Optionally: Poll for status change or encourage user to refresh
        }
    }, []);

    const handleLogoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || !store?.id) return;

        const url = await uploadImage(file, `logos/${store.id}`);
        if (url) {
            try {
                await updateDoc(doc(db, "stores", store.id), { logoUrl: url });
                setStore(prev => ({ ...prev, logoUrl: url }));
                toast.success(t('msg_logo_updated'));
            } catch (err) {
                console.error("Error updating logo:", err);
                toast.error(t('err_logo_update'));
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
            toast.error(t('err_upgrade_failed'));
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
            toast.success(t('msg_stats_fixed', { count: updates.length }));
            setRecalcMsg("");
        } catch (err) {
            console.error("Recalc Error:", err);
            toast.error(t('err_recalculate'));
            setRecalcMsg("");
        } finally {
            setLoading(null);
        }
    };

    const handleRecalculateStoreStats = async () => {
        if (!store?.id) return;
        if (!window.confirm("⚠️ WARNING: This will RESET your Dashboard Financials based on current active orders. \n\nUse this only if your stats are out of sync.\n\nContinue?")) return;

        setLoading('recalcStore');
        setRecalcMsg("Resetting Stats...");
        try {
            await reconcileStoreStats(db, store.id);
            toast.success(t('msg_financials_recalculated'));
            window.location.reload(); // Refresh to see changes
        } catch (err) {
            console.error("Store Recalc Error:", err);
            toast.error(t('err_generic') + err.message);
        } finally {
            setLoading(null);
            setRecalcMsg("");
        }
    };

    // Audit Log State
    const [logs, setLogs] = useState([]);
    useEffect(() => {
        if (activeTab === 'activity' && store?.id) {
            const fetchLogs = async () => {
                const q = query(
                    collection(db, "stores", store.id, "audit_logs"),
                    orderBy("timestamp", "desc"),
                    limit(50)
                );
                const snap = await getDocs(q);
                setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            };
            fetchLogs();
        }
    }, [activeTab, store?.id]);


    const tabs = [
        { id: "general", label: t('tab_general'), icon: Store },
        { id: "shipping", label: t('tab_shipping'), icon: Truck },
        { id: "billing", label: t('tab_billing'), icon: CreditCard },
        { id: "security", label: t('tab_security'), icon: Shield },
        { id: "activity", label: t('tab_activity'), icon: Activity }, // NEW
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
                toast.error(t('err_user_id_not_found'));
                return;
            }
            const success = await register(store.ownerId); // Use ownerId/userId as key
            if (success) {
                localStorage.setItem('biometricEnabled', 'true');
                setBiometricEnabled(true);
                toast.success(t('msg_biometric_enabled'));
            } else {
                toast.error(t('err_biometric_failed'));
            }
        } else {
            // Disable
            if (window.confirm("Disable biometric lock?")) {
                localStorage.removeItem('biometricEnabled');
                setBiometricEnabled(false);
                toast.success(t('msg_biometric_disabled'));
            }
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">{t('page_title_settings')}</h1>
                <p className="mt-1 text-sm text-gray-500">
                    {t('page_subtitle_settings')}
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
                {activeTab === "activity" && (
                    <div className="bg-white shadow rounded-lg border border-gray-100 overflow-hidden">
                        <div className="px-4 py-5 sm:px-6 border-b border-gray-100">
                            <h3 className="text-lg leading-6 font-medium text-gray-900">{t('section_recent_activity')}</h3>
                            <p className="mt-1 text-sm text-gray-500">{t('activity_log_desc')}</p>
                        </div>
                        <ul className="divide-y divide-gray-200">
                            {logs.length === 0 ? (
                                <li className="px-4 py-4 text-sm text-gray-500 text-center">{t('no_activity')}</li>
                            ) : logs.map((log) => (
                                <li key={log.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <p className="text-sm font-medium text-indigo-600 truncate">{log.action}</p>
                                            <p className="flex items-center text-sm text-gray-500 cursor-help" title={JSON.stringify(log.metadata || {})}>
                                                <span className="truncate">{log.details}</span>
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <p className="text-xs text-gray-900 font-semibold">{log.user?.name || log.user?.email}</p>
                                            <p className="text-xs text-gray-500">
                                                {log.timestamp ? format(log.timestamp.toDate(), 'MMM dd, HH:mm') : '-'}
                                            </p>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {activeTab === "shipping" && <ShippingSettings />}

                {activeTab === "billing" && (
                    <div className="space-y-6">
                        {/* Subscription Section */}
                        <div className="bg-white shadow rounded-lg border border-gray-100 overflow-hidden">
                            <div className="px-4 py-5 sm:p-6">
                                <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center gap-2">
                                    <CreditCard className="h-5 w-5 text-gray-400" />
                                    {t('section_subscription_plan')}
                                </h3>
                                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Starter Plan */}
                                    <div className={`border rounded-lg p-6 relative flex flex-col ${store?.plan === 'starter' ? 'border-indigo-600 ring-1 ring-indigo-600 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300'}`}>
                                        {store?.plan === 'starter' && (
                                            <div className="absolute top-0 right-0 -mt-2 -mr-2">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 border border-indigo-200">
                                                    {t('active')}
                                                </span>
                                            </div>
                                        )}
                                        <h4 className="text-lg font-bold text-gray-900">Starter</h4>
                                        <p className="mt-2 text-sm text-gray-500 flex-1">
                                            {t('plan_starter_desc')}
                                        </p>
                                        <div className="mt-4 mb-6">
                                            <span className="text-4xl font-extrabold text-gray-900">79 DH</span>
                                            <span className="text-base font-medium text-gray-500">/mo</span>
                                            <p className="text-xs text-green-600 font-semibold mt-1">14 Days Free Trial</p>
                                        </div>
                                        <ul className="space-y-3 mb-6 text-sm text-gray-600">
                                            <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> {t('plan_feature_50_orders')}</li>
                                            <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> {t('plan_feature_basic_analytics')}</li>
                                        </ul>
                                        <Button
                                            onClick={() => handleUpgrade('starter')}
                                            isLoading={loading === 'starter'}
                                            disabled={store?.plan === 'starter'}
                                            className={`w-full justify-center ${store?.plan === 'starter' ? 'bg-indigo-200 text-indigo-700 cursor-default' : 'bg-white text-indigo-600 border border-indigo-600 hover:bg-indigo-50'}`}
                                        >
                                            {store?.plan === 'starter' ? t('current_plan') : t('start_trial')}
                                        </Button>
                                    </div>

                                    {/* Pro Plan */}
                                    <div className={`border rounded-lg p-6 relative flex flex-col ${store?.plan === 'pro' ? 'border-purple-600 ring-1 ring-purple-600 bg-purple-50' : 'border-gray-200 hover:border-purple-300'}`}>
                                        {store?.plan === 'pro' && (
                                            <div className="absolute top-0 right-0 -mt-2 -mr-2">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                                                    {t('active')}
                                                </span>
                                            </div>
                                        )}
                                        <h4 className="text-lg font-bold text-gray-900">Pro</h4>
                                        <p className="mt-2 text-sm text-gray-500 flex-1">
                                            {t('plan_pro_desc')}
                                        </p>
                                        <div className="mt-4 mb-6">
                                            <span className="text-4xl font-extrabold text-gray-900">179 DH</span>
                                            <span className="text-base font-medium text-gray-500">/mo</span>
                                            <p className="text-xs text-green-600 font-semibold mt-1">14 Days Free Trial</p>
                                        </div>
                                        <ul className="space-y-3 mb-6 text-sm text-gray-600">
                                            <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> {t('plan_feature_unlimited_orders')}</li>
                                            <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> {t('plan_feature_adv_analytics')}</li>
                                        </ul>
                                        <Button
                                            onClick={() => handleUpgrade('pro')}
                                            isLoading={loading === 'pro'}
                                            disabled={store?.plan === 'pro'}
                                            className={`w-full justify-center ${store?.plan === 'pro' ? 'bg-purple-200 text-purple-700 cursor-default' : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-md shadow-indigo-200'}`}
                                            icon={Zap}
                                        >
                                            {store?.plan === 'pro' ? t('current_plan') : t('start_trial')}
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
                                    {t('redeem_promo_code')}
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
                                                toast.success(t('msg_code_redeemed'));
                                                e.target.reset();
                                            } catch (err) {
                                                console.error(err);
                                                toast.error(t('err_code_apply'));
                                            } finally {
                                                setLoading(null);
                                            }
                                        } else {
                                            toast.error(t('err_invalid_code'));
                                        }
                                    }}
                                    className="flex gap-2 max-w-md mt-4"
                                >
                                    <input
                                        name="promoCode"
                                        type="text"
                                        placeholder={t('enter_code')}
                                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                                    />
                                    <Button type="submit" isLoading={loading === 'promo'}>
                                        {t('apply')}
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
                                    {t('section_store_info')}
                                </h3>
                                <div className="mt-4 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                                    <div className="sm:col-span-6">
                                        <label className="block text-sm font-medium text-gray-700">{t('label_store_logo')}</label>
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
                                        <label className="block text-sm font-medium text-gray-700">{t('label_store_name')}</label>
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
                                        <label className="block text-sm font-medium text-gray-700">{t('label_store_currency')}</label>
                                        <div className="mt-1">
                                            <select
                                                value={store?.currency || 'MAD'}
                                                onChange={async (e) => {
                                                    const newCurrency = e.target.value;
                                                    setStore(prev => ({ ...prev, currency: newCurrency }));
                                                    // Auto-save
                                                    try {
                                                        await updateDoc(doc(db, "stores", store.id), { currency: newCurrency });
                                                        toast.success(t('msg_currency_updated', { currency: newCurrency }));
                                                    } catch (err) {
                                                        toast.error(t('err_currency_update'));
                                                    }
                                                }}
                                                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                                            >
                                                <option value="MAD">MAD (Dirham Marocain)</option>
                                                <option value="DZD" disabled className="text-gray-400 bg-gray-50">DZD (Dinar Algérien) - Coming Soon</option>
                                                <option value="TND" disabled className="text-gray-400 bg-gray-50">TND (Dinar Tunisien) - Coming Soon</option>
                                                <option value="EUR" disabled className="text-gray-400 bg-gray-50">EUR (Euro) - Coming Soon</option>
                                                <option value="USD" disabled className="text-gray-400 bg-gray-50">USD (Dollar) - Coming Soon</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Invoice & Contact Details */}
                                    <div className="sm:col-span-6 border-t border-gray-100 pt-6">
                                        <h4 className="text-sm font-medium text-gray-900 mb-4">{t('section_invoice_details')}</h4>
                                        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                                            <div className="sm:col-span-3">
                                                <label className="block text-sm font-medium text-gray-700">{t('label_store_phone')}</label>
                                                <input
                                                    type="text"
                                                    value={store?.phone || ''}
                                                    onChange={(e) => setStore(prev => ({ ...prev, phone: e.target.value }))}
                                                    placeholder="+212 6..."
                                                    className="mt-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                                                />
                                            </div>
                                            <div className="sm:col-span-3">
                                                <label className="block text-sm font-medium text-gray-700">{t('label_store_ice')}</label>
                                                <input
                                                    type="text"
                                                    value={store?.ice || ''}
                                                    onChange={(e) => setStore(prev => ({ ...prev, ice: e.target.value }))}
                                                    placeholder="Tax ID or ICE"
                                                    className="mt-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                                                />
                                            </div>
                                            <div className="sm:col-span-6">
                                                <label className="block text-sm font-medium text-gray-700">{t('label_store_address')}</label>
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
                                                            toast.success(t('msg_details_saved'));
                                                        } catch (e) {
                                                            console.error(e);
                                                            toast.error(t('err_save_failed'));
                                                        }
                                                    }}
                                                    icon={Save}
                                                >
                                                    {t('btn_save_details')}
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
                                    {t('section_whatsapp_config')}
                                </h3>
                                <p className="mt-1 text-sm text-gray-500 mb-6">
                                    {t('whatsapp_config_desc')}
                                </p>

                                <div className="space-y-6">
                                    {/* Language Selector */}
                                    <div className="bg-indigo-50 p-4 rounded-md border border-indigo-100 flex items-center justify-between">
                                        <div>
                                            <h4 className="text-sm font-bold text-indigo-900">{t('whatsapp_language_title')}</h4>
                                            <p className="text-xs text-indigo-700">{t('whatsapp_language_desc')}</p>
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
                                                    {t('status')}: {status}
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
                                                    whatsappTemplates: store.whatsappTemplates || {},
                                                    whatsappLanguage: store.whatsappLanguage || 'fr'
                                                });
                                                toast.success(t('msg_language_saved', { lang: store.whatsappLanguage === 'darija' ? 'Darija' : 'Français' }));
                                            } catch (e) {
                                                console.error(e);
                                                toast.error(t('err_save_templates'));
                                            }
                                        }}
                                        icon={Save}
                                    >
                                        {t('btn_save_config')}
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* AI Configuration Section */}
                        {/* AI Configuration Section */}
                        <div className="bg-white shadow rounded-lg border border-gray-100 overflow-hidden">
                            <div className="px-4 py-5 sm:p-6">
                                <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center gap-2">
                                    <Sparkles className="h-5 w-5 text-indigo-500" />
                                    {t('section_ai_config') || 'AI Configuration'}
                                </h3>
                                <div className="mt-4 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                                    <div className="sm:col-span-6">
                                        <label className="block text-sm font-medium text-gray-700">Gemini API Key</label>
                                        <div className="mt-1 flex gap-2">
                                            <input
                                                type="password"
                                                value={store?.geminiApiKey || ''}
                                                onChange={(e) => setStore(prev => ({ ...prev, geminiApiKey: e.target.value }))}
                                                placeholder="AIza..."
                                                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                                            />
                                            <Button
                                                onClick={async () => {
                                                    try {
                                                        await updateDoc(doc(db, "stores", store.id), {
                                                            geminiApiKey: store.geminiApiKey || ""
                                                        });
                                                        toast.success("API Key saved!");
                                                        // Force reload to apply key instantly if needed, or context updates
                                                        window.location.reload();
                                                    } catch (e) {
                                                        console.error(e);
                                                        toast.error("Error saving key");
                                                    }
                                                }}
                                                icon={Save}
                                            >
                                                {t('btn_save') || 'Save'}
                                            </Button>
                                        </div>
                                        <p className="mt-2 text-xs text-gray-500">
                                            Required for Beya3 (Copilot). Get it from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">Google AI Studio</a>.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white shadow rounded-lg border border-gray-100 p-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                                <SettingsIcon className="h-5 w-5 text-gray-500" />
                                {t('section_system_maintenance')}
                            </h3>
                            <Button
                                onClick={handleRecalculateStats}
                                isLoading={loading === 'recalc'}
                                variant="secondary"
                                className="w-full sm:w-auto"
                            >
                                {recalcMsg || t('btn_recalc_stats')}
                            </Button>

                            <div className="mt-4 pt-4 border-t border-gray-100">
                                <p className="text-sm text-gray-500 mb-2">{t('fix_dashboard_data')}</p>
                                <Button
                                    onClick={handleRecalculateStoreStats}
                                    isLoading={loading === 'recalcStore'}
                                    variant="secondary"
                                    className="w-full sm:w-auto text-red-600 border-red-200 hover:bg-red-50"
                                >
                                    {loading === 'recalcStore' ? recalcMsg : t('btn_fix_financials')}
                                </Button>
                            </div>
                        </div>
                    </div>
                )
                }

                {
                    activeTab === "security" && (
                        <div className="bg-white shadow rounded-lg border border-gray-100 overflow-hidden">
                            <div className="px-4 py-5 sm:p-6">
                                <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center gap-2">
                                    <Shield className="h-5 w-5 text-gray-400" />
                                    {t('section_app_security')}
                                </h3>
                                <div className="mt-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="text-base font-medium text-gray-900">{t('biometric_lock')}</h4>
                                            <p className="text-sm text-gray-500">
                                                {t('biometric_lock_desc')}
                                            </p>
                                        </div>
                                        <div className="flex items-center">
                                            {!biometricSupported ? (
                                                <span className="text-sm text-red-500 bg-red-50 px-2 py-1 rounded">{t('not_supported')}</span>
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
                                                <h3 className="text-sm font-medium text-yellow-800">{t('note')}</h3>
                                                <div className="mt-2 text-sm text-yellow-700">
                                                    <p>
                                                        {t('security_note_desc')}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }
            </div >
        </div >
    );
}
