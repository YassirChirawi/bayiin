import { useStoreData } from "../hooks/useStoreData";
import { X, Package, Calendar } from "lucide-react";
import Button from "./Button";

export default function CustomerDetailModal({ isOpen, onClose, customer }) {
    const { data: allOrders, loading } = useStoreData("orders");

    if (!isOpen || !customer) return null;

    const customerOrders = allOrders
        .filter(o => o.customerId === customer.id)
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    // Stats specific to history (re-calculated to be sure, or use customer stats)
    const totalSpent = customer.totalSpent || 0;
    const orderCount = customer.orderCount || 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl overflow-hidden my-8">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h2 className="text-xl font-bold text-gray-900">
                        Customer Profile
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="p-6">
                    {/* Header Info */}
                    <div className="flex flex-col md:flex-row justify-between gap-6 mb-8">
                        <div>
                            <h3 className="text-2xl font-bold text-gray-900">{customer.name}</h3>
                            <div className="mt-2 text-sm text-gray-500 space-y-1">
                                <p>Phone: <span className="text-gray-900 font-medium">{customer.phone}</span></p>
                                <p>Address: <span className="text-gray-900 font-medium">{customer.address}, {customer.city}</span></p>
                                <p>First Order: <span className="text-gray-900 font-medium">{customer.firstOrderDate || '-'}</span></p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="bg-indigo-50 p-4 rounded-xl text-center min-w-[120px]">
                                <p className="text-sm text-indigo-600 font-medium">Lifetime Value</p>
                                <p className="text-2xl font-bold text-indigo-900">{totalSpent.toFixed(2)} DH</p>
                            </div>
                            <div className="bg-green-50 p-4 rounded-xl text-center min-w-[120px]">
                                <p className="text-sm text-green-600 font-medium">Orders</p>
                                <p className="text-2xl font-bold text-green-900">{orderCount}</p>
                            </div>
                        </div>
                    </div>

                    {/* Order History */}
                    <div>
                        <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Package className="h-5 w-5 text-gray-400" />
                            Order History
                        </h4>

                        <div className="bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
                            {loading ? (
                                <div className="p-4 text-center text-gray-500">Loading history...</div>
                            ) : customerOrders.length === 0 ? (
                                <div className="p-4 text-center text-gray-500">No orders found linked to this profile.</div>
                            ) : (
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-100">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order #</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {customerOrders.map((order) => (
                                            <tr key={order.id}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {order.date}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600">
                                                    {order.orderNumber}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {order.articleName}
                                                    <span className="text-gray-400 text-xs ml-1">({order.quantity})</span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    {(order.price * order.quantity).toFixed(2)} DH
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                        ${order.status === 'livré' ? 'bg-green-100 text-green-800' :
                                                            order.status === 'retour' ? 'bg-red-100 text-red-800' :
                                                                'bg-yellow-100 text-yellow-800'}`}>
                                                        {order.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>

                <div className="bg-gray-50 px-6 py-4 flex justify-end">
                    <Button variant="secondary" onClick={onClose}>
                        Close
                    </Button>
                </div>
            </div>
        </div>
    );
}
