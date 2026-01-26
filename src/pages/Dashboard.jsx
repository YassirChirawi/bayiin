import { useTenant } from "../context/TenantContext";
import { useStoreData } from "../hooks/useStoreData";
import { useStoreStats } from "../hooks/useStoreStats"; // NEW HOOK
import { Link } from "react-router-dom";
import { ShoppingBag, DollarSign, AlertTriangle, Lightbulb, ExternalLink, RotateCcw, CheckCircle } from "lucide-react";
import { useMemo } from "react";
import { format, subDays } from "date-fns";
import { where, limit, orderBy } from "firebase/firestore";

import TrialAlert from "../components/TrialAlert";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

export default function Dashboard() {
    const { store } = useTenant();

    // 1. SCALABLE STATS (Server-Side Aggregation)
    const { stats: aggregatedStats, loading: statsLoading } = useStoreStats();

    // 2. Recent Orders (Only fetch 20 for the table, NOT 500 for stats)
    const recentOrdersConstraints = useMemo(() => [orderBy("date", "desc"), limit(20)], []);
    const { data: recentOrders, loading: ordersLoading } = useStoreData("orders", recentOrdersConstraints);

    // 3. Low Stock (Alerts only)
    const lowStockConstraints = useMemo(() => [where("stock", "<", 5), limit(20)], []);
    const { data: lowStockProducts } = useStoreData("products", lowStockConstraints);

    // Transform Data for UI
    const dashboardData = useMemo(() => {
        if (!aggregatedStats) return {
            revenueToday: 0,
            pendingOrders: 0,
            returnRate: 0,
            salesTrend: [],
            statusDistribution: []
        };

        const todayStr = new Date().toISOString().split('T')[0];

        // Revenue Today
        // The aggregated doc has 'daily.{date}.revenue'
        const revenueToday = aggregatedStats.daily?.[todayStr]?.revenue || 0;

        // Pending Orders (Reçu + Packing)
        const sCounts = aggregatedStats.statusCounts || {};
        const pendingOrders = (sCounts['reçu'] || 0) + (sCounts['packing'] || 0) + (sCounts['confirmation'] || 0);

        // Return Rate
        const totalCount = aggregatedStats.totals?.count || 1;
        const returnCount = sCounts['retour'] || 0;
        const returnRate = ((returnCount / totalCount) * 100).toFixed(1);

        // Sales Trend (Last 7 Days)
        const salesTrend = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateKey = d.toISOString().split('T')[0];
            const rev = aggregatedStats.daily?.[dateKey]?.revenue || 0;
            return {
                date: format(d, 'MMM dd'),
                revenue: rev
            };
        }).reverse();

        // Status Distribution
        const statusDistribution = Object.entries(sCounts).map(([name, value]) => ({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            value
        }));

        return {
            revenueToday,
            pendingOrders,
            returnRate,
            salesTrend,
            statusDistribution
        };
    }, [aggregatedStats]);


    if (!store) return null;

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
    const isLoading = statsLoading || ordersLoading;

    return (
        <div className="space-y-8">
            <TrialAlert createdAt={store?.createdAt} plan={store?.plan} />
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">
                    Welcome back, {store?.name}! 👋
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                    Here's what's happening in your store today.
                </p>

                {!isLoading && recentOrders.length === 0 && (
                    <div className="mt-6 bg-white rounded-lg shadow-sm border border-indigo-100 p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">🚀 Getting Started Checklist</h3>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white font-bold text-sm">1</span>
                                <div className="flex-1">
                                    <h4 className="text-sm font-semibold text-gray-900">Customize Store</h4>
                                    <p className="text-xs text-gray-600">Add your logo and company details in <Link to="/settings" className="text-indigo-600 underline">Settings</Link>.</p>
                                </div>
                                <div className="h-6 w-6 text-green-500">{store?.logoUrl ? <CheckCircle className="h-6 w-6" /> : <div className="h-6 w-6 border-2 border-gray-300 rounded-full"></div>}</div>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-gray-600 font-bold text-sm">2</span>
                                <div className="flex-1">
                                    <h4 className="text-sm font-semibold text-gray-900">Add Products</h4>
                                    <p className="text-xs text-gray-600">Go to <Link to="/products" className="text-indigo-600 underline">Products</Link> and add your inventory.</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-gray-600 font-bold text-sm">3</span>
                                <div className="flex-1">
                                    <h4 className="text-sm font-semibold text-gray-900">Create Order</h4>
                                    <p className="text-xs text-gray-600">Manually create a test order in <Link to="/orders" className="text-indigo-600 underline">Orders</Link> to see stats.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-100 p-5">
                    <div className="flex items-center">
                        <div className="flex-shrink-0 bg-indigo-50 rounded-md p-3">
                            <DollarSign className="h-6 w-6 text-indigo-600" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-gray-500 truncate">Revenue Today</dt>
                                <dd className="text-2xl font-semibold text-gray-900">
                                    {statsLoading ? "..." : (Math.max(0, dashboardData.revenueToday).toFixed(2) || "0.00")} DH
                                </dd>
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
                                <dd className="text-2xl font-semibold text-gray-900">
                                    {statsLoading ? "..." : dashboardData.pendingOrders}
                                </dd>
                            </dl>
                        </div>
                    </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-100 p-5">
                    <div className="flex items-center">
                        <div className="flex-shrink-0 bg-orange-50 rounded-md p-3">
                            <RotateCcw className="h-6 w-6 text-orange-600" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-gray-500 truncate">Return Rate</dt>
                                <dd className="text-2xl font-semibold text-gray-900">
                                    {statsLoading ? "..." : dashboardData.returnRate}%
                                </dd>
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
                                <dd className="text-2xl font-semibold text-gray-900">{lowStockProducts.length}</dd>
                            </dl>
                        </div>
                    </div>
                    {lowStockProducts.length > 0 && (
                        <div className="mt-4 border-t border-gray-100 pt-3">
                            <p className="text-xs font-medium text-gray-500 mb-2">Items needing restock:</p>
                            <ul className="space-y-1">
                                {lowStockProducts.slice(0, 3).map(p => (
                                    <li key={p.id} className="flex justify-between text-xs">
                                        <span className="text-gray-900 truncate">{p.name}</span>
                                        <span className="text-red-600 font-bold">{p.stock} left</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>

            {/* CHARTS SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Sales Trend Chart */}
                <div className="lg:col-span-2 bg-white shadow rounded-lg border border-gray-100 p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Sales Trend (Last 7 Days)</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={dashboardData.salesTrend}>
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

                {/* Status Distribution */}
                <div className="bg-white shadow rounded-lg border border-gray-100 p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Order Statuses</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={dashboardData.statusDistribution}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {dashboardData.statusDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
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
