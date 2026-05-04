import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Building2, Users, DollarSign, Search, ExternalLink, ShieldAlert, Megaphone, CheckCircle, AlertTriangle } from "lucide-react";
import Button from "../components/Button";
import Input from "../components/Input";
import toast from "react-hot-toast";
import { useAdminData } from "../hooks/useAdminData";
import { doc, updateDoc, deleteDoc, setDoc, addDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { RevenueChart, PlanDistributionChart } from "../components/admin/AdminCharts";
import { MetricCard, PerformanceTrend, StoreActivityTable } from "../components/admin/AdminMetrics";
import { TrendingUp, Activity, Wallet, PieChart as PieChartIcon, Zap, Globe, ShieldCheck } from "lucide-react";

export default function AdminDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('stores');
    const [searchTerm, setSearchTerm] = useState("");
    const [qaProgress, setQaProgress] = useState({});
    const [contacts, setContacts] = useState([]);
    const [contactsLoading, setContactsLoading] = useState(false);
    const [promoCodes, setPromoCodes] = useState([]);
    const [promoLoading, setPromoLoading] = useState(false);
    const [selectedQaStore, setSelectedQaStore] = useState(null);
    const [auditStore, setAuditStore] = useState(null);

    // Custom Hook
    const { stats, stores, usersList, franchises, broadcastData, loading, refreshData, setStores, setUsersList } = useAdminData(user);

    // Franchise Modal State
    const [isFranchiseModalOpen, setIsFranchiseModalOpen] = useState(false);
    const [newFranchiseName, setNewFranchiseName] = useState("");
    const [newFranchiseAdminEmail, setNewFranchiseAdminEmail] = useState("");

    const handleCreateFranchise = async (e) => {
        e.preventDefault();
        if (!newFranchiseName || !newFranchiseAdminEmail) return toast.error("All fields required");
        try {
            // Check if user exists first
            const userQ = query(collection(db, "users"), where("email", "==", newFranchiseAdminEmail.trim()));
            const userSnap = await getDocs(userQ);

            if (userSnap.empty) {
                return toast.error("User not found. Admin must sign up first.");
            }

            // Create franchise
            const franchiseRef = await addDoc(collection(db, "franchises"), {
                name: newFranchiseName,
                createdAt: new Date(),
            });

            // Update user
            const targetUser = userSnap.docs[0];
            await updateDoc(doc(db, "users", targetUser.id), {
                role: "franchise_admin",
                franchiseId: franchiseRef.id
            });

            // Attach user's existing stores to this new franchise
            const storesQ = query(collection(db, "stores"), where("ownerId", "==", targetUser.id));
            const storesSnap = await getDocs(storesQ);

            const storePromises = storesSnap.docs.map(storeDoc =>
                updateDoc(doc(db, "stores", storeDoc.id), { franchiseId: franchiseRef.id })
            );
            await Promise.all(storePromises);

            toast.success("Franchise created and Admin assigned!");
            setIsFranchiseModalOpen(false);
            setNewFranchiseName("");
            setNewFranchiseAdminEmail("");
            refreshData();
        } catch (err) {
            console.error(err);
            toast.error("Failed to create franchise");
        }
    };

    // Local Broadcast State (syncs with data on load)
    const [broadcastMsg, setBroadcastMsg] = useState(broadcastData.message);
    const [broadcastActive, setBroadcastActive] = useState(broadcastData.active);

    const handleBroadcastSave = async () => {
        try {
            await setDoc(doc(db, "system", "announcements"), {
                message: broadcastMsg,
                active: broadcastActive,
                updatedAt: new Date(),
                updatedBy: user.email
            });
            toast.success("Broadcast updated!");
            refreshData(); // Refresh to ensure sync
        } catch (err) {
            toast.error("Failed to update broadcast");
        }
    };

    // Derived Data for Charts
    const chartData = [
        { name: 'Jan', mrr: stats.mrr * 0.6 },
        { name: 'Feb', mrr: stats.mrr * 0.7 },
        { name: 'Mar', mrr: stats.mrr * 0.8 },
        { name: 'Apr', mrr: stats.mrr * 0.85 },
        { name: 'May', mrr: stats.mrr * 0.9 },
        { name: 'Jun', mrr: stats.mrr },
    ];

    const pieData = [
        { name: 'Pro', value: stats.proStores },
        { name: 'Free', value: stats.stores - stats.proStores },
    ];

    const filteredStores = stores.filter(store =>
        store.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        store.id?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredUsers = usersList.filter(u =>
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredFranchises = (franchises || []).filter(f =>
        f.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Fetch QA Progress
    const fetchQaProgress = async () => {
        const progress = {};
        // Load QA test definitions for task/severity metadata
        const { QA_MODULES: QA_MODS } = await import('../data/qaTests');
        const testMeta = {};
        QA_MODS.forEach(mod => mod.tests.forEach(t => { testMeta[t.id] = t; }));

        for (const store of stores) {
            try {
                const snap = await getDocs(collection(db, "stores", store.id, "qa_runs"));
                if (!snap.empty) {
                    const currentRun = snap.docs.find(d => d.id === 'current')?.data();
                    if (currentRun?.tests) {
                        const entries = Object.entries(currentRun.tests);
                        const total = Object.keys(testMeta).length || 49;
                        const completed = entries.filter(([, t]) => t.status === 'ok').length;
                        const failed = entries.filter(([, t]) => t.status === 'fail').length;

                        // UX Rating average (only rated entries)
                        const rated = entries.filter(([, t]) => t.uxRating > 0);
                        const avgUxRating = rated.length > 0
                            ? rated.reduce((s, [, t]) => s + t.uxRating, 0) / rated.length
                            : 0;

                        // Full results for auditing
                        const fullResults = currentRun.tests;
                        const failedTests = entries.filter(([, t]) => t.status === 'fail').map(([id]) => id);
                        const startTime = currentRun.startTime?.toDate ? currentRun.startTime.toDate() : null;
                        const endTime = currentRun.updatedAt?.toDate ? currentRun.updatedAt.toDate() : null;
                        const durationMinutes = (startTime && endTime) ? Math.round((endTime - startTime) / 60000) : null;

                        progress[store.id] = { 
                            completed, 
                            total, 
                            failed, 
                            avgUxRating, 
                            failedTests, 
                            fullResults,
                            startTime,
                            updatedAt: currentRun.updatedAt,
                            durationMinutes
                        };
                    }
                }
            } catch (e) { console.error(e); }
        }
        setQaProgress(progress);
    };

    useEffect(() => {
        if (activeTab === 'qa' && stores.length > 0) {
            fetchQaProgress();
        }
        if (activeTab === 'contacts') {
            setContactsLoading(true);
            getDocs(collection(db, 'contact_requests'))
                .then(snap => {
                    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                    data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
                    setContacts(data);
                })
                .catch(console.error)
                .finally(() => setContactsLoading(false));
        }
        if (activeTab === 'promo') {
            setPromoLoading(true);
            getDocs(collection(db, 'promo_codes'))
                .then(snap => {
                    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                    data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
                    setPromoCodes(data);
                })
                .catch(console.error)
                .finally(() => setPromoLoading(false));
        }
    }, [activeTab, stores]);


    if (loading) return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <ShieldAlert className="h-8 w-8 text-indigo-600" />
                            Admin Command Center
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">Overview of system health and performance</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="hidden md:block text-right mr-2">
                            <p className="text-xs font-medium text-gray-400">Logged in as</p>
                            <p className="text-sm font-bold text-gray-900">{user?.email}</p>
                        </div>
                        <Button variant="secondary" onClick={() => navigate('/')}>Exit Admin</Button>
                    </div>
                </header>

                {/* Analytics Pulse Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <MetricCard 
                        title="Monthly Recurring Revenue" 
                        value={`${stats.mrr.toLocaleString()} MAD`} 
                        trend={8.4} 
                        icon={Wallet} 
                        color="indigo" 
                    />
                    <MetricCard 
                        title="Active Merchants" 
                        value={stats.stores} 
                        trend={stats.growth} 
                        icon={TrendingUp} 
                        color="emerald" 
                    />
                    <MetricCard 
                        title="Platform Engagement" 
                        value={`${stats.platformActivity.toFixed(1)}%`} 
                        trend={2.1} 
                        icon={Activity} 
                        color="amber" 
                    />
                    <MetricCard 
                        title="Store Retention" 
                        value={`${(100 - stats.churnRate).toFixed(1)}%`} 
                        trend={-0.5} 
                        icon={ShieldCheck} 
                        color="rose" 
                    />
                </div>

                {/* Secondary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-3xl border border-gray-100 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-2xl bg-blue-50 text-blue-600">
                                <Users className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Accounts</p>
                                <p className="text-xl font-black text-gray-900">{stats.users.toLocaleString()}</p>
                            </div>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-1 bg-blue-50 text-blue-600 rounded-lg">LIVE</span>
                    </div>

                    <div className="bg-white p-6 rounded-3xl border border-gray-100 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-2xl bg-purple-50 text-purple-600">
                                <Zap className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Premium Conversion</p>
                                <p className="text-xl font-black text-gray-900">{((stats.proStores/stats.stores)*100).toFixed(1)}%</p>
                            </div>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-1 bg-purple-50 text-purple-600 rounded-lg">UPGRADE</span>
                    </div>

                    <div className="bg-white p-6 rounded-3xl border border-gray-100 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-2xl bg-orange-50 text-orange-600">
                                <Globe className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Avg GMV Estimate</p>
                                <p className="text-xl font-black text-gray-900">{stats.avgStoreRevenue.toLocaleString()} DH</p>
                            </div>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-1 bg-orange-50 text-orange-600 rounded-lg">ECO</span>
                    </div>
                </div>

                {/* Revenue Trend - Full Width */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h4 className="font-bold text-gray-900 mb-6">Revenue Growth (6 Months)</h4>
                    <RevenueChart data={chartData} />
                </div>

                {/* Main Content Areas */}
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 min-h-[500px] overflow-hidden">
                    <div className="border-b border-gray-100 px-6 pt-6 bg-white sticky top-0 z-10">
                        <nav className="-mb-px flex space-x-6 overflow-x-auto no-scrollbar">
                            {['stores', 'users', 'franchises', 'insights', 'qa', 'contacts', 'promo', 'broadcast'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`
                                        whitespace-nowrap pb-4 px-1 border-b-2 font-black text-[10px] uppercase tracking-widest transition-all duration-200
                                        ${activeTab === tab
                                            ? 'border-indigo-600 text-indigo-600'
                                            : 'border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-200'}
                                    `}
                                >
                                    {tab === 'insights' ? '📊 Insights' : tab === 'qa' ? '🛡️ QA Recette' : tab === 'contacts' ? '📬 Contacts' : tab === 'promo' ? '🎁 Codes Beta' : tab}
                                </button>
                            ))}
                        </nav>
                    </div>

                    <div className="p-6">
                        {/* Control Bar for Lists */}
                        {activeTab !== 'broadcast' && activeTab !== 'contacts' && activeTab !== 'promo' && activeTab !== 'insights' && (
                            <div className="mb-6 flex flex-col sm:flex-row justify-between gap-4">
                                <div className="w-full sm:w-72">
                                    <Input
                                        icon={Search}
                                        placeholder="Search..."
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        className="bg-gray-50 border-transparent focus:bg-white transition-all"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    {activeTab === 'franchises' && (
                                        <Button onClick={() => setIsFranchiseModalOpen(true)}>Create Franchise</Button>
                                    )}
                                    <Button variant="ghost" size="sm">Filter</Button>
                                    <Button variant="ghost" size="sm">Export</Button>
                                </div>
                            </div>
                        )}

                        {/* STORES TAB */}
                        {activeTab === 'stores' && (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-100">
                                    <thead>
                                        <tr className="bg-gray-50/50">
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider rounded-l-lg">Store Info</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Plan Details</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Metrics</th>
                                            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider rounded-r-lg">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {filteredStores.map(store => (
                                            <tr key={store.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center">
                                                        <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 flex items-center justify-center text-indigo-600 font-black mr-4 shadow-sm">
                                                            {store.name?.[0]?.toUpperCase() || 'S'}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-gray-900 text-sm">{store.name}</div>
                                                            <div className="text-[10px] text-gray-400 font-mono flex items-center gap-1">
                                                                <Globe className="w-2 h-2" /> {store.id.slice(0, 8)}...
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${store.plan === 'pro'
                                                        ? 'bg-indigo-100 text-indigo-800'
                                                        : 'bg-gray-100 text-gray-800'
                                                        }`}>
                                                        {store.plan === 'pro' && <CheckCircle className="w-3 h-3 mr-1" />}
                                                        {store.plan?.toUpperCase() || 'FREE'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500">
                                                    <div className="flex flex-col gap-1">
                                                        <span>{usersList.filter(u => u.storeId === store.id).length} Users</span>
                                                        <span className="text-xs text-gray-400">Created: {store.createdAt?.toDate ? new Date(store.createdAt.toDate()).toLocaleDateString() : 'N/A'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right flex justify-end gap-2">
                                                    <Button size="sm" variant="ghost" className="text-indigo-600 hover:bg-indigo-50" onClick={() => setAuditStore(store)}>
                                                        Audit
                                                    </Button>
                                                    <Button size="sm" variant="secondary" icon={ExternalLink} onClick={async () => {
                                                        if (!confirm("Access this store?")) return;
                                                        await updateDoc(doc(db, "users", user.uid), { storeId: store.id });
                                                        window.location.href = '/dashboard';
                                                    }}>Access</Button>

                                                    <div className="relative group">
                                                        <Button size="sm" variant="ghost">More</Button>
                                                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 hidden group-hover:block z-20 overflow-hidden">
                                                            <button
                                                                onClick={async () => {
                                                                    const newPlan = store.plan === 'pro' ? 'free' : 'pro';
                                                                    await updateDoc(doc(db, "stores", store.id), { plan: newPlan });
                                                                    setStores(prev => prev.map(s => s.id === store.id ? { ...s, plan: newPlan } : s));
                                                                    toast.success(`Store plan updated to ${newPlan}`);
                                                                }}
                                                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                                            >
                                                                {store.plan === 'pro' ? 'Downgrade to Free' : 'Upgrade to Pro'}
                                                            </button>
                                                            <button
                                                                onClick={async () => {
                                                                    if (!confirm("PERMANENTLY DELETE STORE? This cannot be undone.")) return;
                                                                    await deleteDoc(doc(db, "stores", store.id));
                                                                    setStores(prev => prev.filter(s => s.id !== store.id));
                                                                    toast.success("Store deleted");
                                                                }}
                                                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                                            >
                                                                Delete Store
                                                            </button>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {filteredStores.length === 0 && (
                                    <div className="p-12 text-center text-gray-500">No stores found matching your search.</div>
                                )}
                            </div>
                        )}

                        {/* USERS TAB */}
                        {activeTab === 'users' && (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-100">
                                    <thead>
                                        <tr className="bg-gray-50/50">
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider rounded-l-lg">User Profile</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Role & Access</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Associated Store</th>
                                            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider rounded-r-lg">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {filteredUsers.map(u => (
                                            <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center">
                                                        <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold mr-3 text-xs">
                                                            {u.email?.[0]?.toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div className="font-medium text-gray-900">{u.name || 'No Name'}</div>
                                                            <div className="text-xs text-gray-500">{u.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium text-gray-600 border border-gray-200">
                                                        {u.role || 'user'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500 font-mono text-xs">
                                                    {u.storeId || <span className="text-gray-300 italic">No Store</span>}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <Button size="sm" variant="secondary" onClick={async () => {
                                                        if (!confirm("Access this user's store?")) return;
                                                        await updateDoc(doc(db, "users", user.uid), { storeId: u.storeId });
                                                        window.location.href = '/dashboard';
                                                    }}>Visit</Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* FRANCHISES TAB */}
                        {activeTab === 'franchises' && (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-100">
                                    <thead>
                                        <tr className="bg-gray-50/50">
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider rounded-l-lg">Franchise Details</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Stores Count</th>
                                            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider rounded-r-lg">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {filteredFranchises.map(franchise => (
                                            <tr key={franchise.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center">
                                                        <div className="h-10 w-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 font-bold mr-4">
                                                            <Building2 className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <div className="font-semibold text-gray-900">{franchise.name}</div>
                                                            <div className="text-xs text-gray-400 font-mono">{franchise.id}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                        {stores.filter(s => s.franchiseId === franchise.id).length} Stores
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={async () => {
                                                        if (!confirm("Delete this franchise?")) return;
                                                        await deleteDoc(doc(db, "franchises", franchise.id));
                                                        refreshData();
                                                    }}>Delete</Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {filteredFranchises.length === 0 && (
                                    <div className="p-12 text-center text-gray-500">No franchises found.</div>
                                )}
                            </div>
                        )}

                        {/* CONTACTS TAB */}
                        {activeTab === 'contacts' && (
                            <div className="space-y-4">
                                <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-2xl">
                                    <h3 className="font-bold text-indigo-900">📬 Demandes de contact & devis</h3>
                                    <p className="text-sm text-indigo-700 mt-1">Toutes les demandes soumises depuis la landing page ou le centre d'aide.</p>
                                </div>
                                {contactsLoading ? (
                                    <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" /></div>
                                ) : contacts.length === 0 ? (
                                    <div className="text-center py-16 text-gray-400">Aucune demande reçue pour le moment.</div>
                                ) : (
                                    <div className="space-y-3">
                                        {contacts.map(c => (
                                            <div key={c.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-all">
                                                <div className="flex items-start justify-between gap-4 flex-wrap">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${c.type === 'support' ? 'bg-blue-100 text-blue-700' : c.type === 'devis' ? 'bg-indigo-100 text-indigo-700' : c.type === 'integration' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'}`}>{c.type || 'contact'}</span>
                                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.status === 'done' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{c.status === 'done' ? '✅ Traité' : '🆕 Nouveau'}</span>
                                                            <span className="text-xs text-gray-400">{c.createdAt?.toDate ? c.createdAt.toDate().toLocaleString('fr-FR') : '—'}</span>
                                                        </div>
                                                        <p className="font-bold text-gray-900">{c.name || 'Anonyme'}</p>
                                                        <p className="text-sm text-gray-500">{c.company ? `${c.company} · ` : ''}{c.email}</p>
                                                        {c.budget && <p className="text-xs text-gray-400 mt-0.5">Budget : {c.budget}</p>}
                                                        {c.storeCount && c.storeCount !== '1' && <p className="text-xs text-gray-400">Boutiques : {c.storeCount}</p>}
                                                        {c.message && <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-3 rounded-xl italic">"{c.message}"</p>}
                                                        {c.integrationOptions?.length > 0 && (
                                                            <div className="flex flex-wrap gap-1 mt-2">
                                                                {c.integrationOptions.map(o => <span key={o} className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">{o}</span>)}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                                        {c.phone && (
                                                            <a href={`https://wa.me/${c.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                                                                className="flex items-center gap-1.5 text-xs font-bold text-white bg-[#25D366] hover:bg-[#1DAE57] px-3 py-1.5 rounded-xl transition-colors">
                                                                📱 {c.phone}
                                                            </a>
                                                        )}
                                                        <button
                                                            onClick={async () => {
                                                                const { updateDoc: ud, doc: fd } = await import('firebase/firestore');
                                                                await ud(fd(db, 'contact_requests', c.id), { status: c.status === 'done' ? 'new' : 'done' });
                                                                setContacts(prev => prev.map(x => x.id === c.id ? { ...x, status: x.status === 'done' ? 'new' : 'done' } : x));
                                                            }}
                                                            className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-colors ${c.status === 'done' ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                                        >
                                                            {c.status === 'done' ? 'Rouvrir' : 'Marquer traité'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* PROMO CODES TAB */}
                        {activeTab === 'promo' && (
                            <div className="space-y-4">
                                <div className="bg-amber-50 border border-amber-100 p-5 rounded-2xl flex items-start gap-4">
                                    <span className="text-3xl">🏆</span>
                                    <div>
                                        <h3 className="font-bold text-amber-900">Codes Beta Testeur</h3>
                                        <p className="text-sm text-amber-700 mt-0.5">Codes générés automatiquement après complétion de la recette QA (80%+, min 20 min, preuves obligatoires).</p>
                                    </div>
                                </div>
                                {promoLoading ? (
                                    <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" /></div>
                                ) : promoCodes.length === 0 ? (
                                    <div className="text-center py-16 text-gray-400">Aucun code généré pour le moment.</div>
                                ) : (
                                    <div className="space-y-3">
                                        {promoCodes.map(c => (
                                            <div key={c.id} className={`bg-white rounded-2xl border p-5 hover:shadow-md transition-all ${c.used ? 'border-gray-100 opacity-60' : 'border-amber-100'}`}>
                                                <div className="flex flex-wrap items-start justify-between gap-4">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                            <code className="text-lg font-black tracking-widest text-indigo-700 bg-indigo-50 px-3 py-1 rounded-xl">{c.code}</code>
                                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.used ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-700'}`}>
                                                                {c.used ? '✅ Utilisé' : '🟢 Actif'}
                                                            </span>
                                                        </div>
                                                        <p className="font-bold text-gray-900">{c.storeName}</p>
                                                        <div className="flex flex-wrap gap-3 text-xs text-gray-400 mt-1">
                                                            <span>📊 {c.completedTests}/{c.totalTests} tests</span>
                                                            <span>📅 Généré : {c.createdAt?.toDate ? c.createdAt.toDate().toLocaleDateString('fr-FR') : '—'}</span>
                                                            <span>⏳ Expire : {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString('fr-FR') : '—'}</span>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={async () => {
                                                            const { updateDoc: ud, doc: fd } = await import('firebase/firestore');
                                                            await ud(fd(db, 'promo_codes', c.id), { used: !c.used });
                                                            setPromoCodes(prev => prev.map(x => x.id === c.id ? { ...x, used: !x.used } : x));
                                                        }}
                                                        className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-colors flex-shrink-0 ${
                                                            c.used ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                                        }`}
                                                    >
                                                        {c.used ? 'Réactiver' : 'Marquer utilisé'}
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* QA TAB */}
                        {activeTab === 'qa' && (
                            <div className="space-y-6">
                                <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-2xl">
                                    <h3 className="text-lg font-bold text-indigo-900 mb-1">Suivi Global de la Recette QA</h3>
                                    <p className="text-sm text-indigo-700">Vue en temps réel des résultats, bugs signalés et notes UX par boutique.</p>
                                </div>

                                {/* Proofs Modal */}
                                {selectedQaStore && (
                                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
                                            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                                <div>
                                                    <h2 className="text-xl font-bold text-gray-900">Audit des Proofs : {selectedQaStore.name}</h2>
                                                    <p className="text-xs text-gray-500">Session de {selectedQaStore.durationMinutes || '?'} minutes</p>
                                                </div>
                                                <button onClick={() => setSelectedQaStore(null)} className="text-gray-400 hover:text-gray-600 text-2xl font-bold">&times;</button>
                                            </div>
                                            <div className="flex-1 overflow-auto p-6">
                                                <table className="min-w-full divide-y divide-gray-200">
                                                    <thead>
                                                        <tr className="bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                            <th className="px-4 py-3 text-left">Test</th>
                                                            <th className="px-4 py-3 text-center">Status</th>
                                                            <th className="px-4 py-3 text-center">UX</th>
                                                            <th className="px-4 py-3 text-left">Proof / Comment</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100">
                                                        {Object.entries(selectedQaStore.fullResults || {}).sort((a, b) => b[1].status === 'fail' ? 1 : -1).map(([id, t]) => (
                                                            <tr key={id} className={`text-sm ${t.status === 'fail' ? 'bg-red-50/30' : ''}`}>
                                                                <td className="px-4 py-3">
                                                                    <div className="font-bold text-gray-900">{id}</div>
                                                                    <div className="text-[10px] text-gray-400 truncate max-w-xs">Test ID: {id}</div>
                                                                </td>
                                                                <td className="px-4 py-3 text-center">
                                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${t.status === 'ok' ? 'bg-green-100 text-green-700' : t.status === 'fail' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
                                                                        {t.status === 'ok' ? 'VALIDÉ' : t.status === 'fail' ? 'BUG' : 'PENDING'}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-3 text-center">
                                                                    <div className="flex justify-center gap-0.5">
                                                                        {[...Array(5)].map((_, i) => (
                                                                            <Star key={i} size={10} className={i < (t.uxRating || 0) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'} />
                                                                        ))}
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    {t.comment && <p className="text-gray-700 italic">"{t.comment}"</p>}
                                                                    {t.bugDescription && <p className="text-red-600 mt-1 font-bold text-xs">🐛 Bug: {t.bugDescription}</p>}
                                                                    {!t.comment && !t.bugDescription && <span className="text-gray-300 italic">No proof provided</span>}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                            <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end">
                                                <Button onClick={() => setSelectedQaStore(null)}>Fermer l'audit</Button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {stores.length === 0 ? (
                                    <div className="text-center py-12 text-gray-400">Aucune boutique trouvée.</div>
                                ) : stores.map(store => {
                                    const p = qaProgress[store.id];
                                    if (!p) return (
                                        <div key={store.id} className="bg-white p-5 rounded-2xl border border-gray-100 flex items-center gap-4">
                                            <div className="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center font-bold text-gray-400">{store.name?.[0]}</div>
                                            <div className="flex-1">
                                                <p className="font-bold text-gray-900">{store.name}</p>
                                                <p className="text-xs text-gray-400">Aucun test commencé</p>
                                            </div>
                                            <Button size="sm" variant="secondary" icon={ExternalLink} onClick={() => navigate(`/qa?storeId=${store.id}`)}>Ouvrir QA</Button>
                                        </div>
                                    );

                                    const { completed, total, failed = 0, avgUxRating, failedTests = [], updatedAt, durationMinutes } = p;
                                    const pct = Math.round((completed / total) * 100);

                                    return (
                                        <div key={store.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-all">
                                            {/* Store Header */}
                                            <div className="p-5 flex flex-wrap items-center gap-4">
                                                <div className="h-11 w-11 rounded-xl bg-indigo-50 flex items-center justify-center font-black text-indigo-600 text-lg">{store.name?.[0]}</div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-gray-900">{store.name}</p>
                                                    {updatedAt && <p className="text-[10px] text-gray-400">Mis à jour : {new Date(updatedAt.seconds * 1000).toLocaleString('fr-FR')}</p>}
                                                </div>
                                                {/* KPI Pills */}
                                                <div className="flex flex-wrap gap-2">
                                                    {durationMinutes !== null && <span className="px-2 py-1 rounded-full text-[11px] font-bold bg-purple-100 text-purple-700">⏱️ {durationMinutes} min</span>}
                                                    <span className="px-2 py-1 rounded-full text-[11px] font-bold bg-green-100 text-green-700">{completed} ✅ validés</span>
                                                    {failed > 0 && <span className="px-2 py-1 rounded-full text-[11px] font-bold bg-red-100 text-red-700">{failed} ❌ bugs</span>}
                                                    {avgUxRating > 0 && <span className="px-2 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700">⭐ {avgUxRating.toFixed(1)} UX moy.</span>}
                                                    <span className="px-2 py-1 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-700">{total - completed - failed} ⏳ en attente</span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button size="sm" variant="secondary" onClick={() => setSelectedQaStore({ ...store, ...p })}>Audit Proofs</Button>
                                                    <Button size="sm" variant="ghost" icon={ExternalLink} onClick={() => navigate(`/qa?storeId=${store.id}`)}>Voir QA</Button>
                                                </div>
                                            </div>

                                            {/* Progress bar */}
                                            <div className="px-5 pb-4">
                                                <div className="flex justify-between text-xs mb-1 font-bold">
                                                    <span className="text-indigo-600">{pct}% complété</span>
                                                    <span className="text-gray-400">{completed} / {total}</span>
                                                </div>
                                                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden flex">
                                                    <div className="h-full bg-green-500 transition-all duration-700" style={{ width: `${pct}%` }} />
                                                    {failed > 0 && <div className="h-full bg-red-400 transition-all duration-700" style={{ width: `${Math.round((failed / total) * 100)}%` }} />}
                                                </div>
                                            </div>

                                            {/* Bug list */}
                                            {failedTests.length > 0 && (
                                                <div className="border-t border-red-50 bg-red-50/50 px-5 py-4">
                                                    <p className="text-xs font-bold text-red-700 mb-3 flex items-center gap-1.5">🐛 Bugs signalés ({failedTests.length})</p>
                                                    <div className="space-y-2">
                                                        {failedTests.map(t => (
                                                            <div key={t.id} className="bg-white rounded-xl p-3 border border-red-100">
                                                                <div className="flex items-start justify-between gap-2">
                                                                    <div className="min-w-0">
                                                                        <span className="text-[10px] font-mono text-gray-400 mr-1">{t.id}</span>
                                                                        <span className="text-xs font-bold text-gray-900">{t.task}</span>
                                                                        {t.bugDescription && <p className="text-xs text-red-600 mt-1 italic">"{t.bugDescription}"</p>}
                                                                        {t.comment && <p className="text-[10px] text-gray-400 mt-0.5">Preuve : {t.comment}</p>}
                                                                    </div>
                                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${t.severity === 'Critique' ? 'bg-red-100 text-red-700' : t.severity === 'Majeur' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>{t.severity}</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Audit Modal */}
                        {auditStore && (
                            <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    className="bg-white rounded-[32px] shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col"
                                >
                                    <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gradient-to-r from-gray-50 to-white">
                                        <div className="flex items-center gap-4">
                                            <div className="h-14 w-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-xl font-black shadow-lg shadow-indigo-100">
                                                {auditStore.name?.[0]}
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-black text-gray-900 tracking-tight">{auditStore.name}</h2>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${auditStore.plan === 'pro' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                                        {auditStore.plan || 'Free'}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400 font-mono">ID: {auditStore.id}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <button onClick={() => setAuditStore(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                            <X className="w-6 h-6 text-gray-400" />
                                        </button>
                                    </div>

                                    <div className="flex-1 overflow-auto p-8 bg-gray-50/30">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Articles</p>
                                                <p className="text-2xl font-black text-gray-900">{auditStore.products || 0}</p>
                                                <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 w-fit px-2 py-0.5 rounded-lg">
                                                    <TrendingUp className="w-3 h-3" /> Healthy Stock
                                                </div>
                                            </div>
                                            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Engagement</p>
                                                <p className="text-2xl font-black text-gray-900">High</p>
                                                <p className="text-[10px] text-gray-400 mt-1">Last seen: Just now</p>
                                            </div>
                                            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Performance Score</p>
                                                <p className="text-2xl font-black text-indigo-600">82/100</p>
                                                <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: '82%' }} />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                                                <h4 className="font-black text-sm uppercase tracking-widest mb-4">Merchant Health Audit</h4>
                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between text-sm">
                                                        <span className="text-gray-500">Business Context Set</span>
                                                        <span className="font-bold text-green-500">YES</span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-sm">
                                                        <span className="text-gray-500">WhatsApp Integration</span>
                                                        <span className="font-bold text-green-500">ACTIVE</span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-sm">
                                                        <span className="text-gray-500">Domain Connected</span>
                                                        <span className="font-bold text-gray-400">SUBDOMAIN</span>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                                                <h4 className="font-black text-sm uppercase tracking-widest mb-4">Quick Actions</h4>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <Button size="sm" variant="secondary" className="w-full text-[10px]">Reset Password</Button>
                                                    <Button size="sm" variant="secondary" className="w-full text-[10px]">Extend Trial</Button>
                                                    <Button size="sm" variant="secondary" className="w-full text-[10px]">Flag Store</Button>
                                                    <Button size="sm" variant="secondary" className="w-full text-[10px] text-red-600">Suspend</Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-6 border-t border-gray-100 bg-white flex justify-between items-center">
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Audit generated on {new Date().toLocaleDateString()}</p>
                                        <Button onClick={() => setAuditStore(null)}>Close Audit</Button>
                                    </div>
                                </motion.div>
                            </div>
                        )}

                        {/* INSIGHTS TAB */}
                        {activeTab === 'insights' && (
                            <div className="space-y-8 animate-in fade-in duration-500">
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    <div className="lg:col-span-2">
                                        <PerformanceTrend 
                                            title="Platform Revenue Growth (6m)" 
                                            data={[
                                                { name: 'Jan', value: stats.mrr * 0.4 },
                                                { name: 'Fev', value: stats.mrr * 0.55 },
                                                { name: 'Mar', value: stats.mrr * 0.6 },
                                                { name: 'Avr', value: stats.mrr * 0.8 },
                                                { name: 'Mai', value: stats.mrr * 0.95 },
                                                { name: 'Juin', value: stats.mrr },
                                            ]} 
                                        />
                                    </div>
                                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
                                        <div>
                                            <h4 className="font-black text-gray-900 text-sm uppercase tracking-widest mb-6">Plan Distribution</h4>
                                            <PlanDistributionChart data={pieData} />
                                        </div>
                                        <div className="space-y-3 mt-4">
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-gray-500 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-indigo-600"></div> Pro Merchants</span>
                                                <span className="font-bold text-gray-900">{stats.proStores}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-gray-500 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-gray-200"></div> Free Merchants</span>
                                                <span className="font-bold text-gray-900">{stats.stores - stats.proStores}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <h4 className="font-black text-gray-900 text-sm uppercase tracking-widest ml-1 flex items-center gap-2">
                                            <TrendingUp className="w-4 h-4 text-emerald-500" />
                                            Top Performers (by activity)
                                        </h4>
                                        <StoreActivityTable stores={stores.sort((a, b) => (b.products || 0) - (a.products || 0))} />
                                    </div>
                                    
                                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                                        <h4 className="font-black text-gray-900 text-sm uppercase tracking-widest mb-6 flex items-center gap-2">
                                            <ShieldAlert className="w-4 h-4 text-amber-500" />
                                            System Health
                                        </h4>
                                        <div className="space-y-6">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 rounded-xl bg-green-50 text-green-600">
                                                        <Activity className="w-4 h-4" />
                                                    </div>
                                                    <span className="text-xs font-bold text-gray-700">Firestore API</span>
                                                </div>
                                                <span className="text-[10px] font-black text-green-500">99.9% Uptime</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                                                        <Zap className="w-4 h-4" />
                                                    </div>
                                                    <span className="text-xs font-bold text-gray-700">Cloud Functions</span>
                                                </div>
                                                <span className="text-[10px] font-black text-indigo-500">12ms Latency</span>
                                            </div>
                                            <div className="pt-4 border-t border-gray-50">
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Derniers Événements</p>
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2 text-[10px]">
                                                        <span className="w-1 h-1 rounded-full bg-indigo-400"></span>
                                                        <span className="text-gray-500 font-mono">12:45</span>
                                                        <span className="text-gray-700 font-bold">New Pro Subscription:</span>
                                                        <span className="text-gray-400 italic">Store #823...</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[10px]">
                                                        <span className="w-1 h-1 rounded-full bg-amber-400"></span>
                                                        <span className="text-gray-500 font-mono">11:32</span>
                                                        <span className="text-gray-700 font-bold">Broadcast update by admin</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'broadcast' && (
                            <div className="max-w-2xl mx-auto py-8">
                                <div className="bg-gradient-to-br from-indigo-50 to-white p-8 rounded-2xl border border-indigo-100 text-center mb-8">
                                    <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 mb-4 shadow-sm">
                                        <Megaphone className="h-7 w-7 text-indigo-600" />
                                    </div>
                                    <h2 className="text-xl font-bold text-gray-900">System Broadcast</h2>
                                    <p className="text-gray-500 mt-2 max-w-md mx-auto">
                                        Send a persistent message to all users. This will appear as a banner in their dashboard.
                                    </p>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Message Content</label>
                                        <textarea
                                            className="w-full rounded-xl border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-4 text-sm resize-none"
                                            rows={4}
                                            placeholder="Example: We are performing scheduled maintenance on Saturday at 2 AM UTC."
                                            value={broadcastMsg}
                                            onChange={(e) => setBroadcastMsg(e.target.value)}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                id="active"
                                                checked={broadcastActive}
                                                onChange={(e) => setBroadcastActive(e.target.checked)}
                                                className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                            />
                                            <label htmlFor="active" className="font-medium text-gray-900 cursor-pointer select-none">Activate Announcement Banner</label>
                                        </div>
                                        {broadcastActive && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold animate-pulse">LIVE</span>}
                                    </div>

                                    <Button className="w-full justify-center py-3 text-base" onClick={handleBroadcastSave}>
                                        Save & Broadcast
                                    </Button>

                                    <div className="flex items-start gap-3 p-4 bg-yellow-50 text-yellow-800 rounded-xl text-sm">
                                        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                                        <p>Warning: This message will be visible to <strong>{stats.users} users</strong> immediately. Please double check for typos.</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Franchise Creation Modal */}
            {isFranchiseModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-indigo-600" />
                                Create Franchise
                            </h2>
                            <button onClick={() => setIsFranchiseModalOpen(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
                        </div>
                        <form onSubmit={handleCreateFranchise} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Franchise Name</label>
                                <Input
                                    placeholder="e.g. Boutique Global"
                                    value={newFranchiseName}
                                    onChange={e => setNewFranchiseName(e.target.value)}
                                    required autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Franchise Admin Email</label>
                                <p className="text-xs text-gray-500 mb-2">User must have already signed up with this email.</p>
                                <Input
                                    type="email"
                                    placeholder="admin@franchise.com"
                                    value={newFranchiseAdminEmail}
                                    onChange={e => setNewFranchiseAdminEmail(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="pt-4 flex justify-end gap-3">
                                <Button type="button" variant="ghost" onClick={() => setIsFranchiseModalOpen(false)}>Cancel</Button>
                                <Button type="submit">Create Franchise</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
