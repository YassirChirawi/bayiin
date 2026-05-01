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

export default function AdminDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('stores');
    const [searchTerm, setSearchTerm] = useState("");
    const [qaProgress, setQaProgress] = useState({});
    const [contacts, setContacts] = useState([]);
    const [contactsLoading, setContactsLoading] = useState(false);

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
        for (const store of stores) {
            try {
                const snap = await getDocs(collection(db, "stores", store.id, "qa_runs"));
                if (!snap.empty) {
                    const currentRun = snap.docs.find(d => d.id === 'current')?.data();
                    if (currentRun && currentRun.tests) {
                        const total = 49; // Total tests from qaTests.js
                        const completed = Object.values(currentRun.tests).filter(t => t.status === 'ok').length;
                        progress[store.id] = { completed, total, updatedAt: currentRun.updatedAt };
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

                {/* Analytics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    {/* KPI Cards */}
                    <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 transition-all hover:shadow-md">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Total Revenue (MRR)</p>
                                    <h3 className="text-3xl font-bold text-gray-900 mt-2">{stats.mrr.toLocaleString()} <span className="text-xs text-gray-400 font-normal">MAD</span></h3>
                                </div>
                                <div className="p-2 bg-green-50 rounded-lg">
                                    <DollarSign className="w-6 h-6 text-green-600" />
                                </div>
                            </div>
                            <div className="mt-4 h-16 w-full">
                                {/* Mini Chart could go here, for now utilizing space */}
                                <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3" /> +12% from last month
                                </p>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 transition-all hover:shadow-md">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Active Stores</p>
                                    <h3 className="text-3xl font-bold text-gray-900 mt-2">{stats.stores}</h3>
                                </div>
                                <div className="p-2 bg-indigo-50 rounded-lg">
                                    <Building2 className="w-6 h-6 text-indigo-600" />
                                </div>
                            </div>
                            <div className="mt-4">
                                <p className="text-xs text-indigo-600 font-medium">{stats.proStores} PRO Accounts</p>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 transition-all hover:shadow-md">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Total Users</p>
                                    <h3 className="text-3xl font-bold text-gray-900 mt-2">{stats.users}</h3>
                                </div>
                                <div className="p-2 bg-blue-50 rounded-lg">
                                    <Users className="w-6 h-6 text-blue-600" />
                                </div>
                            </div>
                            <div className="mt-4">
                                <p className="text-xs text-gray-400">Registered Accounts</p>
                            </div>
                        </div>
                    </div>

                    {/* Chart Card */}
                    <div className="md:col-span-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
                        <div>
                            <h4 className="font-bold text-gray-900 mb-4">Plan Distribution</h4>
                            <PlanDistributionChart data={pieData} />
                        </div>
                        <div className="text-center mt-2 flex justify-center gap-4 text-xs">
                            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-indigo-600"></div> Pro</span>
                            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-gray-200"></div> Free</span>
                        </div>
                    </div>
                </div>

                {/* Revenue Trend - Full Width */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h4 className="font-bold text-gray-900 mb-6">Revenue Growth (6 Months)</h4>
                    <RevenueChart data={chartData} />
                </div>

                {/* Main Content Areas */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 min-h-[500px]">
                    <div className="border-b border-gray-100 px-6 pt-6 bg-white rounded-t-2xl sticky top-0 z-10">
                        <nav className="-mb-px flex space-x-6 overflow-x-auto">
                            {['stores', 'users', 'franchises', 'qa', 'contacts', 'broadcast'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`
                                        whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm capitalize transition-colors duration-200
                                        ${activeTab === tab
                                            ? 'border-indigo-600 text-indigo-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                                    `}
                                >
                                    {tab === 'qa' ? 'QA Recette' : tab === 'contacts' ? '📬 Contacts' : tab}
                                </button>
                            ))}
                        </nav>
                    </div>

                    <div className="p-6">
                        {/* Control Bar for Lists */}
                        {activeTab !== 'broadcast' && activeTab !== 'contacts' && (
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
                                            <tr key={store.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center">
                                                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-100 to-white border border-indigo-50 flex items-center justify-center text-indigo-600 font-bold mr-4 shadow-sm">
                                                            {store.name?.[0]?.toUpperCase() || 'S'}
                                                        </div>
                                                        <div>
                                                            <div className="font-semibold text-gray-900">{store.name}</div>
                                                            <div className="text-xs text-gray-400 font-mono">{store.id}</div>
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

                        {/* QA TAB */}
                        {activeTab === 'qa' && (
                            <div className="space-y-6">
                                <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-2xl mb-8">
                                    <h3 className="text-lg font-bold text-indigo-900 mb-2">Suivi Global de la Recette</h3>
                                    <p className="text-sm text-indigo-700">Surveillez l'état d'avancement des tests sur toutes les boutiques clientes.</p>
                                </div>
                                <div className="grid grid-cols-1 gap-6">
                                    {stores.map(store => {
                                        const progress = qaProgress[store.id] || { completed: 0, total: 50 };
                                        const percentage = Math.round((progress.completed / progress.total) * 100);
                                        return (
                                            <div key={store.id} className="bg-white p-6 rounded-2xl border border-gray-100 flex items-center justify-between hover:shadow-md transition-all">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-12 w-12 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 font-bold">
                                                        {store.name?.[0]}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-gray-900">{store.name}</h4>
                                                        <p className="text-xs text-gray-500">ID: {store.id}</p>
                                                    </div>
                                                </div>
                                                <div className="flex-1 max-w-md px-12">
                                                    <div className="flex justify-between text-xs mb-1 font-bold">
                                                        <span className="text-indigo-600">{percentage}% complété</span>
                                                        <span className="text-gray-400">{progress.completed} / {progress.total} tests</span>
                                                    </div>
                                                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                        <div 
                                                            className="h-full bg-indigo-500 transition-all duration-1000"
                                                            style={{ width: `${percentage}%` }}
                                                        />
                                                    </div>
                                                </div>
                                                <Button 
                                                    size="sm" 
                                                    variant="secondary" 
                                                    icon={ExternalLink}
                                                    onClick={() => navigate(`/qa?storeId=${store.id}`)}
                                                >
                                                    Détails
                                                </Button>
                                            </div>
                                        );
                                    })}
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
