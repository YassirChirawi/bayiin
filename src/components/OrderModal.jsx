import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { X, Save, Search, UserCheck, AlertCircle, Sparkles } from "lucide-react";
import Button from "./Button";
import Input from "./Input";
import { useStoreData } from "../hooks/useStoreData";
import { collection, query, where, getDocs, doc, addDoc } from "firebase/firestore"; // Minimized imports
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
    const { store } = useTenant();
    const { t } = useLanguage(); // NEW
    const { data: warehouses } = useStoreData("warehouses"); // Épique 5

    // Custom Hook for Logic
    const { createOrder, updateOrder, loading: actionLoading, error: actionError } = useOrderActions();

    const [foundCustomer, setFoundCustomer] = useState(null);
    const [showCustomerAlert, setShowCustomerAlert] = useState(false);

    // Payments State (Épique 2)
    const [showPaymentsForm, setShowPaymentsForm] = useState(false);
    const [newPayment, setNewPayment] = useState({ amount: "", method: PAYMENT_METHODS.BANK_TRANSFER, date: new Date().toISOString().split('T')[0] });

    // Refund State
    const [showRefundForm, setShowRefundForm] = useState(false);
    const [refundForm, setRefundForm] = useState({ amount: "", reason: "Retour Partiel" });
    const [isRefunding, setIsRefunding] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        clientName: "",
        clientPhone: "",
        clientAddress: "",
        clientCity: "",
        customerId: null,
        clientCustomerType: "RETAIL",
        clientIce: "",
        products: [], // Multi-article array
        articleId: "", // Legacy / Fallback
        quantity: 1, // Represents total order quantity abstractly, normally 1 if cart
        price: "", // Total Order Price
        costPrice: 0, // Total Order Cost
        shippingCost: 0,
        realDeliveryCost: 0,
        status: ORDER_STATUS.RECEIVED,
        paymentMethod: PAYMENT_METHODS.COD,
        isPaid: false,
        date: new Date().toISOString().split('T')[0],
        note: "",
        followUpDate: "",
        followUpNote: "",
        warehouseId: "" // Épique 5
    });

    const [currentProduct, setCurrentProduct] = useState({
        articleId: "",
        articleName: "",
        variantId: "",
        batchNumber: "",
        size: "",
        color: "",
        quantity: 1,
        price: "",
        costPrice: 0
    });

    const [notifyClient, setNotifyClient] = useState(false);
    const [customWhatsappMessage, setCustomWhatsappMessage] = useState("");

    const [aiSuggestions, setAiSuggestions] = useState(null); // { suggestions: [], aiInsight: '', ... }
    const [loadingAI, setLoadingAI] = useState(false);

    useEffect(() => {
        if (order) {
            let initialProducts = order.products || [];
            if (initialProducts.length === 0 && order.articleId) {
                initialProducts.push({
                    id: order.articleId,
                    name: order.articleName || "Article inconnu",
                    variantId: order.variantId || "",
                    batchNumber: order.batchNumber || "",
                    size: order.size || "",
                    color: order.color || "",
                    quantity: order.quantity || 1,
                    price: order.price || 0,
                    costPrice: order.costPrice || 0
                });
            }

            setFormData({
                clientName: order.clientName || "",
                clientPhone: order.clientPhone || "",
                clientAddress: order.clientAddress || "",
                clientCity: order.clientCity || order.city || "",
                customerId: order.customerId || null,
                clientCustomerType: order.clientCustomerType || "RETAIL",
                clientIce: order.clientIce || "",
                products: initialProducts,
                articleId: order.articleId || "",
                quantity: order.quantity || 1,
                price: order.price || "",
                costPrice: order.costPrice || 0,
                shippingCost: order.shippingCost || 0,
                realDeliveryCost: order.realDeliveryCost || 0,
                status: (order.status === 'pending_catalog') ? ORDER_STATUS.RECEIVED : (order.status || ORDER_STATUS.RECEIVED),
                paymentMethod: order.paymentMethod || PAYMENT_METHODS.COD,
                isPaid: order.isPaid || false,
                amountPaid: order.amountPaid || (order.isPaid ? order.price : 0),
                payments: order.payments || [],
                date: order.date || new Date().toISOString().split('T')[0],
                note: order.note || "",
                followUpDate: order.followUpDate || "",
                followUpNote: order.followUpNote || "",
                warehouseId: order.warehouseId || ""
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
                products: [],
                articleId: "",
                quantity: 1,
                price: "",
                costPrice: 0,
                shippingCost: 0,
                realDeliveryCost: 0,
                status: ORDER_STATUS.RECEIVED,
                paymentMethod: PAYMENT_METHODS.COD,
                isPaid: false,
                amountPaid: 0,
                payments: [],
                date: new Date().toISOString().split('T')[0],
                note: "",
                followUpDate: "",
                followUpNote: "",
                warehouseId: ""
            });
        }
        setCurrentProduct({ articleId: "", articleName: "", variantId: "", batchNumber: "", size: "", color: "", quantity: 1, price: "", costPrice: 0 });
        setFoundCustomer(null);
        setShowCustomerAlert(false);
        setNotifyClient(false);
        setCustomWhatsappMessage("");
    }, [order, isOpen]);

    // Set default warehouse if none selected
    useEffect(() => {
        if (!formData.warehouseId && warehouses && warehouses.length > 0) {
            const defaultWh = warehouses.find(w => w.isDefault) || warehouses[0];
            setFormData(prev => ({ ...prev, warehouseId: defaultWh.id }));
        }
    }, [warehouses, formData.warehouseId]);

    // Recalculate totals whenever products change
    useEffect(() => {
        if (formData.products && formData.products.length > 0) {
            const totalPrice = formData.products.reduce((sum, p) => sum + (parseFloat(p.price) * parseInt(p.quantity)), 0);
            const totalCost = formData.products.reduce((sum, p) => sum + (parseFloat(p.costPrice) * parseInt(p.quantity)), 0);
            
            // Note: we only auto-update if they are adding new products, not if they manually changed the global price.
            // But to keep it simple, we just override.
            setFormData(prev => ({
                ...prev,
                price: totalPrice.toFixed(2),
                costPrice: totalCost,
                quantity: 1, // Treat the whole cart as 1 unit for grand total calculation in legacy systems
                articleId: "" // Clear legacy articleId to prevent confusion
            }));
        }
    }, [formData.products]);

    // Whatsapp msg update logic...
    useEffect(() => {
        if (notifyClient) {
            setCustomWhatsappMessage(getWhatsappMessage(formData.status, formData, store));
        }
    }, [formData.status, formData.clientName, formData.price, formData.products, formData.shippingCost, notifyClient, store]);

    useEffect(() => {
        if (actionError) {
            toast.error(actionError);
        }
    }, [actionError]);

    const handleIssueRefund = async () => {
        if (!refundForm.amount || isNaN(refundForm.amount)) return;
        setIsRefunding(true);
        try {
            await addDoc(collection(db, "refunds"), {
                storeId: store.id,
                orderId: order.id,
                orderRef: order.reference || order.id.substring(0, 6),
                customerId: order.customerId || null,
                clientName: order.clientName || "Client Inconnu",
                amount: parseFloat(refundForm.amount),
                reason: refundForm.reason,
                date: new Date().toISOString()
            });
            toast.success("Avoir généré avec succès ! Montant déduit des Finances.");
            setShowRefundForm(false);
            setRefundForm({ amount: "", reason: "Retour Partiel" });
        } catch (error) {
            console.error("Error issuing refund", error);
            toast.error("Erreur lors de la génération de l'avoir.");
        } finally {
            setIsRefunding(false);
        }
    };

    const handleAddPayment = () => {
        if (!newPayment.amount || isNaN(newPayment.amount) || parseFloat(newPayment.amount) <= 0) return;
        
        const paymentToAdd = {
            id: Date.now().toString(),
            amount: parseFloat(newPayment.amount),
            method: newPayment.method,
            date: newPayment.date
        };

        const updatedPayments = [...(formData.payments || []), paymentToAdd];
        const newTotalPaid = updatedPayments.reduce((sum, p) => sum + p.amount, 0);
        
        setFormData(prev => ({
            ...prev,
            payments: updatedPayments,
            amountPaid: newTotalPaid,
            isPaid: newTotalPaid >= parseFloat(prev.price || 0)
        }));
        
        setNewPayment({ amount: "", method: PAYMENT_METHODS.BANK_TRANSFER, date: new Date().toISOString().split('T')[0] });
    };

    const handleRemovePayment = (paymentId) => {
        const updatedPayments = (formData.payments || []).filter(p => p.id !== paymentId);
        const newTotalPaid = updatedPayments.reduce((sum, p) => sum + p.amount, 0);
        
        setFormData(prev => ({
            ...prev,
            payments: updatedPayments,
            amountPaid: newTotalPaid,
            isPaid: newTotalPaid >= parseFloat(prev.price || 0)
        }));
    };

    const [phoneSuggestions, setPhoneSuggestions] = useState([]);
    const [isSearchingPhone, setIsSearchingPhone] = useState(false);

    // Reset phone suggestions when order changes
    useEffect(() => {
        setPhoneSuggestions([]);
    }, [order, isOpen]);

    // Real-time phone search debounce
    useEffect(() => {
        // Only search if length >= 3 and NO customer is currently selected, AND it's not matching exactly what's typed (meaning user just selected)
        if (!formData.clientPhone || formData.clientPhone.length < 3 || formData.customerId) {
            setPhoneSuggestions([]);
            return;
        }

        const fetchPhones = async () => {
            setIsSearchingPhone(true);
            try {
                const customersRef = collection(db, "customers");
                // Firebase prefix search
                const q = query(
                    customersRef,
                    where("storeId", "==", store.id),
                    where("phone", ">=", formData.clientPhone),
                    where("phone", "<=", formData.clientPhone + "\uf8ff"),
                    limit(5)
                );
                const querySnapshot = await getDocs(q);
                const results = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                
                // If the only result is exactly the phone typed, auto-select or just show if names differ
                setPhoneSuggestions(results);
            } catch (err) {
                console.error("Error searching phones:", err);
            } finally {
                setIsSearchingPhone(false);
            }
        };

        const timeoutId = setTimeout(fetchPhones, 300);
        return () => clearTimeout(timeoutId);
    }, [formData.clientPhone, formData.customerId, store.id]);

    const selectCustomer = (cust) => {
        setFormData(prev => ({
            ...prev,
            clientPhone: cust.phone,
            clientName: cust.name,
            clientAddress: cust.address || prev.clientAddress,
            clientCity: cust.city || prev.clientCity,
            customerId: cust.id,
            clientCustomerType: cust.customerType || "RETAIL",
            clientIce: cust.ice || ""
        }));
        setPhoneSuggestions([]);
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
            setCurrentProduct({ articleId: "", articleName: "", variantId: "", price: "" });
            return;
        }
        const product = products.find(p => p.id === productId);
        if (product) {
            // Apply Pricing logic based on customer type
            const calculatedPrice = calculateProductPrice(product, formData.clientCustomerType);

            setCurrentProduct({
                articleId: product.id,
                articleName: product.name,
                variantId: "", // Reset variant on product change
                batchNumber: "", // Reset batch
                quantity: 1,
                price: calculatedPrice,
                costPrice: product.costPrice || 0,
                size: "", color: ""
            });

            // If not variable, check stock immediately
            if (!product.isVariable) {
                const currentStock = parseInt(product.stock) || 0;
                if (currentStock <= 0) {
                    const returnCount = await checkPotentialReturns(product.id);
                    setStockWarning({ show: true, stock: currentStock, returnCount });
                }
            }

            // --- AI Advisor Integration ---
            if (product.sku) {
                setLoadingAI(true);
                getAISuggestions(product.sku, formData.products || [], products, store?.settings)
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
        const product = products.find(p => p.id === currentProduct.articleId);
        if (!product) return;

        const variant = product.variants?.find(v => v.id === variantId);
        if (variant) {
            // Re-calculate price for variant. We apply the same formula if the model evolves to proPrice per variant
            // For now, if variant has price, use it, maybe discount it if PRO:
            let vPrice = variant.price || currentProduct.price;
            if (formData.clientCustomerType === 'PRO') {
                vPrice = parseFloat(vPrice) * 0.7; // Simple implicit discount if no proPrice
            }

            setCurrentProduct(prev => ({
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
                setStockWarning({ show: true, stock: variantStock, returnCount: 0 });
            }
        }
    };

    const addProductToCart = () => {
        if (!currentProduct.articleId) return;
        setFormData(prev => ({
            ...prev,
            products: [...prev.products, {
                id: currentProduct.articleId,
                name: currentProduct.articleName,
                variantId: currentProduct.variantId,
                batchNumber: currentProduct.batchNumber,
                size: currentProduct.size,
                color: currentProduct.color,
                quantity: parseInt(currentProduct.quantity) || 1,
                price: parseFloat(currentProduct.price) || 0,
                costPrice: parseFloat(currentProduct.costPrice) || 0
            }]
        }));
        setCurrentProduct({ articleId: "", articleName: "", variantId: "", batchNumber: "", size: "", color: "", quantity: 1, price: "", costPrice: 0 });
        setAiSuggestions(null);
    };

    const removeProductFromCart = (index) => {
        setFormData(prev => {
            const newProducts = [...prev.products];
            newProducts.splice(index, 1);
            return { ...prev, products: newProducts };
        });
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



                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        {/* 1. Client Info */}
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">{t('section_client')}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="relative">
                                    <Input 
                                        label={t('label_phone')} 
                                        value={formData.clientPhone} 
                                        onChange={e => {
                                            // Any change to phone resets customerId manually linked
                                            setFormData({ ...formData, clientPhone: e.target.value, customerId: null });
                                        }} 
                                        required 
                                        placeholder="0600000000" 
                                        maxLength={10} 
                                    />
                                    {isSearchingPhone && <div className="absolute right-3 top-[34px] w-4 h-4 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></div>}
                                    {phoneSuggestions.length > 0 && !formData.customerId && (
                                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                                            {phoneSuggestions.map(cust => (
                                                <div 
                                                    key={cust.id} 
                                                    className="px-3 py-2.5 text-sm hover:bg-indigo-50 cursor-pointer border-b border-gray-50 last:border-0 flex items-center justify-between"
                                                    onMouseDown={() => selectCustomer(cust)} // onMouseDown fires before onBlur
                                                >
                                                    <div>
                                                        <span className="font-bold text-indigo-700">{cust.phone}</span>
                                                        <span className="ml-2 font-medium text-gray-800">{cust.name}</span>
                                                    </div>
                                                    {cust.city && <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{cust.city}</span>}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
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

                        {/* 2. Order Details (Multi-Products) */}
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">{t('section_product')} (Panier)</h3>
                            </div>

                            {/* Cart List */}
                            {formData.products.length > 0 && (
                                <div className="mb-4 bg-white border border-gray-200 rounded-lg overflow-hidden">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-50 border-b border-gray-200">
                                            <tr>
                                                <th className="px-3 py-2">Produit</th>
                                                <th className="px-3 py-2">Qté</th>
                                                <th className="px-3 py-2">P.U</th>
                                                <th className="px-3 py-2">Total</th>
                                                <th className="px-3 py-2"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {formData.products.map((p, idx) => (
                                                <tr key={idx} className="border-b last:border-0 hover:bg-gray-50">
                                                    <td className="px-3 py-2 font-medium">{p.name} {p.variantId && <span className="text-xs text-gray-500 block">Var: {p.variantId}</span>}</td>
                                                    <td className="px-3 py-2">{p.quantity}</td>
                                                    <td className="px-3 py-2">{p.price} DH</td>
                                                    <td className="px-3 py-2 font-bold">{(p.price * p.quantity).toFixed(2)} DH</td>
                                                    <td className="px-3 py-2 text-right">
                                                        <button type="button" onClick={() => removeProductFromCart(idx)} className="text-red-500 hover:text-red-700 p-1">
                                                            <X className="h-4 w-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-indigo-50 border-t border-indigo-100">
                                            <tr>
                                                <td colSpan="3" className="px-3 py-2 text-right font-bold text-indigo-900">Total Panier :</td>
                                                <td colSpan="2" className="px-3 py-2 font-bold text-indigo-900">{formData.price} DH</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            )}

                            {/* Add Item Form */}
                            <div className="bg-white p-3 rounded-lg border border-dashed border-gray-300">
                                <p className="text-xs font-semibold text-gray-500 mb-2">Ajouter un article</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                                    <div>
                                        <select className="w-full px-3 py-2 border rounded-lg text-sm" value={currentProduct.articleId} onChange={handleProductChange}>
                                            <option value="">{t('select_product_placeholder')}</option>
                                            {products.map(p => <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>)}
                                        </select>
                                    </div>
                                    {currentProduct.articleId && products.find(p => p.id === currentProduct.articleId)?.isVariable && (
                                        <div>
                                            <select className="w-full px-3 py-2 border rounded-lg text-sm" value={currentProduct.variantId} onChange={handleVariantChange} required>
                                                <option value="">Sélectionner une variante...</option>
                                                {products.find(p => p.id === currentProduct.articleId)?.variants?.map(v => (
                                                    <option key={v.id} value={v.id}>{v.name} (Stock: {v.stock}) - {v.price} DH</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>
                                {currentProduct.articleId && (
                                    <div className="grid grid-cols-3 gap-3">
                                        <Input label="Qté" type="number" min="1" value={currentProduct.quantity} onChange={e => setCurrentProduct({ ...currentProduct, quantity: e.target.value })} />
                                        <Input label="Prix Unit." type="number" value={currentProduct.price} onChange={e => setCurrentProduct({ ...currentProduct, price: e.target.value })} />
                                        <div className="flex items-end pb-1">
                                            <Button type="button" onClick={addProductToCart} className="w-full h-[42px] border-transparent bg-indigo-100 text-indigo-700 hover:bg-indigo-200">
                                                Ajouter au panier
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-200">
                                <Input label={t('label_date')} type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} required />
                                <Input label={`Prix Global (${store?.currency || 'DH'})`} type="number" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} required />
                                <Input label={t('label_shipping')} type="number" value={formData.shippingCost} onChange={e => setFormData({ ...formData, shippingCost: e.target.value })} />
                                <Input label={t('label_real_cost')} type="number" className="bg-red-50" value={formData.realDeliveryCost} onChange={e => setFormData({ ...formData, realDeliveryCost: e.target.value })} />
                            </div>

                            {/* --- AI Recommendations Section --- */}
                            {currentProduct.articleId && (
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
                                                    <div key={s.productId} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-[11px] font-semibold border border-indigo-100 shadow-sm transition-transform hover:scale-105 cursor-pointer"
                                                        onClick={() => {
                                                            const newEvent = { target: { value: s.productId } };
                                                            handleProductChange(newEvent);
                                                        }}
                                                    >
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
                                <div className="flex flex-col justify-end pb-1">
                                    <div className="flex items-center justify-between gap-2">
                                        <label className="flex items-center space-x-2 cursor-pointer">
                                            <input type="checkbox" className="h-5 w-5 text-emerald-600 rounded focus:ring-emerald-500 disabled:opacity-50" 
                                                checked={formData.isPaid || (parseFloat(formData.amountPaid) > 0 && parseFloat(formData.amountPaid) >= parseFloat(formData.price || 0))} 
                                                onChange={e => {
                                                    const checked = e.target.checked;
                                                    setFormData({ 
                                                        ...formData, 
                                                        isPaid: checked, 
                                                        amountPaid: checked ? parseFloat(formData.price || 0) : 0, 
                                                        payments: [] // Reset partial payments if toggled manually
                                                    });
                                                }}
                                                disabled={formData.payments?.length > 0} 
                                            />
                                            <span className={`font-bold ${(formData.isPaid || formData.amountPaid >= formData.price) ? 'text-emerald-700' : 'text-gray-500'}`}>
                                                {(formData.isPaid || formData.amountPaid >= formData.price) ? t('paid_status') : t('unpaid_status')}
                                            </span>
                                        </label>
                                        <Button type="button" variant="secondary" size="sm" onClick={() => setShowPaymentsForm(!showPaymentsForm)} className="text-xs px-2 py-1">
                                            Acomptes
                                        </Button>
                                    </div>
                                    {parseFloat(formData.amountPaid) > 0 && parseFloat(formData.amountPaid) < parseFloat(formData.price || 0) && (
                                        <span className="text-xs text-emerald-600 font-bold mt-1 inline-block bg-emerald-50 px-2 py-0.5 rounded">
                                            Partiel : {parseFloat(formData.amountPaid).toFixed(2)} DH (Reste: {(parseFloat(formData.price || 0) - parseFloat(formData.amountPaid)).toFixed(2)})
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* PARTIAL PAYMENTS FORM (Épique 2) */}
                            {showPaymentsForm && (
                                <div className="mt-4 p-4 bg-emerald-50/50 border border-emerald-100 rounded-lg">
                                    <h4 className="text-sm font-bold text-emerald-800 mb-3 flex items-center justify-between">
                                        Règlements &amp; Acomptes Multiples
                                        <span className="text-xs font-medium text-emerald-600">Reste à payer : {Math.max(0, parseFloat(formData.price || 0) - parseFloat(formData.amountPaid || 0)).toFixed(2)} DH</span>
                                    </h4>
                                    
                                    {formData.payments && formData.payments.length > 0 && (
                                        <div className="space-y-2 mb-4 max-h-32 overflow-y-auto">
                                            {formData.payments.map(p => (
                                                <div key={p.id} className="flex items-center justify-between bg-white px-3 py-2 rounded border border-emerald-100/50 shadow-sm text-sm">
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-bold text-emerald-800">{parseFloat(p.amount).toFixed(2)} DH</span>
                                                        <span className="text-gray-500 text-xs">{PAYMENT_METHOD_LABELS[p.method] || p.method}</span>
                                                        <span className="text-gray-400 text-[10px]">{p.date}</span>
                                                    </div>
                                                    <button type="button" onClick={() => handleRemovePayment(p.id)} className="text-red-400 hover:text-red-600">
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="flex flex-col sm:flex-row gap-2">
                                        <Input type="number" step="0.01" placeholder="Montant" value={newPayment.amount} onChange={e => setNewPayment({...newPayment, amount: e.target.value})} className="w-full sm:w-1/3" />
                                        <select className="px-3 py-2 border rounded-lg bg-white w-full sm:w-1/3" value={newPayment.method} onChange={e => setNewPayment({...newPayment, method: e.target.value})}>
                                            {Object.values(PAYMENT_METHODS).map(m => (
                                                <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>
                                            ))}
                                        </select>
                                        <Input type="date" value={newPayment.date} onChange={e => setNewPayment({...newPayment, date: e.target.value})} className="w-full sm:w-1/3" />
                                        <Button type="button" onClick={handleAddPayment} className="bg-emerald-600 hover:bg-emerald-700 text-white truncate w-full sm:w-auto">
                                            Ajouter
                                        </Button>
                                    </div>
                                </div>
                            )}

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

                            {order?.carrierStatus && (
                                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
                                    <span className="text-lg">🚚</span>
                                    <div className="flex-1 flex justify-between items-center">
                                        <div>
                                            <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-0.5">Statut Transporteur</p>
                                            <p className="text-sm font-bold text-blue-900">{order.carrierStatus}</p>
                                        </div>
                                        {order.lastCarrierUpdate && (
                                            <div className="text-right">
                                                <p className="text-xs text-blue-500">Dernière MaJ (Webhook)</p>
                                                <p className="text-xs font-medium text-blue-700">
                                                    {order.lastCarrierUpdate?.toDate ? order.lastCarrierUpdate.toDate().toLocaleString() : new Date(order.lastCarrierUpdate).toLocaleString()}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* REFUND (AVOIR) SECTION */}
                        {showRefundForm && order && order.isPaid && (
                            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex flex-col gap-3">
                                <h4 className="text-sm font-bold text-red-700 flex items-center gap-2">
                                    <Sparkles className="w-4 h-4" /> Émettre un Avoir (Remboursement)
                                </h4>
                                <div className="flex flex-col md:flex-row gap-3 items-end">
                                    <div className="flex-1 w-full">
                                        <Input type="number" step="0.01" max={order.price} placeholder="Montant (MAD)" value={refundForm.amount} onChange={e => setRefundForm({ ...refundForm, amount: e.target.value })} />
                                    </div>
                                    <div className="flex-1 w-full">
                                        <select className="w-full px-3 py-2 border border-red-300 text-red-900 rounded-lg bg-white" value={refundForm.reason} onChange={e => setRefundForm({ ...refundForm, reason: e.target.value })}>
                                            <option value="Retour Partiel">Retour Partiel / Défaut</option>
                                            <option value="Geste Commercial">Geste Commercial (Remise a posteriori)</option>
                                            <option value="Erreur Facturation">Erreur de Facturation</option>
                                            <option value="Remboursement Total">Remboursement Total</option>
                                        </select>
                                    </div>
                                    <Button type="button" onClick={handleIssueRefund} isLoading={isRefunding} className="bg-red-600 hover:bg-red-700 text-white border-transparent w-full md:w-auto justify-center">
                                        Confirmer l'Avoir
                                    </Button>
                                </div>
                                <p className="text-xs text-red-600 italic mt-1">Attention : Le montant de cet avoir viendra se soustraire définitivement de la marge nette globale (Finances).</p>
                            </div>
                        )}

                        <div className="flex justify-between items-center pt-4 border-t border-gray-100 mt-4">
                            <div className="text-sm text-gray-500 italic">
                                {order?.isPaid && (
                                    <Button type="button" variant="secondary" size="sm" onClick={() => setShowRefundForm(!showRefundForm)} className="text-red-600 border-red-200 hover:bg-red-50 hidden sm:flex">
                                        Générer un Avoir
                                    </Button>
                                )}
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
