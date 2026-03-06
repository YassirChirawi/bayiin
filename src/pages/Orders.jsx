import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { useStoreData } from "../hooks/useStoreData";
import { Plus, Upload, Download, Package, ShoppingCart, X } from "lucide-react";
import Button from "../components/Button";
import OrderModal from "../components/OrderModal";
import ConfirmationModal from "../components/ConfirmationModal";
import ImportModal from "../components/ImportModal";
import HelpTooltip from "../components/HelpTooltip";
import { useOrderActions } from "../hooks/useOrderActions";
import QRCode from "react-qr-code";
import { exportToCSV } from "../utils/csvHelper";
import { PAYMENT_STATUS } from "../utils/constants";
import { getOrderStatusConfig } from "../utils/statusConfig";

import { useTenant } from "../context/TenantContext";
import { useLanguage } from "../context/LanguageContext";
import { db } from "../lib/firebase";
import { doc, writeBatch } from "firebase/firestore";
import { logActivity } from "../utils/logger";
import { useAuth } from "../context/AuthContext";
import TrackingTimelineModal from "../components/TrackingTimelineModal";
import { getPackageStatus, authenticateSendit, requestSenditPickup } from "../lib/sendit";
import { authenticateOlivraison } from "../lib/olivraison";

// Custom Hooks
import { useOrderFilters } from "../hooks/useOrderFilters";
import { useOrderBulkActions } from "../hooks/useOrderBulkActions";

// Extracted UI Components
import OrderFilters from "../components/orders/OrderFilters";
import OrderBulkActions from "../components/orders/OrderBulkActions";
import OrderTable from "../components/orders/OrderTable";
import OrderMobileList from "../components/orders/OrderMobileList";

export default function Orders() {
    const { store } = useTenant();
    const { t } = useLanguage();
    const { user } = useAuth();
    const { sendToOlivraison, sendToSendit } = useOrderActions();

    // TAB STATE
    const [activeTab, setActiveTab] = useState('orders');
    const [showTrash, setShowTrash] = useState(false);

    // Filters Hook
    const filterState = useOrderFilters(activeTab, showTrash, 50);

    // Data Fetching
    const { data: orders, loading, addStoreItem, deleteStoreItem, restoreStoreItem, permanentDeleteStoreItem } = useStoreData("orders", filterState.orderConstraints);
    const filteredOrders = filterState.filterData(orders);

    // Modals & UI State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [editingOrder, setEditingOrder] = useState(null);
    const [qrOrder, setQrOrder] = useState(null);
    const [isInternalPickupModalOpen, setIsInternalPickupModalOpen] = useState(false);
    const [internalDriverToken, setInternalDriverToken] = useState("");
    const [isPickupLoading, setIsPickupLoading] = useState(false);

    // Tracking Modal State
    const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
    const [trackingData, setTrackingData] = useState(null);
    const [trackingProvider, setTrackingProvider] = useState(null);

    // Confirmation Modal
    const [confirmationModal, setConfirmationModal] = useState({ isOpen: false, title: "", message: "", onConfirm: () => {}, isDestructive: false });
    const openConfirmation = (options) => setConfirmationModal({ ...options, isOpen: true });
    const closeConfirmation = () => setConfirmationModal(prev => ({ ...prev, isOpen: false }));

    // Bulk Actions Hook
    const bulkActions = useOrderBulkActions(orders, store?.id, user, {
        deleteStoreItem, restoreStoreItem, permanentDeleteStoreItem, logActivity, openConfirmation
    });

    // AUTO-CLEANUP Carts
    useEffect(() => {
        if (!orders.length) return;
        const cleanupOldCarts = async () => {
             const now = new Date();
             const twoDaysAgo = new Date(now.getTime() - (48 * 60 * 60 * 1000));
             const oldCarts = orders.filter(o => o.status === 'pending_catalog' && o.createdAt && new Date(o.createdAt.seconds * 1000) < twoDaysAgo);
             if (oldCarts.length > 0) {
                 const batch = writeBatch(db);
                 oldCarts.forEach(cart => batch.delete(doc(db, "orders", cart.id)));
                 try { await batch.commit(); } catch (e) { console.error(e); }
             }
        };
        cleanupOldCarts();
    }, [orders]);

    // Fast Single Actions
    const togglePaid = async (order) => {
        if (!store?.id) return;
        try {
            const batch = writeBatch(db);
            const newIsPaid = !order.isPaid;
            batch.update(doc(db, "orders", order.id), { isPaid: newIsPaid });
            await batch.commit();
            logActivity(db, store.id, user, 'PAYMENT_UPDATE', `Order ${order.orderNumber} ${newIsPaid ? 'PAID' : 'UNPAID'}`, { orderId: order.id, newIsPaid });
            toast.success(newIsPaid ? t('msg_payment_marked') : t('msg_payment_cancelled'));
        } catch (err) { toast.error(t('err_update_payment')); }
    };

    const handleOpenTracking = async (order) => {
        if (!order.trackingId) { toast.error("Aucun numéro de suivi disponible."); return; }
        const provider = order.carrier || (order.livreurToken ? 'internal' : 'sendit');
        setTrackingProvider(provider);
        setTrackingData(null);
        setIsTrackingModalOpen(true);
        if (provider === 'internal') { setTrackingData(order); return; }
        try {
            if (provider === 'sendit') {
                const token = await authenticateSendit(store.senditPublicKey, store.senditSecretKey);
                const data = await getPackageStatus(token, order.trackingId);
                setTrackingData(data);
            } else if (provider === 'olivraison') {
                setTrackingData({ code: order.trackingId, status: order.carrierStatus || 'UNKNOWN', audits: [] });
            }
        } catch (error) { toast.error("Erreur de suivi."); setIsTrackingModalOpen(false); }
    };

    const handleDelete = async (id) => {
        const title = showTrash ? t('confirm_permanent_delete') : t('confirm_trash');
        openConfirmation({
            title, message: title, isDestructive: true,
            onConfirm: async () => {
                showTrash ? await permanentDeleteStoreItem(id) : await deleteStoreItem(id);
                bulkActions.setSelectedOrders(prev => prev.filter(oid => oid !== id));
                if (!showTrash) logActivity(db, store.id, user, 'ORDER_DELETE', `Order ${id} trashed`, { orderId: id });
                toast.success(t('msg_order_deleted'));
            }
        });
    };

    const handleRestore = async (id) => {
        await restoreStoreItem(id);
        bulkActions.setSelectedOrders(prev => prev.filter(oid => oid !== id));
        toast.success(t('msg_order_restored'));
    };

    const handleExportCSV = () => {
        const dataToExport = orders.map(o => ({ 'Order #': o.orderNumber, Date: o.date, Client: o.clientName, Phone: o.clientPhone, Status: o.status, Product: o.articleName, Quantity: o.quantity, Price: o.price, Total: o.price ? o.price * o.quantity : 0 }));
        exportToCSV(dataToExport, 'orders');
    };

    const handleImport = async (data) => {
         let importedCount = 0;
         const promises = data.map(row => {
             if (!row.Client || !row.Product) return null;
             return addStoreItem({
                 orderNumber: row['Order #'] || `CMD-${Math.floor(100000 + Math.random() * 900000)}`,
                 clientName: row.Client, clientPhone: row.Phone || "", clientAddress: row.Address || "", clientCity: row.City || "",
                 articleName: row.Product, articleId: "", quantity: parseInt(row.Quantity) || 1, price: parseFloat(row.Price) || 0,
                 costPrice: parseFloat(row['Cost Price'] || row['Cost']) || 0, status: row.Status || "reçu", date: row.Date || new Date().toISOString().split('T')[0]
             }).then(() => { importedCount++; }).catch(console.error);
         });
         await Promise.all(promises);
         toast.success(t('success_import', { count: importedCount }));
    };

    const handleRequestPickup = async () => {
        const senditOrders = orders.filter(o => bulkActions.selectedOrders.includes(o.id) && o.carrier === 'sendit' && o.trackingId);
        if (senditOrders.length === 0) return toast.error("Aucune commande Sendit valide sélectionnée.");
        openConfirmation({
            title: "Confirmer Ramassage", message: `Demander le ramassage pour ${senditOrders.length} colis ?`,
            onConfirm: async () => {
                setIsPickupLoading(true);
                try {
                    const token = await authenticateSendit(store.senditPublicKey, store.senditSecretKey);
                    await requestSenditPickup(token, store, senditOrders.map(o => o.trackingId));
                    toast.success("Demande de ramassage envoyée !");
                    bulkActions.setSelectedOrders([]);
                } catch (error) { toast.error(error.message); } finally { setIsPickupLoading(false); }
            }
        });
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        {t('page_title_orders')} <HelpTooltip topic="orders" />
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">{t('page_subtitle_orders')}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" icon={Upload} onClick={() => setIsImportModalOpen(true)}>{t('btn_import')}</Button>
                    <Button variant="secondary" icon={Download} onClick={handleExportCSV} disabled={orders.length === 0}>{t('btn_export')}</Button>
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button onClick={() => setShowTrash(false)} className={`px-3 py-1 text-sm font-medium rounded-md ${!showTrash ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>{t('label_active')}</button>
                        <button onClick={() => setShowTrash(true)} className={`px-3 py-1 text-sm font-medium rounded-md ${showTrash ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500'}`}>{t('label_trash')}</button>
                    </div>
                </div>
            </div>

            {/* Tabs */}
             <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button onClick={() => setActiveTab('orders')} className={`${activeTab === 'orders' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}><Package className="h-5 w-5"/> {t('tab_orders')}</button>
                    <button onClick={() => setActiveTab('carts')} className={`${activeTab === 'carts' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}><ShoppingCart className="h-5 w-5"/> {t('tab_carts')}
                         {orders.filter(o => o.status === 'pending_catalog').length > 0 && <span className="bg-red-100 text-red-600 py-0.5 px-2.5 rounded-full text-xs font-bold">{orders.filter(o => o.status === 'pending_catalog').length}</span>}
                    </button>
                </nav>
            </div>

            <OrderFilters {...filterState} showTrash={showTrash} setShowTrash={setShowTrash} handleSearch={() => filterState.setActiveSearch(filterState.searchTerm)} handleKeyDown={(e) => e.key === 'Enter' && filterState.setActiveSearch(filterState.searchTerm)} clearSearch={() => {filterState.setSearchTerm(""); filterState.setActiveSearch("");}} setIsModalOpen={setIsModalOpen} t={t} />

            <OrderBulkActions {...bulkActions} handleSelectAll={() => bulkActions.handleSelectAll(filteredOrders)} filteredOrdersCount={filteredOrders.length} activeTab={activeTab} showTrash={showTrash} store={store} t={t} handleRequestPickup={handleRequestPickup} setIsInternalPickupModalOpen={setIsInternalPickupModalOpen} />

            {loading ? <div className="text-center py-10 text-gray-500">{t('msg_loading_orders')}</div> : filteredOrders.length === 0 ? <div className="text-center py-10 text-gray-500 bg-white rounded-lg shadow p-8"><p>{t('msg_no_orders_filter')}</p></div> : (
                <>
                    <div className="hidden md:block">
                        <OrderTable orders={filteredOrders} selectedOrders={bulkActions.selectedOrders} handleSelectAll={() => bulkActions.handleSelectAll(filteredOrders)} handleSelectOne={bulkActions.handleSelectOne} activeTab={activeTab} showTrash={showTrash} store={store} togglePaid={togglePaid} handleEdit={(o) => {setEditingOrder(o); setIsModalOpen(true);}} deleteStoreItem={deleteStoreItem} handleRestore={handleRestore} handleDelete={handleDelete} openConfirmation={openConfirmation} sendToOlivraison={sendToOlivraison} sendToSendit={sendToSendit} handleOpenTracking={handleOpenTracking} setQrOrder={setQrOrder} t={t} />
                    </div>
                    <OrderMobileList orders={filteredOrders} selectedOrders={bulkActions.selectedOrders} handleSelectOne={bulkActions.handleSelectOne} activeTab={activeTab} showTrash={showTrash} store={store} togglePaid={togglePaid} handleEdit={(o) => {setEditingOrder(o); setIsModalOpen(true);}} deleteStoreItem={deleteStoreItem} handleRestore={handleRestore} handleDelete={handleDelete} openConfirmation={openConfirmation} sendToOlivraison={sendToOlivraison} sendToSendit={sendToSendit} handleOpenTracking={handleOpenTracking} setQrOrder={setQrOrder} t={t} />
                </>
            )}

            <div className="flex justify-center mt-4">
                 <Button variant="secondary" onClick={() => filterState.setLimitCount(prev => prev + 50)} disabled={loading || orders.length < filterState.limitCount}>{loading ? "Loading..." : "Load More"}</Button>
            </div>

            {/* Modals */}
            <OrderModal isOpen={isModalOpen} onClose={() => {setIsModalOpen(false); setEditingOrder(null);}} onSave={() => {setIsModalOpen(false); setEditingOrder(null);}} order={editingOrder} />
            <ConfirmationModal isOpen={confirmationModal.isOpen} onClose={closeConfirmation} onConfirm={confirmationModal.onConfirm} title={confirmationModal.title} message={confirmationModal.message} isDestructive={confirmationModal.isDestructive} />
            <ImportModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} onImport={handleImport} title="Import Orders" templateHeaders={["Client", "Phone", "Address", "City", "Product", "Quantity", "Price", "Cost Price", "Status", "Date"]} />
            <TrackingTimelineModal isOpen={isTrackingModalOpen} onClose={() => setIsTrackingModalOpen(false)} trackingData={trackingData} provider={trackingProvider} />

            {qrOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full relative text-center">
                        <button onClick={() => setQrOrder(null)} className="absolute top-4 right-4 text-gray-400"><X className="h-6 w-6" /></button>
                        <h3 className="text-lg font-bold mb-4">Scan Code</h3>
                        <div className="flex justify-center p-4"><QRCode value={JSON.stringify({id: qrOrder.id, number: qrOrder.orderNumber, client: qrOrder.clientName, phone: qrOrder.clientPhone})} size={200} /></div>
                        <p className="mt-4 text-sm text-gray-500 break-all">#{qrOrder.orderNumber}</p>
                    </div>
                </div>
            )}

            {isInternalPickupModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full relative">
                        <button onClick={() => setIsInternalPickupModalOpen(false)} className="absolute top-4 right-4 text-gray-400"><X className="h-6 w-6"/></button>
                        <h3 className="text-lg font-bold mb-2">Assigner Livreur ({bulkActions.selectedOrders.length})</h3>
                        <form onSubmit={(e) => { e.preventDefault(); bulkActions.handleInternalPickup(internalDriverToken, setIsPickupLoading, setIsInternalPickupModalOpen, setInternalDriverToken); }}>
                            <input type="text" value={internalDriverToken} onChange={e => setInternalDriverToken(e.target.value)} placeholder="Token Livreur (ex: L-123)" className="w-full px-4 py-3 border rounded-xl mb-4 focus:ring-2 focus:ring-indigo-500 outline-none" required />
                            <Button type="submit" className="w-full justify-center bg-indigo-600 text-white" disabled={isPickupLoading}>{isPickupLoading ? "Assignation..." : "Assigner & Demander Ramassage"}</Button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
