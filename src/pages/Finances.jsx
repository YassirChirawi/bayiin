import { useState, useMemo } from "react";
import { useStoreData } from "../hooks/useStoreData";
import { DollarSign, TrendingUp, CreditCard, Activity, Plus, Trash2 } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import Button from "../components/Button";
import Input from "../components/Input";
import { format, isSameDay, isSameWeek, isSameMonth, parseISO, startOfMonth, subDays, isWithinInterval, endOfDay, startOfDay } from 'date-fns';

export default function Finances() {
    const { data: orders } = useStoreData("orders");
    const { data: expenses, addStoreItem: addExpense, deleteStoreItem: deleteExpense } = useStoreData("expenses");

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
        let revenueToday = 0;
        let revenueWeek = 0;
        let revenueMonth = 0;
        let totalCOGS = 0;
        let activeOrdersCount = 0;
        let realizedRevenue = 0; // Only 'livré'
        let pendingRevenue = 0;  // 'reçu', 'packing', 'ramassage', 'livraison'

        const today = new Date();
        const start = startOfDay(parseISO(dateRange.start));
        const end = endOfDay(parseISO(dateRange.end));

        orders.forEach(order => {
            const orderDate = parseISO(order.date);
            // Ensure numeric values
            const price = parseFloat(order.price) || 0;
            const quantity = parseInt(order.quantity) || 1;
            const costPrice = parseFloat(order.costPrice) || 0;

            const amount = price * quantity;
            const cost = costPrice * quantity;

            // Date Filters for visual charts (Revenue Trend) might still want 'potential' revenue? 
            // Or strictly realized? usually 'Trend' shows sales volume regardless of status unless cancelled.
            // But for KPIs, the user was specific.

            if (isSameDay(orderDate, today)) revenueToday += amount;
            if (isSameWeek(orderDate, today)) revenueWeek += amount;
            if (isSameMonth(orderDate, today)) revenueMonth += amount;

            if (isWithinInterval(orderDate, { start, end })) {
                const status = (order.status || '').toLowerCase();

                if (status === 'livré') {
                    realizedRevenue += amount;
                    totalCOGS += cost; // Only realized sales have realized COGS? Or do we count COGS for shipped items too?
                    // Usually Accrual vs Cash. User said "income" is "livré".
                    // Let's assume COGS follows realized revenue for Net Profit.
                } else if (['reçu', 'packing', 'ramassage', 'livraison'].includes(status)) {
                    pendingRevenue += amount;
                    // We do NOT add to realizedRevenue
                    // We might want to track 'Potential COGS' but for Net Profit, let's stick to Realized.
                }
            }

            if (!['livré', 'retour', 'annulé'].includes(order.status)) {
                activeOrdersCount++;
            }
        });

        // Filter Expenses
        const filteredExpenses = expenses
            .filter(exp => {
                const d = exp.date ? parseISO(exp.date) : new Date();
                return isWithinInterval(d, { start, end });
            })
            .reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);

        // Advanced Metrics Calculations (Based on REALIZED Revenue usually?)
        // Or should ROAS be based on Total Sales (Realized + Pending)? 
        // Marketing usually counts 'Sales Generated' (Pending + Realized).
        // BUT user was very specific about 'Income' being 'Livré'.
        // Let's use Realized Revenue for Profit, but maybe Total 'Sales' for ROAS?
        // For safety, let's stick to Realized for financial metrics to be conservative.

        const adsSpend = expenses
            .filter(e => e.category === 'Ads' && isWithinInterval(e.date ? parseISO(e.date) : new Date(), { start, end }))
            .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

        const shippingSpend = expenses
            .filter(e => e.category === 'Shipping' && isWithinInterval(e.date ? parseISO(e.date) : new Date(), { start, end }))
            .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

        const netProfit = realizedRevenue - totalCOGS - filteredExpenses;
        const margin = realizedRevenue > 0 ? (netProfit / realizedRevenue) * 100 : 0;

        const roas = adsSpend > 0 ? (realizedRevenue / adsSpend).toFixed(2) : "0.00";
        const cac = activeOrdersCount > 0 ? (adsSpend / activeOrdersCount).toFixed(2) : "0.00";
        const shippingRatio = realizedRevenue > 0 ? ((shippingSpend / realizedRevenue) * 100).toFixed(1) : "0.0";
        const profitPerOrder = activeOrdersCount > 0 ? (netProfit / activeOrdersCount).toFixed(2) : "0.00";

        return {
            revenueToday,
            revenueWeek,
            revenueMonth,
            realizedRevenue, // Was totalRevenue
            pendingRevenue,  // NEW
            totalCOGS,
            totalExpenses: filteredExpenses,
            netResult: netProfit,
            margin: margin.toFixed(1),
            activeOrdersCount,
            totalOrders: orders.length,
            adsSpend,
            roas,
            cac,
            shippingRatio,
            profitPerOrder
        };
    }, [orders, expenses, dateRange]);

    // --- Chart Data Preparation ---
    const chartData = useMemo(() => {
        const data = [];
        const today = new Date();
        // Last 7 days
        for (let i = 6; i >= 0; i--) {
            const date = subDays(today, i);
            const dateLabel = format(date, 'MMM dd');

            let dailyRevenue = 0;
            orders.forEach(order => {
                if (isSameDay(parseISO(order.date), date)) {
                    dailyRevenue += (parseFloat(order.price) || 0) * (parseInt(order.quantity) || 1);
                }
            });

            data.push({ name: dateLabel, revenue: dailyRevenue });
        }
        return data;
    }, [orders]);

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
                                        <div className="text-lg font-medium text-gray-900">{stats.realizedRevenue.toFixed(2)} DH</div>
                                        <div className="text-xs text-yellow-600 mt-1">
                                            + {stats.pendingRevenue.toFixed(2)} DH (Pending)
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
                                    <dt className="text-sm font-medium text-gray-500 truncate">Costs (COGS + Exp)</dt>
                                    <dd>
                                        <div className="text-lg font-medium text-gray-900">{(stats.totalExpenses + stats.totalCOGS).toFixed(2)} DH</div>
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
