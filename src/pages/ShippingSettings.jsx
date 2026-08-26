import { useState, useEffect } from "react";
import { useTenant } from "../context/TenantContext";
import { useLanguage } from "../context/LanguageContext";
import { doc, updateDoc, getDoc, setDoc } from "firebase/firestore";
import { db, functions } from "../lib/firebase";
import { httpsCallable } from "firebase/functions";
import { toast } from "react-hot-toast";
import { Save, Truck, Info, Globe, RefreshCw, ShieldCheck, Key, Copy } from "lucide-react";
import Button from "../components/Button";
import { FEATURES } from "../config/features";

export default function ShippingSettings() {
    const { store } = useTenant();
    const { t } = useLanguage();

    const [webhookSecret, setWebhookSecret] = useState("");

    // ── Local API Key State (avoids mutating store context directly) ──
    const [olivraisonKeys, setOlivraisonKeys] = useState({ apiKey: "", secretKey: "" });
    const [senditKeys, setSenditKeys] = useState({ publicKey: "", secretKey: "" });
    const [cathedisKeys, setCathedisKeys] = useState({ username: "", password: "" });
    const [loading, setLoading] = useState(false);
    const [senditInfoLoading, setSenditInfoLoading] = useState(false);
    const [cathedisLoading, setCathedisLoading] = useState(false);
    const [senditCities, setSenditCities] = useState([]);
    const [loadingCities, setLoadingCities] = useState(false);
    const [customerPaysShipping, setCustomerPaysShipping] = useState(false);

    // Sender info local state
    const [senditSender, setSenditSender] = useState({
        name: "", phone: "", address: "", pickupCityId: ""
    });

    useEffect(() => {
        if (!store?.id) return;

        // Load private config
        const loadPrivateConfig = async () => {
            try {
                const configDoc = await getDoc(doc(db, "stores", store.id, "private", "config"));
                if (configDoc.exists()) {
                    const privateData = configDoc.data();
                    setOlivraisonKeys({
                        apiKey: privateData.olivraisonApiKey || "",
                        secretKey: privateData.olivraisonSecretKey || "",
                    });
                    setSenditKeys({
                        publicKey: privateData.senditPublicKey || "",
                        secretKey: privateData.senditSecretKey || "",
                    });
                    setCathedisKeys({
                        username: privateData.cathedisUsername || "",
                        password: privateData.cathedisPassword || "",
                    });
                    
                    if (privateData.webhookSecret) {
                        setWebhookSecret(privateData.webhookSecret);
                    } else {
                        // Generate missing webhook secret automatically
                        const newSecret = 'whsec_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
                        setWebhookSecret(newSecret);
                        updateDoc(doc(db, "stores", store.id, "private", "config"), {
                            webhookSecret: newSecret
                        }).catch(console.error);
                    }
                } else {
                    // Create config with a generated secret if it doesn't exist
                    const newSecret = 'whsec_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
                    setWebhookSecret(newSecret);
                    setDoc(doc(db, "stores", store.id, "private", "config"), { webhookSecret: newSecret }).catch(console.error);
                }
            } catch (err) {
                console.error("Failed to load private config:", err);
            }
        };

        loadPrivateConfig();

        setSenditSender({
            name: store.senditSenderName || "",
            phone: store.senditSenderPhone || "",
            address: store.senditSenderAddress || "",
            pickupCityId: store.senditPickupCityId || "",
        });
        if (store.senditCities) setSenditCities(store.senditCities);
        setCustomerPaysShipping(store.customerPaysShipping === true);
    }, [store]);

    const handleToggleShipping = async (e) => {
        const value = e.target.checked;
        setCustomerPaysShipping(value);
        try {
            await updateDoc(doc(db, "stores", store.id), { customerPaysShipping: value });
            toast.success(value ? "Le client paiera la livraison (ajoutée au COD)." : "Livraison non facturée au client.");
        } catch (err) {
            console.error(err);
            toast.error("Échec de l'enregistrement.");
            setCustomerPaysShipping(!value);
        }
    };

    const handleSyncCities = async () => {
        if (!senditKeys.publicKey || !senditKeys.secretKey) {
            toast.error("Enregistrez d'abord vos clés Sendit.");
            return;
        }
        setLoadingCities(true);
        try {
            // Districts via Cloud Function : les clés Sendit restent côté serveur.
            const fn = httpsCallable(functions, 'carrierAction');
            const res = await fn({ action: 'districts' });
            const districts = res.data?.data || [];
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
            await updateDoc(doc(db, "stores", store.id, "private", "config"), {
                olivraisonApiKey: olivraisonKeys.apiKey,
                olivraisonSecretKey: olivraisonKeys.secretKey,
            });
            await updateDoc(doc(db, "stores", store.id), {
                olivraisonApiKey: olivraisonKeys.apiKey
            });
            toast.success(t('msg_olivraison_saved'));
        } catch (e) {
            console.error(e);
            toast.error(t('err_save_failed'));
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSendit = async () => {
        if (!store?.id) return;
        setSenditInfoLoading(true);
        try {
            // Update keys in private config
            await updateDoc(doc(db, "stores", store.id, "private", "config"), {
                senditPublicKey: senditKeys.publicKey,
                senditSecretKey: senditKeys.secretKey,
            });

            // Update sender info in main store document (public info)
            await updateDoc(doc(db, "stores", store.id), {
                senditPublicKey: senditKeys.publicKey,
                senditSenderName: senditSender.name,
                senditSenderPhone: senditSender.phone,
                senditSenderAddress: senditSender.address,
                senditPickupCityId: senditSender.pickupCityId,
            });
            toast.success("Configuration Sendit enregistrée ✓");
        } catch (e) {
            console.error(e);
            toast.error(t('err_save_failed'));
        } finally {
            setSenditInfoLoading(false);
        }
    };

    const handleSaveCathedis = async () => {
        if (!store?.id) return;
        setCathedisLoading(true);
        try {
            await updateDoc(doc(db, "stores", store.id, "private", "config"), {
                cathedisUsername: cathedisKeys.username,
                cathedisPassword: cathedisKeys.password,
            });
            await updateDoc(doc(db, "stores", store.id), {
                cathedisUsername: cathedisKeys.username
            });
            toast.success(t('msg_cathedis_saved') || "Configuration Cathedis enregistrée ✓");
        } catch (e) {
            console.error(e);
            toast.error(t('err_save_failed'));
        } finally {
            setCathedisLoading(false);
        }
    };

    // ── Shared input style ──
    const inputCls = "mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition";
    
    // Webhook URLs
    const olivraisonWebhookUrl = webhookSecret ? `https://us-central1-commerce-saas-62f32.cloudfunctions.net/olivraisonWebhook?store=${store?.id}&token=${webhookSecret}` : '';
    const senditWebhookUrl = webhookSecret ? `https://us-central1-commerce-saas-62f32.cloudfunctions.net/senditWebhook?store=${store?.id}&token=${webhookSecret}` : '';

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text);
        toast.success("Copié dans le presse-papier !");
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

            {/* ── Politique de livraison (COD) — s'applique à TOUS les transporteurs ── */}
            <div className="bg-white shadow rounded-xl border border-gray-100 overflow-hidden">
                <div className="px-6 py-5">
                    <div className="flex items-center gap-2 mb-1">
                        <Truck className="h-5 w-5 text-indigo-500" />
                        <h3 className="text-lg font-semibold text-gray-900">Politique de livraison (COD)</h3>
                    </div>
                    <p className="text-sm text-gray-500 mb-4">
                        Détermine le montant encaissé par le transporteur à la livraison — appliqué à Sendit, O-Livraison et Cathedis de façon identique.
                    </p>
                    <label className="flex items-start gap-3 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={customerPaysShipping}
                            onChange={handleToggleShipping}
                            className="mt-1 h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-sm text-gray-700">
                            <span className="font-medium text-gray-900">Le client paie les frais de livraison</span><br />
                            Coché : les frais de livraison sont <strong>ajoutés</strong> au montant COD. Décoché : le montant COD = total des produits uniquement.
                        </span>
                    </label>
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
                        
                        {/* Webhook O-Livraison */}
                        {webhookSecret && (
                            <div className="mt-6 pt-4 border-t border-gray-100">
                                <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                                    <Globe className="h-4 w-4 text-indigo-500" />
                                    URL de Webhook (Sécurisée)
                                </h4>
                                <p className="text-xs text-gray-500 mb-2">Copiez ce lien et collez-le dans les paramètres de webhook sur votre compte O-Livraison. Ce lien permet à O-Livraison de mettre à jour automatiquement le statut de vos commandes sur BayIIn.</p>
                                <div className="flex gap-2 items-center">
                                    <input 
                                        type="text" 
                                        readOnly 
                                        value={olivraisonWebhookUrl} 
                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono text-gray-600 focus:outline-none"
                                    />
                                    <Button variant="secondary" onClick={() => handleCopy(olivraisonWebhookUrl)} title="Copier l'URL">
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
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

                        {/* Webhook Sendit */}
                        {webhookSecret && (
                            <div className="border-t border-gray-100 pt-4 mt-4">
                                <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                                    <Globe className="h-4 w-4 text-indigo-500" />
                                    URL de Webhook (Sécurisée)
                                </h4>
                                <p className="text-xs text-gray-500 mb-2">Copiez ce lien et collez-le dans les paramètres API / Webhook de votre compte Sendit. Ce lien est unique à votre boutique et hautement sécurisé.</p>
                                <div className="flex gap-2 items-center">
                                    <input 
                                        type="text" 
                                        readOnly 
                                        value={senditWebhookUrl} 
                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono text-gray-600 focus:outline-none"
                                    />
                                    <Button variant="secondary" onClick={() => handleCopy(senditWebhookUrl)} title="Copier l'URL">
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Cathedis Integration ── */}
            {FEATURES.carrierCathedis && (
            <div className="bg-white shadow rounded-xl border border-gray-100 overflow-hidden relative">
                <div className="px-6 py-5">
                    <div className="flex items-center gap-2 mb-1">
                        <Globe className="h-5 w-5 text-indigo-500" />
                        <h3 className="text-lg font-semibold text-gray-900">{t('cathedis_title') || 'Cathedis Integration'}</h3>
                        {store?.cathedisUsername && (
                            <span className="ml-auto inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                                <ShieldCheck className="h-3 w-3" /> Actif
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-gray-500 mb-5">{t('cathedis_desc') || 'Configure your Cathedis credentials to enable automatic shipping.'}</p>

                    <div className="max-w-xl space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <Key className="inline h-3.5 w-3.5 mr-1 text-gray-400" />
                                {t('label_login') || 'Identifiant (Username)'}
                            </label>
                            <input
                                type="text"
                                value={cathedisKeys.username}
                                onChange={(e) => setCathedisKeys(prev => ({ ...prev, username: e.target.value }))}
                                className={inputCls}
                                placeholder="Votre Login Cathedis"
                                autoComplete="off"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <Key className="inline h-3.5 w-3.5 mr-1 text-gray-400" />
                                {t('label_password') || 'Mot de passe (Password)'}
                            </label>
                            <input
                                type="password"
                                value={cathedisKeys.password}
                                onChange={(e) => setCathedisKeys(prev => ({ ...prev, password: e.target.value }))}
                                className={inputCls}
                                placeholder="••••••••••••••••"
                                autoComplete="new-password"
                            />
                        </div>
                        <div className="flex justify-end pt-2">
                            <Button onClick={handleSaveCathedis} isLoading={cathedisLoading} icon={Save}>
                                {t('btn_save_keys') || 'Enregistrer les clés'}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
            )}

        </div>
    );
}
