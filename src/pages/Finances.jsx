import { useState, useMemo, useEffect } from "react";
import { useStoreData } from "../hooks/useStoreData";
import { useTenant } from "../context/TenantContext";
import { useLanguage } from "../context/LanguageContext";
import { Navigate } from "react-router-dom";
import { DollarSign, TrendingUp, CreditCard, Activity, Plus, Trash2, Library, Calendar } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import Button from "../components/Button";
import Input from "../components/Input";
import CollectionsManager from "../components/CollectionsManager"; // NEW
import { format, isSameDay, isSameWeek, isSameMonth, parseISO, startOfMonth, subDays, isWithinInterval, endOfDay, startOfDay } from 'date-fns';
import { where } from "firebase/firestore";
import TopProductsChart from "../components/charts/TopProductsChart"; // NEW
import CityRevenueChart from "../components/charts/CityRevenueChart"; // NEW
import { getTopProducts, getCityStats, getHighReturnCities, getRetentionStats } from "../utils/analytics"; // NEW

export default function Finances() {
    const { store } = useTenant();
    const { t } = useLanguage();

    // Security: Redirect Staff
    if (store?.role === 'staff') {
        return <Navigate to="/dashboard" replace />;
    }

    // State
    const [expenseForm, setExpenseForm] = useState({ description: "", amount: "", category: "Other", collectionId: "" });
    const [loadingExpense, setLoadingExpense] = useState(false);

    // Collections Mode
    const [selectedCollection, setSelectedCollection] = useState(null); // null = Global View
    const [showCollectionsModal, setShowCollectionsModal] = useState(false);

    // Default Date Range
    const [dateRange, setDateRange] = useState({
        start: startOfMonth(new Date()).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });

    // Load Collections for Dropdown
    const { data: collections } = useStoreData("collections");

    // Effect: Update Date Range when Collection is Selected
    useEffect(() => {
        if (selectedCollection) {
            setDateRange({
                start: selectedCollection.startDate,
                end: selectedCollection.endDate
            });
        }
    }, [selectedCollection]);


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

    // 2. Fetch Expenses
    // Strategy: Fetch ALL expenses for now to enable effective client-side filtering by both Date AND Collection ID.
    // If we only fetch data by date valid for the collection, we might miss expenses explicitly linked to the collection but outside the date range (e.g. Pre-launch ads).
    // Or we continue simple approach: Date Range is King. 
    // DECISION: If Collection is selected, we include:
    // a) Expenses with matching collectionId (regardless of date?) -> Yes, strictly speaking.
    // b) Expenses with NO collectionId BUT within date range (Shared costs).
    // For simplicity and current scale: Fetch All, Filter Client Side.
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

        // 1. Process Orders (Always bound by Date Range)
        orders.forEach(o => {
            // Helpers - Mirroring Backend Logic for Consistency
            const safeFloat = (val) => {
                const num = parseFloat(val);
                return isNaN(num) ? 0 : num;
            };
            const safeInt = (val) => {
                const num = parseInt(val);
                return isNaN(num) ? 1 : num; // Default to 1 if missing/invalid, same as backend
            };

            const qty = safeInt(o.quantity);
            const price = safeFloat(o.price);
            const cost = safeFloat(o.costPrice);
            const delivery = safeFloat(o.realDeliveryCost);

            const revenue = price * qty;
            const cogs = cost * qty;

            const isPaid = o.isPaid === true || o.isPaid === "true"; // Handle potential string legacy

            // Delivered Potential
            if (o.status === 'livré') {
                res.deliveredRevenue += revenue;
                res.deliveredCount++;
            }

            // Active / Pending
            if (['reçu', 'confirmation', 'packing', 'livraison', 'ramassage', 'reporté'].includes(o.status)) {
                res.activeCount++;
            }

            // Realized Cash (The Gold Standard)
            if (isPaid) {
                res.realizedRevenue += revenue;
                res.totalCOGS += cogs;
            }

            // Delivery Costs
            // We count delivery cost if status is 'livré' or 'retour' OR if there is a realDeliveryCost set > 0 (attempt made)
            if (['livré', 'retour'].includes(o.status) || delivery > 0) {
                res.totalRealDelivery += delivery;
            }
        });

        // 2. Process Expenses
        const filteredExpenses = expenses.filter(e => {
            // Logic:
            // If Collection Selected:
            //   - Include if e.collectionId === selectedCollection.id
            //   - OR Include if !e.collectionId AND Date is within range (Generic spending attributed to this period)
            // If Global View (No Collection Selected):
            //   - Include if Date is within range (Standard view)

            if (selectedCollection) {
                if (e.collectionId === selectedCollection.id) return true; // Explicit link
                if (e.collectionId) return false; // Linked to ANOTHER collection

                // Not linked, check date
                if (!e.date) return false;
                const d = new Date(e.date);
                return d >= start && d <= end;
            } else {
                // Global View: Pure Date Filtering
                if (!e.date) return true; // Safety, or hide?
                const d = new Date(e.date);
                return d >= start && d <= end;
            }
        });

        res.totalExpenses = filteredExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

        // Breakdowns
        res.adsSpend = filteredExpenses
            .filter(e => e.category === 'Ads')
            .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

        // 3. Net Result
        res.netResult = res.realizedRevenue - res.totalCOGS - res.totalRealDelivery - res.totalExpenses;

        // 4. derivated
        res.margin = res.realizedRevenue > 0 ? ((res.netResult / res.realizedRevenue) * 100).toFixed(1) : "0.0";
        res.roas = res.adsSpend > 0 ? (res.realizedRevenue / res.adsSpend).toFixed(2) : "0.00";
        res.cac = res.deliveredCount > 0 ? (res.adsSpend / res.deliveredCount).toFixed(2) : "0.00";

        const totalShipping = res.totalRealDelivery + filteredExpenses.filter(e => e.category === 'Shipping').reduce((sum, e) => sum + parseFloat(e.amount), 0);
        res.shippingRatio = res.realizedRevenue > 0 ? ((totalShipping / res.realizedRevenue) * 100).toFixed(1) : "0.0";
        res.profitPerOrder = res.deliveredCount > 0 ? (res.netResult / res.deliveredCount).toFixed(2) : "0.00";

        return { res, filteredExpenses }; // Return filtered list for chart/list usage
    }, [orders, expenses, dateRange, selectedCollection]);


    // --- Chart Data ---
    const chartData = useMemo(() => {
        const data = {};
        const start = new Date(dateRange.start);
        const end = new Date(dateRange.end);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            data[d.toISOString().split('T')[0]] = 0;
        }

        orders.forEach(o => {
            if (o.date && data[o.date] !== undefined) {
                const qty = parseInt(o.quantity) || 1;
                data[o.date] += (parseFloat(o.price) || 0) * qty;
            }
        });

        return Object.entries(data).map(([name, revenue]) => ({ name: format(new Date(name), 'MMM dd'), revenue }));
    }, [orders, dateRange]);

    const expenseCategoryData = useMemo(() => {
        const data = {};
        stats.filteredExpenses.forEach(exp => {
            const cat = exp.category || 'Other';
            data[cat] = (data[cat] || 0) + (parseFloat(exp.amount) || 0);
        });
        return Object.entries(data).map(([name, value]) => ({ name, value }));
    }, [stats.filteredExpenses]);

    // --- Analytics Calcs (Derived from filtered Orders) ---
    const topProducts = useMemo(() => getTopProducts(orders), [orders]);
    const cityStats = useMemo(() => getCityStats(orders), [orders]);
    const highReturnCities = useMemo(() => getHighReturnCities(orders), [orders]);
    const retention = useMemo(() => getRetentionStats(orders), [orders]);



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
                collectionId: expenseForm.collectionId || (selectedCollection ? selectedCollection.id : null), // Auto-link if in collection logic? Or let user choose. Let's start with explicit or current default.
                date: new Date().toISOString()
            });
            setExpenseForm(prev => ({ ...prev, description: "", amount: "" })); // Keep category/collection sticky? No, reset safely.
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
            {/* Header & Controls */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{t('page_title_finances')}</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        {selectedCollection
                            ? `${t('collections_title')}: ${selectedCollection.name}`
                            : t('page_subtitle_finances')}
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                    {/* Collection Selector */}
                    <div className="relative">
                        <select
                            className="appearance-none block w-full sm:w-48 pl-3 pr-10 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white"
                            value={selectedCollection ? selectedCollection.id : ""}
                            onChange={(e) => {
                                const id = e.target.value;
                                if (!id) setSelectedCollection(null);
                                else setSelectedCollection(collections.find(c => c.id === id));
                            }}
                        >
                            <option value="">{t('label_global_view')}</option>
                            {collections.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                            <Library className="h-4 w-4" />
                        </div>
                    </div>

                    <Button variant="secondary" onClick={() => setShowCollectionsModal(true)} icon={Library}>
                        {t('btn_manage_collections')}
                    </Button>

                    <div className="flex bg-white p-2 rounded-lg shadow-sm border border-gray-100 gap-2 items-center">
                        <span className="text-sm text-gray-500 font-medium px-2 hidden sm:block">{t('date_range')}</span>
                        <input
                            type="date"
                            value={dateRange.start}
                            onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                            className="border-gray-300 rounded-md text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 w-full sm:w-auto"
                        />
                        <span className="text-gray-400">-</span>
                        <input
                            type="date"
                            value={dateRange.end}
                            onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                            className="border-gray-300 rounded-md text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 w-full sm:w-auto"
                        />
                    </div>
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
                                <dd className="text-2xl font-semibold text-gray-900">{stats.res.deliveredRevenue.toLocaleString()} {store?.currency || 'MAD'}</dd>
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
                                <dd className="text-2xl font-semibold text-gray-900">{stats.res.realizedRevenue.toLocaleString()} {store?.currency || 'MAD'}</dd>
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
                                <dd className="text-2xl font-semibold text-gray-900">{stats.res.netResult.toLocaleString()} {store?.currency || 'MAD'}</dd>
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
                                <dd className="text-2xl font-semibold text-gray-900">{stats.res.margin}%</dd>
                            </dl>
                        </div>
                    </div>
                </div>
            </div>

            {/* ANALYTICS SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Top Products */}
                <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">{t('analytics_top_products')}</h3>
                    {loadingOrders ? (
                        <div className="h-64 flex items-center justify-center text-gray-400">Loading...</div>
                    ) : (
                        <TopProductsChart data={topProducts} />
                    )}
                </div>

                {/* City Revenue & Returns */}
                <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">{t('analytics_city_performance')}</h3>
                    {loadingOrders ? (
                        <div className="h-64 flex items-center justify-center text-gray-400">Loading...</div>
                    ) : (
                        <CityRevenueChart data={cityStats} highReturnCities={highReturnCities} />
                    )}
                </div>
            </div>


            {/* ADVANCED METRICS SECTION */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                    <p className="text-xs text-gray-500 font-medium">{t('metric_roas')}</p>
                    <div className="flex items-baseline gap-2 mt-1">
                        <span className={`text - xl font - bold ${parseFloat(stats.res.roas) > 3 ? 'text-green-600' : 'text-gray-900'} `}>
                            {stats.res.roas}x
                        </span>
                        <span className="text-xs text-gray-400">{t('target')}: &gt;3.0</span>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                    <p className="text-xs text-gray-500 font-medium">{t('metric_cac')}</p>
                    <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-xl font-bold text-gray-900">{stats.res.cac} DH</span>
                        <span className="text-xs text-gray-400">{t('label_ads_spending')}</span>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                    <p className="text-xs text-gray-500 font-medium">{t('metric_shipping_ratio')}</p>
                    <div className="flex items-baseline gap-2 mt-1">
                        <span className={`text - xl font - bold ${parseFloat(stats.res.shippingRatio) > 15 ? 'text-red-600' : 'text-gray-900'} `}>
                            {stats.res.shippingRatio}%
                        </span>
                        <span className="text-xs text-gray-400">{t('target')}: &lt;15%</span>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                    <p className="text-xs text-gray-500 font-medium">{t('metric_profit_per_order')}</p>
                    <div className="flex items-baseline gap-2 mt-1">
                        <span className={`text - xl font - bold ${parseFloat(stats.res.profitPerOrder) > 0 ? 'text-green-600' : 'text-red-600'} `}>
                            {stats.res.profitPerOrder} DH
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

                <form onSubmit={handleAddExpense} className="flex flex-col lg:flex-row gap-2 mb-4">
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
                    {/* Collection Linker */}
                    <div className="sm:w-48">
                        <select
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-600"
                            value={expenseForm.collectionId || ""}
                            onChange={e => setExpenseForm({ ...expenseForm, collectionId: e.target.value })}
                        >
                            <option value="">{t('select_collection')}</option>
                            {collections.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
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
                    {stats.filteredExpenses.length === 0 ? (
                        <p className="py-4 text-center text-sm text-gray-500">{t('msg_no_expenses')}</p>
                    ) : (
                        <ul className="divide-y divide-gray-100">
                            {stats.filteredExpenses.map(exp => {
                                const linkedCollection = collections.find(c => c.id === exp.collectionId);
                                return (
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
                                            <div className="flex flex-col">
                                                <span className="text-gray-700 font-medium">{exp.description}</span>
                                                {linkedCollection && (
                                                    <span className="text-xs text-indigo-500 flex items-center gap-1">
                                                        <Library className="w-3 h-3" /> {linkedCollection.name}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="font-medium text-red-600">-{parseFloat(exp.amount).toFixed(2)} DH</span>
                                            <button onClick={() => handleDeleteExpense(exp.id)} className="text-gray-400 hover:text-red-500" title={t('delete')}>
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                </div>
            </div>

            {/* Collections Modal */}
            {showCollectionsModal && (
                <CollectionsManager
                    onClose={() => setShowCollectionsModal(false)}
                    onSelect={(col) => {
                        setSelectedCollection(col);
                        setShowCollectionsModal(false);
                    }}
                />
            )}
        </div>
    );
}
