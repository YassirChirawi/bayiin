import { useTenant } from "../context/TenantContext";
import { useLanguage } from "../context/LanguageContext"; // NEW
import { User, Store, CreditCard, Check, Zap, Shield, Save, Settings as SettingsIcon, Truck, Users, Lock, Activity, Sparkles, Package, Trash2, Plus, ShieldCheck, ClipboardCheck } from "lucide-react";
import { doc, updateDoc, collection, query, getDocs, orderBy, limit, setDoc, addDoc, serverTimestamp, where, runTransaction, increment } from "firebase/firestore";
import { db } from "../lib/firebase";
import Button from "../components/Button";
import { useState, useEffect, useMemo } from "react";
import { useImageUpload } from "../hooks/useImageUpload";
import { useBiometrics } from "../hooks/useBiometrics"; // NEW
import { toast } from "react-hot-toast";
import { Navigate } from "react-router-dom"; // Security
import { format } from "date-fns"; // For Audit Dates
import { vibrate } from "../utils/haptics";
import { MessageSquare } from "lucide-react";

import { PLANS, createCheckoutSession } from "../lib/stripeService";
import { DEFAULT_TEMPLATES, DARIJA_TEMPLATES } from "../utils/whatsappTemplates";

import { useReconciliation } from "../hooks/useReconciliation";
import { useStoreData } from "../hooks/useStoreData";
import ShippingSettings from "./ShippingSettings";
import React, { Suspense, lazy } from 'react';
const CatalogSettings = lazy(() => import('../components/settings/CatalogSettings'));
const LocationSettings = lazy(() => import('../components/settings/LocationSettings'));
const BillingSettings = lazy(() => import('../components/settings/BillingSettings'));
const ActivitySettings = lazy(() => import('../components/settings/ActivitySettings'));
const Beya3Settings = lazy(() => import('../components/settings/Beya3Settings'));
import WhatsAppConnector from '../components/settings/WhatsAppConnector';
import YouCanIntegration from '../components/integrations/YouCanIntegration';
import ShopifyIntegration from '../components/integrations/ShopifyIntegration';
import { FEATURES } from '../config/features';
import ConfirmDialog from "../components/ConfirmDialog";
import { useConfirmDialog } from "../hooks/useConfirmDialog";

import { Link } from "react-router-dom";

export default function Settings() {
    const { store, setStore } = useTenant();
    const { t } = useLanguage(); // NEW
    const { confirmState, confirm, close } = useConfirmDialog();

    const [activeTab, setActiveTab] = useState("general");
    const [loading, setLoading] = useState(null); // 'starter' | 'pro' | null
    const { uploadImage, uploading, error: uploadError } = useImageUpload();
    const { runReconciliation, isRecalculating } = useReconciliation(store?.id);


    const [isValidatingPayment, setIsValidatingPayment] = useState(false);

    const tabs = useMemo(() => [
        { id: "general", label: t('tab_general') || "Général", icon: Store },
        { id: "shipping", label: t('tab_shipping') || "Livraison", icon: Truck },
        { id: "locations", label: t('tab_locations') || "Logistique & Dépôts", icon: Truck },
        { id: "catalog", label: t('tab_catalog') || "Catalogue", icon: Package },
        { id: "billing", label: t('tab_billing') || "Plans & Facturation", icon: CreditCard },
        { id: "security", label: t('tab_security') || "Sécurité", icon: Shield },
        { id: "beya3", label: t('tab_beya3') || "Copilot (Beya3)", icon: Sparkles },
        { id: "qa", label: t('tab_qa') || "Recette QA", icon: ShieldCheck },
        { id: "activity", label: t('tab_activity') || "Journal d'Activité", icon: Activity },
    ], [t]);

    // Check for Tab and Return from Stripe
    useEffect(() => {
        const queryParams = new URLSearchParams(window.location.search);
        
        // Handle Tab switching from URL
        const tab = queryParams.get("tab");
        if (tab && tabs.some(t => t.id === tab)) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setActiveTab(tab);
        }

        // Handle Payment Success
        if (queryParams.get("success")) {
            setIsValidatingPayment(true);
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, [tabs]);

    // Listen to real-time store updates to dismiss validation loader
    useEffect(() => {
        if (isValidatingPayment && store?.subscriptionStatus === 'active') {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setIsValidatingPayment(false);
            vibrate('success');
            toast.success(t('msg_payment_received') || 'Paiement validé avec succès !');
        }
    }, [store?.subscriptionStatus, isValidatingPayment, t]);

    const handleLogoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || !store?.id) return;

        const url = await uploadImage(file, `logos/${store.id}`);
        if (url) {
            try {
                await updateDoc(doc(db, "stores", store.id), { logoUrl: url });
                setStore(prev => ({ ...prev, logoUrl: url }));
                vibrate('success');
                toast.success(t('msg_logo_updated'));
            } catch (err) {
                vibrate('error');
                console.error("Error updating logo:", err);
                toast.error(t('err_logo_update'));
            }
        }
    };

    const handleRecalculateStats = () => {
        confirm({
            title: 'Recalcul',
            message: t('confirm_recalc_customers') || "This will scan all orders to fix customer totals. Continue?",
            onConfirm: () => {
                runReconciliation({ updateCustomers: true, forceReload: false });
            }
        });
    };

    const handleRecalculateStoreStats = async () => {
        if (!store?.id) return;
        confirm({
            title: 'Recalcul Stats',
            message: t('confirm_fix_financials') || "⚠️ WARNING: This will RESET your Dashboard Financials based on current active orders. Continue?",
            isDestructive: true,
            onConfirm: () => {
                runReconciliation({ updateCustomers: true, forceReload: true });
            }
        });
    };

    // Audit Log State
    const [latestLog, setLatestLog] = useState(null);
    useEffect(() => {
        if (store?.id) {
            const fetchLogs = async () => {
                const q = query(
                    collection(db, "stores", store.id, "audit_logs"),
                    orderBy("timestamp", "desc"),
                    limit(1)
                );
                const snap = await getDocs(q);
                if (!snap.empty) setLatestLog(snap.docs[0].data());
            };
            fetchLogs();
        }
    }, [store?.id]);

    // Biometric Logic
    const { isAvailable, register } = useBiometrics();
    const [biometricSupported, setBiometricSupported] = useState(false);
    const [biometricEnabled, setBiometricEnabled] = useState(() => localStorage.getItem('biometricEnabled') === 'true');

    useEffect(() => {
        isAvailable().then(setBiometricSupported);
    }, [isAvailable]);

    const handleToggleBiometric = async () => {
        if (!biometricEnabled) {
            // Enable
            const success = await register(store.ownerId); 
            if (success) {
                localStorage.setItem('biometricEnabled', 'true');
                setBiometricEnabled(true);
                vibrate('success');
                toast.success(t('msg_biometric_enabled'));
            } else {
                vibrate('error');
                toast.error(t('err_biometric_failed'));
            }
        } else {
            // Disable
            confirm({
                title: t('btn_disable') || 'Désactiver',
                message: t('confirm_disable_biometrics') || "Désactiver le verrouillage biométrique ?",
                onConfirm: () => {
                    localStorage.removeItem('biometricEnabled');
                    setBiometricEnabled(false);
                    vibrate('success');
                    toast.success(t('msg_biometric_disabled'));
                }
            });
        }
    };

    // Security: Redirect Staff //
    if (store?.role === 'staff') {
        return <Navigate to="/dashboard" replace />;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">{t('page_title_settings')}</h1>
                <p className="mt-1 text-sm text-gray-500">
                    {t('page_subtitle_settings')}
                </p>
            </div>

            {isValidatingPayment && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6 mb-6 flex flex-col items-center justify-center text-center space-y-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    <div>
                        <h3 className="text-lg font-bold text-indigo-900">{t('msg_payment_validation') || "Validation du paiement en cours..."}</h3>
                        <p className="text-sm text-indigo-700">{t('msg_payment_wait') || "Nous attendons la confirmation sécurisée de notre partenaire de paiement. Cela peut prendre quelques secondes."}</p>
                    </div>
                </div>
            )}

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
                {activeTab === "activity" && (<Suspense fallback={<div>Chargement...</div>}><ActivitySettings store={store} t={t} /></Suspense>)}

                {activeTab === "shipping" && <ShippingSettings />}
                {activeTab === "locations" && <Suspense fallback={<div>Chargement...</div>}><LocationSettings store={store} t={t} /></Suspense>}
                {activeTab === "catalog" && <Suspense fallback={<div>Chargement...</div>}><CatalogSettings store={store} setStore={setStore} t={t} /></Suspense>}
                {activeTab === "beya3" && <Suspense fallback={<div>Chargement...</div>}><Beya3Settings store={store} setStore={setStore} /></Suspense>}

                {activeTab === "billing" && (<Suspense fallback={<div>Chargement...</div>}><BillingSettings store={store} setStore={setStore} t={t} /></Suspense>)}

                {activeTab === "general" && (
                    <div className="space-y-6">
                        <div className="glass-panel rounded-2xl overflow-hidden">
                            <div className="px-6 py-6 sm:p-8">
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
                                    <div className="sm:col-span-6 border-t border-gray-100 pt-8 mt-4">
                                        <h4 className="text-sm font-bold text-gray-900 mb-6 uppercase tracking-wider">{t('section_invoice_details')}</h4>
                                        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                                            <div className="sm:col-span-3">
                                                <label className="block text-sm font-medium text-gray-700">{t('label_store_phone')}</label>
                                                <input
                                                    type="text"
                                                    value={store?.phone || ''}
                                                    onChange={(e) => setStore(prev => ({ ...prev, phone: e.target.value }))}
                                                    placeholder="+212 6..."
                                                    className="mt-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-200 rounded-xl p-3 transition-all"
                                                />
                                            </div>
                                            <div className="sm:col-span-3">
                                                <label className="block text-sm font-medium text-gray-700">{t('label_store_ice') || 'ICE'}</label>
                                                <input
                                                    type="text"
                                                    value={store?.ice || ''}
                                                    onChange={(e) => setStore(prev => ({ ...prev, ice: e.target.value }))}
                                                    placeholder="Identifiant Commun de l'Entreprise"
                                                    className="mt-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-200 rounded-xl p-3 transition-all"
                                                />
                                            </div>
                                            <div className="sm:col-span-3">
                                                <label className="block text-sm font-medium text-gray-700">{t('label_if_fiscal') || 'IF Fiscal'}</label>
                                                <input
                                                    type="text"
                                                    value={store?.if_fiscal || ''}
                                                    onChange={(e) => setStore(prev => ({ ...prev, if_fiscal: e.target.value }))}
                                                    placeholder="Identifiant Fiscal"
                                                    className="mt-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-200 rounded-xl p-3 transition-all"
                                                />
                                            </div>
                                            <div className="sm:col-span-3">
                                                <label className="block text-sm font-medium text-gray-700">{t('label_rc') || 'RC (Registre du Commerce)'}</label>
                                                <input
                                                    type="text"
                                                    value={store?.rc || ''}
                                                    onChange={(e) => setStore(prev => ({ ...prev, rc: e.target.value }))}
                                                    placeholder="Numéro RC"
                                                    className="mt-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-200 rounded-xl p-3 transition-all"
                                                />
                                            </div>
                                            <div className="sm:col-span-3">
                                                <label className="block text-sm font-medium text-gray-700">{t('label_patente') || 'Patente'}</label>
                                                <input
                                                    type="text"
                                                    value={store?.patente || ''}
                                                    onChange={(e) => setStore(prev => ({ ...prev, patente: e.target.value }))}
                                                    placeholder="N° Patente"
                                                    className="mt-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-200 rounded-xl p-3 transition-all"
                                                />
                                            </div>
                                            <div className="sm:col-span-6">
                                                <label className="block text-sm font-medium text-gray-700">{t('label_store_address') || 'Adresse'}</label>
                                                <textarea
                                                    rows={2}
                                                    value={store?.address || ''}
                                                    onChange={(e) => setStore(prev => ({ ...prev, address: e.target.value }))}
                                                    placeholder="123 Rue Mohammed V..."
                                                    className="mt-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-200 rounded-xl p-3 transition-all"
                                                />
                                            </div>
                                            <div className="sm:col-span-6 flex justify-end mt-4">
                                                <Button
                                                    onClick={async () => {
                                                        try {
                                                            await updateDoc(doc(db, "stores", store.id), {
                                                                phone: store.phone || "",
                                                                ice: store.ice || "",
                                                                if_fiscal: store.if_fiscal || "",
                                                                rc: store.rc || "",
                                                                patente: store.patente || "",
                                                                address: store.address || ""
                                                            });
                                                            toast.success(t('msg_details_saved') || 'Mentions légales sauvegardées !');
                                                        } catch {
                                                            toast.error(t('err_save_failed') || 'Erreur lors de la sauvegarde');
                                                        }
                                                    }}
                                                    icon={Save}
                                                >
                                                    {t('btn_save_details') || 'Sauvegarder'}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* WhatsApp Configuration Section */}
                        <div className="glass-panel rounded-2xl overflow-hidden mt-6">
                            <div className="px-6 py-6 sm:p-8">
                                <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center gap-2">
                                    <MessageSquare className="h-5 w-5 text-gray-400" />
                                    {t('section_whatsapp_config')}
                                </h3>
                                <p className="mt-1 text-sm text-gray-500 mb-6">
                                    {t('whatsapp_config_desc')}
                                </p>

                                <div className="space-y-6">
                                    {/* Meta Embedded Signup Connector */}
                                    <WhatsAppConnector store={store} setStore={setStore} />

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

                        {/* YouCan Integration Section — masqué tant que le module n'est pas livré */}
                        {FEATURES.youcanIntegration && <YouCanIntegration store={store} />}

                        {/* Shopify Integration Section — masqué tant que le module n'est pas livré */}
                        {FEATURES.shopifyIntegration && <ShopifyIntegration store={store} />}

                        <div className="glass-panel rounded-2xl p-6 sm:p-8">
                            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                                <SettingsIcon className="h-5 w-5 text-gray-500" />
                                {t('section_system_maintenance')}
                            </h3>
                            <Button
                                onClick={handleRecalculateStats}
                                isLoading={isRecalculating}
                                variant="secondary"
                                className="w-full sm:w-auto"
                            >
                                {isRecalculating ? t('loading') : t('btn_recalc_stats')}
                            </Button>

                            <div className="mt-4 pt-4 border-t border-gray-100">
                                <p className="text-sm text-gray-500 mb-2">{t('fix_dashboard_data')}</p>
                                <Button
                                    onClick={handleRecalculateStoreStats}
                                    isLoading={isRecalculating}
                                    variant="secondary"
                                    className="w-full sm:w-auto text-red-600 border-red-200 hover:bg-red-50"
                                >
                                    {isRecalculating ? t('loading') : t('btn_fix_financials')}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}



                {activeTab === "security" && (
                    <div className="max-w-2xl space-y-6">
                        <div className="bg-white shadow-sm rounded-[2rem] border border-slate-100 overflow-hidden">
                            <div className="p-8">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl">
                                        <Shield size={28} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-900">{t('section_app_security')}</h3>
                                        <p className="text-sm text-slate-500">Gérez l'accès sécurisé à votre interface de gestion.</p>
                                    </div>
                                </div>

                                <div className="space-y-8">
                                    <div className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-base font-bold text-slate-900">{t('biometric_lock')}</h4>
                                                {biometricEnabled && (
                                                    <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider rounded-full">
                                                        <Check size={10} /> Actif
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-500 leading-relaxed max-w-sm">
                                                {t('biometric_lock_desc')}
                                            </p>
                                        </div>
                                        
                                        <div className="flex items-center">
                                            {!biometricSupported ? (
                                                <div className="px-3 py-1 bg-red-50 text-red-600 text-xs font-bold rounded-lg border border-red-100">
                                                    {t('not_supported')}
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={handleToggleBiometric}
                                                    className={`
                                                        relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
                                                        ${biometricEnabled ? 'bg-indigo-600' : 'bg-slate-200'}
                                                    `}
                                                >
                                                    <span
                                                        className={`
                                                            inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300
                                                            ${biometricEnabled ? 'translate-x-6' : 'translate-x-1'}
                                                        `}
                                                    />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="bg-amber-50/50 rounded-2xl p-5 border border-amber-100/50 flex gap-4">
                                        <div className="mt-0.5">
                                            <Lock className="h-5 w-5 text-amber-500" />
                                        </div>
                                        <div className="space-y-1">
                                            <h4 className="text-sm font-bold text-amber-900">{t('note')}</h4>
                                            <p className="text-xs text-amber-700 leading-relaxed">
                                                {t('security_note_desc')}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Additional Security Info */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="p-6 bg-white rounded-3xl border border-slate-100">
                                <Activity className="w-5 h-5 text-slate-400 mb-3" />
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Dernière activité</h4>
                                <p className="text-sm font-semibold text-slate-900">
                                    {latestLog ? format(latestLog.timestamp?.toDate(), 'dd MMM, HH:mm') : 'Aucune donnée'}
                                </p>
                            </div>
                            <div className="p-6 bg-white rounded-3xl border border-slate-100">
                                <Users className="w-5 h-5 text-slate-400 mb-3" />
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Rôle Actuel</h4>
                                <p className="text-sm font-semibold text-slate-900 capitalize">
                                    {store?.role || 'Owner'}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "qa" && (
                    <div className="space-y-6">
                        <div className="bg-white shadow rounded-lg border border-gray-100 p-6">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl">
                                    <ShieldCheck size={32} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">Module de Recette QA</h3>
                                    <p className="text-sm text-gray-500">Activez le mode testeur pour valider chaque fonctionnalité de la plateforme.</p>
                                </div>
                            </div>

                            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6 mb-8">
                                <div className="flex items-center justify-between">
                                    <div className="max-w-md">
                                        <h4 className="font-bold text-indigo-900 mb-1">Mode Testeur (Bêta)</h4>
                                        <p className="text-xs text-indigo-700 leading-relaxed">
                                            En activant ce mode, vous aurez accès à une interface dédiée pour cocher les tests, 
                                            suivre la progression de la recette et garantir que tout est prêt pour le LIVE.
                                        </p>
                                    </div>
                                    <button 
                                        onClick={async () => {
                                            const newVal = !store.testerMode;
                                            // Mise à jour optimiste : on la ANNULE si l'écriture est refusée.
                                            // testerMode fait partie des champs réservés au super_admin
                                            // dans firestore.rules (il ouvre l'accès à la Recette QA et
                                            // au plan PRO). Sans try/catch, le rejet passait en silence :
                                            // l'interrupteur basculait à l'écran, rien n'était écrit, et
                                            // aucun message n'apparaissait.
                                            setStore(prev => ({ ...prev, testerMode: newVal }));
                                            try {
                                                await updateDoc(doc(db, "stores", store.id), { testerMode: newVal });
                                                toast.success(newVal ? "Mode Testeur activé !" : "Mode Testeur désactivé");
                                                vibrate('success');
                                            } catch (err) {
                                                setStore(prev => ({ ...prev, testerMode: !newVal }));
                                                const denied = err?.code === 'permission-denied';
                                                toast.error(denied
                                                    ? "Le Mode Testeur est activé par l'équipe BayIIn. Contactez-nous pour y accéder."
                                                    : "Impossible de modifier le Mode Testeur.");
                                                console.error('testerMode toggle:', err);
                                            }
                                        }}
                                        className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${store.testerMode ? 'bg-indigo-600' : 'bg-gray-200'}`}
                                    >
                                        <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${store.testerMode ? 'translate-x-5' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                            </div>

                            {store.testerMode && (
                                <div className="space-y-4">
                                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-6">
                                        <div className="flex items-center justify-between">
                                            <div className="max-w-md">
                                                <h4 className="font-bold text-amber-900 mb-1">Guidage Interactif (Assistance)</h4>
                                                <p className="text-xs text-amber-700 leading-relaxed">
                                                    Affiche un assistant flottant sur toutes les pages pour vous guider étape par étape 
                                                    selon la checklist. Idéal pour les nouveaux testeurs.
                                                </p>
                                            </div>
                                            <button 
                                                onClick={async () => {
                                                    const newVal = !store.guidedQaMode;
                                                    setStore(prev => ({ ...prev, guidedQaMode: newVal }));
                                                    await updateDoc(doc(db, "stores", store.id), { guidedQaMode: newVal });
                                                    toast.success(newVal ? "Guidage activé !" : "Guidage désactivé");
                                                    vibrate('success');
                                                }}
                                                className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${store.guidedQaMode ? 'bg-amber-500' : 'bg-gray-200'}`}
                                            >
                                                <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${store.guidedQaMode ? 'translate-x-5' : 'translate-x-0'}`} />
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div className="flex justify-center">
                                        <Link 
                                            to="/qa" 
                                            className="inline-flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 hover:-translate-y-1 active:scale-95"
                                        >
                                            <ClipboardCheck size={20} />
                                            Accéder à la Checklist QA
                                        </Link>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white p-4 rounded-xl border border-gray-100">
                                <h4 className="text-xs font-bold text-gray-400 uppercase mb-2 tracking-widest">Conseil</h4>
                                <p className="text-sm text-gray-600">
                                    Utilisez un compte de test séparé pour vos essais afin de ne pas polluer vos statistiques financières réelles.
                                </p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-gray-100">
                                <h4 className="text-xs font-bold text-gray-400 uppercase mb-2 tracking-widest">Feedback</h4>
                                <p className="text-sm text-gray-600">
                                    Chaque test échoué devrait être documenté avec une capture d'écran pour faciliter la correction.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

            </div >
            <ConfirmDialog 
                isOpen={confirmState.isOpen}
                title={confirmState.title}
                message={confirmState.message}
                onConfirm={confirmState.onConfirm}
                onCancel={close}
                isDestructive={confirmState.isDestructive}
            />
        </div >
    );
}
