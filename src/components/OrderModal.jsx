import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { X, Save, Search, UserCheck, AlertCircle } from "lucide-react";
import Button from "./Button";
import Input from "./Input";
import { useStoreData } from "../hooks/useStoreData";
import { collection, query, where, getDocs, addDoc, updateDoc, doc, increment, getCountFromServer, writeBatch } from "firebase/firestore";


import { db } from "../lib/firebase";
import { useTenant } from "../context/TenantContext";
import { useAudit } from "../hooks/useAudit"; // NEW
import { getWhatsappMessage, getWhatsappLink } from "../utils/whatsappTemplates";
import { MOROCCAN_CITIES } from "../utils/moroccanCities";

const ORDER_STATUSES = [
    'reçu', 'packing', 'ramassage', 'livraison', 'livré', 'pas de réponse', 'reporté', 'retour', 'annulé'
];

const INACTIVE_STATUSES = ['retour', 'annulé'];

export default function OrderModal({ isOpen, onClose, onSave, order = null }) {
    const { data: products } = useStoreData("products"); // Fetch products for selection
    const { store } = useTenant();
    const [loading, setLoading] = useState(false);
    const [foundCustomer, setFoundCustomer] = useState(null); // Stores the customer found by phone lookup
    const [selectedProduct, setSelectedProduct] = useState(null);
    const { logAction } = useAudit(); // NEW

    // Product search state
    const [searchTerm, setSearchTerm] = useState("");
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
                realDeliveryCost: order.realDeliveryCost || 0,
                status: order.status || "reçu",
                date: order.date || new Date().toISOString().split('T')[0],
                followUpDate: order.followUpDate || "", // NEW
                followUpNote: order.followUpNote || ""  // NEW
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
                realDeliveryCost: 0,
                status: "reçu",
                date: new Date().toISOString().split('T')[0],
                followUpDate: "", // NEW
                followUpNote: ""  // NEW
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
            toast.error("Phone number must be exactly 10 digits.");
            setLoading(false);
            return;
        }

        // 1. PLAN LIMIT CHECK
        if (!order) {
            const isStandard = store.plan === 'starter' || store.plan === 'free' || !store.plan;
            if (isStandard) {
                const startOfMonth = new Date();
                startOfMonth.setDate(1);
                startOfMonth.setHours(0, 0, 0, 0);

                const ordersRef = collection(db, "orders");
                const q = query(
                    ordersRef,
                    where("storeId", "==", store.id),
                    where("date", ">=", startOfMonth.toISOString().split('T')[0])
                );
                try {
                    const snapshot = await getCountFromServer(q);
                    if (snapshot.data().count >= 50) {
                        toast.error("Plan Limit Reached: 50 Orders/Month. Upgrade to Pro for unlimited orders.", { duration: 5000 });
                        setLoading(false);
                        return;
                    }
                } catch (err) {
                    console.warn("Offline limit check skipped:", err);
                    toast("Offline mode: Limit check skipped", { icon: "⚠️" });
                }
            }
        }

        try {
            const batch = writeBatch(db);

            // 2. PREPARE DATA
            const orderRef = order ? doc(db, "orders", order.id) : doc(collection(db, "orders"));
            const orderId = orderRef.id;

            // Generate Order Number if new
            let orderNumber = order ? order.orderNumber : `CMD-${Math.floor(100000 + Math.random() * 900000)}`;

            // Customer Setup
            let customerId = formData.customerId;
            let customerRef;
            let isNewCustomer = false;

            if (customerId) {
                customerRef = doc(db, "customers", customerId);
            } else {
                customerRef = doc(collection(db, "customers"));
                customerId = customerRef.id;
                isNewCustomer = true;
            }

            const orderData = {
                ...formData,
                id: orderId, // Ensure ID is in data
                storeId: store.id,
                customerId: customerId,
                orderNumber: orderNumber,
                quantity: parseInt(formData.quantity) || 1,
                price: parseFloat(formData.price) || 0,
                costPrice: parseFloat(formData.costPrice) || 0,
                shippingCost: parseFloat(formData.shippingCost) || 0,
                realDeliveryCost: parseFloat(formData.realDeliveryCost) || 0, // TYPE FIX
                updatedAt: new Date().toISOString()
            };

            if (!order) {
                orderData.createdAt = new Date().toISOString();
                orderData.status = 'reçu'; // Default for new
                orderData.isPaid = false;
            }

            // 3. BATCH OPERATIONS

            // A. Order Write
            if (order) {
                batch.update(orderRef, orderData);
            } else {
                batch.set(orderRef, orderData);
            }

            // B. Customer Write
            const totalOrderVal = orderData.price * orderData.quantity;

            if (isNewCustomer) {
                batch.set(customerRef, {
                    storeId: store.id,
                    name: formData.clientName,
                    phone: formData.clientPhone,
                    address: formData.address,
                    city: formData.city,
                    totalSpent: totalOrderVal,
                    orderCount: 1,
                    firstOrderDate: orderData.date,
                    lastOrderDate: orderData.date,
                    createdAt: new Date().toISOString()
                });
            } else {
                // Update existing customer stats ONLY if it's a new order
                if (!order) {
                    batch.update(customerRef, {
                        orderCount: increment(1),
                        totalSpent: increment(totalOrderVal),
                        lastOrderDate: orderData.date
                    });
                }
                // (Optimistic: We don't adjust stats on edit for now to avoid complexity)
            }

            // C. Stock Management
            const qty = parseInt(formData.quantity) || 0;
            const isNewStatusInactive = INACTIVE_STATUSES.includes(formData.status);

            if (order) {
                // EDIT: Reconcile
                const oldQty = parseInt(order.quantity) || 0;
                const isOldStatusInactive = INACTIVE_STATUSES.includes(order.status);

                // Return old stock if it was consumed
                if (!isOldStatusInactive && order.articleId) {
                    const oldProductRef = doc(db, "products", order.articleId);
                    batch.update(oldProductRef, { stock: increment(oldQty) });
                }
                // Take new stock if valid
                if (!isNewStatusInactive && formData.articleId) {
                    const newProductRef = doc(db, "products", formData.articleId);
                    batch.update(newProductRef, { stock: increment(-qty) });
                }
            } else {
                // NEW: Deduct if active
                if (formData.articleId && !isNewStatusInactive) {
                    const productRef = doc(db, "products", formData.articleId);
                    batch.update(productRef, { stock: increment(-qty) });
                }
            }

            // 4. COMMIT
            await batch.commit();

            // 5. Audit Log & Toast
            if (order) {
                // Assuming logAction is defined elsewhere
                // logAction("Order Updated", `Updated Order ${order.orderNumber} status to ${formData.status}`, { orderId: order.id });
                toast.success("Order updated");
            } else {
                // Assuming logAction is defined elsewhere and orderId/orderNumber are available
                // from the order creation logic above (orderRef.id and orderNumber)
                // logAction("Order Created", `Created Order #${orderNumber} for ${formData.clientName}`, { orderId: orderId });
                toast.success("Order created");
            }
            onSave(); // Close modal (passed as empty callback now)

        } catch (err) {
            console.error("Error saving order:", err);
            toast.error("Error saving order: " + err.message);
        } finally {
            setLoading(false);
        }
    };



    // Simple helper removed as we now have explicit city field

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
                                <div className="space-y-1">
                                    <label className="block text-sm font-medium text-gray-700">City</label>
                                    <input
                                        list="moroccan-cities"
                                        type="text"
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                                        value={formData.clientCity}
                                        onChange={(e) => setFormData({ ...formData, clientCity: e.target.value })}
                                        placeholder="e.g. Casablanca"
                                    />
                                    <datalist id="moroccan-cities">
                                        {MOROCCAN_CITIES.map(city => (
                                            <option key={city} value={city} />
                                        ))}
                                    </datalist>
                                </div>
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
                                    label="Shipping (Client Price)"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={formData.shippingCost}
                                    onChange={(e) => setFormData({ ...formData, shippingCost: e.target.value })}
                                />
                                <Input
                                    label="Real Delivery Cost (Charge)"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    className="bg-red-50"
                                    value={formData.realDeliveryCost}
                                    onChange={(e) => setFormData({ ...formData, realDeliveryCost: e.target.value })}
                                    placeholder="e.g. 35"
                                />
                            </div>
                        </div>

                        {/* Section 3: Status */}
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-4 pb-2 border-b">Status</h3>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Internal Note</label>
                                <textarea
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                                    rows="2"
                                    placeholder="Door code, specific instructions..."
                                    value={formData.note}
                                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                                />
                            </div>

                            {/* Programmed Follow-up (Visible if 'pas de réponse' or 'reporté') */}
                            {(formData.status === 'pas de réponse' || formData.status === 'reporté' || formData.status === 'reçu') && (
                                <div className="md:col-span-2 bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                                    <h4 className="flex items-center gap-2 text-sm font-bold text-yellow-800 mb-3">
                                        <AlertCircle className="w-4 h-4" />
                                        Schedule Follow-up / Reminder
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Input
                                            type="datetime-local"
                                            label="Call Back At"
                                            value={formData.followUpDate}
                                            onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
                                        />
                                        <Input
                                            label="Reminder Note"
                                            placeholder="Ex: Call after lunch..."
                                            value={formData.followUpNote}
                                            onChange={(e) => setFormData({ ...formData, followUpNote: e.target.value })}
                                        />
                                    </div>
                                </div>
                            )}
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
