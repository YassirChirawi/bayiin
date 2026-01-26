import { useState, useMemo } from "react";
import { useStoreData } from "../hooks/useStoreData";
import { useStoreStats } from "../hooks/useStoreStats"; // New hook
import { DollarSign, TrendingUp, CreditCard, Activity, Plus, Trash2 } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import Button from "../components/Button";
import Input from "../components/Input";
import { format, isSameDay, isSameWeek, isSameMonth, parseISO, startOfMonth, subDays, isWithinInterval, endOfDay, startOfDay } from 'date-fns';
import { where } from "firebase/firestore";

export default function Finances() {
    // 1. Scalable Aggregated Stats (Realized Revenue, Totals, Daily History)
    const { stats: aggregatedStats, loading: loadingStats } = useStoreStats();

    // 2. Fetch only PENDING orders to calculate Pending Revenue (Scalable because pending list is usually small)
    // We assume "Active" = received, packing, confirmation, ramassage, livraison.
    const pendingConstraints = useMemo(() => [
        where("status", "in", ["reçu", "packing", "confirmation", "ramassage", "livraison"])
    ], []);
    const { data: pendingOrders, loading: loadingPending } = useStoreData("orders", pendingConstraints);

    // 3. Expenses (Low volume, safe to fetch all)
    const { data: expenses, loading: loadingExpenses, error: expensesError, addStoreItem: addExpense, deleteStoreItem: deleteExpense } = useStoreData("expenses");

    // Expense Form State
    const [expenseForm, setExpenseForm] = useState({ description: "", amount: "", category: "Other" });
    const [loadingExpense, setLoadingExpense] = useState(false);
    const [dateRange, setDateRange] = useState({
        start: startOfMonth(new Date()).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });

    const EXPENSE_CATEGORIES = ["Ads", "Shipping", "COGS", "Salaries", "Other"];
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    // --- KPIs Calculation ---
    const stats = useMemo(() => {
        // Defaults
        const res = {
            revenueToday: 0,
            revenueWeek: 0,
            revenueMonth: 0,
            realizedRevenue: 0,
            pendingRevenue: 0,
            totalCOGS: 0,
            totalExpenses: 0,
            netResult: 0,
            margin: "0.0",
            activeOrdersCount: 0,
            totalOrders: 0,
            adsSpend: 0,
            roas: "0.00",
            cac: "0.00",
            shippingRatio: "0.0",
            profitPerOrder: "0.00"
        };

        if (!aggregatedStats) return res;

        const todayStr = new Date().toISOString().split('T')[0];
        const statusCounts = aggregatedStats.statusCounts || {};

        // 1. Realized Revenue & COGS (Server-side)
        res.realizedRevenue = aggregatedStats.totals?.realizedRevenue || 0;
        res.totalCOGS = aggregatedStats.totals?.realizedCOGS || 0;
        const totalRealDelivery = aggregatedStats.totals?.realizedDeliveryCost || 0;
        res.totalOrders = aggregatedStats.totals?.count || 0;

        // 2. Pending Revenue (From client-side subset)
        res.pendingRevenue = pendingOrders.reduce((sum, o) => sum + ((parseFloat(o.price) || 0) * (parseInt(o.quantity) || 1)), 0);
        res.activeOrdersCount = pendingOrders.length;

        // 3. Date-based Revenues (Approximation using 'daily' map from server)
        // Note: 'daily' tracks ALL revenue (created), not just realized. 
        // For 'Trend', this is usually what we want (Sales Velocity).
        // If we strictly want Realized Trend, we'd need daily.realized. 
        // For now, using total daily sales is standard for "Revenue Trend".
        if (aggregatedStats.daily) {
            const today = new Date();
            Object.entries(aggregatedStats.daily).forEach(([dateStr, data]) => {
                const amount = data.revenue || 0;
                const date = parseISO(dateStr);

                if (dateStr === todayStr) res.revenueToday = amount;
                if (isSameWeek(date, today)) res.revenueWeek += amount;
                if (isSameMonth(date, today)) res.revenueMonth += amount;
            });
        }

        // 4. Expenses Filtered by Date
        const start = startOfDay(parseISO(dateRange.start));
        const end = endOfDay(parseISO(dateRange.end));

        res.totalExpenses = expenses
            .filter(exp => {
                const d = exp.date ? parseISO(exp.date) : new Date();
                return isWithinInterval(d, { start, end });
            })
            .reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);

        // Add Real Delivery Cost to Total Expenses View (implicitly, or explicitly?)
        // Since Real Delivery Cost is "Realized" (all time?), but Expenses are "Date Range"?
        // Discrepancy: Realized Stats are Lifetime. Expenses are Date Range.
        // For accurate Net Profit on this view (which shows Lifetime Realized Revenue?), we should use Lifetime Realized Delivery.
        // However, Finance page usually mixes Lifetime KPI cards with Date Range charts.
        // Let's stick to Lifetime for the KPI Cards (Top Row).

        // 5. Net Profit (Lifetime Realized)
        // Net = Realized Revenue - Realized COGS - Lifetime Expenses (Wait, expenses filtered by date range above? That's inconsistent).
        // The previous code filtered expenses by date range but subtracted from Lifetime Realized Revenue? That was a bug/inconsistency.
        // Let's fix: If using Lifetime Revenue, use Lifetime Expenses.
        // BUT user range selector suggests they want range data.
        // Aggregated Stats are LIFETIME. We cannot filter them by date range easily without `daily` breakdown of realized.
        // COMPROMISE: We show Lifetime Stats in KPI Cards (ignoring date range for Revenue/COGS/Delivery) and Date Range for Charts.
        // OR: We just say "Net Profit" is based on the visible range? No, we don't have daily realized revenue yet.
        // Let's follow existing pattern: Use Lifetime Stats for the simplified KPIs for now.
        // And for expenses, let's use LIFETIME expenses for the Net Result calculation to be consistent with Lifetime Revenue.

        const lifetimeExpenses = expenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);

        // We will store specific delivery costs separately if needed, but for Net Result:
        res.netResult = res.realizedRevenue - res.totalCOGS - lifetimeExpenses - totalRealDelivery;
        res.margin = res.realizedRevenue > 0 ? ((res.netResult / res.realizedRevenue) * 100).toFixed(1) : "0.0";

        // Expose totalRealDelivery for UI
        res.totalRealDelivery = totalRealDelivery;

        // 6. Advanced Metrics
        res.adsSpend = expenses
            .filter(e => e.category === 'Ads' && isWithinInterval(e.date ? parseISO(e.date) : new Date(), { start, end }))
            .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

        const shippingSpend = expenses
            .filter(e => e.category === 'Shipping' && isWithinInterval(e.date ? parseISO(e.date) : new Date(), { start, end }))
            .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

        // Combine Manual Expense (Shipping) + Auto Real Delivery Cost
        // Note: Discrepancy again (Range vs Lifetime). Using Lifetime Real Delivery for consistency with Revenue.
        const totalShippingMetrics = shippingSpend + totalRealDelivery;

        res.roas = res.adsSpend > 0 ? (res.realizedRevenue / res.adsSpend).toFixed(2) : "0.00";
        res.cac = res.activeOrdersCount > 0 ? (res.adsSpend / res.activeOrdersCount).toFixed(2) : "0.00"; // CAC usually using Total New Customers not active orders, but approx ok.
        res.shippingRatio = res.realizedRevenue > 0 ? ((totalShippingMetrics / res.realizedRevenue) * 100).toFixed(1) : "0.0";
        // Profit per order: Net Profit / Total Delivered Orders (approx)
        // We don't have exact "Total Delivered Count" in totals easily unless statusCounts['livré'] is used.
        const deliveredCount = statusCounts['livré'] || 1;
        res.profitPerOrder = deliveredCount > 0 ? (res.netResult / deliveredCount).toFixed(2) : "0.00";

        return res;
    }, [aggregatedStats, pendingOrders, expenses, dateRange]);

    // --- Chart Data (From Server Aggregates) ---
    const chartData = useMemo(() => {
        if (!aggregatedStats?.daily) return [];

        const data = [];
        const today = new Date();
        // Last 7 days
        for (let i = 6; i >= 0; i--) {
            const date = subDays(today, i);
            const dateStr = date.toISOString().split('T')[0];
            const dateLabel = format(date, 'MMM dd');

            const val = aggregatedStats.daily[dateStr]?.revenue || 0;
            data.push({ name: dateLabel, revenue: val });
        }
        return data;
    }, [aggregatedStats]);

    const expenseCategoryData = useMemo(() => {
        const data = {};
        expenses.forEach(exp => {
            const cat = exp.category || 'Other';
            data[cat] = (data[cat] || 0) + (parseFloat(exp.amount) || 0);
        });
        return Object.entries(data).map(([name, value]) => ({ name, value }));
    }, [expenses]);


    // --- Handlers ---
    const handleAddExpense = async (e) => {
        e.preventDefault();
        if (!expenseForm.description || !expenseForm.amount) return;
        setLoadingExpense(true);
        try {
            await addExpense({
                description: expenseForm.description,
                amount: parseFloat(expenseForm.amount),
                category: expenseForm.category,
                date: new Date().toISOString()
            });
            setExpenseForm({ description: "", amount: "", category: "Other" });
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingExpense(false);
        }
    };

    const handleDeleteExpense = async (id) => {
        if (window.confirm("Remove expense?")) {
            await deleteExpense(id);
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Finances & Analytics</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Track revenue, expenses, and net profit.
                    </p>
                </div>
                <div className="flex bg-white p-2 rounded-lg shadow-sm border border-gray-100 gap-2 items-center">
                    <span className="text-sm text-gray-500 font-medium px-2">Data Range:</span>
                    <input
                        type="date"
                        value={dateRange.start}
                        onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                        className="border-gray-300 rounded-md text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                    <span className="text-gray-400">-</span>
                    <input
                        type="date"
                        value={dateRange.end}
                        onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                        className="border-gray-300 rounded-md text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                </div>
            </div>

            {expensesError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    <p className="font-bold">Error loading finances:</p>
                    <p className="text-sm">{expensesError.message} - Check your 'expenses' collection permissions in Firebase Console.</p>
                </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-100">
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <DollarSign className="h-6 w-6 text-green-500" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">Total Income (Livré)</dt>
                                    <dd>
                                        <div className="text-lg font-medium text-gray-900">{Math.max(0, stats.realizedRevenue).toFixed(2)} DH</div>
                                        <div className="text-xs text-yellow-600 mt-1">
                                            {loadingStats ? "..." : (Math.max(0, stats.pendingRevenue).toFixed(2) || "0.00")} DH (Pending)
                                        </div>
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-100">
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <TrendingUp className="h-6 w-6 text-indigo-400" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">Net Profit (Margin: {stats.margin}%)</dt>
                                    <dd>
                                        <div className={`text-lg font-medium ${stats.netResult >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {stats.netResult.toFixed(2)} DH
                                        </div>
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-100">
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <CreditCard className="h-6 w-6 text-red-400" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">Costs (COGS + Delivery + Exp)</dt>
                                    <dd>
                                        <div className="text-lg font-medium text-gray-900">{(stats.totalExpenses + stats.totalCOGS + stats.totalRealDelivery).toFixed(2)} DH</div>
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-100">
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <Activity className="h-6 w-6 text-yellow-500" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">Active Orders</dt>
                                    <dd>
                                        <div className="text-lg font-medium text-gray-900">{stats.activeOrdersCount}</div>
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ADVANCED METRICS SECTION */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                    <p className="text-xs text-gray-500 font-medium">ROAS (Ads Efficiency)</p>
                    <div className="flex items-baseline gap-2 mt-1">
                        <span className={`text-xl font-bold ${parseFloat(stats.roas) > 3 ? 'text-green-600' : 'text-gray-900'}`}>
                            {stats.roas}x
                        </span>
                        <span className="text-xs text-gray-400">Target: &gt;3.0</span>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                    <p className="text-xs text-gray-500 font-medium">CAC (Cost Per Order)</p>
                    <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-xl font-bold text-gray-900">{stats.cac} DH</span>
                        <span className="text-xs text-gray-400">Ads / Orders</span>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                    <p className="text-xs text-gray-500 font-medium">Shipping Ratio</p>
                    <div className="flex items-baseline gap-2 mt-1">
                        <span className={`text-xl font-bold ${parseFloat(stats.shippingRatio) > 15 ? 'text-red-600' : 'text-gray-900'}`}>
                            {stats.shippingRatio}%
                        </span>
                        <span className="text-xs text-gray-400">Target: &lt;15%</span>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                    <p className="text-xs text-gray-500 font-medium">Net Profit / Order</p>
                    <div className="flex items-baseline gap-2 mt-1">
                        <span className={`text-xl font-bold ${parseFloat(stats.profitPerOrder) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {stats.profitPerOrder} DH
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Chart Section */}
                <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Revenue Trend (Last 7 Days)</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="name" />
                                <YAxis />
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <Tooltip formatter={(value) => `${value} DH`} />
                                <Area type="monotone" dataKey="revenue" stroke="#4f46e5" fillOpacity={1} fill="url(#colorRevenue)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Expenses Breakdown Chart */}
                <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Expenses Breakdown</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={expenseCategoryData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {expenseCategoryData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value) => `${value.toFixed(2)} DH`} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Expenses Management */}
            <div className="bg-white p-6 rounded-lg shadow border border-gray-100 lg:col-span-2">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Expenses Management</h3>

                <form onSubmit={handleAddExpense} className="flex flex-col sm:flex-row gap-2 mb-4">
                    <div className="flex-1">
                        <Input
                            placeholder="Description (e.g. Ads, Packaging)"
                            value={expenseForm.description}
                            onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })}
                            required
                        />
                    </div>
                    <div className="sm:w-40">
                        <select
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            value={expenseForm.category}
                            onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value })}
                        >
                            {EXPENSE_CATEGORIES.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>
                    <div className="sm:w-32">
                        <Input
                            type="number"
                            placeholder="Cost"
                            value={expenseForm.amount}
                            onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                            required
                        />
                    </div>
                    <Button type="submit" isLoading={loadingExpense} icon={Plus}>Add</Button>
                </form>

                <div className="overflow-y-auto max-h-64 border-t border-gray-100">
                    {expenses.length === 0 ? (
                        <p className="py-4 text-center text-sm text-gray-500">No expenses recorded.</p>
                    ) : (
                        <ul className="divide-y divide-gray-100">
                            {expenses.map(exp => (
                                <li key={exp.id} className="py-3 flex justify-between items-center text-sm">
                                    <div className="flex items-center gap-3">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full 
                                                    ${exp.category === 'Ads' ? 'bg-blue-100 text-blue-800' :
                                                exp.category === 'Shipping' ? 'bg-yellow-100 text-yellow-800' :
                                                    exp.category === 'COGS' ? 'bg-orange-100 text-orange-800' :
                                                        exp.category === 'Salaries' ? 'bg-purple-100 text-purple-800' :
                                                            'bg-gray-100 text-gray-800'}`}>
                                            {exp.category || 'Other'}
                                        </span>
                                        <span className="text-gray-700">{exp.description}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="font-medium text-red-600">-{parseFloat(exp.amount).toFixed(2)} DH</span>
                                        <button onClick={() => handleDeleteExpense(exp.id)} className="text-gray-400 hover:text-red-500">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}
