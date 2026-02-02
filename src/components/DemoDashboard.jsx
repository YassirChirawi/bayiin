import { ShoppingBag, DollarSign, AlertTriangle, Lightbulb, RotateCcw, CheckCircle, RefreshCw } from "lucide-react";
import { useMemo } from "react";
import { format, subDays } from "date-fns";
import { useLanguage } from "../context/LanguageContext";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

export default function DemoDashboard() {
    const { t, language } = useLanguage();
    const isRTL = language === 'ar';

    // MOCK DATA
    const dashboardData = {
        revenueToday: 12450.00,
        pendingOrders: 12,
        returnRate: 4.5,
        salesTrend: Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return {
                date: format(d, 'MMM dd'),
                revenue: Math.floor(Math.random() * 5000) + 1000
            };
        }).reverse(),
        statusDistribution: [
            { name: "Livré", value: 45 },
            { name: "En cours", value: 20 },
            { name: "Retour", value: 5 },
            { name: "Annulé", value: 2 }
        ]
    };

    const lowStockProducts = [
        { id: 1, name: "Premium Watch Gold", stock: 2 },
        { id: 2, name: "Leather Wallet", stock: 4 }
    ];

    const tasks = [
        { id: 1, clientName: "Ahmed Benali", followUpNote: "Rappeler pour confirmation", clientPhone: "0600123456", followUpDate: new Date().toISOString() },
        { id: 2, clientName: "Sarah Idrissi", followUpNote: "Changement d'adresse", clientPhone: "0611223344", followUpDate: new Date().toISOString() }
    ];

    const COLORS = ['#0088FE', '#00C49F', '#FF8042', '#FF4444']; // Livré, En cours, Retour, Annulé

    return (
        <div className={`space-y-6 p-6 bg-slate-50/50 ${isRTL ? 'font-arabic' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>

            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {t('welcome_back').replace('{name}', 'Demo Store')}
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        {t('dashboard_subtitle')}
                    </p>
                </div>
                <div className="p-2 rounded-lg bg-white border border-gray-200 text-gray-400">
                    <RefreshCw className="h-5 w-5" />
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
                    <div className="flex items-center">
                        <div className="flex-shrink-0 bg-indigo-50 rounded-md p-3">
                            <DollarSign className="h-6 w-6 text-indigo-600" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-gray-500 truncate">{t('kpi_revenue_today')}</dt>
                                <dd className="text-2xl font-semibold text-gray-900">
                                    {dashboardData.revenueToday.toLocaleString()} DH
                                </dd>
                            </dl>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
                    <div className="flex items-center">
                        <div className="flex-shrink-0 bg-yellow-50 rounded-md p-3">
                            <ShoppingBag className="h-6 w-6 text-yellow-600" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-gray-500 truncate">{t('kpi_pending_orders')}</dt>
                                <dd className="text-2xl font-semibold text-gray-900">
                                    {dashboardData.pendingOrders}
                                </dd>
                            </dl>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
                    <div className="flex items-center">
                        <div className="flex-shrink-0 bg-orange-50 rounded-md p-3">
                            <RotateCcw className="h-6 w-6 text-orange-600" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-gray-500 truncate">{t('kpi_return_rate')}</dt>
                                <dd className="text-2xl font-semibold text-gray-900">
                                    {dashboardData.returnRate}%
                                </dd>
                            </dl>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
                    <div className="flex items-center">
                        <div className="flex-shrink-0 bg-red-50 rounded-md p-3">
                            <AlertTriangle className="h-6 w-6 text-red-600" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-gray-500 truncate">{t('kpi_low_stock')}</dt>
                                <dd className="text-2xl font-semibold text-gray-900">{lowStockProducts.length}</dd>
                            </dl>
                        </div>
                    </div>
                </div>
            </div>

            {/* Dashboard 2-column Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column (Charts & Tasks) */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Sales Trend Chart */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">{t('chart_sales_trend')}</h3>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={dashboardData.salesTrend}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} tickFormatter={(val) => `${val} DH`} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        formatter={(value) => [`${value} DH`, t('chart_revenue_tooltip')]}
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

                    {/* Pending Tasks (Follow-ups) Widget */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-yellow-100/50">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <CheckCircle className="h-5 w-5 text-yellow-600" />
                                {t('todo_list')}
                            </h3>
                            <button className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">{t('view_details')}</button>
                        </div>

                        <div className="space-y-3">
                            {tasks.map(task => (
                                <div key={task.id} className="flex items-start justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                                    <div>
                                        <p className="font-semibold text-gray-900 text-sm">{task.clientName}</p>
                                        <p className="text-xs text-yellow-800 mt-1">
                                            {task.followUpNote}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {t('label_phone_short')} {task.clientPhone}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-white text-gray-800 border border-gray-200 shadow-sm">
                                            {format(new Date(task.followUpDate), 'MMM dd, HH:mm')}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column (Pie Chart & Orders) */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Status Breakdown (Pie Chart) */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">{t('chart_order_status')}</h3>
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

                    {/* Functional Tips */}
                    <div className="lg:col-span-1">
                        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-lg shadow-lg text-white p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Lightbulb className="h-6 w-6 text-yellow-300" />
                                <h3 className="text-lg font-bold">{t('pro_tips')}</h3>
                            </div>
                            <p className="text-indigo-100 mb-6 text-sm">
                                {t('msg_ready_to_scale')}
                            </p>

                            <div className="space-y-4">
                                <div className="bg-white/10 p-3 rounded-lg backdrop-blur-sm">
                                    <h4 className="font-semibold text-sm">📣 {t('tip_marketing')}</h4>
                                </div>

                                <div className="bg-white/10 p-3 rounded-lg backdrop-blur-sm">
                                    <h4 className="font-semibold text-sm">🤝 {t('tip_crm')}</h4>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
}
