import { useState, useEffect } from "react";
import { useTenant } from "../context/TenantContext";
import { useLanguage } from "../context/LanguageContext";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { toast } from "react-hot-toast";
import { Save, Truck, Info, Globe, RefreshCw, ShieldCheck, Key } from "lucide-react";
import { authenticateSendit, getSenditDistricts } from "../lib/sendit";
import Button from "../components/Button";

export default function ShippingSettings() {
    const { store } = useTenant();
    const { t } = useLanguage();

    // ── Local API Key State (avoids mutating store context directly) ──
    const [olivraisonKeys, setOlivraisonKeys] = useState({ apiKey: "", secretKey: "" });
    const [senditKeys, setSenditKeys] = useState({ publicKey: "", secretKey: "" });
    const [loading, setLoading] = useState(false);
    const [senditInfoLoading, setSenditInfoLoading] = useState(false);
    const [senditCities, setSenditCities] = useState([]);
    const [loadingCities, setLoadingCities] = useState(false);

    // Sender info local state
    const [senditSender, setSenditSender] = useState({
        name: "", phone: "", address: "", pickupCityId: ""
    });

    useEffect(() => {
        if (!store) return;
        setOlivraisonKeys({
            apiKey: store.olivraisonApiKey || "",
            secretKey: store.olivraisonSecretKey || "",
        });
        setSenditKeys({
            publicKey: store.senditPublicKey || "",
            secretKey: store.senditSecretKey || "",
        });
        setSenditSender({
            name: store.senditSenderName || "",
            phone: store.senditSenderPhone || "",
            address: store.senditSenderAddress || "",
            pickupCityId: store.senditPickupCityId || "",
        });
        if (store.senditCities) setSenditCities(store.senditCities);
    }, [store]);

    const handleSyncCities = async () => {
        if (!senditKeys.publicKey || !senditKeys.secretKey) {
            toast.error("Enregistrez d'abord vos clés Sendit.");
            return;
        }
        setLoadingCities(true);
        try {
            const token = await authenticateSendit(senditKeys.publicKey, senditKeys.secretKey);
            const districts = await getSenditDistricts(token);
            setSenditCities(districts);
            await updateDoc(doc(db, "stores", store.id), { senditCities: districts });
            toast.success(`${districts.length} villes synchronisées.`);
        } catch (error) {
            toast.error("Échec de la synchronisation. Vérifiez vos clés.");
        } finally {
            setLoadingCities(false);
        }
    };

    const handleSaveOlivraison = async () => {
        if (!store?.id) return;
        setLoading(true);
        try {
            await updateDoc(doc(db, "stores", store.id), {
                olivraisonApiKey: olivraisonKeys.apiKey,
                olivraisonSecretKey: olivraisonKeys.secretKey,
            });
            toast.success(t('msg_olivraison_saved'));
        } catch (e) {
            toast.error(t('err_save_failed'));
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSendit = async () => {
        if (!store?.id) return;
        setSenditInfoLoading(true);
        try {
            await updateDoc(doc(db, "stores", store.id), {
                senditPublicKey: senditKeys.publicKey,
                senditSecretKey: senditKeys.secretKey,
                senditSenderName: senditSender.name,
                senditSenderPhone: senditSender.phone,
                senditSenderAddress: senditSender.address,
                senditPickupCityId: senditSender.pickupCityId,
            });
            toast.success("Configuration Sendit enregistrée ✓");
        } catch (e) {
            toast.error(t('err_save_failed'));
        } finally {
            setSenditInfoLoading(false);
        }
    };

    // ── Shared input style ──
    const inputCls = "mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition";

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
                <Truck className="w-8 h-8 text-indigo-600" />
                <div>
                    <h2 className="text-xl font-bold text-gray-900">{t('page_title_shipping')}</h2>
                    <p className="text-sm text-gray-500">{t('page_subtitle_shipping')}</p>
                </div>
            </div>

            {/* ── O-Livraison Integration ── */}
            <div className="bg-white shadow rounded-xl border border-gray-100 overflow-hidden">
                <div className="px-6 py-5">
                    <div className="flex items-center gap-2 mb-1">
                        <Globe className="h-5 w-5 text-indigo-500" />
                        <h3 className="text-lg font-semibold text-gray-900">{t('olivraison_title')}</h3>
                        <span className="ml-auto inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                            <ShieldCheck className="h-3 w-3" /> Actif
                        </span>
                    </div>
                    <p className="text-sm text-gray-500 mb-5">{t('olivraison_desc')}</p>

                    <div className="max-w-xl space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <Key className="inline h-3.5 w-3.5 mr-1 text-gray-400" />
                                Clé API (API Key)
                            </label>
                            <input
                                type="text"
                                value={olivraisonKeys.apiKey}
                                onChange={(e) => setOlivraisonKeys(prev => ({ ...prev, apiKey: e.target.value }))}
                                className={inputCls}
                                placeholder={t('placeholder_api_key')}
                                autoComplete="off"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <Key className="inline h-3.5 w-3.5 mr-1 text-gray-400" />
                                Clé Secrète (Secret Key)
                            </label>
                            <input
                                type="password"
                                value={olivraisonKeys.secretKey}
                                onChange={(e) => setOlivraisonKeys(prev => ({ ...prev, secretKey: e.target.value }))}
                                className={inputCls}
                                placeholder="••••••••••••••••"
                                autoComplete="new-password"
                            />
                        </div>
                        <div className="flex justify-end pt-2">
                            <Button onClick={handleSaveOlivraison} isLoading={loading} icon={Save}>
                                {t('btn_save_keys')}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sendit Integration */}
            <div className="bg-white shadow rounded-lg border border-gray-100 overflow-hidden">
                <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center gap-2">
                        <Truck className="h-5 w-5 text-indigo-500" />
                        Sendit Integration
                    </h3>

                    {/* Demo/Guide Section */}
                    <div className="mt-4 mb-6 bg-indigo-50 border border-indigo-100 rounded-lg p-4">
                        <h4 className="text-sm font-bold text-indigo-900 mb-3 flex items-center gap-2">
                            <Info className="h-4 w-4" />
                            How it works (Demo)
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                            <div className="bg-white p-3 rounded shadow-sm border border-indigo-100">
                                <div className="text-xs font-bold text-indigo-500 mb-1">STEP 1</div>
                                <div className="font-semibold text-gray-900 mb-1">Connect</div>
                                <p className="text-xs text-gray-500">Enter your <strong>Public</strong> & <strong>Secret Keys</strong> from Sendit and click Save.</p>
                            </div>
                            <div className="bg-white p-3 rounded shadow-sm border border-indigo-100">
                                <div className="text-xs font-bold text-indigo-500 mb-1">STEP 2</div>
                                <div className="font-semibold text-gray-900 mb-1">Configure</div>
                                <p className="text-xs text-gray-500">Fill Sender Info & click <strong>Sync</strong> to select your <strong>Pickup City</strong>.</p>
                            </div>
                            <div className="bg-white p-3 rounded shadow-sm border border-indigo-100">
                                <div className="text-xs font-bold text-indigo-500 mb-1">STEP 3</div>
                                <div className="font-semibold text-gray-900 mb-1">Ship</div>
                                <p className="text-xs text-gray-500">Go to <strong>Orders</strong>, click the <Truck className="inline h-3 w-3 text-orange-500" /> icon to create a shipment.</p>
                            </div>
                            <div className="bg-white p-3 rounded shadow-sm border border-indigo-100">
                                <div className="text-xs font-bold text-indigo-500 mb-1">STEP 4</div>
                                <div className="font-semibold text-gray-900 mb-1">Sync</div>
                                <p className="text-xs text-gray-500">Status updates (Livré, Retour) are updated <strong>automatically</strong>.</p>
                            </div>
                        </div>
                    </div>

                    <p className="mt-1 text-sm text-gray-500 mb-6">
                        Configure your Sendit API keys to enable automatic shipping.
                    </p>

                    <div className="max-w-xl space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <Key className="inline h-3.5 w-3.5 mr-1 text-gray-400" />
                                Clé Publique (Public Key)
                            </label>
                            <input
                                type="text"
                                value={senditKeys.publicKey}
                                onChange={(e) => setSenditKeys(prev => ({ ...prev, publicKey: e.target.value }))}
                                className={inputCls}
                                placeholder="Enter Public Key"
                                autoComplete="off"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <Key className="inline h-3.5 w-3.5 mr-1 text-gray-400" />
                                Clé Secrète (Secret Key)
                            </label>
                            <input
                                type="password"
                                value={senditKeys.secretKey}
                                onChange={(e) => setSenditKeys(prev => ({ ...prev, secretKey: e.target.value }))}
                                className={inputCls}
                                placeholder="••••••••••••••••"
                                autoComplete="new-password"
                            />
                        </div>
                        <div className="flex justify-end pt-2">
                            <Button onClick={handleSaveSendit} isLoading={senditInfoLoading} icon={Save}>
                                Enregistrer les clés Sendit
                            </Button>
                        </div>

                        <div className="border-t border-gray-100 pt-4 mt-4">
                            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                                <Info className="h-4 w-4 text-indigo-500" />
                                Sender Information (Ramassage)
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Sender Name</label>
                                    <input
                                        type="text"
                                        value={senditSender.name}
                                        onChange={(e) => setSenditSender(prev => ({ ...prev, name: e.target.value }))}
                                        className={inputCls}
                                        placeholder="e.g. My Store"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Sender Phone</label>
                                    <input
                                        type="text"
                                        value={senditSender.phone}
                                        onChange={(e) => setSenditSender(prev => ({ ...prev, phone: e.target.value }))}
                                        className={inputCls}
                                        placeholder="06XXXXXXXX"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700">Pickup Address</label>
                                    <input
                                        type="text"
                                        value={senditSender.address}
                                        onChange={(e) => setSenditSender(prev => ({ ...prev, address: e.target.value }))}
                                        className={inputCls}
                                        placeholder="Full address for pickup"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Pickup City (Sendit ID)</label>
                                    <div className="flex gap-2">
                                        <select
                                            value={senditSender.pickupCityId}
                                            onChange={(e) => setSenditSender(prev => ({ ...prev, pickupCityId: e.target.value }))}
                                            className="block w-full shadow-sm sm:text-sm border-gray-300 rounded-lg p-2 border bg-white focus:ring-2 focus:ring-indigo-500"
                                        >
                                            <option value="">Select a city...</option>
                                            {senditCities.map(city => (
                                                <option key={city.id} value={city.id}>
                                                    {city.name} ({city.region || '-'})
                                                </option>
                                            ))}
                                        </select>
                                        <Button
                                            onClick={handleSyncCities}
                                            isLoading={loadingCities}
                                            variant="secondary"
                                            icon={RefreshCw}
                                            title="Fetch cities from Sendit"
                                        >
                                            Sync
                                        </Button>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {senditCities.length === 0 ? "Click Sync to load cities." : `${senditCities.length} cities loaded.`}
                                    </p>
                                </div>
                            </div>
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
