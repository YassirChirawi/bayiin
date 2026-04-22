import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { X, Save } from "lucide-react";
import Button from "./Button";
import Input from "./Input";
import { useLanguage } from "../context/LanguageContext"; // NEW
import { getCustomerSegment } from "../utils/aiSegmentation";
import { getWhatsAppLink, createRawWhatsAppLink } from "../utils/whatsappTemplates";
import { MessageCircle, Sparkles, Wand2 } from "lucide-react";
import { generateWhatsAppTemplate } from "../services/aiService"; // NEW

export default function CustomerModal({ isOpen, onClose, onSave, customer = null }) {
    const { t } = useLanguage(); // NEW
    const [formData, setFormData] = useState({
        name: "",
        phone: "",
        address: "",
        city: "", // Explicit city field
        customerType: "RETAIL", // RETAIL | PRO
        ice: "", // Identifiant Commun de l'Entreprise
    });
    const [loading, setLoading] = useState(false);
    
    // AI Integration
    const [aiMessage, setAiMessage] = useState("");
    const [isGeneratingAi, setIsGeneratingAi] = useState(false);

    useEffect(() => {
        if (customer) {
            setFormData({
                name: customer.name || "",
                phone: customer.phone || "",
                address: customer.address || "",
                city: customer.city || "",
                customerType: customer.customerType || "RETAIL",
                ice: customer.ice || "",
            });
        } else {
            setFormData({
                name: "",
                phone: "",
                address: "",
                city: "",
                customerType: "RETAIL",
                ice: "",
            });
            setAiMessage("");
        }
    }, [customer, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSave({
                ...formData,
                updatedAt: new Date().toISOString()
            });
            onClose();
        } catch (error) {
            console.error("Error saving customer:", error);
            toast.error(t('err_save_customer'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-900">
                        {customer ? t('modal_title_edit_customer') : t('modal_title_new_customer')}
                    </h2>
                    <div className="flex items-center gap-2">
                        {customer && (
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${getCustomerSegment(customer, customer.orders || []).color}`}>
                                {getCustomerSegment(customer, customer.orders || []).icon} {getCustomerSegment(customer, customer.orders || []).label}
                            </span>
                        )}
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                            <X className="h-6 w-6" />
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <Input
                        label={t('label_full_name')}
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder={t('placeholder_customer_name')}
                    />

                    <Input
                        label={t('label_phone')}
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder={t('placeholder_phone')}
                    />

                    <Input
                        label={t('label_city')}
                        required
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        placeholder={t('placeholder_city')}
                    />

                    <Input
                        label={t('label_address')}
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder={t('placeholder_address')}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('label_customer_type')}</label>
                            <select
                                className="w-full px-3 py-2 border rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                                value={formData.customerType}
                                onChange={(e) => setFormData({ ...formData, customerType: e.target.value })}
                            >
                                <option value="RETAIL">{t('option_retail')}</option>
                                <option value="PRO">{t('option_pro')}</option>
                            </select>
                        </div>
                        <Input
                            label={t('label_ice')}
                            value={formData.ice}
                            onChange={(e) => setFormData({ ...formData, ice: e.target.value })}
                            placeholder={t('placeholder_ice')}
                        />
                    </div>

                    {/* AI Generated Message Box */}
                    {aiMessage && (
                        <div className="p-4 bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg border border-emerald-100 relative shadow-inner">
                            <label className="text-xs font-bold text-emerald-800 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                                <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Message généré par Beya3
                            </label>
                            <textarea
                                value={aiMessage}
                                onChange={e => setAiMessage(e.target.value)}
                                className="w-full text-sm text-gray-800 bg-white/80 backdrop-blur-sm border border-emerald-200 rounded-lg p-3 min-h-[100px] focus:ring-2 focus:ring-emerald-400 outline-none shadow-sm"
                            />
                            <div className="mt-3 flex justify-end">
                                <Button 
                                    type="button"
                                    className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-200 uppercase tracking-widest text-[10px] font-black"
                                    onClick={() => {
                                        const link = createRawWhatsAppLink(customer.phone, aiMessage);
                                        window.open(link, '_blank');
                                    }}
                                >
                                    Ouvrir dans WhatsApp
                                </Button>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                        {customer && (
                            <Button
                                type="button"
                                variant="outline"
                                icon={Wand2}
                                className="text-green-700 border-green-200 hover:bg-green-50 shadow-sm"
                                isLoading={isGeneratingAi}
                                onClick={async () => {
                                    setIsGeneratingAi(true);
                                    try {
                                        const segment = getCustomerSegment(customer, customer.orders || []);
                                        const prompt = `Génère un message WhatsApp amical pour un client nommé ${customer.name}. Il fait partie du segment "${segment.label}". Propose-lui subtilement de revenir voir nos nouveautés ou une offre de fidélité. Sois court (2 phrases max), ajoute des emojis, pas de blabla.`;
                                        const msg = await generateWhatsAppTemplate(prompt, 'fr');
                                        setAiMessage(msg);
                                    } catch (e) {
                                        toast.error("Erreur de génération IA");
                                    } finally {
                                        setIsGeneratingAi(false);
                                    }
                                }}
                            >
                                {t('btn_ai_reengage')}
                            </Button>
                        )}
                        <div className="flex gap-3">
                            <Button type="button" variant="secondary" onClick={onClose}>
                                {t('cancel')}
                            </Button>
                            <Button type="submit" isLoading={loading} icon={Save}>
                                {t('btn_save_customer')}
                            </Button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
