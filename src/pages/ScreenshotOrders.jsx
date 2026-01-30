
import { useState } from "react";
import { Plus, Edit2, Trash2, QrCode, Search, X, FileText, CheckSquare, Square, Check, Trash, RotateCcw, Upload, Download, MessageCircle, DollarSign, AlertCircle, Truck, Package, Box } from "lucide-react";
import Button from "../components/Button";
import ScreenshotLayout from "../components/ScreenshotLayout";

export default function ScreenshotOrders() {
    const orders = [
        { id: 1, orderNumber: "CMD-83921", date: "2024-01-30", clientName: "Karim Benchrif", clientPhone: "0661123456", articleName: "Smart Watch Series 5", quantity: 1, price: 599.00, status: "livré", isPaid: true },
        { id: 2, orderNumber: "CMD-83920", date: "2024-01-30", clientName: "Sara Idrissi", clientPhone: "0662987654", articleName: "Wireless Headphones Pro", quantity: 1, price: 299.00, status: "packing", isPaid: false },
        { id: 3, orderNumber: "CMD-83919", date: "2024-01-29", clientName: "Mohamed Alami", clientPhone: "0663456789", articleName: "Running Shoes", quantity: 1, price: 450.00, status: "reçu", isPaid: false },
        { id: 4, orderNumber: "CMD-83918", date: "2024-01-29", clientName: "Fatima Zahra", clientPhone: "0664987123", articleName: "Organic Face Cream", quantity: 2, price: 180.00, status: "confirmation", isPaid: false },
        { id: 5, orderNumber: "CMD-83917", date: "2024-01-29", clientName: "Youssef Tazi", clientPhone: "0665123987", articleName: "Premium Yoga Mat", quantity: 1, price: 149.00, status: "retour", isPaid: false },
        { id: 6, orderNumber: "CMD-83916", date: "2024-01-28", clientName: "Houda Benjelloun", clientPhone: "0666789456", articleName: "Minimalist Backpack", quantity: 1, price: 320.00, status: "livré", isPaid: true },
        { id: 7, orderNumber: "CMD-83915", date: "2024-01-28", clientName: "Amine Kabbaj", clientPhone: "0667456123", articleName: "Smart Watch Series 5", quantity: 1, price: 599.00, status: "livraison", isPaid: false },
    ];

    const getStatusColor = (status) => {
        switch (status) {
            case 'livré': return 'bg-green-100 text-green-800';
            case 'retour': return 'bg-red-100 text-red-800';
            case 'annulé': return 'bg-gray-100 text-gray-400 line-through';
            case 'packing': return 'bg-yellow-100 text-yellow-800';
            case 'livraison': return 'bg-blue-100 text-blue-800';
            case 'confirmation': return 'bg-indigo-100 text-indigo-800';
            case 'reçu': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <ScreenshotLayout>
            <div className="space-y-6 font-sans text-slate-900">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Commandes</h1>
                        <p className="mt-1 text-sm text-gray-500">
                            Gérez vos commandes et expéditions
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="secondary" icon={Upload}>Importer</Button>
                        <Button variant="secondary" icon={Download}>Exporter</Button>
                        <Button icon={Plus}>Nouvelle Commande</Button>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex gap-4">
                    <div className="relative flex-1 max-w-md">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <input type="text" className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md bg-white text-sm" placeholder="Rechercher une commande..." />
                    </div>
                    <select className="block w-40 py-2 px-3 border border-gray-300 bg-white rounded-md text-sm">
                        <option>Tous les statuts</option>
                        <option>Livré</option>
                        <option>Reçu</option>
                    </select>
                </div>

                {/* Table */}
                <div className="bg-white shadow overflow-hidden sm:rounded-lg overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left"><Square className="h-5 w-5 text-gray-400" /></th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">N° Commande</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produit</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paiement</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {orders.map((order) => (
                                <tr key={order.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4"><Square className="h-5 w-5 text-gray-400 hover:text-gray-600 cursor-pointer" /></td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600">{order.orderNumber}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.date}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        <div className="font-medium">{order.clientName}</div>
                                        <div className="text-gray-500 text-xs">{order.clientPhone}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <div>{order.articleName}</div>
                                        <div className="text-xs text-gray-400">x{order.quantity}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                                        {(order.price * order.quantity).toFixed(2)} MAD
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${order.isPaid ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                            {order.isPaid ? 'PAYÉ' : 'NON PAYÉ'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}>
                                            {order.status.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex items-center justify-end gap-2">
                                            <button className="text-gray-400 hover:text-green-600"><MessageCircle className="h-4 w-4" /></button>
                                            <button className="text-gray-400 hover:text-blue-600"><FileText className="h-4 w-4" /></button>
                                            <button className="text-indigo-600 hover:text-indigo-900"><Edit2 className="h-4 w-4" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </ScreenshotLayout>
    );
}
