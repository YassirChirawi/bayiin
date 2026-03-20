import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { X, Save, Search, UserCheck, AlertCircle, Sparkles } from "lucide-react";
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
import { calculateProductPrice } from "../utils/pricing"; // NEW
import { getAISuggestions } from "../services/productAdvisorService"; // NEW

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
        clientCustomerType: "RETAIL", // NEW
        clientIce: "", // NEW
        articleId: "",
        articleName: "",
        variantId: "", // NEW
        batchNumber: "", // NEW
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

    const [aiSuggestions, setAiSuggestions] = useState(null); // { suggestions: [], aiInsight: '', ... }
    const [loadingAI, setLoadingAI] = useState(false);

    useEffect(() => {
        if (order) {
            setFormData({
                clientName: order.clientName || "",
                clientPhone: order.clientPhone || "",
                clientAddress: order.clientAddress || "",
                clientCity: order.clientCity || order.city || "",
                customerId: order.customerId || null,
                clientCustomerType: order.clientCustomerType || "RETAIL", // NEW
                clientIce: order.clientIce || "", // NEW
                articleId: order.articleId || "",
                articleName: order.articleName || "",
                variantId: order.variantId || "", // NEW
                batchNumber: order.batchNumber || "", // NEW
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
                clientCustomerType: "RETAIL",
                clientIce: "",
                articleId: "",
                articleName: "",
                variantId: "", // NEW
                batchNumber: "", // NEW
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
                customerId: foundCustomer.id,
                clientCustomerType: foundCustomer.customerType || "RETAIL",
                clientIce: foundCustomer.ice || ""
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
            setFormData(prev => ({ ...prev, articleId: "", articleName: "", variantId: "", price: "" }));
            return;
        }
        const product = products.find(p => p.id === productId);
        if (product) {
            // Apply Pricing logic based on customer type
            const calculatedPrice = calculateProductPrice(product, formData.clientCustomerType);

            setFormData(prev => ({
                ...prev,
                articleId: product.id,
                articleName: product.name,
                variantId: "", // Reset variant on product change
                batchNumber: "", // Reset batch
                price: calculatedPrice,
                costPrice: product.costPrice || 0
            }));

            // If not variable, check stock immediately
            if (!product.isVariable) {
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

            // --- AI Advisor Integration ---
            if (product.sku) {
                setLoadingAI(true);
                getAISuggestions(product.sku, [], products, store?.settings)
                    .then(res => setAiSuggestions(res))
                    .catch(err => console.error("AI Advisor error:", err))
                    .finally(() => setLoadingAI(false));
            } else {
                setAiSuggestions(null);
            }
        }
    };

    const handleVariantChange = (e) => {
        const variantId = e.target.value;
        const product = products.find(p => p.id === formData.articleId);
        if (!product) return;

        const variant = product.variants?.find(v => v.id === variantId);
        if (variant) {
            // Re-calculate price for variant. We apply the same formula if the model evolves to proPrice per variant
            // For now, if variant has price, use it, maybe discount it if PRO:
            let vPrice = variant.price || prev.price;
            if (formData.clientCustomerType === 'PRO') {
                vPrice = parseFloat(vPrice) * 0.7; // Simple implicit discount if no proPrice
            }

            setFormData(prev => ({
                ...prev,
                variantId: variant.id,
                price: vPrice,
                // Extract size/color if they exist in attributes
                size: variant.attributes?.Size || variant.attributes?.taille || prev.size,
                color: variant.attributes?.Color || variant.attributes?.couleur || prev.color
            }));

            // Check variant stock
            const variantStock = parseInt(variant.stock) || 0;
            if (variantStock <= 0) {
                setStockWarning({
                    show: true,
                    stock: variantStock,
                    returnCount: 0 // We don't track returns per variant yet for simplicity
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
                                    <h4 className="font-bold text-red-900 text-lg">⚠️ {t('stock_out')} ({stockWarning.stock})</h4>
                                    <p className="text-red-700 mt-1">
                                        {t('availability_not_guaranteed')}
                                    </p>
                                    {stockWarning.returnCount > 0 ? (
                                        <div className="mt-2 bg-white p-3 rounded border border-red-100">
                                            <p className="text-sm font-semibold text-gray-800">
                                                {t('returns_hint', { count: stockWarning.returnCount })}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {t('check_returns_msg')}
                                            </p>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-red-600 mt-1">{t('no_recent_returns')}</p>
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
                                            {t('cancel_selection')}
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={() => setStockWarning(null)}
                                        >
                                            {t('force_order')}
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
                                    <input list="cities" className="w-full px-3 py-2 border rounded-lg" value={formData.clientCity} onChange={e => setFormData({ ...formData, clientCity: e.target.value })} required placeholder={t('select_city_placeholder')} />
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
                                        <option value="">{t('select_product_placeholder')}</option>
                                        {products.map(p => <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>)}
                                    </select>
                                </div>
                                {formData.articleId && products.find(p => p.id === formData.articleId)?.isVariable && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('label_variant') || 'Variante'}</label>
                                        <select className="w-full px-3 py-2 border rounded-lg" value={formData.variantId} onChange={handleVariantChange} required>
                                            <option value="">Sélectionner une variante...</option>
                                            {products.find(p => p.id === formData.articleId)?.variants?.map(v => (
                                                <option key={v.id} value={v.id}>{v.name} (Stock: {v.stock}) - {v.price} DH</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                {formData.articleId && products.find(p => p.id === formData.articleId)?.inventoryBatches?.length > 0 && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('label_batch_number') || 'Numéro de Lot'}</label>
                                        <select
                                            className="w-full px-3 py-2 border rounded-lg"
                                            value={formData.batchNumber}
                                            onChange={e => setFormData({ ...formData, batchNumber: e.target.value })}
                                        >
                                            <option value="">Auto (FEFO - Plus proche exp.)</option>
                                            {products.find(p => p.id === formData.articleId).inventoryBatches.filter(b => b.quantity > 0).map(b => (
                                                <option key={b.batchNumber} value={b.batchNumber}>
                                                    {b.batchNumber} (Exp: {b.expiryDate} - Qté: {b.quantity})
                                                </option>
                                            ))}
                                        </select>
                                        <p className="text-[10px] text-gray-400 mt-1">Sert de référence visuelle. La déduction réelle suit la logique FEFO globale.</p>
                                    </div>
                                )}
                                <Input label={t('label_date')} type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} required />
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <Input label={t('label_qty')} type="number" min="1" value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: e.target.value })} required />
                                <Input label={`${t('label_price')} (${store?.currency || 'DH'})`} type="number" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} required />
                                <Input label={t('label_shipping')} type="number" value={formData.shippingCost} onChange={e => setFormData({ ...formData, shippingCost: e.target.value })} />
                                <Input label={t('label_real_cost')} type="number" className="bg-red-50" value={formData.realDeliveryCost} onChange={e => setFormData({ ...formData, realDeliveryCost: e.target.value })} />
                            </div>

                            {/* --- AI Recommendations Section --- */}
                            {formData.articleId && (
                                <div className="mt-4 pt-4 border-t border-gray-200">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
                                        <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Recommandations AI (ProductAdvisor)</h4>
                                    </div>

                                    {loadingAI ? (
                                        <div className="flex gap-2">
                                            <div className="h-8 w-24 bg-indigo-50 animate-pulse rounded-full" />
                                            <div className="h-8 w-24 bg-indigo-50 animate-pulse rounded-full" />
                                        </div>
                                    ) : aiSuggestions?.suggestions?.length > 0 ? (
                                        <div className="space-y-3">
                                            <div className="flex flex-wrap gap-2">
                                                {aiSuggestions.suggestions.map(s => (
                                                    <div key={s.productId} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-[11px] font-semibold border border-indigo-100 shadow-sm transition-transform hover:scale-105">
                                                        <span className="opacity-70 font-mono">{s.sku}</span>
                                                        <span>{s.name}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            {aiSuggestions.aiInsight && (
                                                <p className="text-[11px] text-gray-500 italic leading-relaxed pl-1 border-l-2 border-indigo-200">
                                                    “ {aiSuggestions.aiInsight} ”
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-[10px] text-gray-400 italic">Analysez les besoins du client pour proposer un soin complémentaire.</p>
                                    )}
                                </div>
                            )}
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
                                            {formData.isPaid ? t('paid_status') : t('unpaid_status')}
                                        </span>
                                    </label>
                                </div>
                            </div>

                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">{t('label_note')}</label>
                                <textarea className="w-full px-3 py-2 border rounded-lg" rows="2" value={formData.note} onChange={e => setFormData({ ...formData, note: e.target.value })} placeholder={t('note_placeholder')}></textarea>
                            </div>

                            {order?.driverNote && (
                                <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2">
                                    <span className="text-lg">💬</span>
                                    <div>
                                        <p className="text-xs font-bold text-rose-700 uppercase tracking-wide mb-0.5">{t('driver_note_label')}</p>
                                        <p className="text-sm text-rose-800">{order.driverNote}</p>
                                    </div>
                                </div>
                            )}
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
