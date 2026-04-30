import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { X, Save, Search, UserCheck, AlertCircle, Sparkles, Users, Phone, MapPin, Package, Calendar, CreditCard, ChevronRight, Trash2, Edit2, CheckCircle, Truck, RefreshCw, Smartphone, Map, UserPlus, Zap, Plus } from "lucide-react";
import Button from "./Button";
import Input from "./Input";
import { useStoreData } from "../hooks/useStoreData";
import { collection, query, where, getDocs, doc, addDoc, limit, increment, serverTimestamp } from "firebase/firestore"; 
import { db } from "../lib/firebase";
import { useTenant } from "../context/TenantContext";
import { getWhatsappMessage, createRawWhatsAppLink } from "../utils/whatsappTemplates";
import { MOROCCAN_CITIES } from "../utils/moroccanCities";
import { ORDER_STATUS, ORDER_STATUS_LABELS, PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from "../utils/constants";
import { useOrderActions } from "../hooks/useOrderActions";
import { useLanguage } from "../context/LanguageContext"; 
import { calculateProductPrice } from "../utils/pricing"; 
import { getAISuggestions } from "../services/productAdvisorService"; 

export default function OrderModal({ isOpen, onClose, onSave, order = null }) {
    const { store } = useTenant();
    const { t } = useLanguage(); 
    const { data: warehouses } = useStoreData("warehouses"); 
    const { data: products } = useStoreData("products");     

    const { createOrder, updateOrder, loading: actionLoading, error: actionError } = useOrderActions();

    const [foundCustomer, setFoundCustomer] = useState(null);
    const [showCustomerAlert, setShowCustomerAlert] = useState(false);

    const [showPaymentsForm, setShowPaymentsForm] = useState(false);
    const [newPayment, setNewPayment] = useState({ amount: "", method: PAYMENT_METHODS.BANK_TRANSFER, date: new Date().toISOString().split('T')[0] });

    const [showRefundForm, setShowRefundForm] = useState(false);
    const [refundForm, setRefundForm] = useState({ amount: "", reason: t('label_retour_partiel') || "Retour Partiel" });
    const [isRefunding, setIsRefunding] = useState(false);

    const [formData, setFormData] = useState({
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
        date: new Date().toISOString().split('T')[0],
        note: "",
        followUpDate: "",
        followUpNote: "",
        warehouseId: "" 
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

    const [aiSuggestions, setAiSuggestions] = useState(null); 
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

    useEffect(() => {
        if (!formData.warehouseId && warehouses && warehouses.length > 0) {
            const defaultWh = warehouses.find(w => w.isDefault) || warehouses[0];
            setFormData(prev => ({ ...prev, warehouseId: defaultWh.id }));
        }
    }, [warehouses, formData.warehouseId]);

    useEffect(() => {
        if (formData.products && formData.products.length > 0) {
            const totalPrice = formData.products.reduce((sum, p) => sum + (parseFloat(p.price) * parseInt(p.quantity)), 0);
            const totalCost = formData.products.reduce((sum, p) => sum + (parseFloat(p.costPrice) * parseInt(p.quantity)), 0);
            
            setFormData(prev => ({
                ...prev,
                price: totalPrice.toFixed(2),
                costPrice: totalCost,
                quantity: 1, 
                articleId: "" 
            }));
        }
    }, [formData.products]);

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
            toast.success(t('msg_refund_success'));
            setShowRefundForm(false);
            setRefundForm({ amount: "", reason: t('label_retour_partiel') || "Retour Partiel" });
        } catch (error) {
            console.error("Error issuing refund", error);
            toast.error(t('err_refund_failed'));
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

    useEffect(() => {
        setPhoneSuggestions([]);
    }, [order, isOpen]);

    useEffect(() => {
        if (!formData.clientPhone || formData.clientPhone.length < 3 || formData.customerId) {
            setPhoneSuggestions([]);
            return;
        }

        const fetchPhones = async () => {
            setIsSearchingPhone(true);
            try {
                const customersRef = collection(db, "customers");
                const searchTerm = formData.clientPhone.replace(/\D/g, ''); 
                
                const q = query(
                    customersRef,
                    where("storeId", "==", store.id),
                    where("phone", ">=", searchTerm),
                    where("phone", "<=", searchTerm + "\uf8ff"),
                    limit(5)
                );
                const querySnapshot = await getDocs(q);
                const results = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                
                const cleanTyped = formData.clientPhone.replace(/\D/g, '');
                const exactMatch = results.find(cust => {
                    const cleanCustPhone = (cust.phone || '').replace(/\D/g, '');
                    return cleanCustPhone === cleanTyped;
                });
                
                if (cleanTyped.length >= 10 && exactMatch) {
                    selectCustomer(exactMatch);
                    toast.success(t('msg_customer_found') || "Client reconnu !");
                }

                setPhoneSuggestions(results);
            } catch (err) {
                console.error("Error searching phones:", err);
            } finally {
                setIsSearchingPhone(false);
            }
        };

        const timeoutId = setTimeout(fetchPhones, 300);
        return () => clearTimeout(timeoutId);
    }, [formData.clientPhone, formData.customerId, store.id, t]);

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

    const [stockWarning, setStockWarning] = useState(null); 

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
            return snapshot.size;
        } catch (err) {
            console.error("Error checking returns:", err);
            return 0;
        }
    };

    const handleProductChange = async (e) => {
        const productId = e.target.value;
        setStockWarning(null); 

        if (!productId) {
            setCurrentProduct({ articleId: "", articleName: "", variantId: "", price: "" });
            return;
        }
        const product = products.find(p => p.id === productId);
        if (product) {
            const calculatedPrice = calculateProductPrice(product, formData.clientCustomerType);

            setCurrentProduct({
                articleId: product.id,
                articleName: product.name,
                variantId: "", 
                batchNumber: "", 
                quantity: 1,
                price: calculatedPrice,
                costPrice: product.costPrice || 0,
                size: "", color: ""
            });

            if (!product.isVariable) {
                const currentStock = parseInt(product.stock) || 0;
                if (currentStock <= 0) {
                    const returnCount = await checkPotentialReturns(product.id);
                    setStockWarning({ show: true, stock: currentStock, returnCount });
                }
            }

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
            let vPrice = variant.price || currentProduct.price;
            if (formData.clientCustomerType === 'PRO') {
                vPrice = parseFloat(vPrice) * 0.7; 
            }

            setCurrentProduct(prev => ({
                ...prev,
                variantId: variant.id,
                price: vPrice,
                size: variant.attributes?.Size || variant.attributes?.taille || prev.size,
                color: variant.attributes?.Color || variant.attributes?.couleur || prev.color
            }));

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
            articleId: formData.articleId || (formData.products?.[0]?.id || ""),
            articleName: formData.articleName || (formData.products?.[0]?.name || ""),
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
                const message = getWhatsappMessage(formData.status, formData, store);
                const link = createRawWhatsAppLink(formData.clientPhone, message);
                window.open(link, '_blank', 'noopener,noreferrer');
            }
            onSave();
            onClose();
        } else {
            toast.error(t('err_operation_failed'));
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[10000] overflow-y-auto bg-black/50 backdrop-blur-sm p-4 flex items-center justify-center">
            <div 
                data-testid="order-modal"
                className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden relative z-10 flex flex-col"
            >
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 sticky top-0 z-20">
                    <h2 className="text-xl font-bold text-gray-900">
                        {order ? `${t('modal_edit_order')} #${order.orderNumber || order.id?.substring(0, 8)}` : t('modal_new_order')}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-0 relative">
                    <div className="p-6 pt-2">
                        {stockWarning && stockWarning.show && (
                            <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg shadow-sm">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="h-6 w-6 text-red-600 mt-1" />
                                    <div>
                                        <h4 className="font-bold text-red-900 text-lg">⚠️ {t('stock_out')} ({stockWarning.stock})</h4>
                                        <p className="text-red-700 mt-1">{t('availability_not_guaranteed')}</p>
                                        <div className="mt-4 flex gap-3">
                                            <Button size="sm" variant="secondary" className="bg-red-100 text-red-800 hover:bg-red-200 border-transparent" onClick={() => { setFormData(prev => ({ ...prev, articleId: "", articleName: "", price: "" })); setStockWarning(null); }}>
                                                {t('cancel_selection')}
                                            </Button>
                                            <Button size="sm" variant="secondary" onClick={() => setStockWarning(null)}>
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
                                        <div className="flex items-center justify-between mb-1">
                                            <label htmlFor="order-client-phone" className="block text-sm font-medium text-gray-700">{t('label_phone')}</label>
                                            {formData.customerId && (
                                                <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                    <Users className="w-3 h-3" />
                                                    {t('badge_customer_found') || "CLIENT RECONNU"}
                                                </span>
                                            )}
                                        </div>
                                        <Input id="order-client-phone" value={formData.clientPhone} onChange={e => { setFormData({ ...formData, clientPhone: e.target.value, customerId: null }); }} required placeholder="0600000000" maxLength={10} />
                                        {isSearchingPhone && <div className="absolute right-3 top-[38px] w-4 h-4 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></div>}
                                        {phoneSuggestions.length > 0 && !formData.customerId && (
                                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                                                {phoneSuggestions.map(cust => (
                                                    <div key={cust.id} className="px-3 py-2.5 text-sm hover:bg-indigo-50 cursor-pointer border-b border-gray-50 last:border-0 flex items-center justify-between" onMouseDown={() => selectCustomer(cust)}>
                                                        <div><span className="font-bold text-indigo-700">{cust.phone}</span><span className="ml-2 font-medium text-gray-800">{cust.name}</span></div>
                                                        {cust.city && <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{cust.city}</span>}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <Input id="order-client-name" label={t('label_name')} value={formData.clientName} onChange={e => setFormData({ ...formData, clientName: e.target.value })} required placeholder={t('placeholder_customer_name') || "Nom Complet"} />
                                    <div className="space-y-1">
                                        <label htmlFor="order-client-city" className="block text-sm font-medium text-gray-700">{t('label_city')}</label>
                                        <input id="order-client-city" list="cities" className="w-full px-3 py-2 border rounded-lg" value={formData.clientCity} onChange={e => setFormData({ ...formData, clientCity: e.target.value })} required placeholder={t('select_city_placeholder')} />
                                        <datalist id="cities">{MOROCCAN_CITIES.map(c => <option key={c} value={c} />)}</datalist>
                                    </div>
                                    <div className="md:col-span-3">
                                        <Input id="order-client-address" label={`${t('label_address')} *`} value={formData.clientAddress} onChange={e => setFormData({ ...formData, clientAddress: e.target.value })} required placeholder={t('placeholder_address') || "Adresse..."} />
                                    </div>
                                </div>
                            </div>

                            {/* 2. Order Details (Multi-Products) */}
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">{t('section_product')}</h3>
                                {formData.products.length > 0 && (
                                    <div className="mb-4 bg-white border border-gray-200 rounded-lg overflow-hidden">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-gray-50 border-b border-gray-200">
                                                <tr>
                                                    <th className="px-3 py-2">{t('nav_products')}</th>
                                                    <th className="px-3 py-2">{t('label_qty')}</th>
                                                    <th className="px-3 py-2">{t('label_pu')}</th>
                                                    <th className="px-3 py-2">{t('label_total')}</th>
                                                    <th className="px-3 py-2"></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {formData.products.map((p, idx) => (
                                                    <tr key={idx} className="border-b last:border-0 hover:bg-gray-50">
                                                        <td className="px-3 py-2 font-medium">{p.name}</td>
                                                        <td className="px-3 py-2">{p.quantity}</td>
                                                        <td className="px-3 py-2">{p.price} DH</td>
                                                        <td className="px-3 py-2 font-bold">{(p.price * p.quantity).toFixed(2)} DH</td>
                                                        <td className="px-3 py-2 text-right">
                                                            <button type="button" onClick={() => removeProductFromCart(idx)} className="text-red-500 hover:text-red-700 p-1"><X className="h-4 w-4" /></button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                <div className="bg-white p-3 rounded-lg border border-dashed border-gray-300">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                                        <select className="w-full px-3 py-2 border rounded-lg text-sm" value={currentProduct.articleId} onChange={handleProductChange}>
                                            <option value="">{t('select_product_placeholder')}</option>
                                            {products.map(p => <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>)}
                                        </select>
                                        {currentProduct.articleId && products.find(p => p.id === currentProduct.articleId)?.isVariable && (
                                            <select className="w-full px-3 py-2 border rounded-lg text-sm" value={currentProduct.variantId} onChange={handleVariantChange} required>
                                                <option value="">{t('placeholder_select_variant')}</option>
                                                {products.find(p => p.id === currentProduct.articleId)?.variants?.map(v => (
                                                    <option key={v.id} value={v.id}>{v.name} (Stock: {v.stock}) - {v.price} DH</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                    {currentProduct.articleId && (
                                        <div className="grid grid-cols-3 gap-3">
                                            <Input label={t('label_qty')} type="number" min="1" value={currentProduct.quantity} onChange={e => setCurrentProduct({ ...currentProduct, quantity: e.target.value })} />
                                            <Input label={t('label_pu')} type="number" value={currentProduct.price} onChange={e => setCurrentProduct({ ...currentProduct, price: e.target.value })} />
                                            <div className="flex items-end pb-1"><Button type="button" onClick={addProductToCart} className="w-full h-[42px]">{t('btn_add_to_cart') || 'Ajouter'}</Button></div>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-200">
                                    <Input label={t('label_date')} type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} required />
                                    <Input id="order-price-input" label={t('label_global_price')} type="number" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} required />
                                    <Input label={t('label_shipping')} type="number" value={formData.shippingCost} onChange={e => setFormData({ ...formData, shippingCost: e.target.value })} />
                                    <Input label={t('label_real_cost')} type="number" className="bg-red-50" value={formData.realDeliveryCost} onChange={e => setFormData({ ...formData, realDeliveryCost: e.target.value })} />
                                </div>
                            </div>

                            {/* 3. Status & Payment */}
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">{t('section_status')}</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-1">
                                        <label htmlFor="order-status-select" className="block text-sm font-medium text-gray-700">{t('label_status')}</label>
                                        <select id="order-status-select" className="w-full px-3 py-2 border rounded-lg font-medium" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                                            {Object.values(ORDER_STATUS).map(s => <option key={s} value={s}>{ORDER_STATUS_LABELS[s]?.label || s}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="block text-sm font-medium text-gray-700">{t('label_payment')}</label>
                                        <select className="w-full px-3 py-2 border rounded-lg" value={formData.paymentMethod} onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })}>
                                            {Object.values(PAYMENT_METHODS).map(m => <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-2 pt-6">
                                        <input type="checkbox" className="h-5 w-5 text-emerald-600 rounded" checked={formData.isPaid} onChange={e => setFormData({ ...formData, isPaid: e.target.checked })} />
                                        <span className="font-bold text-sm">{formData.isPaid ? t('paid_status') : t('unpaid_status')}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                <Button type="button" variant="secondary" onClick={onClose} disabled={actionLoading}>{t('btn_cancel')}</Button>
                                <Button id="order-submit-button" type="submit" isLoading={actionLoading} icon={Save}>
                                    {order ? t('btn_update') : t('btn_create')}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
