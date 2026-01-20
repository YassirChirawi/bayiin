import { useState, useMemo } from "react";
import { useStoreData } from "../hooks/useStoreData";
import { DollarSign, TrendingUp, CreditCard, Activity, Plus, Trash2 } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import Button from "../components/Button";
import Input from "../components/Input";
import { format, isSameDay, isSameWeek, isSameMonth, parseISO, startOfMonth, subDays } from 'date-fns';

export default function Finances() {
    const { data: orders } = useStoreData("orders");
    const { data: expenses, addStoreItem: addExpense, deleteStoreItem: deleteExpense } = useStoreData("expenses");

    // Expense Form State
    const [expenseForm, setExpenseForm] = useState({ description: "", amount: "", category: "Other" });
    const [loadingExpense, setLoadingExpense] = useState(false);

    const EXPENSE_CATEGORIES = ["Ads", "Shipping", "COGS", "Salaries", "Other"];
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    // --- KPIs Calculation ---
    const stats = useMemo(() => {
        const today = new Date();
        let revenueToday = 0;
        let revenueWeek = 0;
        let revenueMonth = 0;
        let totalRevenue = 0;
        let activeOrdersCount = 0;

        orders.forEach(order => {
            const orderDate = parseISO(order.date);
            const amount = (parseFloat(order.price) || 0) * (parseInt(order.quantity) || 1);

            totalRevenue += amount;

            if (isSameDay(orderDate, today)) revenueToday += amount;
            if (isSameWeek(orderDate, today)) revenueWeek += amount;
            if (isSameMonth(orderDate, today)) revenueMonth += amount;

            if (!['livré', 'retour'].includes(order.status)) {
                activeOrdersCount++;
            }
        });

        const totalExpenses = expenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
        const netResult = totalRevenue - totalExpenses;

        return {
            revenueToday,
            revenueWeek,
            revenueMonth,
            totalRevenue,
            totalExpenses,
            netResult,
            activeOrdersCount,
            totalOrders: orders.length
        };
    }, [orders, expenses]);

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
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Finances & Analytics</h1>
                <p className="mt-1 text-sm text-gray-500">
                    Track revenue, expenses, and net profit.
                </p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-100">
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <DollarSign className="h-6 w-6 text-gray-400" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">Revenue (Month)</dt>
                                    <dd>
                                        <div className="text-lg font-medium text-gray-900">{stats.revenueMonth.toFixed(2)} DH</div>
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
                                    <dt className="text-sm font-medium text-gray-500 truncate">Net Profit</dt>
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
                                    <dt className="text-sm font-medium text-gray-500 truncate">Total Expenses</dt>
                                    <dd>
                                        <div className="text-lg font-medium text-gray-900">{stats.totalExpenses.toFixed(2)} DH</div>
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
