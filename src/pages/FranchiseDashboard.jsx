import { useMemo, useState, useEffect } from "react";
import { useTenant } from "../context/TenantContext";
import { useFranchiseData } from "../hooks/useFranchiseData";
import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, Legend, Cell
} from "recharts";
import {
    Building2, DollarSign, ShoppingBag, RotateCcw, Package,
    TrendingUp, Users, Award, AlertTriangle, Store, Plus, Box,
    Edit, Power, ExternalLink
} from "lucide-react";
import Button from "../components/Button";
import Input from "../components/Input";
import toast from "react-hot-toast";
import { addDoc, collection, getDocs, doc, setDoc, query, where, writeBatch } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useLanguage } from "../context/LanguageContext";
import { useAudit } from "../hooks/useAudit";

// ── Color palette for per-store bars ──
const STORE_COLORS = [
    '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
    '#10b981', '#3b82f6', '#ef4444', '#14b8a6'
];

function StatCard({ icon: Icon, label, value, sub, color = 'indigo', loading }) {
    const colorMap = {
        indigo: { bg: 'bg-indigo-50', icon: 'text-indigo-600', val: 'text-indigo-700' },
        violet: { bg: 'bg-violet-50', icon: 'text-violet-600', val: 'text-violet-700' },
        emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', val: 'text-emerald-700' },
        rose: { bg: 'bg-rose-50', icon: 'text-rose-600', val: 'text-rose-700' },
        amber: { bg: 'bg-amber-50', icon: 'text-amber-600', val: 'text-amber-700' },
    };
    const c = colorMap[color] || colorMap.indigo;

    return (
        <div className="glass-panel rounded-2xl p-5 flex items-center gap-4">
            <div className={`flex-shrink-0 ${c.bg} rounded-xl p-3`}>
                <Icon className={`h-6 w-6 ${c.icon}`} />
            </div>
            <div className="min-w-0">
                <p className="text-xs font-medium text-gray-500 truncate">{label}</p>
                <p className={`text-2xl font-bold ${c.val} truncate`}>
                    {loading ? <span className="animate-pulse text-gray-300">———</span> : value}
                </p>
                {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
            </div>
        </div>
    );
}

export default function FranchiseDashboard() {
    const { t } = useLanguage();
    const { logAction } = useAudit();
    const { user } = useAuth();
    const { franchise, franchiseStores, isFranchiseAdmin, refreshStores } = useTenant();
    
    // Global Date Filter State
    const [dateFilter, setDateFilter] = useState('all');

    const { kpis, storeStats, topProducts, loading, refreshData } = useFranchiseData(dateFilter);

    // Franchise Applications State
    const [applications, setApplications] = useState([]);
    const [pendingApproveId, setPendingApproveId] = useState(null);

    useEffect(() => {
        if (!franchise?.id) return;
        const loadApps = async () => {
            try {
                const q = query(
                    collection(db, 'franchiseApplications'),
                    where('storeId', '==', franchise.id),
                    where('status', '==', 'pending')
                );
                const snap = await getDocs(q);
                setApplications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch(e) { console.error(e); }
        };
        loadApps();
    }, [franchise?.id]);

    const handleApproveApplication = (app) => {
        setNewStoreName(`Franchise ${app.city} - ${app.name}`);
        setPendingApproveId(app.id);
        setIsCreateModalOpen(true);
    };

    const closeCreateModal = () => {
        if (isCreating) return;
        setIsCreateModalOpen(false);
        setPendingApproveId(null);
    };

    // Store Creation State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newStoreName, setNewStoreName] = useState("");
    const [cloneSourceId, setCloneSourceId] = useState("");
    const [isCreating, setIsCreating] = useState(false);

    // Store Management State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingStore, setEditingStore] = useState(null);

    const handleSwitchStore = (storeId) => {
        localStorage.setItem('bayiin_tenant_store', storeId);
        window.location.href = '/dashboard';
    };

    const toggleStoreStatus = async (storeId, currentStatus) => {
        const isCurrentlyActive = currentStatus !== false; 
        if (window.confirm(`Voulez-vous vraiment ${isCurrentlyActive ? 'désactiver' : 'réactiver'} ce magasin ?`)) {
            const toastId = toast.loading("Mise à jour...");
            try {
                await setDoc(doc(db, "stores", storeId), { isActive: !isCurrentlyActive }, { merge: true });
                await refreshStores();
                if (refreshData) refreshData();
                toast.success(`Magasin ${isCurrentlyActive ? 'désactivé' : 'réactivé'} avec succès`, { id: toastId });
                logAction('STORE_STATUS_TOGGLE', `Store ${storeId} ${isCurrentlyActive ? 'deactivated' : 'activated'}`);
            } catch (err) {
                console.error(err);
                toast.error("Erreur de mise à jour", { id: toastId });
            }
        }
    };

    const handleUpdateStore = async (e) => {
        e.preventDefault();
        if (!editingStore?.name?.trim()) return;

        const toastId = toast.loading("Mise à jour...");
        try {
            await setDoc(doc(db, "stores", editingStore.id), { 
                name: editingStore.name.trim(),
                plan: editingStore.plan || 'free'
            }, { merge: true });
            
            setIsEditModalOpen(false);
            setEditingStore(null);
            await refreshStores();
            if (refreshData) refreshData();
            
            toast.success("Paramètres mis à jour", { id: toastId });
        } catch (err) {
            console.error(err);
            toast.error("Erreur lors de la modification", { id: toastId });
        }
    };

    const handleCreateStore = async (e) => {
        e.preventDefault();
        if (!newStoreName.trim()) return;

        setIsCreating(true);
        try {
            // 1. Create base Store
            const storeRef = await addDoc(collection(db, "stores"), {
                name: newStoreName.trim(),
                ownerId: user.uid,
                franchiseId: franchise.id,
                plan: "free",
                products: 0,
                createdAt: new Date(),
                currency: "MAD",
                settings: {
                    allowGuestCheckout: true,
                    requirePhone: true
                }
            });

            // Log activity
            logAction('STORE_CREATE', `Created new store: ${newStoreName.trim()}`, { storeId: storeRef.id });

            // 2. Clone Catalog if requested
            if (cloneSourceId) {
                const toastId = toast.loading("Duplication du catalogue...");
                const productsQuery = query(collection(db, "products"), where("storeId", "==", cloneSourceId));
                const productsSnap = await getDocs(productsQuery);

                let clonedCount = 0;
                let currentBatch = writeBatch(db);
                let operationsCount = 0;

                for (const productDoc of productsSnap.docs) {
                    const data = productDoc.data();
                    // exclude specific fields if needed
                    delete data.createdAt;
                    delete data.updatedAt;

                    const newDocRef = doc(collection(db, "products"));
                    currentBatch.set(newDocRef, {
                        ...data,
                        storeId: storeRef.id,
                        createdAt: new Date()
                    });

                    clonedCount++;
                    operationsCount++;

                    // Firestore batch limit is 500. We commit at 450 to be safe.
                    if (operationsCount === 450) {
                        await currentBatch.commit();
                        currentBatch = writeBatch(db);
                        operationsCount = 0;
                    }
                }

                if (operationsCount > 0) {
                    await currentBatch.commit();
                }

                // Update product count on store
                await setDoc(doc(db, "stores", storeRef.id), { products: clonedCount }, { merge: true });
                toast.success(`${clonedCount} produits copiés !`, { id: toastId });
            }

            toast.success("Magasin créé avec succès !");
            setIsCreateModalOpen(false);
            setNewStoreName("");
            setCloneSourceId("");

            // Force refresh data if the hook supports it
            if (refreshData) refreshData();

            // Refresh tenant context to include new store
            if (refreshStores) await refreshStores();

            if (pendingApproveId) {
                await setDoc(doc(db, 'franchiseApplications', pendingApproveId), { status: 'approved' }, { merge: true });
                setApplications(prev => prev.filter(a => a.id !== pendingApproveId));
                setPendingApproveId(null);
            }
        } catch (error) {
            console.error(error);
            toast.error("Erreur lors de la création du magasin");
        } finally {
            setIsCreating(false);
        }
    };

    // Redirect non-franchise users
    if (!isFranchiseAdmin) return <Navigate to="/dashboard" replace />;

    const franchiseName = franchise?.name || "Franchise Hub";
    const storeCount = franchiseStores.length;

    // Per-store comparison table data
    const tableData = storeStats.map(({ storeId, storeName, stats }) => {
        const storeObj = franchiseStores.find(s => s.id === storeId);
        const revenue = stats?.totals?.deliveredRevenue ?? stats?.totals?.revenue ?? 0;
        const orders = stats?.totals?.count ?? 0;
        const returns = stats?.statusCounts?.retour ?? 0;
        const returnRate = orders > 0 ? ((returns / orders) * 100).toFixed(1) : '0.0';
        return { storeId, storeName, revenue, orders, returnRate, storeObj };
    }).sort((a, b) => b.revenue - a.revenue);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 p-4 md:p-8">

            {/* ── Header ── */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-2.5">
                            <Building2 className="h-7 w-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-white tracking-tight">{franchiseName}</h1>
                            <p className="text-indigo-300 text-sm mt-0.5">
                                {t('franchise_hub')} · {storeCount} {t('active_stores').toLowerCase()}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <select 
                            value={dateFilter} 
                            onChange={e => setDateFilter(e.target.value)}
                            className="bg-white/10 text-white border border-white/20 rounded-xl px-4 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500 outline-none backdrop-blur-sm cursor-pointer [&>option]:text-gray-900"
                        >
                            <option value="7d">{t('last_7_days') || "7 Derniers Jours"}</option>
                            <option value="30d">{t('last_30_days') || "30 Derniers Jours"}</option>
                            <option value="all">{t('all_time') || "Global (Tout)"}</option>
                        </select>
                        <Button
                            icon={Plus}
                            className="bg-white text-indigo-900 border-none hover:bg-indigo-50 shadow-lg"
                            onClick={() => setIsCreateModalOpen(true)}
                        >
                            {t('create_new_store')}
                        </Button>
                    </div>
                </div>
                {/* Store badges */}
                <div className="flex flex-wrap gap-2 mt-4">
                    {franchiseStores.map((s, i) => (
                        <span
                            key={s.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-white"
                            style={{ backgroundColor: STORE_COLORS[i % STORE_COLORS.length] + 'cc' }}
                        >
                            <Store className="h-3 w-3" />
                            {s.name || s.id}
                        </span>
                    ))}
                </div>
            </div>

            {/* ── KPI Row ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard
                    icon={DollarSign} label={t('consolidated_ca')} color="indigo" loading={loading}
                    value={kpis ? `${kpis.totalRevenue.toLocaleString('fr-MA')} ${t('revenue_unit')}` : '—'}
                    sub={t('total_global')}
                />
                <StatCard
                    icon={ShoppingBag} label={t('total_orders_consolidated')} color="violet" loading={loading}
                    value={kpis ? kpis.totalOrders.toLocaleString('fr-MA') : '—'}
                    sub={t('total_orders_consolidated')}
                />
                <StatCard
                    icon={RotateCcw} label={t('return_rate_avg')} color="rose" loading={loading}
                    value={kpis ? `${kpis.returnRate}%` : '—'}
                    sub={t('return_rate_avg')}
                />
                <StatCard
                    icon={Package} label={t('active_stores')} color="emerald" loading={loading}
                    value={storeCount}
                    sub={t('active_stores')}
                />
            </div>

            {/* ── Charts Row ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

                {/* Revenue by Store — Bar Chart */}
                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
                    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-indigo-400" />
                        {t('revenue_by_store')}
                    </h2>
                    {loading ? (
                        <div className="h-56 flex items-center justify-center text-indigo-300/50 text-sm">
                            {t('loading')}
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={kpis?.revByStore || []} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false} tickLine={false}
                                    tick={{ fill: '#a5b4fc', fontSize: 11 }}
                                    tickFormatter={v => v.length > 10 ? v.slice(0, 10) + '…' : v}
                                />
                                <YAxis
                                    axisLine={false} tickLine={false}
                                    tick={{ fill: '#a5b4fc', fontSize: 11 }}
                                    tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
                                />
                                <Tooltip
                                    contentStyle={{ background: '#1e1b4b', border: 'none', borderRadius: 10, color: '#fff', fontSize: 12 }}
                                    formatter={v => [`${v.toLocaleString('fr-MA')} ${t('revenue_unit')}`, t('revenue') || 'CA']}
                                />
                                <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                                    {(kpis?.revByStore || []).map((_, i) => (
                                        <Cell key={i} fill={STORE_COLORS[i % STORE_COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* 7-Day Trend — Line Chart */}
                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
                    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-purple-400" />
                        {t('trend_7d_global')}
                    </h2>
                    {loading ? (
                        <div className="h-56 flex items-center justify-center text-purple-300/50 text-sm">
                            Chargement...
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={220}>
                            <LineChart data={kpis?.trend7d || []} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#c4b5fd', fontSize: 11 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#c4b5fd', fontSize: 11 }}
                                    tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
                                />
                                <Tooltip
                                    contentStyle={{ background: '#1e1b4b', border: 'none', borderRadius: 10, color: '#fff', fontSize: 12 }}
                                    formatter={v => [`${v.toLocaleString('fr-MA')} ${t('revenue_unit')}`, t('revenue') || 'Revenu']}
                                />
                                <Line
                                    type="monotone" dataKey="revenue" stroke="#818cf8" strokeWidth={3}
                                    dot={{ r: 4, fill: '#818cf8', stroke: '#1e1b4b', strokeWidth: 2 }}
                                    activeDot={{ r: 6 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* ── Bottom Grid: Store Table + Top Products ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Per-store comparison table (2/3 width) */}
                <div className="lg:col-span-2 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
                    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Store className="h-5 w-5 text-indigo-400" />
                        {t('store_comparison')}
                    </h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-white/10">
                                    <th className="text-left text-indigo-300 font-semibold pb-3 pr-4">{t('active_stores')}</th>
                                    <th className="text-right text-indigo-300 font-semibold pb-3 pr-4">{t('consolidated_ca')} ({t('revenue_unit')})</th>
                                    <th className="text-right text-indigo-300 font-semibold pb-3 pr-4">{t('orders')}</th>
                                    <th className="text-right text-indigo-300 font-semibold pb-3 pr-4">{t('status_retour')}</th>
                                    <th className="text-right text-indigo-300 font-semibold pb-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {loading ? (
                                    [1, 2, 3].map(i => (
                                        <tr key={i}>
                                            {[1, 2, 3, 4, 5].map(j => (
                                                <td key={j} className="py-3 pr-4">
                                                    <div className="h-4 bg-white/10 rounded animate-pulse" />
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                ) : tableData.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-8 text-center text-indigo-300/50 text-sm">
                                            {t('no_stores_found')}
                                        </td>
                                    </tr>
                                ) : tableData.map(({ storeId, storeName, revenue, orders, returnRate, storeObj }, i) => (
                                    <tr key={storeId} className={`hover:bg-white/5 transition-colors ${storeObj?.isActive === false ? 'opacity-50 grayscale' : ''}`}>
                                        <td className="py-3 pr-4">
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                                                    style={{ backgroundColor: STORE_COLORS[i % STORE_COLORS.length] }}
                                                />
                                                <span className="text-white font-medium truncate">
                                                    {storeName}
                                                    {storeObj?.isActive === false && <span className="ml-2 text-[10px] bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded uppercase cursor-help" title="Magasin désactivé">INACTIF</span>}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-3 pr-4 text-right text-emerald-400 font-bold">
                                            {revenue.toLocaleString('fr-MA')}
                                        </td>
                                        <td className="py-3 pr-4 text-right text-white">{orders}</td>
                                        <td className="py-3 pr-4 text-right">
                                            <span className={`font-medium ${parseFloat(returnRate) > 15 ? 'text-rose-400' : parseFloat(returnRate) > 8 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                                {returnRate}%
                                            </span>
                                        </td>
                                        <td className="py-3 text-right">
                                            <div className="flex items-center justify-end gap-1 opacity-60 hover:opacity-100 transition-opacity">
                                                <button 
                                                    title="Accéder au magasin"
                                                    onClick={() => handleSwitchStore(storeId)} 
                                                    className="p-1.5 text-indigo-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                                >
                                                    <ExternalLink className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    title="Modifier les paramètres"
                                                    onClick={() => { setEditingStore(storeObj); setIsEditModalOpen(true); }}
                                                    className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    title={storeObj?.isActive !== false ? "Désactiver le magasin" : "Réactiver le magasin"}
                                                    onClick={() => toggleStoreStatus(storeId, storeObj?.isActive)}
                                                    className={`p-1.5 rounded-lg transition-colors ${storeObj?.isActive !== false ? 'text-gray-400 hover:text-rose-400 hover:bg-rose-400/10' : 'text-rose-400 hover:text-emerald-400 hover:bg-emerald-400/10'}`}
                                                >
                                                    <Power className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            {!loading && tableData.length > 0 && (
                                <tfoot>
                                    <tr className="border-t border-white/20">
                                        <td className="pt-3 pr-4 text-indigo-300 font-bold text-xs uppercase tracking-wide">{t('total_global')}</td>
                                        <td className="pt-3 pr-4 text-right text-white font-bold">
                                            {tableData.reduce((s, r) => s + r.revenue, 0).toLocaleString('fr-MA')}
                                        </td>
                                        <td className="pt-3 pr-4 text-right text-white font-bold">
                                            {tableData.reduce((s, r) => s + r.orders, 0)}
                                        </td>
                                        <td className="pt-3 pr-4 text-right text-white font-bold">
                                            {kpis?.returnRate}%
                                        </td>
                                        <td className="pt-3"></td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </div>

                {/* Top Products (1/3 width) */}
                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
                    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Award className="h-5 w-5 text-amber-400" />
                        {t('top_products_global')}
                    </h2>
                    {loading ? (
                        <div className="space-y-3">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="h-8 bg-white/10 rounded-lg animate-pulse" />
                            ))}
                        </div>
                    ) : topProducts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-indigo-300/50">
                            <AlertTriangle className="h-8 w-8 mb-2 opacity-40" />
                            <p className="text-sm">{t('no_data')}</p>
                        </div>
                    ) : (
                        <ol className="space-y-2">
                            {topProducts.map((p, i) => (
                                <li key={i} className="flex items-center gap-3">
                                    <span
                                        className="flex-shrink-0 h-6 w-6 rounded-full text-xs font-bold flex items-center justify-center text-white"
                                        style={{ backgroundColor: STORE_COLORS[i % STORE_COLORS.length] }}
                                    >
                                        {i + 1}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white text-sm font-medium truncate">{p.name}</p>
                                        <p className="text-indigo-300/70 text-xs">{p.qty} {t('label_quantity').toLowerCase()} · {p.storeCount} {t('active_stores').toLowerCase()}</p>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    )}
                </div>
            </div>

            {/* ── Franchise Applications ── */}
            {applications.length > 0 && (
                <div className="mt-6 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
                    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Users className="h-5 w-5 text-emerald-400" />
                        Candidatures en attente ({applications.length})
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {applications.map(app => (
                            <div key={app.id} className="bg-white/10 backdrop-blur border border-white/20 rounded-xl p-5 relative overflow-hidden hover:bg-white/20 transition-all">
                                <div className="absolute -top-4 -right-4 p-4 opacity-10"><Building2 className="w-24 h-24 text-white" /></div>
                                <div className="relative z-10 space-y-2">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <p className="font-bold text-white text-lg">{app.name}</p>
                                            <p className="text-sm font-medium text-indigo-300 flex items-center gap-1">
                                                <Store className="w-3.5 h-3.5" /> {app.city}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5 pb-2 border-b border-white/10">
                                        <p className="text-xs text-slate-200 flex items-center gap-2">
                                            <span className="text-indigo-300 w-16">Téléphone:</span> <span className="font-medium">{app.phone}</span>
                                        </p>
                                        <p className="text-xs text-slate-200 flex items-center gap-2">
                                            <span className="text-indigo-300 w-16">Budget:</span> <span className="bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-medium">{app.budget}</span>
                                        </p>
                                        <p className="text-xs text-slate-200 flex items-start gap-2">
                                            <span className="text-indigo-300 w-16 flex-shrink-0">Profil:</span> <span>{app.experience}</span>
                                        </p>
                                    </div>
                                    {app.motivation && (
                                        <div className="pt-1">
                                            <p className="text-xs text-indigo-200 mb-1">Motivation :</p>
                                            <p className="text-xs text-slate-300 p-2.5 bg-black/20 rounded-lg italic line-clamp-3">"{app.motivation}"</p>
                                        </div>
                                    )}
                                    <div className="pt-3">
                                        <Button className="w-full bg-emerald-500 hover:bg-emerald-600 border-none text-white shadow-lg shadow-emerald-900/50" onClick={() => handleApproveApplication(app)}>
                                            Valider la candidature
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Store Creation Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                        <div className="bg-indigo-600 p-6 text-white flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold">{t('create_new_store')}</h2>
                                <p className="text-indigo-200 text-sm mt-1">{t('franchise_hub')}</p>
                            </div>
                            <button
                                onClick={closeCreateModal}
                                className="text-white/70 hover:text-white"
                                disabled={isCreating}
                            >
                                &times;
                            </button>
                        </div>

                        <form onSubmit={handleCreateStore} className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">{t('store_name')}</label>
                                <Input
                                    placeholder="Ex: Boutique Agadir"
                                    value={newStoreName}
                                    onChange={e => setNewStoreName(e.target.value)}
                                    required
                                    disabled={isCreating}
                                />
                            </div>

                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
                                    <Box className="w-4 h-4 text-indigo-500" />
                                    {t('clone_catalog')}
                                </label>
                                <p className="text-xs text-gray-500 mb-3">
                                    {t('clone_catalog_desc')}
                                </p>
                                <select
                                    className="w-full text-sm border-gray-200 rounded-xl focus:ring-indigo-500 focus:border-indigo-500"
                                    value={cloneSourceId}
                                    onChange={e => setCloneSourceId(e.target.value)}
                                    disabled={isCreating || franchiseStores.length === 0}
                                >
                                    <option value="">{t('start_from_scratch')}</option>
                                    {franchiseStores.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="pt-2 flex justify-end gap-3">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={closeCreateModal}
                                    disabled={isCreating}
                                >
                                    {t('cancel')}
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isCreating}
                                >
                                    {isCreating ? t('loading') : t('create_new_store')}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Store Edit Modal */}
            {isEditModalOpen && editingStore && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                        <div className="bg-slate-800 p-6 text-white flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold">Gérer le magasin</h2>
                                <p className="text-slate-300 text-sm mt-1">Paramètres de la succursale</p>
                            </div>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-white/70 hover:text-white">
                                &times;
                            </button>
                        </div>
                        <form onSubmit={handleUpdateStore} className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">{t('store_name')}</label>
                                <Input
                                    value={editingStore.name}
                                    onChange={e => setEditingStore({...editingStore, name: e.target.value})}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Plan d'abonnement</label>
                                <select
                                    className="w-full text-sm border-gray-200 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 p-2.5 border bg-gray-50 text-gray-900"
                                    value={editingStore.plan || 'free'}
                                    onChange={e => setEditingStore({...editingStore, plan: e.target.value})}
                                >
                                    <option value="free">Basic (Gratuit)</option>
                                    <option value="pro">Pro</option>
                                    <option value="enterprise">Entreprise</option>
                                </select>
                            </div>
                            <div className="pt-2 flex justify-end gap-3">
                                <Button type="button" variant="secondary" onClick={() => setIsEditModalOpen(false)}>
                                    {t('cancel')}
                                </Button>
                                <Button type="submit">Sauvegarder</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
