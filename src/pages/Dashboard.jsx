import { useTenant } from "../context/TenantContext";
import { useStoreData } from "../hooks/useStoreData";
import { useStoreStats } from "../hooks/useStoreStats";
import { Link } from "react-router-dom";
import { ShoppingBag, DollarSign, AlertTriangle, Lightbulb, ExternalLink, RotateCcw, CheckCircle, RefreshCw, Check, X, Calendar, Clock } from "lucide-react"; // Added Calendar, Clock
import { useMemo, useState } from "react";
import { format, subDays } from "date-fns";
import { where, limit, orderBy } from "firebase/firestore";
import { reconcileStoreStats } from "../utils/reconcileStats";
import { db } from "../lib/firebase";
import { toast } from "react-hot-toast";
import { useLanguage } from "../context/LanguageContext"; // NEW

import TrialAlert from "../components/TrialAlert";
import HelpTooltip from "../components/HelpTooltip";
import { useOrderActions } from "../hooks/useOrderActions"; // NEW
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

export default function Dashboard() {
    const { store } = useTenant();
    const { t } = useLanguage(); // NEW

    const [isRecalculating, setIsRecalculating] = useState(false);

    // NEW handles
    const { updateOrder } = useOrderActions();

    const handleClearTask = async (task, type) => {
        const confirmMsg = type === 'done' ? t('msg_confirm_done') : t('msg_confirm_cancel');
        // Optional: Add confirm dialog? For speed, usually just do it.
        // Or simple toast "Processing..."

        await updateOrder(task.id, task, {
            ...task,
            followUpDate: "",
            followUpNote: ""
        });

        if (type === 'done') toast.success(t('msg_task_done') || "Task Completed");
        else toast.success(t('msg_task_removed') || "Task Removed");
    };

    const handleHardRefresh = async () => {
        if (!store?.id) return;
        if (isRecalculating) return;

        setIsRecalculating(true);
        const toastId = toast.loading(t('recalculate_sync') + "...");
        try {
            await reconcileStoreStats(db, store.id);
            await reconcileStoreStats(db, store.id);
            toast.success(t('msg_dashboard_updated'), { id: toastId });
            // No need to reload page, the hooks will stream the new data automatically via onSnapshot
        } catch (err) {
            console.error(err);
            toast.error(t('err_sync_failed'), { id: toastId });
        } finally {
            setIsRecalculating(false);
        }
    };

    // 1. SCALABLE STATS (Server-Side Aggregation)
    const { stats: aggregatedStats, loading: statsLoading } = useStoreStats();

    // 2. Recent Orders (Only fetch 20)
    const recentOrdersConstraints = useMemo(() => [orderBy("date", "desc"), limit(20)], []);
    const { data: recentOrders, loading: ordersLoading } = useStoreData("orders", recentOrdersConstraints);

    // 3. Programmed / Follow-up Orders
    const tasksConstraints = useMemo(() => [
        where("followUpDate", ">", ""),
        orderBy("followUpDate", "asc"),
        limit(10)
    ], []);
    const { data: tasks, loading: loadingTasks } = useStoreData("orders", tasksConstraints);

    // 4. Low Stock
    const lowStockConstraints = useMemo(() => [where("stock", "<", 5), limit(20)], []);
    const { data: lowStockProducts } = useStoreData("products", lowStockConstraints);

    // Transform Data
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
        const revenueToday = aggregatedStats.daily?.[todayStr]?.revenue || 0;

        // Pending Orders (Reçu + Packing + Reporté)
        const sCounts = aggregatedStats.statusCounts || {};
        const pendingOrders = (sCounts['reçu'] || 0) + (sCounts['packing'] || 0) + (sCounts['confirmation'] || 0) + (sCounts['livraison'] || 0) + (sCounts['ramassage'] || 0) + (sCounts['reporté'] || 0);

        // Return Rate
        const totalCount = aggregatedStats.totals?.count || 1;
        const returnCount = sCounts['retour'] || 0;
        const returnRate = ((returnCount / totalCount) * 100).toFixed(1);

        // Sales Trend
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
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {t('welcome_back').replace('{name}', store?.name || 'User')}
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        {t('dashboard_subtitle')}
                    </p>
                </div>
                <button
                    onClick={handleHardRefresh}
                    disabled={isRecalculating}
                    className={`p-2 rounded-lg bg-white border border-gray-200 text-gray-500 hover:text-indigo-600 hover:border-indigo-200 transition-all ${isRecalculating ? 'animate-spin text-indigo-600' : ''}`}
                    title={t('btn_recalculate')}
                >
                    <RefreshCw className="h-5 w-5" />
                </button>
            </div>
            {!isLoading && recentOrders.length === 0 && (
                <div className="mt-6 glass-panel rounded-xl border-indigo-100/50 p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">{t('getting_started')}</h3>
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white font-bold text-sm">1</span>
                            <div className="flex-1">
                                <h4 className="text-sm font-semibold text-gray-900">{t('step_1_title')}</h4>
                                <p className="text-xs text-gray-600">{t('step_1_desc')}</p>
                            </div>
                            <div className="h-6 w-6 text-green-500">{store?.logoUrl ? <CheckCircle className="h-6 w-6" /> : <div className="h-6 w-6 border-2 border-gray-300 rounded-full"></div>}</div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-gray-600 font-bold text-sm">2</span>
                            <div className="flex-1">
                                <h4 className="text-sm font-semibold text-gray-900">{t('step_2_title')}</h4>
                                <p className="text-xs text-gray-600">{t('step_2_desc')}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-gray-600 font-bold text-sm">3</span>
                            <div className="flex-1">
                                <h4 className="text-sm font-semibold text-gray-900">{t('step_3_title')}</h4>
                                <p className="text-xs text-gray-600">{t('step_3_desc')}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* KPI Grid */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <div className="glass-panel rounded-xl overflow-hidden p-5">
                    <div className="flex items-center">
                        <div className="flex-shrink-0 bg-indigo-50 rounded-md p-3">
                            <DollarSign className="h-6 w-6 text-indigo-600" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-gray-500 truncate flex items-center gap-2">
                                    {t('kpi_revenue_today')}
                                    <HelpTooltip topic="dashboard" />
                                </dt>
                                <dd className="text-2xl font-semibold text-gray-900">
                                    {statsLoading ? "..." : (Math.max(0, dashboardData.revenueToday).toFixed(2) || "0.00")} DH
                                </dd>
                            </dl>
                        </div>
                    </div>
                </div>

                <div className="glass-panel rounded-xl overflow-hidden p-5">
                    <div className="flex items-center">
                        <div className="flex-shrink-0 bg-yellow-50 rounded-md p-3">
                            <ShoppingBag className="h-6 w-6 text-yellow-600" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-gray-500 truncate flex items-center gap-2">
                                    {t('kpi_pending_orders')}
                                    <HelpTooltip topic="dashboard" />
                                </dt>
                                <dd className="text-2xl font-semibold text-gray-900">
                                    {statsLoading ? "..." : dashboardData.pendingOrders}
                                </dd>
                            </dl>
                        </div>
                    </div>
                </div>

                <div className="glass-panel rounded-xl overflow-hidden p-5">
                    <div className="flex items-center">
                        <div className="flex-shrink-0 bg-orange-50 rounded-md p-3">
                            <RotateCcw className="h-6 w-6 text-orange-600" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-gray-500 truncate flex items-center gap-2">
                                    {t('kpi_return_rate')}
                                    <HelpTooltip topic="dashboard" />
                                </dt>
                                <dd className="text-2xl font-semibold text-gray-900">
                                    {statsLoading ? "..." : dashboardData.returnRate}%
                                </dd>
                            </dl>
                        </div>
                    </div>
                </div>

                <div className="glass-panel rounded-xl overflow-hidden p-5">
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
                    {lowStockProducts.length > 0 && (
                        <div className="mt-4 border-t border-gray-100 pt-3">
                            <p className="text-xs font-medium text-gray-500 mb-2">{t('items_needing_restock')}</p>
                            <ul className="space-y-1">
                                {lowStockProducts.slice(0, 3).map(p => (
                                    <li key={p.id} className="flex justify-between text-xs">
                                        <span className="text-gray-900 truncate">{p.name}</span>
                                        <span className="text-red-600 font-bold">{t('msg_items_left', { count: p.stock })}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>

            {/* Dashboard 2-column Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column (Charts & Tasks) */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Sales Trend Chart */}
                    <div className="glass-panel p-6 rounded-xl">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">{t('chart_sales_trend')}</h3>
                        <div className="h-[300px] w-full">
                            {dashboardData.salesTrend.length > 0 ? (
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
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                    <AlertTriangle className="h-8 w-8 mb-2 opacity-50" />
                                    <p>{t('msg_no_sales')}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Pending Tasks (Follow-ups) Widget */}
                    <div className="glass-panel p-6 rounded-xl border-yellow-100/50">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <CheckCircle className="h-5 w-5 text-yellow-600" />
                                {t('todo_list')}
                            </h3>
                            <Link to="/orders" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">{t('view_details')}</Link>
                        </div>

                        {tasks.length === 0 ? (
                            <p className="text-sm text-gray-500 italic py-4">{t('no_pending_tasks')}</p>
                        ) : (
                            <div className="space-y-3">
                                {tasks.map(task => {
                                    const isOverdue = task.followUpDate && new Date(task.followUpDate) < new Date();

                                    return (
                                        <div key={task.id} className={`flex items-start justify-between p-3 rounded-lg border ${isOverdue ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className={`font-semibold text-sm ${isOverdue ? 'text-red-900' : 'text-gray-900'}`}>{task.clientName}</p>
                                                    {isOverdue && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-600">LATE</span>}
                                                </div>
                                                <p className={`text-xs mt-1 ${isOverdue ? 'text-red-800' : 'text-yellow-800'}`}>
                                                    {task.followUpNote || t('msg_no_note')}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    {t('label_phone_short')} <a href={`tel:${task.clientPhone}`} className="hover:underline">{task.clientPhone}</a>
                                                </p>
                                            </div>
                                            <div className="text-right flex flex-col items-end gap-2">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-white text-gray-800 border border-gray-200 shadow-sm">
                                                    {task.followUpDate ? format(new Date(task.followUpDate), 'MMM dd, HH:mm') : t('label_asap')}
                                                </span>

                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => handleClearTask(task, 'done')}
                                                        className="p-1.5 rounded-md bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                                                        title={t('btn_done') || "Done"}
                                                    >
                                                        <Check className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleClearTask(task, 'cancel')}
                                                        className="p-1.5 rounded-md bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                                                        title={t('btn_cancel') || "Cancel"}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </div>

                                                <Link to={`/orders?search=${task.orderNumber}`} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                                                    {t('link_open_order')} &rarr;
                                                </Link>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column (Pie Chart & Orders) */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Status Breakdown (Pie Chart) */}
                    <div className="glass-panel rounded-xl p-6">
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

                                <div className="bg-white/10 p-3 rounded-lg backdrop-blur-sm">
                                    <h4 className="font-semibold text-sm">📦 {t('tip_inventory')}</h4>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
}
