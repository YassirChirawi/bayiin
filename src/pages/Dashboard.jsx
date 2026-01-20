import { useTenant } from "../context/TenantContext";
import { useStoreData } from "../hooks/useStoreData";
import { Link } from "react-router-dom";
import { ShoppingBag, DollarSign, Package, AlertTriangle, Lightbulb, ExternalLink } from "lucide-react";
import { useMemo } from "react";
import { format, isSameDay, parseISO } from "date-fns";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';

export default function Dashboard() {
    const { store } = useTenant();
    const { data: orders, loading: ordersLoading } = useStoreData("orders");
    const { data: products, loading: productsLoading } = useStoreData("products");

    // Calculate Dashboard KPIs
    const stats = useMemo(() => {
        const today = new Date();
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return format(d, 'yyyy-MM-dd');
        }).reverse();

        // 1. Sales Trend Data
        const salesTrend = last7Days.map(date => {
            const dayOrders = orders.filter(o => o.date === date);
            const revenue = dayOrders.reduce((sum, o) => sum + ((parseFloat(o.price) || 0) * (parseInt(o.quantity) || 1)), 0);
            return { date: format(parseISO(date), 'MMM dd'), revenue };
        });

        // 2. Top Products Data
        const productMap = {};
        orders.forEach(o => {
            if (o.articleName) {
                productMap[o.articleName] = (productMap[o.articleName] || 0) + (parseInt(o.quantity) || 1);
            }
        });
        const topProducts = Object.entries(productMap)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);


        let revenueToday = 0;
        let pendingOrders = 0;

        orders.forEach(order => {
            // Revenue Today
            if (order.date && isSameDay(parseISO(order.date), today)) {
                revenueToday += (parseFloat(order.price) || 0) * (parseInt(order.quantity) || 1);
            }
            // Pending Orders
            if (['reçu', 'packing'].includes(order.status)) {
                pendingOrders++;
            }
        });

        const lowStockProducts = products.filter(p => (parseInt(p.stock) || 0) < 5).length;

        return {
            revenueToday,
            pendingOrders,
            lowStockProducts,
            totalOrders: orders.length,
            salesTrend,
            topProducts
        };
    }, [orders, products]);

    const recentOrders = orders
        .slice()
        .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt))
        .slice(0, 5);

    if (!store) return null;

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">
                    Welcome back, {store?.name}! 👋
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                    Here's what's happening in your store today.
                </p>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-100 p-5">
                    <div className="flex items-center">
                        <div className="flex-shrink-0 bg-indigo-50 rounded-md p-3">
                            <DollarSign className="h-6 w-6 text-indigo-600" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-gray-500 truncate">Revenue Today</dt>
                                <dd className="text-2xl font-semibold text-gray-900">{stats.revenueToday.toFixed(2)} DH</dd>
                            </dl>
                        </div>
                    </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-100 p-5">
                    <div className="flex items-center">
                        <div className="flex-shrink-0 bg-yellow-50 rounded-md p-3">
                            <ShoppingBag className="h-6 w-6 text-yellow-600" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-gray-500 truncate">Pending Orders</dt>
                                <dd className="text-2xl font-semibold text-gray-900">{stats.pendingOrders}</dd>
                            </dl>
                        </div>
                    </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-100 p-5">
                    <div className="flex items-center">
                        <div className="flex-shrink-0 bg-red-50 rounded-md p-3">
                            <AlertTriangle className="h-6 w-6 text-red-600" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-gray-500 truncate">Low Stock Alert</dt>
                                <dd className="text-2xl font-semibold text-gray-900">{stats.lowStockProducts}</dd>
                            </dl>
                        </div>
                    </div>
                </div>
            </div>

            {/* CHARTS SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Sales Trend Chart */}
                <div className="bg-white shadow rounded-lg border border-gray-100 p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Sales Trend (Last 7 Days)</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={stats.salesTrend}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#4F46E5"
                                    strokeWidth={3}
                                    dot={{ r: 4, fill: '#4F46E5', strokeWidth: 2, stroke: '#fff' }}
                                    activeDot={{ r: 6 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Products Chart */}
                <div className="bg-white shadow rounded-lg border border-gray-100 p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Top 5 Products</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.topProducts} layout="vertical" margin={{ left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    axisLine={false}
                                    tickLine={false}
                                    width={100}
                                    tick={{ fontSize: 12, fill: '#374151' }}
                                />
                                <Tooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '8px' }} />
                                <Bar dataKey="count" fill="#8B5CF6" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Orders */}
                <div className="lg:col-span-2">
                    <div className="bg-white shadow rounded-lg border border-gray-100">
                        <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="text-lg font-medium text-gray-900">Recent Orders</h3>
                            <Link to="/orders" className="text-sm text-indigo-600 hover:text-indigo-900 flex items-center">
                                View all <ExternalLink className="ml-1 h-3 w-3" />
                            </Link>
                        </div>
                        <div className="overflow-x-auto">
                            {ordersLoading ? (
                                <div className="p-4 text-center">Loading...</div>
                            ) : recentOrders.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">No orders yet.</div>
                            ) : (
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order #</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {recentOrders.map((order) => (
                                            <tr key={order.id}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    #{order.orderNumber}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                        ${order.status === 'livré' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                        {order.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                                                    {((parseFloat(order.price) || 0) * (parseInt(order.quantity) || 1)).toFixed(2)} DH
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>

                {/* Functional Tips */}
                <div className="lg:col-span-1">
                    <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-lg shadow-lg text-white p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Lightbulb className="h-6 w-6 text-yellow-300" />
                            <h3 className="text-lg font-bold">Pro Functional Tips</h3>
                        </div>
                        <p className="text-indigo-100 mb-6 text-sm">
                            Ready to scale? Here are suggested features for your next upgrade:
                        </p>

                        <div className="space-y-4">
                            <div className="bg-white/10 p-3 rounded-lg backdrop-blur-sm">
                                <h4 className="font-semibold text-sm">📣 Marketing Automation</h4>
                                <p className="text-xs text-indigo-200 mt-1">
                                    Send automatic SMS/Emails to customers when status changes to 'Delivered'.
                                </p>
                            </div>

                            <div className="bg-white/10 p-3 rounded-lg backdrop-blur-sm">
                                <h4 className="font-semibold text-sm">🤝 Customer CRM</h4>
                                <p className="text-xs text-indigo-200 mt-1">
                                    Track "Top Spenders" and offer them loyalty discounts automatically.
                                </p>
                            </div>

                            <div className="bg-white/10 p-3 rounded-lg backdrop-blur-sm">
                                <h4 className="font-semibold text-sm">📦 Inventory Prediction</h4>
                                <p className="text-xs text-indigo-200 mt-1">
                                    Use AI to predict "Out of Stock" dates based on sales velocity.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
