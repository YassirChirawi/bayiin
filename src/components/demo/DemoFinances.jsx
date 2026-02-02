import { DollarSign, TrendingUp, CreditCard, PieChart as PieIcon, Download } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function DemoFinances() {
    const { t } = useLanguage();

    const data = [
        { name: 'Jan', income: 4000, expense: 2400 },
        { name: 'Feb', income: 3000, expense: 1398 },
        { name: 'Mar', income: 2000, expense: 9800 }, // Outlier for visual interest
        { name: 'Apr', income: 2780, expense: 3908 },
        { name: 'May', income: 1890, expense: 4800 },
        { name: 'Jun', income: 2390, expense: 3800 },
        { name: 'Jul', income: 3490, expense: 4300 },
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-slate-900">{t('finances') || "Finances"}</h2>
                    <p className="text-sm text-slate-500">Suivi des profits et dépenses.</p>
                </div>
                <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-50">
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Export</span>
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-indigo-600 rounded-xl p-5 text-white shadow-lg shadow-indigo-200">
                    <div className="flex items-center gap-2 mb-1 opacity-80">
                        <DollarSign className="w-4 h-4" /> Revenu Total
                    </div>
                    <div className="text-2xl font-bold">124,500 DH</div>
                    <div className="text-xs mt-2 bg-white/20 inline-block px-2 py-0.5 rounded">+12% vs mois dernier</div>
                </div>
                <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-1 text-slate-500">
                        <TrendingUp className="w-4 h-4" /> Profit Net
                    </div>
                    <div className="text-2xl font-bold text-green-600">42,300 DH</div>
                    <div className="text-xs mt-2 text-green-600 bg-green-50 inline-block px-2 py-0.5 rounded font-medium">Excellent</div>

                </div>
                <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-1 text-slate-500">
                        <CreditCard className="w-4 h-4" /> Dépenses
                    </div>
                    <div className="text-2xl font-bold text-red-500">82,200 DH</div>
                    <div className="text-xs mt-2 text-slate-400">Ads: 45%, Stock: 30%</div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-6">Cashflow</h3>
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                            <Bar dataKey="income" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="expense" fill="#EF4444" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
