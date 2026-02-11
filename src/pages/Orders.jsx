import { useState, useMemo, useEffect } from "react";
import { toast } from "react-hot-toast";
import { useStoreData } from "../hooks/useStoreData";
import { Plus, Edit2, Trash2, QrCode, Search, X, FileText, CheckSquare, Square, Check, Trash, RotateCcw, Upload, Download, MessageCircle, DollarSign, AlertCircle, Truck, Package, Box, ShoppingCart, Printer } from "lucide-react";
import Button from "../components/Button";
import OrderModal from "../components/OrderModal";
import ImportModal from "../components/ImportModal";
import HelpTooltip from "../components/HelpTooltip";
import { useOrderActions } from "../hooks/useOrderActions"; // Hook
import QRCode from "react-qr-code";
import { generateInvoice } from "../utils/generateInvoice";
import { getWhatsappMessage, getWhatsappLink } from "../utils/whatsappTemplates";
import { exportToCSV } from "../utils/csvHelper";

import { useTenant } from "../context/TenantContext";
import { useLanguage } from "../context/LanguageContext"; // NEW
import { db } from "../lib/firebase";
import { doc, updateDoc, increment, getDoc, orderBy, limit, writeBatch, where, deleteDoc } from "firebase/firestore";
import { logActivity } from "../utils/logger"; // NEW
import { useAuth } from "../context/AuthContext"; // NEW
import TrackingTimelineModal from "../components/TrackingTimelineModal"; // NEW
import { getPackageStatus, requestSenditPickup, authenticateSendit } from "../lib/sendit"; // NEW
import { authenticateOlivraison, createOlivraisonPackage } from "../lib/olivraison"; // NEW (Ensure consistency)
import { MapPin } from "lucide-react"; // NEW Icon

const INACTIVE_STATUSES = ['retour', 'annulé'];

export default function Orders() {
    const { store } = useTenant();
    const { t } = useLanguage(); // NEW
    const { user } = useAuth(); // NEW

    // Search State
    const [searchTerm, setSearchTerm] = useState(""); // Input value
    const [activeSearch, setActiveSearch] = useState(""); // Triggered Server Search
    const [limitCount, setLimitCount] = useState(50); // Pagination Limit

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
        return [orderBy("date", "desc"), limit(limitCount)];
    }, [activeSearch]);

    const { sendToOlivraison, sendToSendit } = useOrderActions();
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

    // Tracking Modal State
    const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
    const [trackingData, setTrackingData] = useState(null);
    const [trackingProvider, setTrackingProvider] = useState(null);

    // Pickup State
    const [isPickupLoading, setIsPickupLoading] = useState(false);

    // TAB STATE: 'orders' | 'carts'
    const [activeTab, setActiveTab] = useState('orders');

    // AUTO-CLEANUP: Delete pending_catalog > 48h
    useEffect(() => {
        if (!orders.length) return;

        const cleanupOldCarts = async () => {
            const now = new Date();
            const twoDaysAgo = new Date(now.getTime() - (48 * 60 * 60 * 1000));

            // Pending orders older than 48h
            const oldCarts = orders.filter(o =>
                o.status === 'pending_catalog' &&
                o.createdAt &&
                new Date(o.createdAt.seconds * 1000) < twoDaysAgo
            );

            if (oldCarts.length > 0) {
                console.log(`Cleaning up ${oldCarts.length} old carts...`);
                const batch = writeBatch(db);
                oldCarts.forEach(cart => {
                    batch.delete(doc(db, "orders", cart.id));
                });
                try {
                    await batch.commit();
                    // toast.success(`Cleaned up ${oldCarts.length} expired carts`); // Optional toast
                } catch (e) {
                    console.error("Cleanup failed", e);
                }
            }
        };

        cleanupOldCarts();
    }, [orders]); // Run when orders load/change

    const togglePaid = async (order) => {
        if (!store?.id) return;

        try {
            const batch = writeBatch(db);
            const orderRef = doc(db, "orders", order.id);
            const statsRef = doc(db, "stores", store.id, "stats", "sales");

            // Calculations
            const newIsPaid = !order.isPaid;
            const revenue = (parseFloat(order.price) || 0) * (parseInt(order.quantity) || 1);
            const cogs = (parseFloat(order.costPrice) || 0) * (parseInt(order.quantity) || 1);
            const delivery = parseFloat(order.realDeliveryCost) || 0;
            const sign = newIsPaid ? 1 : -1;

            batch.update(orderRef, { isPaid: newIsPaid });

            batch.update(orderRef, { isPaid: newIsPaid });

            await batch.commit();

            // Log Activity
            logActivity(db, store.id, user, 'PAYMENT_UPDATE',
                `Order ${order.orderNumber} marked as ${newIsPaid ? 'PAID' : 'UNPAID'}`,
                { orderId: order.id, orderNumber: order.orderNumber, newIsPaid }
            );

            toast.success(newIsPaid ? t('msg_payment_marked') : t('msg_payment_cancelled'));
        } catch (err) {
            console.error("Error toggling paid:", err);
            toast.error(t('err_update_payment'));
        }
    };

    // Trigger Search
    const handleSearch = () => {
        if (!searchTerm.trim()) {
            setActiveSearch("");
            return;
        }
        setActiveSearch(searchTerm.trim());
        toast.loading(t('msg_searching'), { duration: 1000 });
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

    const handleSave = () => {
        setIsModalOpen(false);
        setEditingOrder(null);
        // Database write is now handled atomicly inside OrderModal
    };

    const handleEdit = (order) => {
        setEditingOrder(order);
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (showTrash) {
            if (window.confirm(t('confirm_permanent_delete'))) {
                await permanentDeleteStoreItem(id);
                setSelectedOrders(prev => prev.filter(oid => oid !== id));
                toast.success(t('msg_order_deleted')); // Actually permanently deleted
            }
        } else {
            if (window.confirm(t('confirm_trash'))) {
                await deleteStoreItem(id);
                setSelectedOrders(prev => prev.filter(oid => oid !== id));
                logActivity(db, store.id, user, 'ORDER_DELETE', `Order ${id} moved to trash`, { orderId: id });
                toast.success(t('msg_order_deleted'));
            }
        }
    };

    const handleRestore = async (id) => {
        await restoreStoreItem(id);
        setSelectedOrders(prev => prev.filter(oid => oid !== id));
        logActivity(db, store.id, user, 'ORDER_RESTORE', `Order ${id} restored from trash`, { orderId: id });
        toast.success(t('msg_order_restored'));
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
                costPrice: parseFloat(row['Cost Price'] || row['Cost']) || 0,
                status: row.Status || "reçu",
                date: row.Date || new Date().toISOString().split('T')[0]
            }).then(() => { importedCount++; }).catch(e => console.error("Import error", e));
        });

        await Promise.all(promises);
        toast.success(t('success_import', { count: importedCount }));
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
            ? t('confirm_bulk_delete_perm', { count: selectedOrders.length })
            : t('confirm_bulk_trash', { count: selectedOrders.length });

        if (window.confirm(message)) {
            await Promise.all(selectedOrders.map(id => showTrash ? permanentDeleteStoreItem(id) : deleteStoreItem(id)));
            setSelectedOrders([]);
            toast.success(showTrash ? t('msg_orders_deleted_perm') : t('msg_orders_moved_trash'));
        }
    };

    const handleBulkRestore = async () => {
        if (window.confirm(t('confirm_bulk_restore', { count: selectedOrders.length }))) {
            await Promise.all(selectedOrders.map(id => restoreStoreItem(id)));
            setSelectedOrders([]);
            toast.success(t('msg_orders_restored'));
        }
    };

    const handleBulkPaid = async () => {
        if (!window.confirm(t('confirm_bulk_pay', { count: selectedOrders.length }))) return;

        try {
            const batch = writeBatch(db);
            selectedOrders.forEach(id => {
                const order = orders.find(o => o.id === id);
                if (!order || order.isPaid) return;
                const orderRef = doc(db, "orders", id);
                batch.update(orderRef, { isPaid: true });
            });

            await batch.commit();
            setSelectedOrders([]);
            toast.success(t('msg_orders_marked_paid'));
        } catch (err) {
            console.error("Error bulk paying:", err);
            toast.error("Failed to update payment status");
        }
    };

    const handleBulkStatus = async (status) => {
        if (!window.confirm(t('confirm_bulk_status', { count: selectedOrders.length, status }))) return;

        try {
            const batch = writeBatch(db);

            selectedOrders.forEach(id => {
                const order = orders.find(o => o.id === id);
                if (!order) return;

                const orderRef = doc(db, "orders", id);
                const updates = { status };

                // 1. Stock Logic - MOVED TO CLOUD FUNCTIONS
                // (client-side removed to prevent double counting)


                // 2. Financial Logic - REMOVED (Handled by Cloud Function to avoid double counting)
                // Case A: Moving TO Inactive (Refund/Cancel) AND was Paid -> Unpay
                if (isNewStatusInactive && order.isPaid) {
                    updates.isPaid = false;
                }

                // Case B: Moving TO 'Livré' (Delivered) AND not Paid -> Auto-Pay
                if (status === 'livré' && !order.isPaid) {
                    updates.isPaid = true;
                }

                batch.update(orderRef, updates);
            });

            await batch.commit();
            setSelectedOrders([]);
            toast.success(t('msg_orders_status_updated', { status }));
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

    // Tracking Logic
    const handleOpenTracking = async (order) => {
        if (!order.trackingId) {
            toast.error("Aucun numéro de suivi disponible.");
            return;
        }

        const provider = order.carrier || 'sendit'; // Default to sendit
        setTrackingProvider(provider);
        setTrackingData(null); // Clear previous
        setIsTrackingModalOpen(true);

        try {
            if (provider === 'sendit') {
                if (!store.senditPublicKey || !store.senditSecretKey) {
                    throw new Error("Clés API Sendit manquantes.");
                }
                const token = await authenticateSendit(store.senditPublicKey, store.senditSecretKey);
                const data = await getPackageStatus(token, order.trackingId);
                setTrackingData(data);
            } else if (provider === 'olivraison') {
                // Placeholder for Olivraison tracking logic if/when they provide full history
                // For now, just show basic info
                setTrackingData({
                    code: order.trackingId,
                    status: order.carrierStatus || 'UNKNOWN',
                    audits: [] // No audits yet for O-Livraison
                });
            }
        } catch (error) {
            console.error("Tracking Error:", error);
            toast.error("Erreur lors de la récupération du suivi.");
            setIsTrackingModalOpen(false);
        }
    };

    // Pickup Logic
    const handleRequestPickup = async () => {
        if (selectedOrders.length === 0) {
            toast.error("Veuillez sélectionner des commandes pour le ramassage.");
            return;
        }

        // Filter valid orders (must be Sendit + have tracking ID + not delivered/cancelled?)
        // Actually Sendit API just wants a list of tracking IDs.
        // We should probably only send "ready" orders.
        const ordersToPickup = orders.filter(o => selectedOrders.includes(o.id));
        const senditOrders = ordersToPickup.filter(o => o.carrier === 'sendit' && o.trackingId);

        if (senditOrders.length === 0) {
            toast.error("Aucune commande Sendit valide sélectionnée.");
            return;
        }

        if (!window.confirm(`Demander le ramassage pour ${senditOrders.length} colis ?`)) return;

        setIsPickupLoading(true);
        try {
            if (!store.senditPublicKey || !store.senditSecretKey) {
                throw new Error("Clés API Sendit manquantes.");
            }
            const token = await authenticateSendit(store.senditPublicKey, store.senditSecretKey);

            const trackingIds = senditOrders.map(o => o.trackingId);
            const result = await requestSenditPickup(token, store, trackingIds);

            toast.success("Demande de ramassage envoyée avec succès !");
            setSelectedOrders([]); // Clear selection
        } catch (error) {
            console.error("Pickup Error:", error);
            toast.error(error.message || "Erreur de demande de ramassage.");
        } finally {
            setIsPickupLoading(false);
        }
    };

    // Filter Logic (Client Side Refinement of Server Results)
    const filteredOrders = orders
        .filter(o => activeTab === 'carts' ? o.status === 'pending_catalog' : o.status !== 'pending_catalog') // TAB SPLIT
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
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        {t('page_title_orders')}
                        <HelpTooltip topic="orders" />
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        {t('page_subtitle_orders')}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="secondary"
                        icon={Upload}
                        onClick={() => setIsImportModalOpen(true)}
                    >
                        {t('btn_import')}
                    </Button>
                    <Button
                        variant="secondary"
                        icon={Download}
                        onClick={handleExportCSV}
                        disabled={orders.length === 0}
                    >
                        {t('btn_export')}
                    </Button>
                    {selectedOrders.length > 0 && (
                        <>
                            {showTrash ? (
                                <Button
                                    onClick={handleBulkRestore}
                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                    icon={RotateCcw}
                                >
                                    {t('btn_restore')} ({selectedOrders.length})
                                </Button>
                            ) : (
                                <>
                                    <Button
                                        onClick={handleBulkPaid}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                        icon={DollarSign}
                                    >
                                        {t('btn_mark_paid')}
                                    </Button>
                                    <Button
                                        onClick={() => handleBulkStatus('confirmation')}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                                        icon={Check}
                                    >
                                        {t('btn_mark_confirmed')}
                                    </Button>
                                    <Button
                                        onClick={() => handleBulkStatusUpdate('livré')}
                                        className="bg-green-600 hover:bg-green-700 text-white"
                                        icon={Check}
                                    >
                                        {t('btn_mark_delivered')}
                                    </Button>
                                    <Button
                                        onClick={() => handleBulkStatusUpdate('reporté')}
                                        className="bg-yellow-600 hover:bg-yellow-700 text-white"
                                        icon={RotateCcw}
                                    >
                                        {t('btn_mark_postponed')}
                                    </Button>
                                    <Button
                                        onClick={() => handleBulkStatusUpdate('pas de réponse')}
                                        className="bg-orange-600 hover:bg-orange-700 text-white"
                                        icon={AlertCircle}
                                    >
                                        {t('btn_no_answer')}
                                    </Button>
                                </>
                            )}
                            <Button
                                onClick={handleBulkDelete}
                                className="bg-red-600 hover:bg-red-700 text-white"
                                icon={Trash}
                            >
                                {showTrash ? t('btn_delete_permanent') : t('btn_delete')} ({selectedOrders.length})
                            </Button>
                        </>
                    )}
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button
                            onClick={() => setShowTrash(false)}
                            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${!showTrash ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            {t('label_active')}
                        </button>
                        <button
                            onClick={() => setShowTrash(true)}
                            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${showTrash ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            {t('label_trash')}
                        </button>
                    </div>
                    <Button onClick={() => { setEditingOrder(null); setIsModalOpen(true); }} icon={Plus}>
                        {t('btn_new_order')}
                    </Button>

                    <Button
                        onClick={handleRequestPickup}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                        icon={Truck}
                        disabled={isPickupLoading || selectedOrders.length === 0}
                    >
                        {isPickupLoading ? "Envoi..." : "Demander Ramassage"}
                    </Button>
                </div>
            </div>

            {/* TABS */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('orders')}
                        className={`${activeTab === 'orders'
                            ? 'border-indigo-500 text-indigo-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
                    >
                        <Package className="h-5 w-5" />
                        {t('tab_orders') || "Orders"}
                    </button>
                    <button
                        onClick={() => setActiveTab('carts')}
                        className={`${activeTab === 'carts'
                            ? 'border-indigo-500 text-indigo-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
                    >
                        <ShoppingCart className="h-5 w-5" />
                        {t('tab_carts') || "Live Carts / Pending"}
                        {orders.filter(o => o.status === 'pending_catalog').length > 0 && (
                            <span className="bg-red-100 text-red-600 py-0.5 px-2.5 rounded-full text-xs font-bold">
                                {orders.filter(o => o.status === 'pending_catalog').length}
                            </span>
                        )}
                    </button>
                </nav>
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
                            placeholder={t('label_search_placeholder')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                    </div>
                    {activeSearch ? (
                        <Button onClick={clearSearch} variant="secondary" icon={X}>
                            {t('btn_cancel') || "Clear"}
                        </Button>
                    ) : (
                        <Button onClick={handleSearch} icon={Search}>
                            {t('btn_search') || "Search"}
                        </Button>
                    )}
                </div>

                {/* Status Filter */}
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="block w-full md:w-40 py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                    <option value="all">{t('label_all_status')}</option>
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
                        placeholder={t('label_start_date')}
                    />
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="block w-full md:w-auto py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder={t('label_end_date')}
                    />
                </div>
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block bg-white shadow overflow-hidden border-b border-gray-200 sm:rounded-lg overflow-x-auto">
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
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('th_order_no')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('th_date')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('th_client')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('th_product')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('th_qty')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('th_total')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('th_paid')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('th_status')}</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('th_actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr><td colSpan="9" className="px-6 py-4 text-center">{t('msg_loading_orders')}</td></tr>
                        ) : filteredOrders.length === 0 ? (
                            <tr><td colSpan="9" className="px-6 py-4 text-center text-gray-500">{t('msg_no_orders')}</td></tr>
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
                                        {order.price ? `${(order.source === 'public_catalog' ? parseFloat(order.price) : (order.price * order.quantity)).toFixed(2)} ${store?.currency || 'MAD'}` : '-'}
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
                                        {activeTab === 'carts' ? (
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                                {t('status_pending_action') || "Pending Action"}
                                            </span>
                                        ) : (
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}>
                                                {t(`status_${order.status.toLowerCase().replace(/\s+/g, '_')}`) || order.status}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex items-center justify-end gap-2">
                                            {activeTab === 'carts' ? (
                                                <>
                                                    <button
                                                        onClick={() => {
                                                            alert("Opening to modify. Please add client name/phone and change status to 'Reçu'.");
                                                            handleEdit(order);
                                                        }}
                                                        className="bg-indigo-600 text-white px-3 py-1 rounded text-xs hover:bg-indigo-700"
                                                    >
                                                        Confirm / Edit
                                                    </button>
                                                    <button
                                                        onClick={() => deleteStoreItem(order.id)} // Soft delete is fine, or permanent
                                                        className="bg-red-50 text-red-600 px-3 py-1 rounded text-xs hover:bg-red-100 border border-red-200"
                                                    >
                                                        Discard
                                                    </button>
                                                </>
                                            ) : showTrash ? (
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
                                                    {/* Tracking Timeline Button */}
                                                    {(order.carrier === 'sendit' || order.carrier === 'olivraison') && order.trackingId && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleOpenTracking(order); }}
                                                            className="text-blue-500 hover:text-blue-700"
                                                            title="Suivi Colis"
                                                        >
                                                            <MapPin className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                    <button

                                                        onClick={(e) => {
                                                            e.stopPropagation(); // Prevent row click
                                                            if (!store?.olivraisonApiKey) {
                                                                toast.error("Please configure O-Livraison API Keys in Settings first.");
                                                                return;
                                                            }
                                                            if (window.confirm(`Send Order #${order.orderNumber} to O-Livraison?`)) {
                                                                sendToOlivraison(order)
                                                                    .then(() => toast.success("Order sent to O-Livraison!"))
                                                                    .catch(err => toast.error(err.message));
                                                            }
                                                        }}
                                                        disabled={
                                                            order.carrier === 'olivraison' // Disable if already sent
                                                        }
                                                        className={`text-gray-400 hover:text-blue-600 ${!store?.olivraisonApiKey ? 'opacity-30 cursor-not-allowed' : ''
                                                            } ${order.carrier === 'olivraison' ? 'text-green-500 hover:text-green-600' : ''}`}
                                                        title={!store?.olivraisonApiKey ? "Configure O-Livraison keys" : "Send to O-Livraison"}
                                                    >
                                                        <Truck className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (!store?.senditPublicKey) {
                                                                toast.error("Please configure Sendit API Keys in Settings first.");
                                                                return;
                                                            }
                                                            if (window.confirm(`Send Order #${order.orderNumber} to Sendit?`)) {
                                                                sendToSendit(order)
                                                                    .then(() => toast.success("Order sent to Sendit!"))
                                                                    .catch(err => toast.error(err.message));
                                                            }
                                                        }}
                                                        disabled={
                                                            order.carrier === 'sendit'
                                                        }
                                                        className={`text-gray-400 hover:text-blue-600 ${!store?.senditPublicKey ? 'opacity-30 cursor-not-allowed' : ''
                                                            } ${order.carrier === 'sendit' ? 'text-green-500 hover:text-green-600' : ''}`}
                                                        title={!store?.senditPublicKey ? "Configure Sendit keys" : "Send to Sendit"}
                                                    >
                                                        <Truck className="h-4 w-4 text-orange-500" />
                                                    </button>
                                                    {order.labelUrl && (
                                                        <a
                                                            href={order.labelUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-gray-400 hover:text-blue-600"
                                                            title="Print Shipping Label"
                                                        >
                                                            <Printer className="h-4 w-4" />
                                                        </a>
                                                    )}
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
                                            {/* WhatsApp Notification */}
                                            <a
                                                href={getWhatsappLink(
                                                    order.clientPhone,
                                                    getWhatsappMessage(order.status, order, store)
                                                )}
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

            </div >

            {/* Mobile View (Cards) */}
            {/* Same MapPin generic replacement can be done here if needed, but skipped for brevity in plan */}

            <TrackingTimelineModal
                isOpen={isTrackingModalOpen}
                onClose={() => setIsTrackingModalOpen(false)}
                trackingData={trackingData}
                provider={trackingProvider}
            />

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
                {loading ? (
                    <div className="text-center py-10 text-gray-500">{t('msg_loading_orders')}</div>
                ) : filteredOrders.length === 0 ? (
                    <div className="text-center py-10 text-gray-500 bg-white rounded-lg shadow p-8">
                        <p>{t('msg_no_orders_filter')}</p>
                    </div>
                ) : (
                    filteredOrders.map((order) => {
                        const isSelected = selectedOrders.includes(order.id);
                        const waLink = getWhatsappLink(order.clientPhone, getWhatsappMessage(order.status, order, store));
                        const totalPrice = order.price ? (order.source === 'public_catalog' ? parseFloat(order.price).toFixed(2) : (order.price * order.quantity).toFixed(2)) : '-';

                        return (
                            <div
                                key={order.id}
                                className={`bg-white rounded-xl shadow-sm border p-4 transition-all ${isSelected ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-gray-100'}`}
                            >
                                {/* Header: Order ID, Date, Selection */}
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => handleSelectOne(order.id)} className="text-gray-400">
                                            {isSelected ? <CheckSquare className="h-6 w-6 text-indigo-600" /> : <Square className="h-6 w-6" />}
                                        </button>
                                        <div>
                                            <h3 className="font-bold text-gray-900">{order.orderNumber}</h3>
                                            <p className="text-xs text-gray-500">{order.date}</p>
                                        </div>
                                    </div>
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${activeTab === 'carts' ? 'bg-yellow-100 text-yellow-800' : getStatusColor(order.status)}`}>
                                        {activeTab === 'carts' ? 'Pending Action' : order.status}
                                    </span>
                                </div>

                                {/* Body: Client & Product Info */}
                                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                                    <div>
                                        <p className="text-xs text-gray-400 mb-1">Customer</p>
                                        <p className="font-semibold text-gray-900 truncate">{order.clientName}</p>
                                        <a href={`tel:${order.clientPhone}`} className="text-indigo-600 text-xs flex items-center gap-1 mt-1">
                                            {order.clientPhone}
                                        </a>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-gray-400 mb-1">Total</p>
                                        <p className="font-bold text-gray-900 text-base">{totalPrice} <span className="text-xs font-normal">{store?.currency || 'MAD'}</span></p>
                                        <p className="text-xs text-gray-500 truncate mt-1">{order.articleName} (x{order.quantity})</p>
                                    </div>
                                </div>

                                {/* Footer: Actions */}
                                <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                                    {/* Left: Payment Toggle */}
                                    <button
                                        onClick={() => togglePaid(order)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${order.isPaid
                                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                            }`}
                                    >
                                        <DollarSign className="h-3.5 w-3.5" />
                                        {order.isPaid ? "PAID" : "UNPAID"}
                                    </button>

                                    {activeTab === 'carts' ? (
                                        <>
                                            <button
                                                onClick={() => handleEdit(order)}
                                                className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium shadow-sm active:scale-95 transition-transform"
                                            >
                                                Confirm
                                            </button>
                                            <button
                                                onClick={() => deleteStoreItem(order.id)}
                                                className="p-2 rounded-full bg-red-50 text-red-600 hover:bg-red-100 border border-red-100"
                                            >
                                                <Trash2 className="h-5 w-5" />
                                            </button>
                                        </>
                                    ) : (
                                        <div className="flex items-center gap-3">
                                            {/* O-Livraison Action */}
                                            <button
                                                onClick={async () => {
                                                    if (!store?.olivraisonApiKey) {
                                                        toast.error("Please configure O-Livraison API Keys in Settings first.");
                                                        return;
                                                    }
                                                    if (order.carrier === 'olivraison') return; // Double check

                                                    if (window.confirm(`Send Order #${order.orderNumber} to O-Livraison?`)) {
                                                        try {
                                                            toast.loading("Sending to Carrier...");
                                                            await sendToOlivraison(order);
                                                            toast.dismiss();
                                                            toast.success("Order sent to O-Livraison!");
                                                        } catch (err) {
                                                            toast.dismiss();
                                                            toast.error(err.message);
                                                        }
                                                    }
                                                }}
                                                disabled={!store?.olivraisonApiKey || order.carrier === 'olivraison'}
                                                className={`p-2 rounded-full transition-colors ${!store?.olivraisonApiKey
                                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                    : order.carrier === 'olivraison'
                                                        ? 'bg-green-100 text-green-600 cursor-default'
                                                        : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                                                    }`}
                                                title={
                                                    !store?.olivraisonApiKey ? "Configure O-Livraison in Settings to enable"
                                                        : order.carrier === 'olivraison' ? "Order already sent to O-Livraison"
                                                            : "Send to O-Livraison"
                                                }
                                            >
                                                <Truck className="h-5 w-5" />
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    if (!store?.senditPublicKey) {
                                                        toast.error("Please configure Sendit API Keys in Settings first.");
                                                        return;
                                                    }
                                                    if (order.carrier === 'sendit') return;

                                                    if (window.confirm(`Send Order #${order.orderNumber} to Sendit?`)) {
                                                        try {
                                                            toast.loading("Sending to Sendit...");
                                                            await sendToSendit(order);
                                                            toast.dismiss();
                                                            toast.success("Order sent to Sendit!");
                                                        } catch (err) {
                                                            toast.dismiss();
                                                            toast.error(err.message);
                                                        }
                                                    }
                                                }}
                                                disabled={!store?.senditPublicKey || order.carrier === 'sendit'}
                                                className={`p-2 rounded-full transition-colors ${!store?.senditPublicKey
                                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                    : order.carrier === 'sendit'
                                                        ? 'bg-green-100 text-green-600 cursor-default'
                                                        : 'bg-orange-50 text-orange-600 hover:bg-orange-100'
                                                    }`}
                                                title={
                                                    !store?.senditPublicKey ? "Configure Sendit in Settings to enable"
                                                        : order.carrier === 'sendit' ? "Order already sent to Sendit"
                                                            : "Send to Sendit"
                                                }
                                            >
                                                <Truck className="h-5 w-5" />
                                            </button>
                                            {/* Amana Placeholder */}
                                            <button disabled className="p-2 rounded-full bg-gray-50 text-gray-300 cursor-not-allowed" title="Amana Integration Coming Soon">
                                                <Package className="h-5 w-5" />
                                            </button>
                                            {/* Cathedis Placeholder */}
                                            <button disabled className="p-2 rounded-full bg-gray-50 text-gray-300 cursor-not-allowed" title="Cathedis Integration Coming Soon">
                                                <Box className="h-5 w-5" />
                                            </button>
                                            {/* WhatsApp Notification */}
                                            <a
                                                href={waLink}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="p-2 rounded-full bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                                            >
                                                <MessageCircle className="h-5 w-5" />
                                            </a>
                                            <button
                                                onClick={() => handleEdit(order)}
                                                className="p-2 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                                            >
                                                <Edit2 className="h-5 w-5" />
                                            </button>
                                            {showTrash && (
                                                <button
                                                    onClick={() => handleRestore(order.id)}
                                                    className="p-2 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100"
                                                >
                                                    <RotateCcw className="h-5 w-5" />
                                                </button>
                                            )}
                                            {showTrash ? (
                                                <button
                                                    onClick={() => handleDelete(order.id)}
                                                    className="p-2 rounded-full bg-red-50 text-red-600 hover:bg-red-100"
                                                >
                                                    <Trash2 className="h-5 w-5" />
                                                </button>
                                            ) : null}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Pagination / Load More */}
            <div className="mt-4 flex justify-center">
                <Button
                    variant="secondary"
                    onClick={() => setLimitCount(prev => prev + 50)}
                    disabled={loading || orders.length < limitCount}
                >
                    {loading ? "Loading..." : "Load More"}
                </Button>
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
                templateHeaders={["Client", "Phone", "Address", "City", "Product", "Quantity", "Price", "Cost Price", "Status", "Date"]}
            />
        </div >
    );
}
