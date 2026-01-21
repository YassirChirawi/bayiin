import { useState, useEffect } from "react";
import { X, Save, Search, UserCheck, AlertCircle } from "lucide-react";
import Button from "./Button";
import Input from "./Input";
import { useStoreData } from "../hooks/useStoreData";
import { collection, query, where, getDocs, addDoc, updateDoc, doc, increment } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useTenant } from "../context/TenantContext";
import { getWhatsappMessage, getWhatsappLink } from "../utils/whatsappTemplates";

const ORDER_STATUSES = [
    'reçu', 'packing', 'ramassage', 'livraison', 'livré', 'pas de réponse', 'retour', 'annulé'
];

const INACTIVE_STATUSES = ['retour', 'annulé'];

export default function OrderModal({ isOpen, onClose, onSave, order = null }) {
    const { data: products } = useStoreData("products"); // Fetch products for selection
    const { store } = useTenant();
    const [loading, setLoading] = useState(false);
    const [foundCustomer, setFoundCustomer] = useState(null); // Stores the customer found by phone lookup
    const [showCustomerAlert, setShowCustomerAlert] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        clientName: "",
        clientPhone: "",
        clientAddress: "",
        clientCity: "", // New explicit city field
        customerId: null, // Link to customer document
        articleId: "",
        articleName: "", // Denormalized for easier display
        size: "",
        color: "",
        quantity: 1,
        price: "",
        costPrice: 0, // Snapshot of product cost
        shippingCost: 0,
        status: "reçu",
        date: new Date().toISOString().split('T')[0]
    });

    const [notifyClient, setNotifyClient] = useState(false);
    const [customWhatsappMessage, setCustomWhatsappMessage] = useState("");

    useEffect(() => {
        if (order) {
            setFormData({
                clientName: order.clientName || "",
                clientPhone: order.clientPhone || "",
                clientAddress: order.clientAddress || "",
                clientCity: order.clientCity || order.city || "", // Handle both legacy and new
                customerId: order.customerId || null,
                articleId: order.articleId || "",
                articleName: order.articleName || "",
                size: order.size || "",
                color: order.color || "",
                quantity: order.quantity || 1,
                price: order.price || "",
                costPrice: order.costPrice || 0,
                shippingCost: order.shippingCost || 0,
                status: order.status || "reçu",
                date: order.date || new Date().toISOString().split('T')[0]
            });
        } else {
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
                shippingCost: 0,
                status: "reçu",
                date: new Date().toISOString().split('T')[0]
            });
        }
        setFoundCustomer(null);
        setShowCustomerAlert(false);
        setNotifyClient(false);
        setCustomWhatsappMessage("");
    }, [order, isOpen]);

    // Update custom message when status or client name changes
    useEffect(() => {
        if (notifyClient) {
            setCustomWhatsappMessage(getWhatsappMessage(formData.status, formData, store));
        }
    }, [formData.status, formData.clientName, formData.price, formData.quantity, formData.shippingCost, notifyClient, store]);

    const handlePhoneBlur = async () => {
        if (!formData.clientPhone || formData.customerId) return; // Don't check if empty or already linked

        // Query customers collection
        try {
            const customersRef = collection(db, "customers");
            const q = query(
                customersRef,
                where("storeId", "==", store.id),
                where("phone", "==", formData.clientPhone)
            );
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const customerDoc = querySnapshot.docs[0];
                setFoundCustomer({ id: customerDoc.id, ...customerDoc.data() });
                setShowCustomerAlert(true);
            }
        } catch (err) {
            console.error("Error looking up customer:", err);
        }
    };

    const confirmCustomerLink = () => {
        if (foundCustomer) {
            setFormData(prev => ({
                ...prev,
                clientName: foundCustomer.name,
                clientAddress: foundCustomer.address || prev.clientAddress,
                clientCity: foundCustomer.city || prev.clientCity, // Auto-fill city
                customerId: foundCustomer.id
            }));
            setShowCustomerAlert(false);
        }
    };

    const ignoreCustomerLink = () => {
        setFoundCustomer(null);
        setShowCustomerAlert(false);
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
                // If price is empty or user hasn't manually edited it much, set it? 
                // Let's just set it to product price
                price: product.price,
                costPrice: product.costPrice || 0 // Snapshot cost
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        if (formData.clientPhone && !/^\d{10}$/.test(formData.clientPhone)) {
            alert("Phone number must be exactly 10 digits.");
            setLoading(false);
            return;
        }

        try {
            let finalCustomerId = formData.customerId;

            // Customer Management Logic
            if (finalCustomerId) {
                // UPDATE existing customer stats
                const customerRef = doc(db, "customers", finalCustomerId);
                // We'll update stats: +1 order, +totalSpent
                // Note: Ideally transactions, but for now simple updates
                await updateDoc(customerRef, {
                    orderCount: increment(1),
                    totalSpent: increment(parseFloat(formData.price) * parseInt(formData.quantity)),
                    lastOrderDate: formData.date
                });
            } else {
                // CREATE new customer
                // Check AGAIN if phone exists to avoid duplicates if they ignored the popup but proceeded? 
                // For now, assume if they ignored, they want a NEW customer entry or it's a different person with same phone (rare but possible I guess? No, usually same phone = same person).
                // Let's enforce uniqueness? 
                // The requirement says "popup... accept or ignore". If ignore, we probably shouldn't link?
                // But for "Customer Profiles", capturing the new data is good.

                // Let's create a new customer document
                const newCustomerData = {
                    storeId: store.id,
                    name: formData.clientName,
                    phone: formData.clientPhone,
                    address: formData.clientAddress,
                    city: formData.clientCity,
                    totalSpent: parseFloat(formData.price) * parseInt(formData.quantity),
                    orderCount: 1,
                    firstOrderDate: formData.date,
                    lastOrderDate: formData.date,
                    createdAt: new Date()
                };

                const docRef = await addDoc(collection(db, "customers"), newCustomerData);
                finalCustomerId = docRef.id;
            }

            // Stock Management
            const qty = parseInt(formData.quantity) || 0;
            const isNewStatusInactive = INACTIVE_STATUSES.includes(formData.status);

            if (order) {
                // EDIT MODE: Reconcile Stock
                const oldQty = parseInt(order.quantity) || 0;
                const isOldStatusInactive = INACTIVE_STATUSES.includes(order.status);

                // 1. If old order was consuming stock, give it back first
                if (!isOldStatusInactive && order.articleId) {
                    const oldProductRef = doc(db, "products", order.articleId);
                    await updateDoc(oldProductRef, { stock: increment(oldQty) });
                }

                // 2. If new state consumes stock, take it
                if (!isNewStatusInactive && formData.articleId) {
                    const newProductRef = doc(db, "products", formData.articleId);
                    await updateDoc(newProductRef, { stock: increment(-qty) });
                }
            } else {
                // NEW ORDER MODE
                // Only deduct if creating an ACTIVE order
                if (formData.articleId && !isNewStatusInactive) {
                    const productRef = doc(db, "products", formData.articleId);
                    await updateDoc(productRef, {
                        stock: increment(-qty)
                    });
                }
            }

            await onSave({
                ...formData,
                customerId: finalCustomerId,
                quantity: parseInt(formData.quantity),
                price: parseFloat(formData.price),
                shippingCost: parseFloat(formData.shippingCost) || 0,
                costPrice: parseFloat(formData.costPrice) || 0,
                updatedAt: new Date().toISOString()
            });

            if (notifyClient && formData.clientPhone) {
                const link = getWhatsappLink(formData.clientPhone, customWhatsappMessage);
                window.open(link, '_blank');
            }

            onClose();
        } catch (error) {
            console.error("Error saving order:", error);
            alert("Failed to save order");
        } finally {
            setLoading(false);
        }
    };

    // Simple helper removed as we now have explicit city field

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl overflow-hidden my-8">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h2 className="text-xl font-bold text-gray-900">
                        {order ? `Edit Order #${order.orderNumber || ''}` : "New Order"}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="relative">
                    {showCustomerAlert && foundCustomer && (
                        <div className="absolute top-0 left-0 right-0 z-10 mx-6 mt-4 p-4 bg-indigo-50 border border-indigo-200 rounded-lg shadow-sm">
                            <div className="flex items-start gap-3">
                                <UserCheck className="h-5 w-5 text-indigo-600 mt-0.5" />
                                <div className="flex-1">
                                    <h4 className="text-sm font-semibold text-indigo-900">Existing Client Found</h4>
                                    <p className="text-sm text-indigo-700 mt-1">
                                        This phone number matches <strong>{foundCustomer.name}</strong>.
                                    </p>
                                    <div className="mt-3 flex gap-3">
                                        <Button size="sm" onClick={confirmCustomerLink}>
                                            Yes, Link to Client
                                        </Button>
                                        <Button size="sm" variant="secondary" onClick={ignoreCustomerLink}>
                                            Ignore
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="p-6 space-y-8">
                        {/* Section 1: Client Info */}
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-4 pb-2 border-b">Client Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Input
                                    label="Phone Number"
                                    required
                                    type="tel"
                                    maxLength={10}
                                    value={formData.clientPhone}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, '');
                                        setFormData({ ...formData, clientPhone: val });
                                    }}
                                    onBlur={handlePhoneBlur}
                                    placeholder="06XXXXXXXX (10 digits)"
                                />
                                <Input
                                    label="Client Name"
                                    required
                                    value={formData.clientName}
                                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                                />
                                <Input
                                    label="Address"
                                    required
                                    value={formData.clientAddress}
                                    onChange={(e) => setFormData({ ...formData, clientAddress: e.target.value })}
                                />
                                <Input
                                    label="City"
                                    required
                                    value={formData.clientCity}
                                    onChange={(e) => setFormData({ ...formData, clientCity: e.target.value })}
                                    placeholder="e.g. Casablanca"
                                />
                            </div>
                        </div>

                        {/* Section 2: Order Details */}
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-4 pb-2 border-b">Order Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Article (Product)</label>
                                    <select
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                                        value={formData.articleId}
                                        onChange={handleProductChange}
                                    >
                                        <option value="">-- Select Product --</option>
                                        {products.map(p => (
                                            <option key={p.id} value={p.id}>{p.name} ({p.stock})</option>
                                        ))}
                                    </select>
                                </div>

                                <Input
                                    label="Order Date"
                                    type="date"
                                    required
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <Input
                                    label="Size"
                                    value={formData.size}
                                    onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                                    placeholder="e.g. M"
                                />
                                <Input
                                    label="Color"
                                    value={formData.color}
                                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                    placeholder="e.g. Red"
                                />
                                <Input
                                    label="Quantity"
                                    type="number"
                                    min="1"
                                    required
                                    value={formData.quantity}
                                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                />
                                <Input
                                    label="Price (DH)"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    required
                                    value={formData.price}
                                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                />
                                <Input
                                    label="Shipping (DH)"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={formData.shippingCost}
                                    onChange={(e) => setFormData({ ...formData, shippingCost: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Section 3: Status */}
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-4 pb-2 border-b">Status</h3>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Order Status</label>
                                <select
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                >
                                    {ORDER_STATUSES.map(status => (
                                        <option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* WhatsApp Notification */}
                        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                            <div className="flex items-center gap-2 mb-2">
                                <input
                                    type="checkbox"
                                    id="notifyClient"
                                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                                    checked={notifyClient}
                                    onChange={(e) => setNotifyClient(e.target.checked)}
                                />
                                <label htmlFor="notifyClient" className="text-sm font-medium text-green-900">
                                    Notify Client via WhatsApp
                                </label>
                            </div>

                            {notifyClient && (
                                <div className="mt-2">
                                    <label className="block text-xs font-medium text-green-800 mb-1">Message Preview:</label>
                                    <textarea
                                        className="w-full px-3 py-2 text-sm border border-green-300 rounded-md focus:ring-green-500 focus:border-green-500"
                                        rows="2"
                                        value={customWhatsappMessage}
                                        onChange={(e) => setCustomWhatsappMessage(e.target.value)}
                                    ></textarea>
                                </div>
                            )}
                        </div>


                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                            <Button type="button" variant="secondary" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button type="submit" isLoading={loading} icon={Save}>
                                Save Order
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
