import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy, getDoc, doc, updateDoc, deleteDoc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Building2, Users, DollarSign, Search, ExternalLink, ShieldAlert, Megaphone, Lock, RefreshCw } from "lucide-react";
import Button from "../components/Button";
import Input from "../components/Input";
import toast from "react-hot-toast";

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState('stores'); // stores, users, broadcast
    const [stats, setStats] = useState({ stores: 0, mrr: 0, users: 0 });
    const [stores, setStores] = useState([]);
    const [usersList, setUsersList] = useState([]); // List of users
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const { user } = useAuth();
    const navigate = useNavigate();

    // Broadcast State
    const [broadcastMsg, setBroadcastMsg] = useState("");
    const [broadcastActive, setBroadcastActive] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch Stores
                const storesSnapshot = await getDocs(collection(db, "stores"));
                const storesData = storesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                // Fetch Users (Now possible with new rules)
                const usersSnapshot = await getDocs(collection(db, "users"));
                const usersData = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                // Fetch Broadcast Status
                const broadcastSnap = await getDoc(doc(db, "system", "announcements"));
                if (broadcastSnap.exists()) {
                    setBroadcastMsg(broadcastSnap.data().message || "");
                    setBroadcastActive(broadcastSnap.data().active || false);
                }

                // Stats
                const proStores = storesData.filter(s => s.plan === 'pro').length;
                const mrr = proStores * 179;

                setStores(storesData);
                setUsersList(usersData);
                setStats({
                    stores: storesData.length,
                    mrr: mrr,
                    users: usersData.length
                });
            } catch (error) {
                console.error("Error fetching admin data:", error);
                toast.error("Failed to load admin data");
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            fetchData();
        }
    }, [user]);

    const handleBroadcastSave = async () => {
        try {
            await setDoc(doc(db, "system", "announcements"), {
                message: broadcastMsg,
                active: broadcastActive,
                updatedAt: new Date(),
                updatedBy: user.email
            });
            toast.success("Broadcast updated!");
        } catch (err) {
            toast.error("Failed to update broadcast");
            console.error(err);
        }
    };

    const filteredStores = stores.filter(store =>
        store.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        store.id?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredUsers = usersList.filter(u =>
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div className="p-10 text-center">Loading Admin...</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <ShieldAlert className="h-8 w-8 text-indigo-600" />
                            Super Admin
                        </h1>
                    </div>
                    <Button variant="secondary" onClick={() => navigate('/')}>Back to App</Button>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Total Stores</p>
                            <p className="text-3xl font-bold text-gray-900 mt-2">{stats.stores}</p>
                        </div>
                        <Building2 className="w-8 h-8 text-gray-300" />
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Users</p>
                            <p className="text-3xl font-bold text-gray-900 mt-2">{stats.users}</p>
                        </div>
                        <Users className="w-8 h-8 text-gray-300" />
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                        <div>
                            <p className="text-sm font-medium text-gray-500">MRR</p>
                            <p className="text-3xl font-bold text-gray-900 mt-2 text-green-600">{stats.mrr} DH</p>
                        </div>
                        <DollarSign className="w-8 h-8 text-green-200" />
                    </div>
                </div>

                {/* TABS */}
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8">
                        {['stores', 'users', 'broadcast'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`
                                    whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm capitalize
                                    ${activeTab === tab
                                        ? 'border-indigo-500 text-indigo-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                                `}
                            >
                                {tab}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* STORES TAB */}
                {activeTab === 'stores' && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex justify-between gap-4">
                            <h2 className="text-lg font-bold">Stores Management</h2>
                            <div className="w-72">
                                <Input icon={Search} placeholder="Search stores..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Store</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Plan</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Users</th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredStores.map(store => (
                                        <tr key={store.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center">
                                                    <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold mr-3">{store.name[0]}</div>
                                                    <div>
                                                        <div className="font-medium text-gray-900">{store.name}</div>
                                                        <div className="text-xs text-gray-500">{store.id}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${store.plan === 'pro' ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-600'}`}>
                                                    {store.plan?.toUpperCase() || 'FREE'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                {/* Calculate users for this store */}
                                                {usersList.filter(u => u.storeId === store.id).length} Users
                                            </td>
                                            <td className="px-6 py-4 text-right space-x-2">
                                                <Button size="sm" variant="secondary" icon={ExternalLink} onClick={async () => {
                                                    if (!confirm("Access this store?")) return;
                                                    await updateDoc(doc(db, "users", user.uid), { storeId: store.id });
                                                    window.location.href = '/dashboard';
                                                }}>Access</Button>
                                                <Button size="sm" variant="ghost" onClick={async () => {
                                                    const newPlan = store.plan === 'pro' ? 'free' : 'pro';
                                                    await updateDoc(doc(db, "stores", store.id), { plan: newPlan });
                                                    setStores(prev => prev.map(s => s.id === store.id ? { ...s, plan: newPlan } : s));
                                                }}>
                                                    {store.plan === 'pro' ? 'Downgrade' : 'Upgrade'}
                                                </Button>
                                                <Button size="sm" className="text-red-600 hover:bg-red-50" onClick={async () => {
                                                    if (!confirm("Delete store?")) return;
                                                    await deleteDoc(doc(db, "stores", store.id));
                                                    setStores(prev => prev.filter(s => s.id !== store.id));
                                                }}>Delete</Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* USERS TAB */}
                {activeTab === 'users' && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex justify-between gap-4">
                            <h2 className="text-lg font-bold">All Users</h2>
                            <div className="w-72">
                                <Input icon={Search} placeholder="Search email..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">User</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Role</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Store ID</th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredUsers.map(u => (
                                        <tr key={u.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-900">{u.name}</div>
                                                <div className="text-xs text-gray-500">{u.email}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-2 py-1 bg-gray-100 rounded text-xs">{u.role}</span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                                                {u.storeId}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Button size="sm" variant="secondary" onClick={async () => {
                                                    if (!confirm("Access this user's store?")) return;
                                                    await updateDoc(doc(db, "users", user.uid), { storeId: u.storeId });
                                                    window.location.href = '/dashboard';
                                                }}>Visit Store</Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* BROADCAST TAB */}
                {activeTab === 'broadcast' && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 max-w-2xl mx-auto">
                        <div className="text-center mb-8">
                            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 mb-4">
                                <Megaphone className="h-6 w-6 text-indigo-600" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900">System Broadcast</h2>
                            <p className="text-gray-500 mt-2">Send a message to ALL active dashboards instantly.</p>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Announcement Message</label>
                                <textarea
                                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3"
                                    rows={4}
                                    placeholder="e.g., Scheduled maintenance tonight at 2 AM..."
                                    value={broadcastMsg}
                                    onChange={(e) => setBroadcastMsg(e.target.value)}
                                />
                            </div>

                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="active"
                                    checked={broadcastActive}
                                    onChange={(e) => setBroadcastActive(e.target.checked)}
                                    className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                />
                                <label htmlFor="active" className="font-medium text-gray-900">Activate Banner</label>
                            </div>

                            <Button className="w-full justify-center" onClick={handleBroadcastSave}>
                                Update Broadcast
                            </Button>

                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
                                <p className="text-sm text-yellow-800">
                                    <strong>Preview:</strong> This banner will appear at the bottom of the screen for all users.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
