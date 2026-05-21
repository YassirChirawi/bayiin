import { doc, deleteDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import Button from "../../Button";
import { Building2 } from "lucide-react";

export default function AdminFranchisesTab({ filteredFranchises, stores, refreshData }) {
    return (
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
    );
}
