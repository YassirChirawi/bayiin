import { useState, useMemo } from "react";
import { useStoreData } from "../hooks/useStoreData";
import { useTenant } from "../context/TenantContext"; // NEW
import { useLanguage } from "../context/LanguageContext"; // NEW
import { Navigate } from "react-router-dom"; // NEW
import { DollarSign, TrendingUp, CreditCard, Activity, Plus, Trash2 } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import Button from "../components/Button";
import Input from "../components/Input";
import { format, isSameDay, isSameWeek, isSameMonth, parseISO, startOfMonth, subDays, isWithinInterval, endOfDay, startOfDay } from 'date-fns';
import { where } from "firebase/firestore";

export default function Finances() {
    const { store } = useTenant();
    const { t } = useLanguage(); // NEW
    // Security: Redirect Staff
    if (store?.role === 'staff') {
        return <Navigate to="/dashboard" replace />;
    }

    // State
    const [expenseForm, setExpenseForm] = useState({ description: "", amount: "", category: "Other" });
    const [loadingExpense, setLoadingExpense] = useState(false);
    const [dateRange, setDateRange] = useState({
        start: startOfMonth(new Date()).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });

    const EXPENSE_CATEGORIES = ["Ads", "Shipping", "COGS", "Salaries", "Other"];
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    // 1. Fetch Orders for Selected Date Range (Source of Truth)
    const orderConstraints = useMemo(() => {
        const start = dateRange.start;
        const end = dateRange.end;
        return [
            where("date", ">=", start),
            where("date", "<=", end)
        ];
    }, [dateRange.start, dateRange.end]);

    const { data: orders, loading: loadingOrders } = useStoreData("orders", orderConstraints);

    // 2. Fetch Expenses (Source of Truth)
    // We fetch all and filter client-side or we could add constraints if we have date on expenses (we do)
    // Expenses volume is low, fetching all is fine for now, or we can constrain match.
    // Let's constrain for performance.
    const expenseConstraints = useMemo(() => {
        return [
            where("date", ">=", new Date(dateRange.start).toISOString()), // Expenses store ISO strings
            where("date", "<=", new Date(dateRange.end + "T23:59:59").toISOString())
        ];
    }, [dateRange.start, dateRange.end]);

    // Actually, useStoreData uses strict equality for strings if not careful. 
    // Expenses might have full ISO timestamps. simpler to fetch all `expenses` for now as they are few.
    const { data: expenses, loading: loadingExpenses, error: expensesError, addStoreItem: addExpense, deleteStoreItem: deleteExpense } = useStoreData("expenses");


    // --- Precise KPIs Calculation ---
    const stats = useMemo(() => {
        const res = {
            realizedRevenue: 0, // Cash Collected (isPaid)
            deliveredRevenue: 0, // Potential from Delivered (status == livré)
            totalCOGS: 0,
            totalRealDelivery: 0,
            totalExpenses: 0,

            netResult: 0,
            margin: "0.0",

            // Advanced
            adsSpend: 0,
            roas: "0.00",
            cac: "0.00",
            shippingRatio: "0.0",
            profitPerOrder: "0.00",

            deliveredCount: 0,
            activeCount: 0
        };

        const start = new Date(dateRange.start);
        const end = new Date(dateRange.end + "T23:59:59");

        // 1. Process Orders
        orders.forEach(o => {
            const qty = parseInt(o.quantity) || 1;
            const price = parseFloat(o.price) || 0;
            const cost = parseFloat(o.costPrice) || 0;
            const delivery = parseFloat(o.realDeliveryCost) || 0;
            const revenue = price * qty;
            const cogs = cost * qty;

            // Delivered Potential
            if (o.status === 'livré') {
                res.deliveredRevenue += revenue;
                res.deliveredCount++;
            }

            // Active / Pending
            if (['reçu', 'confirmation', 'packing', 'livraison', 'ramassage'].includes(o.status)) {
                res.activeCount++;
            }

            // Realized Cash (The Gold Standard)
            if (o.isPaid) {
                res.realizedRevenue += revenue;
                res.totalCOGS += cogs;
                // We count COGS only when we get paid? Or when it leaves? 
                // For "Cash Net Profit", yes.
            }

            // Delivery Costs (We pay this regardless if we got paid, if the attempt was made)
            // Assuming 'livré' and 'retour' imply a delivery fee was paid.
            if (['livré', 'retour'].includes(o.status)) {
                res.totalRealDelivery += delivery;
            }
        });

        // 2. Process Expenses
        const filteredExpenses = expenses.filter(e => {
            if (!e.date) return true;
            const d = new Date(e.date);
            return d >= start && d <= end;
        });

        res.totalExpenses = filteredExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

        // Breakdowns
        res.adsSpend = filteredExpenses
            .filter(e => e.category === 'Ads')
            .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

        const nonAdsExpenses = res.totalExpenses - res.adsSpend;


        // 3. Net Result (Crazy Precise)
        // Cash In (Realized Rev) - Cash Out (COGS of sold + Delivery Fees + Expenses)
        res.netResult = res.realizedRevenue - res.totalCOGS - res.totalRealDelivery - res.totalExpenses;

        // 4. derivated
        res.margin = res.realizedRevenue > 0 ? ((res.netResult / res.realizedRevenue) * 100).toFixed(1) : "0.0";
        res.roas = res.adsSpend > 0 ? (res.realizedRevenue / res.adsSpend).toFixed(2) : "0.00";
        res.cac = res.deliveredCount > 0 ? (res.adsSpend / res.deliveredCount).toFixed(2) : "0.00"; // Cost per Delivered Order

        const totalShipping = res.totalRealDelivery + filteredExpenses.filter(e => e.category === 'Shipping').reduce((sum, e) => sum + parseFloat(e.amount), 0);
        res.shippingRatio = res.realizedRevenue > 0 ? ((totalShipping / res.realizedRevenue) * 100).toFixed(1) : "0.0";
        res.profitPerOrder = res.deliveredCount > 0 ? (res.netResult / res.deliveredCount).toFixed(2) : "0.00";

        return res;
    }, [orders, expenses, dateRange]);

    // --- Chart Data ---
    const chartData = useMemo(() => {
        const data = {};
        // Initialize days
        const start = new Date(dateRange.start);
        const end = new Date(dateRange.end);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            data[d.toISOString().split('T')[0]] = 0;
        }

        orders.forEach(o => {
            if (o.date && data[o.date] !== undefined) {
                const qty = parseInt(o.quantity) || 1;
                // Chart shows Volume (Generated Revenue), not just realized, to show activity
                // OR show Realized? Usually activity.
                // Let's show "Delivered Revenue" vs "Pending"? 
                // Simple: Show Total Ordered Value
                data[o.date] += (parseFloat(o.price) || 0) * qty;
            }
        });

        return Object.entries(data).map(([name, revenue]) => ({ name: format(new Date(name), 'MMM dd'), revenue }));
    }, [orders, dateRange]);

    const expenseCategoryData = useMemo(() => {
        const data = {};
        const start = new Date(dateRange.start);
        const end = new Date(dateRange.end + "T23:59:59");

        expenses.forEach(exp => {
            const d = new Date(exp.date);
            if (d < start || d > end) return;

            const cat = exp.category || 'Other';
            data[cat] = (data[cat] || 0) + (parseFloat(exp.amount) || 0);
        });
        return Object.entries(data).map(([name, value]) => ({ name, value }));
    }, [expenses, dateRange]);


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
        if (window.confirm(t('btn_remove_expense'))) {
            await deleteExpense(id);
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{t('page_title_finances')}</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        {t('page_subtitle_finances')}
                    </p>
                </div>
                <div className="flex bg-white p-2 rounded-lg shadow-sm border border-gray-100 gap-2 items-center">
                    <span className="text-sm text-gray-500 font-medium px-2">{t('date_range')}</span>
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
                    <p className="font-bold">{t('err_loading_finances')}</p>
                    <p className="text-sm">{expensesError.message} - {t('msg_check_permissions')}</p>
                </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">

                {/* 1. Total Income (LIVRÉ) */}
                <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-100 p-5">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <div className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-100 text-indigo-600">
                                <TrendingUp className="h-6 w-6" />
                            </div>
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-gray-500 truncate">{t('kpi_total_income_delivered')}</dt>
                                <dd className="text-2xl font-semibold text-gray-900">{stats.deliveredRevenue.toLocaleString()} {store?.currency || 'MAD'}</dd>
                            </dl>
                        </div>
                    </div>
                </div>

                {/* 2. Total Paid (CASH) */}
                <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-100 p-5">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <div className="flex items-center justify-center h-12 w-12 rounded-md bg-green-100 text-green-600">
                                <DollarSign className="h-6 w-6" />
                            </div>
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-gray-500 truncate">{t('kpi_total_paid')}</dt>
                                <dd className="text-2xl font-semibold text-gray-900">{stats.realizedRevenue.toLocaleString()} {store?.currency || 'MAD'}</dd>
                            </dl>
                        </div>
                    </div>
                </div>

                {/* 3. Net Profit */}
                <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-100 p-5">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <div className="flex items-center justify-center h-12 w-12 rounded-md bg-purple-100 text-purple-600">
                                <Activity className="h-6 w-6" />
                            </div>
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-gray-500 truncate">{t('kpi_net_profit')}</dt>
                                <dd className="text-2xl font-semibold text-gray-900">{stats.netResult.toLocaleString()} {store?.currency || 'MAD'}</dd>
                            </dl>
                        </div>
                    </div>
                </div>

                {/* 4. Net Margin */}
                <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-100 p-5">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <div className="flex items-center justify-center h-12 w-12 rounded-md bg-yellow-100 text-yellow-600">
                                <CreditCard className="h-6 w-6" />
                            </div>
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-gray-500 truncate">{t('kpi_net_margin')}</dt>
                                <dd className="text-2xl font-semibold text-gray-900">{stats.margin}%</dd>
                            </dl>
                        </div>
                    </div>
                </div>
            </div>

            {/* ADVANCED METRICS SECTION */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                    <p className="text-xs text-gray-500 font-medium">{t('metric_roas')}</p>
                    <div className="flex items-baseline gap-2 mt-1">
                        <span className={`text - xl font - bold ${parseFloat(stats.roas) > 3 ? 'text-green-600' : 'text-gray-900'} `}>
                            {stats.roas}x
                        </span>
                        <span className="text-xs text-gray-400">{t('target')}: &gt;3.0</span>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                    <p className="text-xs text-gray-500 font-medium">{t('metric_cac')}</p>
                    <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-xl font-bold text-gray-900">{stats.cac} DH</span>
                        <span className="text-xs text-gray-400">{t('label_ads_spending')}</span>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                    <p className="text-xs text-gray-500 font-medium">{t('metric_shipping_ratio')}</p>
                    <div className="flex items-baseline gap-2 mt-1">
                        <span className={`text - xl font - bold ${parseFloat(stats.shippingRatio) > 15 ? 'text-red-600' : 'text-gray-900'} `}>
                            {stats.shippingRatio}%
                        </span>
                        <span className="text-xs text-gray-400">{t('target')}: &lt;15%</span>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                    <p className="text-xs text-gray-500 font-medium">{t('metric_profit_per_order')}</p>
                    <div className="flex items-baseline gap-2 mt-1">
                        <span className={`text - xl font - bold ${parseFloat(stats.profitPerOrder) > 0 ? 'text-green-600' : 'text-red-600'} `}>
                            {stats.profitPerOrder} DH
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Chart Section */}
                <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">{t('chart_revenue')}</h3>
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
                    <h3 className="text-lg font-medium text-gray-900 mb-4">{t('chart_expenses')}</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={expenseCategoryData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}% `}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {expenseCategoryData.map((entry, index) => (
                                        <Cell key={`cell - ${index} `} fill={COLORS[index % COLORS.length]} />
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
                <h3 className="text-lg font-medium text-gray-900 mb-4">{t('section_expenses')}</h3>

                <form onSubmit={handleAddExpense} className="flex flex-col sm:flex-row gap-2 mb-4">
                    <div className="flex-1">
                        <Input
                            placeholder={t('placeholder_desc')} // "Description (e.g. Ads, Packaging)"
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
                                <option key={cat} value={cat}>{t(`cat_${cat.toLowerCase()}`) || cat}</option>
                            ))}
                        </select>
                    </div>
                    <div className="sm:w-32">
                        <Input
                            type="number"
                            placeholder={t('placeholder_cost')}
                            value={expenseForm.amount}
                            onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                            required
                        />
                    </div>
                    <Button type="submit" isLoading={loadingExpense} icon={Plus}>{t('btn_add_expense')}</Button>
                </form>

                <div className="overflow-y-auto max-h-64 border-t border-gray-100">
                    {expenses.length === 0 ? (
                        <p className="py-4 text-center text-sm text-gray-500">{t('msg_no_expenses')}</p>
                    ) : (
                        <ul className="divide-y divide-gray-100">
                            {expenses.map(exp => (
                                <li key={exp.id} className="py-3 flex justify-between items-center text-sm">
                                    <div className="flex items-center gap-3">
                                        <span className={`px - 2 py - 1 text - xs font - semibold rounded - full 
                                                    ${exp.category === 'Ads' ? 'bg-blue-100 text-blue-800' :
                                                exp.category === 'Shipping' ? 'bg-yellow-100 text-yellow-800' :
                                                    exp.category === 'COGS' ? 'bg-orange-100 text-orange-800' :
                                                        exp.category === 'Salaries' ? 'bg-purple-100 text-purple-800' :
                                                            'bg-gray-100 text-gray-800'
                                            } `}>
                                            {t(`cat_${(exp.category || 'other').toLowerCase()}`) || exp.category}
                                        </span>
                                        <span className="text-gray-700">{exp.description}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="font-medium text-red-600">-{parseFloat(exp.amount).toFixed(2)} DH</span>
                                        <button onClick={() => handleDeleteExpense(exp.id)} className="text-gray-400 hover:text-red-500" title={t('delete')}>
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
