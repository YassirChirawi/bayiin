import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { X, Save } from "lucide-react";
import Button from "./Button";
import Input from "./Input";
import { useLanguage } from "../context/LanguageContext"; // NEW
import { getCustomerSegment } from "../utils/aiSegmentation";
import { getWhatsAppLink } from "../utils/whatsappTemplates";
import { MessageCircle } from "lucide-react";

export default function CustomerModal({ isOpen, onClose, onSave, customer = null }) {
    const { t } = useLanguage(); // NEW
    const [formData, setFormData] = useState({
        name: "",
        phone: "",
        address: "",
        city: "", // Explicit city field
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (customer) {
            setFormData({
                name: customer.name || "",
                phone: customer.phone || "",
                address: customer.address || "",
                city: customer.city || "",
            });
        } else {
            setFormData({
                name: "",
                phone: "",
                address: "",
                city: "",
            });
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

                    <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                        {customer && (
                            <Button
                                type="button"
                                variant="outline"
                                icon={MessageCircle}
                                className="text-green-600 border-green-200 hover:bg-green-50"
                                onClick={() => {
                                    const segment = getCustomerSegment(customer, customer.orders || []);
                                    // Use the template-based link generator
                                    const link = getWhatsAppLink(customer.phone, customer.name, segment.messageKey, 'fr');
                                    window.open(link, '_blank');
                                }}
                            >
                                {t('btn_ai_reengage') || "Relancer (IA)"}
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
