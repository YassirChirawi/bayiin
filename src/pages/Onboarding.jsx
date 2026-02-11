import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTenant } from "../context/TenantContext";
import { useLanguage } from "../context/LanguageContext";
import { useImageUpload } from "../hooks/useImageUpload";
import Button from "../components/Button";
import Input from "../components/Input";
import { doc, setDoc, addDoc, collection } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Store, LogOut, ChevronRight, ChevronLeft, Phone, MapPin, Package, Upload } from "lucide-react";

export default function Onboarding() {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: "",
        currency: "MAD",
        phone: "",
        address: "",
        city: "",
        logoUrl: "",
    });

    const { user, logout } = useAuth();
    const { setStore, stores } = useTenant();
    const { t } = useLanguage();
    const navigate = useNavigate();
    const location = useLocation();
    const { uploadImage, uploading } = useImageUpload();

    // Auto-redirect if store exists
    useEffect(() => {
        const isCreatingNew = location.state?.createNew;
        if (stores && stores.length > 0 && !isCreatingNew) {
            navigate("/dashboard");
        }
    }, [stores, navigate, location.state]);

    const handleNext = () => {
        if (step === 1 && !formData.name) return toast.error("Store name is required");
        if (step === 2 && !formData.phone) return toast.error("Phone number is mandatory");
        setStep(prev => prev + 1);
    };

    const handleBack = () => setStep(prev => prev - 1);

    const handleLogoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const url = await uploadImage(file, `logos/${user.uid}_${Date.now()}`);
        if (url) {
            setFormData(prev => ({ ...prev, logoUrl: url }));
            toast.success("Logo uploaded!");
        }
    };

    const handleFinish = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const storeId = formData.name.toLowerCase().replace(/\s+/g, '-') + '-' + Math.random().toString(36).substr(2, 5);

            // 1. Create Store
            const storeData = {
                name: formData.name,
                currency: formData.currency,
                phone: formData.phone,
                address: formData.address, // Now captured
                city: formData.city,
                logoUrl: formData.logoUrl,
                ownerId: user.uid,
                createdAt: new Date().toISOString(),
                plan: 'free',
                subscriptionStatus: 'active'
            };
            await setDoc(doc(db, "stores", storeId), storeData);

            // 2. Update User
            await setDoc(doc(db, "users", user.uid), {
                email: user.email,
                storeId,
                role: 'owner'
            }, { merge: true });

            setStore({ id: storeId, ...storeData });
            toast.success("Store setup complete!");
            navigate("/dashboard");

        } catch (error) {
            console.error(error);
            toast.error("Setup failed: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 relative">
            <div className="absolute top-4 right-4">
                <button onClick={logout} className="flex items-center gap-2 text-gray-500 hover:text-red-600 px-4 py-2">
                    <LogOut className="w-5 h-5" /> {t('logout')}
                </button>
            </div>

            <div className="max-w-lg w-full bg-white p-8 rounded-xl shadow-lg border border-gray-100">
                {/* Progress Bar */}
                <div className="mb-8">
                    <div className="flex justify-between mb-2">
                        {[1, 2, 3].map(s => (
                            <div key={s} className={`h-2 flex-1 mx-1 rounded-full ${s <= step ? 'bg-indigo-600' : 'bg-gray-100'}`} />
                        ))}
                    </div>
                    <p className="text-center text-sm text-gray-500">Step {step} of 3</p>
                </div>

                {step === 1 && (
                    <div className="space-y-6 animate-fadeIn">
                        <div className="text-center">
                            <Store className="mx-auto h-12 w-12 text-indigo-600" />
                            <h2 className="mt-4 text-2xl font-bold text-gray-900">{t('setup_store_title')}</h2>
                            <p className="text-gray-500">{t('setup_store_desc')}</p>
                        </div>
                        <Input
                            label={t('label_store_name')}
                            required
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            placeholder="My Awesome Store"
                            autoFocus
                        />
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('label_store_currency')}</label>
                            <select
                                value={formData.currency}
                                onChange={e => setFormData({ ...formData, currency: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500"
                            >
                                <option value="MAD">MAD (DH)</option>
                                <option value="USD">USD ($)</option>
                                <option value="EUR">EUR (€)</option>
                            </select>
                        </div>
                        <Button onClick={handleNext} className="w-full" icon={ChevronRight}>{t('btn_next')}</Button>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-6 animate-fadeIn">
                        <div className="text-center">
                            <Phone className="mx-auto h-12 w-12 text-indigo-600" />
                            <h2 className="mt-4 text-2xl font-bold text-gray-900">Contact Info</h2>
                            <p className="text-gray-500">How can customers reach you?</p>
                        </div>
                        <Input
                            label="Phone Number (WhatsApp) *"
                            required
                            value={formData.phone}
                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="+212 6..."
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="City"
                                value={formData.city}
                                onChange={e => setFormData({ ...formData, city: e.target.value })}
                                placeholder="Casablanca"
                            />
                            <Input
                                label="Address"
                                value={formData.address}
                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                                placeholder="Hay Riad..."
                            />
                        </div>
                        <div className="flex gap-3">
                            <Button onClick={handleBack} variant="secondary" className="flex-1" icon={ChevronLeft}>{t('btn_back')}</Button>
                            <Button onClick={handleNext} className="flex-1" icon={ChevronRight}>{t('btn_next')}</Button>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="space-y-6 animate-fadeIn">
                        <div className="text-center">
                            <Upload className="mx-auto h-12 w-12 text-indigo-600" />
                            <h2 className="mt-4 text-2xl font-bold text-gray-900">Add a Logo</h2>
                            <p className="text-gray-500">Make your store stand out.</p>
                        </div>

                        <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-6 hover:bg-gray-50 transition-colors cursor-pointer relative">
                            {formData.logoUrl ? (
                                <img src={formData.logoUrl} alt="Logo" className="h-32 w-32 object-contain mb-4" />
                            ) : (
                                <div className="h-32 w-32 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400">
                                    <Store className="h-12 w-12" />
                                </div>
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleLogoUpload}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                disabled={uploading}
                            />
                            <p className="text-sm text-indigo-600 font-medium">
                                {uploading ? "Uploading..." : "Click to upload logo"}
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <Button onClick={handleBack} variant="secondary" className="flex-1" icon={ChevronLeft}>{t('btn_back')}</Button>
                            <Button onClick={handleFinish} className="flex-1" isLoading={loading} icon={Store}>
                                {t('btn_finish_setup') || "Finish Setup"}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
