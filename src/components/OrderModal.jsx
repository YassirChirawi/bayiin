import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { X, Save, Search, UserCheck, AlertCircle } from "lucide-react";
import Button from "./Button";
import Input from "./Input";
import { useStoreData } from "../hooks/useStoreData";
import { collection, query, where, getDocs, doc } from "firebase/firestore"; // Minimized imports
import { db } from "../lib/firebase";
import { useTenant } from "../context/TenantContext";
import { getWhatsappMessage, getWhatsappLink } from "../utils/whatsappTemplates";
import { MOROCCAN_CITIES } from "../utils/moroccanCities";
import { ORDER_STATUS, ORDER_STATUS_LABELS, PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from "../utils/constants";
import { useOrderActions } from "../hooks/useOrderActions";

export default function OrderModal({ isOpen, onClose, onSave, order = null }) {
    const { data: products } = useStoreData("products");
    const { store } = useTenant();

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
                status: order.status || ORDER_STATUS.RECEIVED,
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

    const handleProductChange = (e) => {
        const productId = e.target.value;
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
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.clientPhone && !/^\d{10}$/.test(formData.clientPhone)) {
            toast.error("Phone number must be exactly 10 digits.");
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
            if (success) toast.success("Order updated successfully (Stock Adjusted)");
        } else {
            success = await createOrder(payload);
            if (success) toast.success("Order created successfully (Stock Reserved)");
        }

        if (success) {
            if (notifyClient) {
                // Generate fresh message to be sure (using latest formData)
                const message = getWhatsappMessage(formData.status, formData, store);
                const link = getWhatsappLink(formData.clientPhone, message);
                window.open(link, '_blank');
            }

            onSave();
            onClose();
        } else {
            toast.error("Operation failed. Check stock or logs.");
        }
    };


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto sm:p-6">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl overflow-hidden my-8 md:my-0 relative">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 sticky top-0 z-10">
                    <h2 className="text-xl font-bold text-gray-900">
                        {order ? `Edit Order #${order.orderNumber || ''}` : "New Order"}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="relative">
                    {showCustomerAlert && foundCustomer && (
                        <div className="mx-6 mt-4 p-4 bg-indigo-50 border border-indigo-200 rounded-lg shadow-sm flex justify-between items-center">
                            <div>
                                <h4 className="font-semibold text-indigo-900">Existing Client Found: {foundCustomer.name}</h4>
                            </div>
                            <div className="flex gap-2">
                                <Button size="sm" onClick={confirmCustomerLink}>Link Client</Button>
                                <Button size="sm" variant="secondary" onClick={() => setShowCustomerAlert(false)}>Ignore</Button>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        {/* 1. Client Info */}
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">Client</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Input label="Phone (06...)" value={formData.clientPhone} onChange={e => setFormData({ ...formData, clientPhone: e.target.value })} onBlur={handlePhoneBlur} required placeholder="0600000000" maxLength={10} />
                                <Input label="Name" value={formData.clientName} onChange={e => setFormData({ ...formData, clientName: e.target.value })} required />
                                <div className="space-y-1">
                                    <label className="block text-sm font-medium text-gray-700">City</label>
                                    <input list="cities" className="w-full px-3 py-2 border rounded-lg" value={formData.clientCity} onChange={e => setFormData({ ...formData, clientCity: e.target.value })} required placeholder="Select City..." />
                                    <datalist id="cities">{MOROCCAN_CITIES.map(c => <option key={c} value={c} />)}</datalist>
                                </div>
                                <div className="md:col-span-3">
                                    <Input label="Address" value={formData.clientAddress} onChange={e => setFormData({ ...formData, clientAddress: e.target.value })} required />
                                </div>
                            </div>
                        </div>

                        {/* 2. Order Details */}
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">Product & Price</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                                    <select className="w-full px-3 py-2 border rounded-lg" value={formData.articleId} onChange={handleProductChange}>
                                        <option value="">-- Select --</option>
                                        {products.map(p => <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>)}
                                    </select>
                                </div>
                                <Input label="Date" type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} required />
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <Input label="Qty" type="number" min="1" value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: e.target.value })} required />
                                <Input label="Price (DH)" type="number" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} required />
                                <Input label="Shipping (Client)" type="number" value={formData.shippingCost} onChange={e => setFormData({ ...formData, shippingCost: e.target.value })} />
                                <Input label="Real Cost (Livreur)" type="number" className="bg-red-50" value={formData.realDeliveryCost} onChange={e => setFormData({ ...formData, realDeliveryCost: e.target.value })} />
                            </div>
                        </div>

                        {/* 3. Status & Payment (COD) */}
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">Status & Payment</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Order Status</label>
                                    <select className="w-full px-3 py-2 border rounded-lg font-medium" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                                        {Object.values(ORDER_STATUS).map(s => (
                                            <option key={s} value={s}>{ORDER_STATUS_LABELS[s]?.label || s}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
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
                                <label className="block text-sm font-medium text-gray-700 mb-1">Note / Instructions</label>
                                <textarea className="w-full px-3 py-2 border rounded-lg" rows="2" value={formData.note} onChange={e => setFormData({ ...formData, note: e.target.value })} placeholder="Digicode, instructions..."></textarea>
                            </div>
                        </div>

                        <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                            <div className="text-sm text-gray-500 italic">
                                {actionError && <span className="text-red-600 font-bold">Error: {actionError}</span>}
                            </div>
                            <div className="flex gap-3">
                                <Button type="button" variant="secondary" onClick={onClose} disabled={actionLoading}>Cancel</Button>
                                <Button type="submit" isLoading={actionLoading} icon={Save}>
                                    {order ? 'Update Order' : 'Create Order'}
                                </Button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
