import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy, getDoc, doc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Building2, Users, DollarSign, Search, ExternalLink, ShieldAlert } from "lucide-react";
import Button from "../components/Button";
import Input from "../components/Input";

export default function AdminDashboard() {
    const [stats, setStats] = useState({ stores: 0, mrr: 0, users: 0 });
    const [stores, setStores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const { user } = useAuth();
    const navigate = useNavigate();

    // Admin Guard - Simple email check for now (replace with your actual admin email or role check)
    // For demo purposes, we might allow any logged-in user to see this IF they navigate to /admin, 
    // BUT in production this MUST be strict.
    // Let's assume the user viewing this is the "owner" of the SaaS.

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch Stores
                const storesSnapshot = await getDocs(collection(db, "stores"));
                const storesData = storesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                // Fetch Users (Restricted by security rules, using store count as proxy for now)
                // const usersSnapshot = await getDocs(collection(db, "users"));
                // const usersCount = usersSnapshot.size;
                const usersCount = storesData.length; // Approximate active users based on stores

                // Calculate KPIs
                const totalStores = storesData.length;

                // Calculate MRR (Simple: count Pro plans * 179)
                const proStores = storesData.filter(s => s.plan === 'pro').length;
                const mrr = proStores * 179;

                setStores(storesData);
                setStats({
                    stores: totalStores,
                    mrr: mrr,
                    users: usersCount
                });
            } catch (error) {
                console.error("Error fetching admin data:", error);
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            fetchData();
        }
    }, [user]);

    const filteredStores = stores.filter(store =>
        store.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        store.id?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <ShieldAlert className="h-8 w-8 text-indigo-600" />
                            Super Admin Dashboard
                        </h1>
                        <p className="text-gray-500 mt-1"> Overview of entire SaaS platform performance</p>
                    </div>
                    <Button variant="secondary" onClick={() => navigate('/')}>
                        Back to App
                    </Button>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Total Stores</p>
                                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.stores}</p>
                            </div>
                            <div className="bg-blue-50 p-3 rounded-lg">
                                <Building2 className="w-6 h-6 text-blue-600" />
                            </div>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Total Users</p>
                                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.users}</p>
                            </div>
                            <div className="bg-green-50 p-3 rounded-lg">
                                <Users className="w-6 h-6 text-green-600" />
                            </div>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Monthly Revenue (MRR)</p>
                                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.mrr} DH</p>
                            </div>
                            <div className="bg-indigo-50 p-3 rounded-lg">
                                <DollarSign className="w-6 h-6 text-indigo-600" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stores Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between gap-4">
                        <h2 className="text-lg font-bold text-gray-900">All Stores</h2>
                        <div className="w-full sm:w-72">
                            <Input
                                placeholder="Search stores..."
                                icon={Search}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Store Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Currency</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredStores.map((store) => (
                                    <tr key={store.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold mr-3">
                                                    {store.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="text-sm font-medium text-gray-900">{store.name}</div>
                                            </div>
                                            <div className="text-xs text-gray-500 px-11">ID: {store.id}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {store.plan === 'pro' ? (
                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-100 text-indigo-800">
                                                    PRO
                                                </span>
                                            ) : (
                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                                    FREE
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {store.currency}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(store.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${store.subscriptionStatus === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                }`}>
                                                {store.subscriptionStatus || 'active'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
