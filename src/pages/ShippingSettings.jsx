import { useState, useEffect } from "react";
import { useStoreData } from "../hooks/useStoreData";
import { useTenant } from "../context/TenantContext";
import { useLanguage } from "../context/LanguageContext"; // NEW
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { toast } from "react-hot-toast";
import { Save, Truck, Info, Globe } from "lucide-react";
import Button from "../components/Button";
import Input from "../components/Input"; // Assuming you have this
// If Input component doesn't match, I'll use standard input.

export default function ShippingSettings() {
    const { store } = useTenant();
    const { t } = useLanguage(); // NEW
    const [config, setConfig] = useState({
        amana: { enabled: false, login: "", password: "", customerId: "" },
        cathedis: { enabled: false, apiKey: "", accountId: "" },
        olivraison: { enabled: false, token: "" },
        sendit: { enabled: false, token: "" },
        tawssil: { enabled: false, token: "" },
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (store?.shippingConfig) {
            setConfig(prev => ({ ...prev, ...store.shippingConfig }));
        }
    }, [store]);

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const storeRef = doc(db, "stores", store.id);
            await updateDoc(storeRef, {
                shippingConfig: config
            });
            toast.success("Shipping configuration saved");
        } catch (err) {
            console.error(err);
            toast.error("Failed to save configuration");
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (provider, field, value) => {
        setConfig(prev => ({
            ...prev,
            [provider]: {
                ...prev[provider],
                [field]: value
            }
        }));
    };

    const toggleProvider = (provider) => {
        setConfig(prev => ({
            ...prev,
            [provider]: {
                ...prev[provider],
                enabled: !prev[provider].enabled
            }
        }));
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
                <Truck className="w-8 h-8 text-indigo-600" />
                <div>
                    <h2 className="text-xl font-bold text-gray-900">{t('page_title_shipping')}</h2>
                    <p className="text-sm text-gray-500">{t('page_subtitle_shipping')}</p>
                </div>
            </div>

            {/* O-Livraison Integration */}
            <div className="bg-white shadow rounded-lg border border-gray-100 overflow-hidden">
                <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center gap-2">
                        <Globe className="h-5 w-5 text-indigo-500" />
                        {t('olivraison_title')}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 mb-6">
                        {t('olivraison_desc')}
                    </p>

                    <div className="max-w-xl space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">{t('label_api_key')}</label>
                            <input
                                type="text"
                                value={store?.olivraisonApiKey || ''}
                                onChange={(e) => setStore(prev => ({ ...prev, olivraisonApiKey: e.target.value }))}
                                className="mt-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                                placeholder={t('placeholder_api_key')}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">{t('label_secret_key')}</label>
                            <input
                                type="password"
                                value={store?.olivraisonSecretKey || ''}
                                onChange={(e) => setStore(prev => ({ ...prev, olivraisonSecretKey: e.target.value }))}
                                className="mt-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                                placeholder={t('placeholder_secret_key')}
                            />
                        </div>
                        <div className="flex justify-end">
                            <Button
                                onClick={async () => {
                                    setLoading(true);
                                    try {
                                        await updateDoc(doc(db, "stores", store.id), {
                                            olivraisonApiKey: store.olivraisonApiKey || "",
                                            olivraisonSecretKey: store.olivraisonSecretKey || ""
                                        });
                                        toast.success("O-Livraison Configuration Saved!");
                                    } catch (e) {
                                        console.error(e);
                                        toast.error("Failed to save.");
                                    } finally {
                                        setLoading(false);
                                    }
                                }}
                                isLoading={loading}
                                icon={Save}
                            >
                                {t('btn_save_keys')}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Other Carriers (Coming Soon) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
                {/* Amana */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 relative overflow-hidden">
                    <div className="absolute top-2 right-2 bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full font-medium">{t('coming_soon')}</div>
                    <h3 className="font-semibold text-gray-700 mb-4">Amana (Barid Al Maghrib)</h3>
                    <div className="space-y-3 pointer-events-none select-none">
                        <div>
                            <label className="block text-xs font-medium text-gray-500">{t('label_login')}</label>
                            <input type="text" disabled className="mt-1 block w-full bg-gray-100 border-gray-300 rounded-md shadow-sm sm:text-sm" placeholder="••••••••" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500">{t('label_password')}</label>
                            <input type="password" disabled className="mt-1 block w-full bg-gray-100 border-gray-300 rounded-md shadow-sm sm:text-sm" placeholder="••••••••" />
                        </div>
                    </div>
                </div>

                {/* Cathedis */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 relative overflow-hidden">
                    <div className="absolute top-2 right-2 bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full font-medium">{t('coming_soon')}</div>
                    <h3 className="font-semibold text-gray-700 mb-4">Cathedis</h3>
                    <div className="space-y-3 pointer-events-none select-none">
                        <div>
                            <label className="block text-xs font-medium text-gray-500">{t('label_api_key')}</label>
                            <input type="text" disabled className="mt-1 block w-full bg-gray-100 border-gray-300 rounded-md shadow-sm sm:text-sm" placeholder="••••••••" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500">{t('label_account_id')}</label>
                            <input type="text" disabled className="mt-1 block w-full bg-gray-100 border-gray-300 rounded-md shadow-sm sm:text-sm" placeholder="••••••••" />
                        </div>
                    </div>
                </div>

                {/* Tawssil */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 relative overflow-hidden">
                    <div className="absolute top-2 right-2 bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full font-medium">{t('coming_soon')}</div>
                    <h3 className="font-semibold text-gray-700 mb-4">Tawssil</h3>
                    <div className="space-y-3 pointer-events-none select-none">
                        <div>
                            <label className="block text-xs font-medium text-gray-500">{t('label_token')}</label>
                            <input type="text" disabled className="mt-1 block w-full bg-gray-100 border-gray-300 rounded-md shadow-sm sm:text-sm" placeholder="••••••••" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ProviderCard({ title, enabled, onToggle, children }) {
    return (
        <div className={`bg-white border rounded-lg p-5 shadow-sm transition-all ${enabled ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-gray-200'}`}>
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-900">{title}</h3>
                <div className="flex items-center">
                    <button
                        type="button"
                        onClick={onToggle}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${enabled ? 'bg-indigo-600' : 'bg-gray-200'}`}
                    >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>
            </div>

            {enabled && (
                <div className="space-y-3 animate-fadeIn">
                    {children}
                </div>
            )}
            {!enabled && (
                <p className="text-sm text-gray-400 italic">{t('enable_to_configure')}</p>
            )}
        </div>
    );
}
