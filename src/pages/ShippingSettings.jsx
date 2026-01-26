import { useState, useEffect } from "react";
import { useStoreData } from "../hooks/useStoreData";
import { useTenant } from "../context/TenantContext";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { toast } from "react-hot-toast";
import { Save, Truck, Info } from "lucide-react";
import Button from "../components/Button";
import Input from "../components/Input"; // Assuming you have this
// If Input component doesn't match, I'll use standard input.

export default function ShippingSettings() {
    const { store } = useTenant();
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
                    <h2 className="text-xl font-bold text-gray-900">Shipping Integrations</h2>
                    <p className="text-sm text-gray-500">Connect your local Moroccan carriers to automate labels.</p>
                </div>
            </div>

            <div className="relative">
                {/* Overlay Blur */}
                <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg border border-gray-100">
                    <div className="text-center p-6 bg-white shadow-xl rounded-2xl border border-indigo-100 transform scale-100 hover:scale-105 transition-transform duration-300">
                        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-indigo-100 mb-4">
                            <Truck className="h-8 w-8 text-indigo-600" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Coming Soon</h3>
                        <p className="text-gray-500 max-w-sm mb-6">
                            Integration with Amana, Cathedis, and other local carriers will be available in the next major update.
                        </p>
                        <span className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-indigo-700 bg-indigo-50 hover:bg-indigo-100 cursor-not-allowed">
                            Stay Tuned 🚀
                        </span>
                    </div>
                </div>

                {/* Blurred Content (Disabled) */}
                <div className="filter blur-sm select-none pointer-events-none opacity-50">
                    <form className="grid gap-6 md:grid-cols-2">
                        {/* Amana */}
                        <ProviderCard
                            title="Amana (Barid Al Maghrib)"
                            enabled={true}
                            onToggle={() => { }}
                        >
                            <Input label="Login" value="***********" disabled />
                            <Input label="Password" value="***********" disabled />
                            <Input label="Customer ID" value="***********" disabled />
                        </ProviderCard>

                        {/* Cathedis */}
                        <ProviderCard
                            title="Cathedis"
                            enabled={true}
                            onToggle={() => { }}
                        >
                            <Input label="API Key" value="***********" disabled />
                            <Input label="Account ID" value="***********" disabled />
                        </ProviderCard>

                        {/* Tawssil */}
                        <ProviderCard
                            title="Tawssil"
                            enabled={true}
                            onToggle={() => { }}
                        >
                            <Input label="Token / API Key" value="***********" disabled />
                        </ProviderCard>

                        {/* Olivraison */}
                        <ProviderCard
                            title="Olivraison"
                            enabled={true}
                            onToggle={() => { }}
                        >
                            <Input label="API Token" value="***********" disabled />
                        </ProviderCard>

                        {/* Sendit */}
                        <ProviderCard
                            title="Sendit.ma"
                            enabled={true}
                            onToggle={() => { }}
                        >
                            <Input label="API Token" value="***********" disabled />
                        </ProviderCard>

                        <div className="md:col-span-2 flex justify-end">
                            <Button icon={Save} disabled>
                                Save Configuration
                            </Button>
                        </div>
                    </form>
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
                <p className="text-sm text-gray-400 italic">Enable to configure settings.</p>
            )}
        </div>
    );
}
