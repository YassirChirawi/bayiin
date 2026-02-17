import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { X, Save, Search, UserCheck, AlertCircle } from "lucide-react";
import Button from "./Button";
import Input from "./Input";
import { useStoreData } from "../hooks/useStoreData";
import { collection, query, where, getDocs, doc } from "firebase/firestore"; // Minimized imports
import { db } from "../lib/firebase";
import { useTenant } from "../context/TenantContext";
import { getWhatsappMessage, createRawWhatsAppLink } from "../utils/whatsappTemplates";
import { MOROCCAN_CITIES } from "../utils/moroccanCities";
import { ORDER_STATUS, ORDER_STATUS_LABELS, PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from "../utils/constants";
import { useOrderActions } from "../hooks/useOrderActions";
import { useLanguage } from "../context/LanguageContext"; // NEW

export default function OrderModal({ isOpen, onClose, onSave, order = null }) {
    const { data: products } = useStoreData("products");
    const { store } = useTenant();
    const { t } = useLanguage(); // NEW

    // Custom Hook for Logic
    const { createOrder, updateOrder, loading: actionLoading, error: actionError } = useOrderActions();

    const [foundCustomer, setFoundCustomer] = useState(null);
    const [showCustomerAlert, setShowCustomerAlert] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        clientName: "",
        clientPhone: "",
        clientAddress: "",
        clientCity: "",
        customerId: null,
        articleId: "",
        articleName: "",
        size: "",
        color: "",
        quantity: 1,
        price: "",
        costPrice: 0,
        shippingCost: 0,
        realDeliveryCost: 0,
        status: ORDER_STATUS.RECEIVED,
        paymentMethod: PAYMENT_METHODS.COD,
        isPaid: false,
        date: new Date().toISOString().split('T')[0],
        note: "",
        followUpDate: "",
        followUpNote: ""
    });

    const [notifyClient, setNotifyClient] = useState(false);
    const [customWhatsappMessage, setCustomWhatsappMessage] = useState("");

    useEffect(() => {
        if (order) {
            setFormData({
                clientName: order.clientName || "",
                clientPhone: order.clientPhone || "",
                clientAddress: order.clientAddress || "",
                clientCity: order.clientCity || order.city || "",
                customerId: order.customerId || null,
                articleId: order.articleId || "",
                articleName: order.articleName || "",
                size: order.size || "",
                color: order.color || "",
                quantity: order.quantity || 1,
                price: order.price || "",
                costPrice: order.costPrice || 0,
                shippingCost: order.shippingCost || 0,
                realDeliveryCost: order.realDeliveryCost || 0,
                status: (order.status === 'pending_catalog') ? ORDER_STATUS.RECEIVED : (order.status || ORDER_STATUS.RECEIVED),
                paymentMethod: order.paymentMethod || PAYMENT_METHODS.COD,
                isPaid: order.isPaid || false,
                date: order.date || new Date().toISOString().split('T')[0],
                note: order.note || "",
                followUpDate: order.followUpDate || "",
                followUpNote: order.followUpNote || ""
            });
        } else {
            // Reset for New Order
            setFormData({
                clientName: "",
                clientPhone: "",
                clientAddress: "",
                clientCity: "",
                customerId: null,
                articleId: "",
                articleName: "",
                size: "",
                color: "",
                quantity: 1,
                price: "",
                costPrice: 0,
                shippingCost: 0,
                realDeliveryCost: 0,
                status: ORDER_STATUS.RECEIVED,
                paymentMethod: PAYMENT_METHODS.COD,
                isPaid: false,
                date: new Date().toISOString().split('T')[0],
                note: "",
                followUpDate: "",
                followUpNote: ""
            });
        }
        setFoundCustomer(null);
        setShowCustomerAlert(false);
        setNotifyClient(false);
        setCustomWhatsappMessage("");
    }, [order, isOpen]);

    // Whatsapp msg update logic...
    useEffect(() => {
        if (notifyClient) {
            setCustomWhatsappMessage(getWhatsappMessage(formData.status, formData, store));
        }
    }, [formData.status, formData.clientName, formData.price, formData.quantity, formData.shippingCost, notifyClient, store]);

    useEffect(() => {
        if (actionError) {
            toast.error(actionError);
        }
    }, [actionError]);

    const handlePhoneBlur = async () => {
        if (!formData.clientPhone || formData.customerId) return;
        try {
            const customersRef = collection(db, "customers");
            const q = query(customersRef, where("storeId", "==", store.id), where("phone", "==", formData.clientPhone));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                const customerDoc = querySnapshot.docs[0];
                setFoundCustomer({ id: customerDoc.id, ...customerDoc.data() });
                setShowCustomerAlert(true);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const confirmCustomerLink = () => {
        if (foundCustomer) {
            setFormData(prev => ({
                ...prev,
                clientName: foundCustomer.name,
                clientAddress: foundCustomer.address || prev.clientAddress,
                clientCity: foundCustomer.city || prev.clientCity,
                customerId: foundCustomer.id
            }));
            setShowCustomerAlert(false);
        }
    };

    const [stockWarning, setStockWarning] = useState(null); // { show: true, returnCount: 0 }

    const checkPotentialReturns = async (productId) => {
        try {
            const ordersRef = collection(db, "orders");
            const q = query(
                ordersRef,
                where("storeId", "==", store.id),
                where("articleId", "==", productId),
                where("status", "in", ["retour", "annulé", "reporté"])
            );
            const snapshot = await getDocs(q);
            // Check if date is recent? for now just count all "pending" returns logic if needed.
            // Actually, "retour" means it IS returned. "annulé" too.
            // We want to know if there are items that *could* be put back in stock.
            // But wait, if they are "returned", we usually increment stock automatically when marking them as returned.
            // So if stock is 0, it means even with returns, we are out.
            // UNLESS the user forgot to mark them as returned.
            // User request: "s'il y'a ce produit en retour ça veut dire il reviendra au stock pendant queleques jours"
            // So we count "retour" status orders.
            return snapshot.size;
        } catch (err) {
            console.error("Error checking returns:", err);
            return 0;
        }
    };

    const handleProductChange = async (e) => {
        const productId = e.target.value;
        setStockWarning(null); // Reset

        if (!productId) {
            setFormData(prev => ({ ...prev, articleId: "", articleName: "", price: "" }));
            return;
        }
        const product = products.find(p => p.id === productId);
        if (product) {
            setFormData(prev => ({
                ...prev,
                articleId: product.id,
                articleName: product.name,
                price: product.price,
                costPrice: product.costPrice || 0
            }));

            // Stock Check
            const currentStock = parseInt(product.stock) || 0;
            if (currentStock <= 0) {
                const returnCount = await checkPotentialReturns(product.id);
                setStockWarning({
                    show: true,
                    stock: currentStock,
                    returnCount
                });
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.clientPhone && !/^\d{10}$/.test(formData.clientPhone)) {
            toast.error(t('err_phone_digits'));
            return;
        }

        const payload = {
            ...formData,
            storeId: store.id,
            quantity: parseInt(formData.quantity) || 1,
            price: parseFloat(formData.price) || 0,
            costPrice: parseFloat(formData.costPrice) || 0,
            shippingCost: parseFloat(formData.shippingCost) || 0,
            realDeliveryCost: parseFloat(formData.realDeliveryCost) || 0,
        };

        let success = false;
        if (order) {
            success = await updateOrder(order.id, order, payload);
            if (success) toast.success(t('msg_order_updated'));
        } else {
            success = await createOrder(payload);
            if (success) toast.success(t('msg_order_created'));
        }


        if (success) {
            if (notifyClient) {
                // Generate fresh message to be sure (using latest formData)
                const message = getWhatsappMessage(formData.status, formData, store);
                const link = createRawWhatsAppLink(formData.clientPhone, message);
                window.open(link, '_blank');
            }

            onSave();
            onClose();
        } else {
            toast.error(t('err_operation_failed'));
        }
    };


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto sm:p-6">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl overflow-hidden my-8 md:my-0 relative">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 sticky top-0 z-10">
                    <h2 className="text-xl font-bold text-gray-900">
                        {order ? `${t('modal_edit_order')} #${order.orderNumber || ''}` : t('modal_new_order')}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="relative">
                    {stockWarning && stockWarning.show && (
                        <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg shadow-sm">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="h-6 w-6 text-red-600 mt-1" />
                                <div>
                                    <h4 className="font-bold text-red-900 text-lg">⚠️ Stock Épuisé ({stockWarning.stock})</h4>
                                    <p className="text-red-700 mt-1">
                                        Impossible de garantir la disponibilité.
                                    </p>
                                    {stockWarning.returnCount > 0 ? (
                                        <div className="mt-2 bg-white p-3 rounded border border-red-100">
                                            <p className="text-sm font-semibold text-gray-800">
                                                💡 Indice : Il y a <span className="text-indigo-600 font-bold">{stockWarning.returnCount} commandes</span> en "Retour" ou "Annulé".
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                Est-ce qu'un retour est arrivé ? Veuillez vérifier et mettre à jour le stock avant de continuer.
                                            </p>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-red-600 mt-1">Aucun retour récent trouvé.</p>
                                    )}
                                    <div className="mt-4 flex gap-3">
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            className="bg-red-100 text-red-800 hover:bg-red-200 border-transparent"
                                            onClick={() => {
                                                setFormData(prev => ({ ...prev, articleId: "", articleName: "", price: "" }));
                                                setStockWarning(null);
                                            }}
                                        >
                                            Annuler sélection
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={() => setStockWarning(null)}
                                        >
                                            Forcer la commande (Stock -1)
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {showCustomerAlert && foundCustomer && (
                        <div className="mx-6 mt-4 p-4 bg-indigo-50 border border-indigo-200 rounded-lg shadow-sm flex justify-between items-center">
                            <div>
                                <h4 className="font-semibold text-indigo-900">{t('msg_client_found', { name: foundCustomer.name })}</h4>
                            </div>
                            <div className="flex gap-2">
                                <Button size="sm" onClick={confirmCustomerLink}>{t('btn_link_client')}</Button>
                                <Button size="sm" variant="secondary" onClick={() => setShowCustomerAlert(false)}>{t('btn_ignore')}</Button>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        {/* 1. Client Info */}
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">{t('section_client')}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Input label={t('label_phone')} value={formData.clientPhone} onChange={e => setFormData({ ...formData, clientPhone: e.target.value })} onBlur={handlePhoneBlur} required placeholder="0600000000" maxLength={10} />
                                <Input label={t('label_name')} value={formData.clientName} onChange={e => setFormData({ ...formData, clientName: e.target.value })} required />
                                <div className="space-y-1">
                                    <label className="block text-sm font-medium text-gray-700">{t('label_city')}</label>
                                    <input list="cities" className="w-full px-3 py-2 border rounded-lg" value={formData.clientCity} onChange={e => setFormData({ ...formData, clientCity: e.target.value })} required placeholder="Select City..." />
                                    <datalist id="cities">{MOROCCAN_CITIES.map(c => <option key={c} value={c} />)}</datalist>
                                </div>
                                <div className="md:col-span-3">
                                    <Input label={t('label_address')} value={formData.clientAddress} onChange={e => setFormData({ ...formData, clientAddress: e.target.value })} required />
                                </div>
                            </div>
                        </div>

                        {/* 2. Order Details */}
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">{t('section_product')}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('label_product')}</label>
                                    <select className="w-full px-3 py-2 border rounded-lg" value={formData.articleId} onChange={handleProductChange}>
                                        <option value="">-- Select --</option>
                                        {products.map(p => <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>)}
                                    </select>
                                </div>
                                <Input label={t('label_date')} type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} required />
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <Input label={t('label_qty')} type="number" min="1" value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: e.target.value })} required />
                                <Input label={`${t('label_price')} (${store?.currency || 'DH'})`} type="number" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} required />
                                <Input label={t('label_shipping')} type="number" value={formData.shippingCost} onChange={e => setFormData({ ...formData, shippingCost: e.target.value })} />
                                <Input label={t('label_real_cost')} type="number" className="bg-red-50" value={formData.realDeliveryCost} onChange={e => setFormData({ ...formData, realDeliveryCost: e.target.value })} />
                            </div>
                        </div>

                        {/* 3. Status & Payment (COD) */}
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">{t('section_status')}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('label_status')}</label>
                                    <select className="w-full px-3 py-2 border rounded-lg font-medium" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                                        {Object.values(ORDER_STATUS).map(s => (
                                            <option key={s} value={s}>{ORDER_STATUS_LABELS[s]?.label || s}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('label_payment')}</label>
                                    <select className="w-full px-3 py-2 border rounded-lg" value={formData.paymentMethod} onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })}>
                                        {Object.values(PAYMENT_METHODS).map(m => (
                                            <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex items-end pb-2">
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input type="checkbox" className="h-5 w-5 text-emerald-600 rounded focus:ring-emerald-500" checked={formData.isPaid} onChange={e => setFormData({ ...formData, isPaid: e.target.checked })} />
                                        <span className={`font-bold ${formData.isPaid ? 'text-emerald-700' : 'text-gray-500'}`}>
                                            {formData.isPaid ? 'PAID (Encaissé)' : 'Unpaid (Non Payé)'}
                                        </span>
                                    </label>
                                </div>
                            </div>

                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">{t('label_note')}</label>
                                <textarea className="w-full px-3 py-2 border rounded-lg" rows="2" value={formData.note} onChange={e => setFormData({ ...formData, note: e.target.value })} placeholder="Digicode, instructions..."></textarea>
                            </div>
                        </div>

                        <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                            <div className="text-sm text-gray-500 italic">
                                {/* Status or info text could go here */}
                            </div>
                            <div className="flex gap-3">
                                <Button type="button" variant="secondary" onClick={onClose} disabled={actionLoading}>{t('btn_cancel')}</Button>
                                <Button type="submit" isLoading={actionLoading} icon={Save}>
                                    {order ? t('btn_update') : t('btn_create')}
                                </Button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
