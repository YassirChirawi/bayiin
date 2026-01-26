import { useState, useMemo } from "react";
import { toast } from "react-hot-toast";
import { useStoreData } from "../hooks/useStoreData";
import { Plus, Edit2, Trash2, QrCode, Search, X, FileText, CheckSquare, Square, Check, Trash, RotateCcw, Upload, Download, MessageCircle, DollarSign } from "lucide-react";
import Button from "../components/Button";
import OrderModal from "../components/OrderModal";
import ImportModal from "../components/ImportModal";
import QRCode from "react-qr-code";
import { generateInvoice } from "../utils/generateInvoice";
import { exportToCSV } from "../utils/csvHelper";

import { useTenant } from "../context/TenantContext";
import { db } from "../lib/firebase";
import { doc, updateDoc, increment, getDoc, orderBy, limit, writeBatch, where } from "firebase/firestore";

const INACTIVE_STATUSES = ['retour', 'annulé'];

export default function Orders() {
    const { store } = useTenant();

    // Search State
    const [searchTerm, setSearchTerm] = useState(""); // Input value
    const [activeSearch, setActiveSearch] = useState(""); // Triggered Server Search

    // SCALABILITY FIX: Dynamic Constraints
    const orderConstraints = useMemo(() => {
        if (activeSearch) {
            // Smart Search Detection
            const isPhone = /^\d+$/.test(activeSearch.replace(/\s/g, ''));
            // If it looks like a phone, search phone. Else order number.
            if (isPhone) {
                return [where("clientPhone", "==", activeSearch)]; // Exact Phone Match
            } else {
                return [where("orderNumber", "==", activeSearch)]; // Exact Order Number Match
            }
        }
        // Default: Recent 50
        return [orderBy("date", "desc"), limit(50)];
    }, [activeSearch]);

    const { data: orders, loading, addStoreItem, updateStoreItem, deleteStoreItem, restoreStoreItem, permanentDeleteStoreItem } = useStoreData("orders", orderConstraints);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [editingOrder, setEditingOrder] = useState(null);
    const [qrOrder, setQrOrder] = useState(null);
    const [selectedOrders, setSelectedOrders] = useState([]);
    const [showTrash, setShowTrash] = useState(false);

    // Filter State
    const [statusFilter, setStatusFilter] = useState("all");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    const togglePaid = async (order) => {
        if (!store?.id) return;

        try {
            const batch = writeBatch(db);
            const orderRef = doc(db, "orders", order.id);
            // Stat path: stores/{storeId}/stats/sales
            const statsRef = doc(db, "stores", store.id, "stats", "sales");

            const newIsPaid = !order.isPaid;
            const revenueDelta = (parseFloat(order.price) || 0) * (parseInt(order.quantity) || 1);
            const costDelta = (parseFloat(order.costPrice) || 0) * (parseInt(order.quantity) || 1);
            const sign = newIsPaid ? 1 : -1;

            batch.update(orderRef, { isPaid: newIsPaid });

            // Update Stats (Realized Revenue & COGS)
            batch.set(statsRef, {
                totals: {
                    realizedRevenue: increment(revenueDelta * sign),
                    realizedCOGS: increment(costDelta * sign)
                }
            }, { merge: true });

            await batch.commit();
            toast.success(newIsPaid ? "Payment Marked" : "Payment Cancelled");
        } catch (err) {
            console.error("Error toggling paid:", err);
            toast.error("Failed to update payment status");
        }
    };

    // Trigger Search
    const handleSearch = () => {
        if (!searchTerm.trim()) {
            setActiveSearch("");
            return;
        }
        setActiveSearch(searchTerm.trim());
        toast.loading("Searching database...", { duration: 1000 });
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    // Clear Search
    const clearSearch = () => {
        setSearchTerm("");
        setActiveSearch("");
    };

    const handleExportCSV = () => {
        const dataToExport = orders.map(o => ({
            'Order #': o.orderNumber,
            Date: o.date,
            Client: o.clientName,
            Phone: o.clientPhone,
            Status: o.status,
            Product: o.articleName,
            Quantity: o.quantity,
            Price: o.price,
            Total: o.price ? o.price * o.quantity : 0
        }));
        exportToCSV(dataToExport, 'orders');
    };

    const handleSave = async (orderData) => {
        if (editingOrder) {
            await updateStoreItem(editingOrder.id, orderData);
            toast.success("Order updated successfully");
        } else {
            // Generate a simple Order Number if new
            const orderNumber = `CMD-${Math.floor(100000 + Math.random() * 900000)}`;
            await addStoreItem({ ...orderData, orderNumber });
            toast.success("New order created");
        }
        setIsModalOpen(false);
        setEditingOrder(null);
    };

    const handleEdit = (order) => {
        setEditingOrder(order);
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (showTrash) {
            if (window.confirm("Are you sure you want to permanently delete this order? This cannot be undone.")) {
                await permanentDeleteStoreItem(id);
                setSelectedOrders(prev => prev.filter(oid => oid !== id));
                toast.success("Order permanently deleted");
            }
        } else {
            if (window.confirm("Are you sure you want to move this order to trash?")) {
                await deleteStoreItem(id);
                setSelectedOrders(prev => prev.filter(oid => oid !== id));
                toast.success("Order moved to trash");
            }
        }
    };

    const handleRestore = async (id) => {
        await restoreStoreItem(id);
        setSelectedOrders(prev => prev.filter(oid => oid !== id));
        toast.success("Order restored");
    };

    const handleImport = async (data) => {
        let importedCount = 0;
        const promises = data.map(row => {
            if (!row.Client || !row.Product) return null;

            const orderNumber = row['Order #'] || `CMD-${Math.floor(100000 + Math.random() * 900000)}`;

            return addStoreItem({
                orderNumber,
                clientName: row.Client,
                clientPhone: row.Phone || "",
                clientAddress: row.Address || "",
                clientCity: row.City || "",
                articleName: row.Product,
                articleId: "", // Linked product ID missing in CSV usually, treat as unlinked
                quantity: parseInt(row.Quantity) || 1,
                price: parseFloat(row.Price) || 0,
                status: row.Status || "reçu",
                date: row.Date || new Date().toISOString().split('T')[0]
            }).then(() => { importedCount++; }).catch(e => console.error("Import error", e));
        });

        await Promise.all(promises);
        toast.success(`Successfully imported ${importedCount} orders.`);
    };

    // Bulk Actions
    const handleSelectAll = () => {
        if (selectedOrders.length === filteredOrders.length) {
            setSelectedOrders([]); // Deselect All
        } else {
            setSelectedOrders(filteredOrders.map(o => o.id)); // Select All
        }
    };

    const handleSelectOne = (id) => {
        setSelectedOrders(prev =>
            prev.includes(id)
                ? prev.filter(oid => oid !== id)
                : [...prev, id]
        );
    };

    const handleBulkDelete = async () => {
        const message = showTrash
            ? `Permanently delete ${selectedOrders.length} orders? This cannot be undone.`
            : `Move ${selectedOrders.length} orders to trash?`;

        if (window.confirm(message)) {
            await Promise.all(selectedOrders.map(id => showTrash ? permanentDeleteStoreItem(id) : deleteStoreItem(id)));
            setSelectedOrders([]);
            toast.success(showTrash ? "Orders deleted permanently" : "Orders moved to trash");
        }
    };

    const handleBulkRestore = async () => {
        if (window.confirm(`Restore ${selectedOrders.length} orders?`)) {
            await Promise.all(selectedOrders.map(id => restoreStoreItem(id)));
            setSelectedOrders([]);
            toast.success("Orders restored");
        }
    };

    const handleBulkStatus = async (status) => {
        if (!window.confirm(`Mark ${selectedOrders.length} orders as ${status}?`)) return;

        try {
            const batch = writeBatch(db);
            // Stat path: stores/{storeId}/stats/sales
            const statsRef = doc(db, "stores", store.id, "stats", "sales");
            let revenueAdjustment = 0;
            let cogsAdjustment = 0;

            selectedOrders.forEach(id => {
                const order = orders.find(o => o.id === id);
                if (!order) return;

                const orderRef = doc(db, "orders", id);
                const updates = { status };

                // 1. Stock Logic
                const isNewStatusInactive = INACTIVE_STATUSES.includes(status);
                const isOldStatusInactive = INACTIVE_STATUSES.includes(order.status);

                // Only act if status "category" changes (Active <-> Inactive) AND we have an articleId
                if (order.articleId && isNewStatusInactive !== isOldStatusInactive) {
                    const productRef = doc(db, "products", order.articleId);
                    const qty = parseInt(order.quantity) || 1;
                    // If becoming inactive (cancelled/returned), add stock back. Else remove.
                    const stockChange = isNewStatusInactive ? qty : -qty;
                    batch.update(productRef, { stock: increment(stockChange) });
                }

                // 2. Financial Logic (Optimization for Returns)
                // If moving TO inactive status (Retour/Annulé) AND it was Paid -> Auto-Unpay & Deduct Revenue
                if (isNewStatusInactive && order.isPaid) {
                    updates.isPaid = false;
                    const revenue = (parseFloat(order.price) || 0) * (parseInt(order.quantity) || 1);
                    const cogs = (parseFloat(order.costPrice) || 0) * (parseInt(order.quantity) || 1);
                    revenueAdjustment -= revenue;
                    cogsAdjustment -= cogs;
                }

                batch.update(orderRef, updates);
            });

            // 3. Apply Aggregated Stats Update (One stats write for all orders)
            if (revenueAdjustment !== 0 || cogsAdjustment !== 0) {
                batch.set(statsRef, {
                    totals: {
                        realizedRevenue: increment(revenueAdjustment),
                        realizedCOGS: increment(cogsAdjustment)
                    }
                }, { merge: true });
            }

            await batch.commit();
            setSelectedOrders([]);
            toast.success(`Orders marked as ${status}`);
        } catch (err) {
            console.error("Error updating statuses:", err);
            toast.error("Failed to update orders.");
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'livré': return 'bg-green-100 text-green-800';
            case 'retour': return 'bg-red-100 text-red-800';
            case 'annulé': return 'bg-gray-100 text-gray-400 line-through';
            case 'packing': return 'bg-yellow-100 text-yellow-800';
            case 'livraison': return 'bg-blue-100 text-blue-800';
            case 'reporté': return 'bg-purple-100 text-purple-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    // Filter Logic (Client Side Refinement of Server Results)
    const filteredOrders = orders
        .filter(o => showTrash ? o.deleted : !o.deleted)
        .filter(o => statusFilter === 'all' || o.status === statusFilter)
        .filter(o => !startDate || o.date >= startDate)
        .filter(o => !endDate || o.date <= endDate)
        // If Active Search is NOT set, we allow client-side partial filtering of the 50 items
        // If Active Search IS set, the DB already filtered, but we can still highlight/filter locally if strictly needed.
        // For consistency, let's keep client filter on top of DB result (e.g. searching 'CMD' might retun nothing if exact match, but searching local list works).
        // Actually, to avoid confusion:
        // If activeSearch is set, rely on DB result primarily.
        .filter(o => {
            if (activeSearch) return true; // DB Filtered
            // Local Filter for the "Recent" list
            return (
                o.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                o.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                o.clientPhone?.includes(searchTerm)
            );
        });

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Track and manage customer orders
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="secondary"
                        icon={Upload}
                        onClick={() => setIsImportModalOpen(true)}
                    >
                        Import
                    </Button>
                    <Button
                        variant="secondary"
                        icon={Download}
                        onClick={handleExportCSV}
                        disabled={orders.length === 0}
                    >
                        Export
                    </Button>
                    {selectedOrders.length > 0 && (
                        <>
                            {showTrash ? (
                                <Button
                                    onClick={handleBulkRestore}
                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                    icon={RotateCcw}
                                >
                                    Restore ({selectedOrders.length})
                                </Button>
                            ) : (
                                <>
                                    <Button
                                        onClick={() => handleBulkStatus('livré')}
                                        className="bg-green-600 hover:bg-green-700 text-white"
                                        icon={Check}
                                    >
                                        Mark Delivered ({selectedOrders.length})
                                    </Button>
                                    <Button
                                        onClick={() => handleBulkStatus('retour')}
                                        className="bg-orange-600 hover:bg-orange-700 text-white"
                                        icon={RotateCcw}
                                    >
                                        Mark Returned ({selectedOrders.length})
                                    </Button>
                                    <Button
                                        onClick={() => handleBulkStatus('reporté')}
                                        className="bg-purple-600 hover:bg-purple-700 text-white"
                                        icon={RotateCcw}
                                    >
                                        Mark Reporté ({selectedOrders.length})
                                    </Button>
                                </>
                            )}
                            <Button
                                onClick={handleBulkDelete}
                                className="bg-red-600 hover:bg-red-700 text-white"
                                icon={Trash}
                            >
                                {showTrash ? 'Delete Permanently' : 'Delete'} ({selectedOrders.length})
                            </Button>
                        </>
                    )}
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button
                            onClick={() => setShowTrash(false)}
                            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${!showTrash ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Active
                        </button>
                        <button
                            onClick={() => setShowTrash(true)}
                            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${showTrash ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Trash
                        </button>
                    </div>
                    {!showTrash && (
                        <Button onClick={() => { setEditingOrder(null); setIsModalOpen(true); }} icon={Plus}>
                            New Order
                        </Button>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
                <div className="relative flex-1 flex gap-2">
                    <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            className={`block w-full pl-10 pr-3 py-2 border rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition duration-150 ease-in-out ${activeSearch ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-gray-300'}`}
                            placeholder="Search Order # or Phone (Exact)..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                    </div>
                    {activeSearch ? (
                        <Button onClick={clearSearch} variant="secondary" icon={X}>
                            Clear
                        </Button>
                    ) : (
                        <Button onClick={handleSearch} icon={Search}>
                            Search
                        </Button>
                    )}
                </div>

                {/* Status Filter */}
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="block w-full md:w-40 py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                    <option value="all">All Status</option>
                    <option value="reçu">Reçu</option>
                    <option value="confirmation">Confirmation</option>
                    <option value="packing">Packing</option>
                    <option value="livraison">Livraison</option>
                    <option value="livré">Livré</option>
                    <option value="reporté">Reporté</option>
                    <option value="retour">Retour</option>
                    <option value="annulé">Annulé</option>
                </select>

                {/* Date Filters */}
                <div className="flex gap-2">
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="block w-full md:w-auto py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="Start Date"
                    />
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="block w-full md:w-auto py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="End Date"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white shadow overflow-hidden border-b border-gray-200 sm:rounded-lg overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left">
                                <button onClick={handleSelectAll} className="text-gray-500 hover:text-gray-700">
                                    {selectedOrders.length > 0 && selectedOrders.length === filteredOrders.length ? (
                                        <CheckSquare className="h-5 w-5 text-indigo-600" />
                                    ) : (
                                        <Square className="h-5 w-5" />
                                    )}
                                </button>
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">N° Cmd</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Article</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr><td colSpan="9" className="px-6 py-4 text-center">Loading...</td></tr>
                        ) : filteredOrders.length === 0 ? (
                            <tr><td colSpan="9" className="px-6 py-4 text-center text-gray-500">No orders found.</td></tr>
                        ) : filteredOrders.map((order) => {
                            const isSelected = selectedOrders.includes(order.id);
                            return (
                                <tr key={order.id} className={`hover:bg-gray-50 ${isSelected ? 'bg-indigo-50' : ''}`}>
                                    <td className="px-6 py-4">
                                        <button onClick={() => handleSelectOne(order.id)} className="text-gray-500 hover:text-gray-700">
                                            {isSelected ? (
                                                <CheckSquare className="h-5 w-5 text-indigo-600" />
                                            ) : (
                                                <Square className="h-5 w-5" />
                                            )}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600">
                                        {order.orderNumber}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {order.date}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        <div className="font-medium">{order.clientName}</div>
                                        <div className="text-gray-500 text-xs">{order.clientPhone}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <div>{order.articleName}</div>
                                        <div className="text-xs text-gray-400">{order.size} / {order.color}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {order.quantity}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                                        {order.price ? `${(order.price * order.quantity).toFixed(2)} DH` : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <button
                                            onClick={() => togglePaid(order)}
                                            className={`p-1 rounded-full ${order.isPaid ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}
                                            title={order.isPaid ? "Mark Unpaid" : "Mark Paid"}
                                        >
                                            <DollarSign className="h-5 w-5" />
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}>
                                            {order.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex items-center justify-end gap-2">
                                            {showTrash ? (
                                                <>
                                                    <button
                                                        onClick={() => handleRestore(order.id)}
                                                        className="text-blue-600 hover:text-blue-900"
                                                        title="Restore"
                                                    >
                                                        <RotateCcw className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(order.id)}
                                                        className="text-red-600 hover:text-red-900"
                                                        title="Delete Permanently"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => setQrOrder(order)}
                                                        className="text-gray-400 hover:text-gray-900"
                                                        title="View QR Code"
                                                    >
                                                        <QrCode className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => generateInvoice(order, store)}
                                                        className="text-gray-400 hover:text-blue-600"
                                                        title="Download Invoice"
                                                    >
                                                        <FileText className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleEdit(order)}
                                                        className="text-indigo-600 hover:text-indigo-900"
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(order.id)}
                                                        className="text-red-600 hover:text-red-900"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </>
                                            )}
                                            {/* WhatsApp Notification */}
                                            <a
                                                href={`https://wa.me/${order.clientPhone ? order.clientPhone.replace(/\D/g, '') : ''}?text=${encodeURIComponent(
                                                    (store?.whatsappTemplates?.[order.status] || `Bonjour ${order.clientName}, votre commande #${order.orderNumber} est ${order.status}.`)
                                                        .replace('[Make]', store?.name || '')
                                                        .replace('[Client]', order.clientName || '')
                                                        .replace('[Produit]', order.articleName || '')
                                                        .replace('[Commande]', order.orderNumber || '')
                                                        .replace('[Ville]', order.clientCity || '')
                                                )}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-gray-400 hover:text-green-600"
                                                title="Notify on WhatsApp"
                                            >
                                                <MessageCircle className="h-4 w-4" />
                                            </a>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <OrderModal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setEditingOrder(null); }}
                onSave={handleSave}
                order={editingOrder}
            />

            {/* QR Code Modal */}
            {
                qrOrder && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full relative text-center">
                            <button
                                onClick={() => setQrOrder(null)}
                                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                            >
                                <X className="h-6 w-6" />
                            </button>
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Order Scan Code</h3>
                            <div className="flex justify-center p-4 bg-white rounded-lg">
                                <QRCode
                                    value={JSON.stringify({
                                        id: qrOrder.id,
                                        number: qrOrder.orderNumber,
                                        client: qrOrder.clientName,
                                        phone: qrOrder.clientPhone
                                    })}
                                    size={200}
                                />
                            </div>
                            <p className="mt-4 text-sm text-gray-500 break-all">
                                #{qrOrder.orderNumber}
                            </p>
                        </div>
                    </div>
                )
            }


            <ImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onImport={handleImport}
                title="Import Orders"
                templateHeaders={["Client", "Product"]}
            />
        </div >
    );
}
