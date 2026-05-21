import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import Button from "../../Button";
import { ExternalLink, Globe, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";

export default function AdminStoresTab({
    filteredStores,
    usersList,
    setAuditStore,
    user,
    setStores
}) {
    return (
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
    );
}
