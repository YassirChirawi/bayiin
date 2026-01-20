import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingBag, DollarSign, AlertTriangle, Lightbulb, ExternalLink, Menu, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import DemoTour from "../components/DemoTour";

export default function DemoDashboard() {
    const navigate = useNavigate();

    // MOCK DATA
    const stats = {
        revenueToday: 1425.00,
        pendingOrders: 12,
        lowStockProducts: 3,
        salesTrend: [
            { date: 'Jan 14', revenue: 4200 },
            { date: 'Jan 15', revenue: 3800 },
            { date: 'Jan 16', revenue: 5100 },
            { date: 'Jan 17', revenue: 4900 },
            { date: 'Jan 18', revenue: 6200 },
            { date: 'Jan 19', revenue: 5800 },
            { date: 'Jan 20', revenue: 1425 },
        ],
        topProducts: [
            { name: "Wireless Headphones", count: 42 },
            { name: "Smart Watch", count: 38 },
            { name: "Running Shoes", count: 25 },
            { name: "Yoga Mat", count: 18 },
            { name: "Water Bottle", count: 15 },
        ]
    };

    const recentOrders = [
        { id: 1, orderNumber: "1024", status: "livré", price: 299, quantity: 1 },
        { id: 2, orderNumber: "1025", status: "packing", price: 149, quantity: 2 },
        { id: 3, orderNumber: "1026", status: "reçu", price: 599, quantity: 1 },
        { id: 4, orderNumber: "1027", status: "livré", price: 89, quantity: 3 },
        { id: 5, orderNumber: "1028", status: "reçu", price: 1299, quantity: 1 },
    ];

    // TOUR STEPS
    const tourSteps = [
        {
            title: "Welcome to your Dashboard",
            description: "Here you can see exactly how your business is performing in real-time.",
            position: { top: '100px', left: '50%', transform: 'translateX(-50%)' }
        },
        {
            title: "Track Revenue",
            description: "Monitor your daily earnings instantly.",
            position: { top: '220px', left: '25%' }
        },
        {
            title: "Action Items",
            description: "See pending orders and low stock alerts that need your attention.",
            position: { top: '220px', left: '60%' }
        },
        {
            title: "Sales Trends",
            description: "Analyze your growth trends over time.",
            position: { top: '550px', left: '30%' }
        }
    ];

    const [isTourOpen, setIsTourOpen] = useState(true);

    return (
        <div className="flex min-h-screen bg-gray-50 flex-col md:flex-row font-sans">
            {/* TOUR OVERLAY */}
            <DemoTour steps={tourSteps} isOpen={isTourOpen} onClose={() => setIsTourOpen(false)} />

            {/* FAKE SIDEBAR */}
            <div className="hidden md:flex flex-col w-64 bg-slate-900 text-white min-h-screen">
                <div className="p-4 flex items-center gap-3 border-b border-indigo-500/30 mb-6">
                    <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-xl">C</div>
                    <span className="font-bold text-lg">Commerce</span>
                </div>
                <nav className="flex-1 px-2 space-y-1">
                    <div className="px-2 py-2 mb-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Demo Mode
                    </div>
                    {['Dashboard', 'Orders', 'Products', 'Customers', 'Finances'].map(item => (
                        <div key={item} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${item === 'Dashboard' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}>
                            {item}
                            {item !== 'Dashboard' && <span className="ml-auto text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">Locked</span>}
                        </div>
                    ))}
                </nav>
                <div className="p-4 border-t border-slate-800">
                    <Link to="/signup" className="flex items-center justify-center gap-2 w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                        Start Real Trial
                    </Link>
                </div>
            </div>

            {/* MAIN CONTENT */}
            <main className="flex-1 overflow-auto h-[calc(100vh-65px)] md:h-screen w-full p-4 md:p-8">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            Welcome back, Demo Store! 👋
                        </h1>
                        <p className="mt-1 text-sm text-gray-500">
                            Here's what's happening in your store today.
                        </p>
                    </div>
                    <button
                        onClick={() => setIsTourOpen(true)}
                        className="text-sm text-indigo-600 font-medium hover:underline flex items-center gap-1"
                    >
                        <Lightbulb className="w-4 h-4" /> Restart Tour
                    </button>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 mb-8">
                    <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-100 p-5 relative group">
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

                {/* CHARTS */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    <div className="bg-white shadow rounded-lg border border-gray-100 p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Sales Trend</h3>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={stats.salesTrend}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} />
                                    <YAxis axisLine={false} tickLine={false} />
                                    <Tooltip />
                                    <Line type="monotone" dataKey="revenue" stroke="#4F46E5" strokeWidth={3} dot={{ r: 4 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-white shadow rounded-lg border border-gray-100 p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Top Products</h3>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.topProducts} layout="vertical" margin={{ left: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={100} />
                                    <Tooltip />
                                    <Bar dataKey="count" fill="#8B5CF6" radius={[0, 4, 4, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <div className="bg-white shadow rounded-lg border border-gray-100">
                            <div className="px-5 py-4 border-b border-gray-100">
                                <h3 className="text-lg font-medium text-gray-900">Recent Orders (Simulation)</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {recentOrders.map((order) => (
                                            <tr key={order.id}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">#{order.orderNumber}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${order.status === 'livré' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                        {order.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">{order.price} DH</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-1">
                        <div className="bg-indigo-900 rounded-lg shadow-lg text-white p-6 relative">
                            <h3 className="text-xl font-bold mb-4 relative z-10">Start for Free</h3>
                            <p className="text-indigo-200 mb-6 text-sm relative z-10">
                                Ready to get these insights for your own business?
                            </p>
                            <Link to="/signup" className="block w-full py-3 bg-white text-indigo-900 text-center font-bold rounded-lg hover:bg-indigo-50 transition-colors relative z-10">
                                Create Account
                            </Link>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
