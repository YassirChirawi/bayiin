import { useMemo, useState } from "react";
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
    TrendingUp, Users, Award, AlertTriangle, Store, Plus, Box
} from "lucide-react";
import Button from "../components/Button";
import Input from "../components/Input";
import toast from "react-hot-toast";
import { addDoc, collection, getDocs, doc, setDoc, query, where } from "firebase/firestore";
import { db } from "../lib/firebase";

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
    const { user } = useAuth();
    const { franchise, franchiseStores, isFranchiseAdmin, refreshStores } = useTenant();
    const { kpis, storeStats, topProducts, loading, refreshData } = useFranchiseData();

    // Store Creation State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newStoreName, setNewStoreName] = useState("");
    const [cloneSourceId, setCloneSourceId] = useState("");
    const [isCreating, setIsCreating] = useState(false);

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

            // 2. Clone Catalog if requested
            if (cloneSourceId) {
                const toastId = toast.loading("Duplication du catalogue...");
                const productsQuery = query(collection(db, "products"), where("storeId", "==", cloneSourceId));
                const productsSnap = await getDocs(productsQuery);

                let clonedCount = 0;
                const batchPromises = productsSnap.docs.map(async (productDoc) => {
                    const data = productDoc.data();
                    // exclude specific fields if needed
                    delete data.createdAt;
                    delete data.updatedAt;

                    await addDoc(collection(db, "products"), {
                        ...data,
                        storeId: storeRef.id,
                        createdAt: new Date()
                    });
                    clonedCount++;
                });

                await Promise.all(batchPromises);

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
        const revenue = stats?.totals?.deliveredRevenue ?? stats?.totals?.revenue ?? 0;
        const orders = stats?.totals?.count ?? 0;
        const returns = stats?.statusCounts?.retour ?? 0;
        const returnRate = orders > 0 ? ((returns / orders) * 100).toFixed(1) : '0.0';
        return { storeId, storeName, revenue, orders, returnRate };
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
                                Tableau de bord franchise · {storeCount} magasin{storeCount > 1 ? 's' : ''}
                            </p>
                        </div>
                    </div>
                    <Button
                        icon={Plus}
                        className="bg-white text-indigo-900 border-none hover:bg-indigo-50 shadow-lg"
                        onClick={() => setIsCreateModalOpen(true)}
                    >
                        Nouveau Magasin
                    </Button>
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
                    icon={DollarSign} label="CA Consolidé" color="indigo" loading={loading}
                    value={kpis ? `${kpis.totalRevenue.toLocaleString('fr-MA')} DH` : '—'}
                    sub="Toutes franchises"
                />
                <StatCard
                    icon={ShoppingBag} label="Commandes Totales" color="violet" loading={loading}
                    value={kpis ? kpis.totalOrders.toLocaleString('fr-MA') : '—'}
                    sub="Commandes livrées incluses"
                />
                <StatCard
                    icon={RotateCcw} label="Taux de Retour" color="rose" loading={loading}
                    value={kpis ? `${kpis.returnRate}%` : '—'}
                    sub="Moyenne pondérée"
                />
                <StatCard
                    icon={Package} label="Magasins Actifs" color="emerald" loading={loading}
                    value={storeCount}
                    sub="Dans cette franchise"
                />
            </div>

            {/* ── Charts Row ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

                {/* Revenue by Store — Bar Chart */}
                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
                    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-indigo-400" />
                        CA par Magasin
                    </h2>
                    {loading ? (
                        <div className="h-56 flex items-center justify-center text-indigo-300/50 text-sm">
                            Chargement...
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
                                    formatter={v => [`${v.toLocaleString('fr-MA')} DH`, 'CA']}
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
                        Tendance 7 Jours (CA global)
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
                                    formatter={v => [`${v.toLocaleString('fr-MA')} DH`, 'Revenu']}
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
                        Comparaison par Magasin
                    </h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-white/10">
                                    <th className="text-left text-indigo-300 font-semibold pb-3 pr-4">Magasin</th>
                                    <th className="text-right text-indigo-300 font-semibold pb-3 pr-4">CA (DH)</th>
                                    <th className="text-right text-indigo-300 font-semibold pb-3 pr-4">Commandes</th>
                                    <th className="text-right text-indigo-300 font-semibold pb-3">Retours</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {loading ? (
                                    [1, 2, 3].map(i => (
                                        <tr key={i}>
                                            {[1, 2, 3, 4].map(j => (
                                                <td key={j} className="py-3 pr-4">
                                                    <div className="h-4 bg-white/10 rounded animate-pulse" />
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                ) : tableData.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="py-8 text-center text-indigo-300/50 text-sm">
                                            Aucun magasin trouvé dans cette franchise
                                        </td>
                                    </tr>
                                ) : tableData.map(({ storeId, storeName, revenue, orders, returnRate }, i) => (
                                    <tr key={storeId} className="hover:bg-white/5 transition-colors">
                                        <td className="py-3 pr-4">
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                                                    style={{ backgroundColor: STORE_COLORS[i % STORE_COLORS.length] }}
                                                />
                                                <span className="text-white font-medium truncate">{storeName}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 pr-4 text-right text-emerald-400 font-bold">
                                            {revenue.toLocaleString('fr-MA')}
                                        </td>
                                        <td className="py-3 pr-4 text-right text-white">{orders}</td>
                                        <td className="py-3 text-right">
                                            <span className={`font-medium ${parseFloat(returnRate) > 15 ? 'text-rose-400' : parseFloat(returnRate) > 8 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                                {returnRate}%
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            {!loading && tableData.length > 0 && (
                                <tfoot>
                                    <tr className="border-t border-white/20">
                                        <td className="pt-3 pr-4 text-indigo-300 font-bold text-xs uppercase tracking-wide">Total</td>
                                        <td className="pt-3 pr-4 text-right text-white font-bold">
                                            {tableData.reduce((s, r) => s + r.revenue, 0).toLocaleString('fr-MA')}
                                        </td>
                                        <td className="pt-3 pr-4 text-right text-white font-bold">
                                            {tableData.reduce((s, r) => s + r.orders, 0)}
                                        </td>
                                        <td className="pt-3 text-right text-white font-bold">
                                            {kpis?.returnRate}%
                                        </td>
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
                        Top Produits
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
                            <p className="text-sm">Aucun produit livré</p>
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
                                        <p className="text-indigo-300/70 text-xs">{p.qty} unités · {p.storeCount} magasin{p.storeCount > 1 ? 's' : ''}</p>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    )}
                </div>
            </div>

            {/* Store Creation Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                        <div className="bg-indigo-600 p-6 text-white flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold">Ajouter un Magasin</h2>
                                <p className="text-indigo-200 text-sm mt-1">Élargissez votre franchise</p>
                            </div>
                            <button
                                onClick={() => !isCreating && setIsCreateModalOpen(false)}
                                className="text-white/70 hover:text-white"
                                disabled={isCreating}
                            >
                                &times;
                            </button>
                        </div>

                        <form onSubmit={handleCreateStore} className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Nom du magasin</label>
                                <Input
                                    placeholder="Ex: Kuos Agadir"
                                    value={newStoreName}
                                    onChange={e => setNewStoreName(e.target.value)}
                                    required
                                    disabled={isCreating}
                                />
                            </div>

                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
                                    <Box className="w-4 h-4 text-indigo-500" />
                                    Dupliquer le catalogue ? (Optionnel)
                                </label>
                                <p className="text-xs text-gray-500 mb-3">
                                    Copiez immédiatement tous les produits d'un magasin existant vers le nouveau.
                                </p>
                                <select
                                    className="w-full text-sm border-gray-200 rounded-xl focus:ring-indigo-500 focus:border-indigo-500"
                                    value={cloneSourceId}
                                    onChange={e => setCloneSourceId(e.target.value)}
                                    disabled={isCreating || franchiseStores.length === 0}
                                >
                                    <option value="">-- Démarrer à zéro --</option>
                                    {franchiseStores.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="pt-2 flex justify-end gap-3">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => !isCreating && setIsCreateModalOpen(false)}
                                    disabled={isCreating}
                                >
                                    Annuler
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isCreating}
                                >
                                    {isCreating ? 'Création en cours...' : 'Créer le magasin'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
