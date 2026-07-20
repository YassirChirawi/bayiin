import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import Button from "../../Button";
import { toast } from "react-hot-toast";

export default function AdminUsersTab({ filteredUsers, user }) {
    const handleUpgradeToPro = async (storeId) => {
        if (!storeId) {
            toast.error("User has no associated store.");
            return;
        }
        if (!confirm("Are you sure you want to upgrade this store to PRO?")) return;
        
        try {
            await updateDoc(doc(db, "stores", storeId), {
                plan: "pro",
                updatedAt: new Date().toISOString()
            });
            toast.success("Store upgraded to PRO!");
        } catch (error) {
            console.error(error);
            toast.error("Failed to upgrade store.");
        }
    };

    return (
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
                            <td className="px-6 py-4 text-right flex justify-end gap-2">
                                <Button size="sm" variant="outline" onClick={() => handleUpgradeToPro(u.storeId)} className="text-indigo-600 border-indigo-200 hover:bg-indigo-50">
                                    Upgrade to Pro
                                </Button>
                                <Button size="sm" variant="secondary" onClick={async () => {
                                    if (!confirm("Access this user's store?")) return;
                                    await updateDoc(doc(db, "users", user.uid), { storeId: u.storeId });
                                    window.location.href = '/dashboard';
                                }}>
                                    Visit
                                </Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
