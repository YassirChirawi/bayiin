import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTenant } from "../context/TenantContext";
import { useLanguage } from "../context/LanguageContext"; // NEW
import Button from "../components/Button";
import Input from "../components/Input";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Store, LogOut } from "lucide-react";

export default function Onboarding() {
    const [storeName, setStoreName] = useState("");
    const [currency, setCurrency] = useState("USD");
    const [loading, setLoading] = useState(false);
    const { user, logout } = useAuth();
    const { setStore, stores } = useTenant();
    const { t } = useLanguage(); // NEW
    const navigate = useNavigate();
    const location = useLocation();

    // Auto-redirect if user already has stores AND is not trying to create a new one
    useEffect(() => {
        const isCreatingNew = location.state?.createNew;

        if (stores && stores.length > 0 && !isCreatingNew) {
            toast.success("Redirecting to your stores...");
            navigate("/dashboard");
        }
    }, [stores, navigate, location.state]);

    const handleCreateStore = async (e) => {
        e.preventDefault();
        if (!user) return;

        try {
            setLoading(true);
            const storeId = storeName.toLowerCase().replace(/\s+/g, '-') + '-' + Math.random().toString(36).substr(2, 5);

            const storeData = {
                name: storeName,
                currency,
                ownerId: user.uid,
                createdAt: new Date().toISOString(),
                plan: 'free',
                subscriptionStatus: 'active'
            };

            // Create store document
            await setDoc(doc(db, "stores", storeId), storeData);

            // Update user document with storeId
            await setDoc(doc(db, "users", user.uid), {
                email: user.email,
                storeId,
                role: 'owner'
            }, { merge: true });

            setStore({ id: storeId, ...storeData });
            navigate("/dashboard");
        } catch (error) {
            console.error("Error creating store DETAILS:", error);
            toast.error("Failed to create store: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 relative">
            {/* Logout Button */}
            <div className="absolute top-4 right-4">
                <button
                    onClick={logout}
                    className="flex items-center gap-2 text-gray-500 hover:text-red-600 transition-colors px-4 py-2 rounded-lg hover:bg-white/50"
                >
                    <LogOut className="w-5 h-5" />
                    <span className="font-medium">{t('logout')}</span>
                </button>
            </div>

            <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg border border-gray-100">
                <div className="text-center">
                    <div className="mx-auto h-12 w-12 bg-indigo-100 rounded-full flex items-center justify-center">
                        <Store className="h-6 w-6 text-indigo-600" />
                    </div>
                    <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                        {t('setup_store_title')}
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        {t('setup_store_desc')}
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleCreateStore}>
                    <div className="space-y-4">
                        <Input
                            label={t('label_store_name')}
                            required
                            value={storeName}
                            onChange={(e) => setStoreName(e.target.value)}
                            placeholder="My Awesome Store"
                        />

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t('label_store_currency')}
                            </label>
                            <select
                                value={currency}
                                onChange={(e) => setCurrency(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="USD">USD ($)</option>
                                <option value="EUR">EUR (€)</option>
                                <option value="GBP">GBP (£)</option>
                                <option value="MAD">MAD (DH)</option>
                            </select>
                        </div>
                    </div>

                    <Button
                        type="submit"
                        className="w-full"
                        isLoading={loading}
                    >
                        {t('btn_create_store')}
                    </Button>
                </form>
            </div>
        </div>
    );
}
