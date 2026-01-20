import { useState } from "react";
import { useStoreData } from "../hooks/useStoreData";
import { Plus, Edit2, Trash2, QrCode, Search, X, FileText, CheckSquare, Square, Check, Trash, RotateCcw } from "lucide-react";
import Button from "../components/Button";
import OrderModal from "../components/OrderModal";
import QRCode from "react-qr-code";
import { generateInvoice } from "../utils/generateInvoice";

import { useTenant } from "../context/TenantContext";
import { db } from "../lib/firebase";
import { doc, updateDoc, increment, getDoc } from "firebase/firestore";

const INACTIVE_STATUSES = ['retour', 'annulé'];

export default function Orders() {
    const { store } = useTenant();
    const { data: orders, loading, addStoreItem, updateStoreItem, deleteStoreItem, restoreStoreItem, permanentDeleteStoreItem } = useStoreData("orders");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingOrder, setEditingOrder] = useState(null);
    const [qrOrder, setQrOrder] = useState(null); // Order selected for QR display
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedOrders, setSelectedOrders] = useState([]); // Selected IDs
    const [showTrash, setShowTrash] = useState(false);

    const handleSave = async (orderData) => {
        if (editingOrder) {
            await updateStoreItem(editingOrder.id, orderData);
        } else {
            // Generate a simple Order Number if new
            const orderNumber = `CMD-${Math.floor(100000 + Math.random() * 900000)}`;
            await addStoreItem({ ...orderData, orderNumber });
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
            }
        } else {
            if (window.confirm("Are you sure you want to move this order to trash?")) {
                await deleteStoreItem(id);
                setSelectedOrders(prev => prev.filter(oid => oid !== id));
            }
        }
    };

    const handleRestore = async (id) => {
        await restoreStoreItem(id);
        setSelectedOrders(prev => prev.filter(oid => oid !== id));
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
        }
    };

    const handleBulkRestore = async () => {
        if (window.confirm(`Restore ${selectedOrders.length} orders?`)) {
            await Promise.all(selectedOrders.map(id => restoreStoreItem(id)));
            setSelectedOrders([]);
        }
    };

    const handleBulkStatus = async (status) => {
        if (!window.confirm(`Mark ${selectedOrders.length} orders as ${status}?`)) return;

        setLoading(true); // Manually toggle loading if possible, or just blocking
        try {
            await Promise.all(selectedOrders.map(async (id) => {
                const order = orders.find(o => o.id === id);
                if (!order) return;

                // Stock Automation Logic
                const isNewStatusInactive = INACTIVE_STATUSES.includes(status);
                const isOldStatusInactive = INACTIVE_STATUSES.includes(order.status);

                // Only act if status "category" changes (Active <-> Inactive) AND we have an articleId
                if (order.articleId && isNewStatusInactive !== isOldStatusInactive) {
                    const productRef = doc(db, "products", order.articleId);
                    const qty = parseInt(order.quantity) || 1;

                    if (isNewStatusInactive) {
                        // Returning to stock (Order Cancelled/Returned)
                        await updateDoc(productRef, { stock: increment(qty) });
                    } else {
                        // Deducting from stock (Order Reactivated)
                        await updateDoc(productRef, { stock: increment(-qty) });
                    }
                }

                return updateStoreItem(id, { status });
            }));
            setSelectedOrders([]);
        } catch (err) {
            console.error("Error updating statuses:", err);
            alert("Failed to update some orders.");
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'livré': return 'bg-green-100 text-green-800';
            case 'retour': return 'bg-red-100 text-red-800';
            case 'annulé': return 'bg-gray-100 text-gray-400 line-through';
            case 'packing': return 'bg-yellow-100 text-yellow-800';
            case 'livraison': return 'bg-blue-100 text-blue-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const filteredOrders = orders
        .filter(o => showTrash ? o.deleted : !o.deleted)
        .filter(o =>
            o.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            o.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            o.clientPhone?.includes(searchTerm)
        );

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
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex gap-4">
                <div className="relative flex-1 max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition duration-150 ease-in-out"
                        placeholder="Search by Client, Phone or Order #..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
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
        </div >
    );
}
