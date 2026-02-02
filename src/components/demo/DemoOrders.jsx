import { Search, Filter, MoreHorizontal, CheckCircle, Clock, XCircle, Truck } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";

export default function DemoOrders() {
    const { t, language } = useLanguage();

    const orders = [
        { id: "#ORD-001", client: "Karim Tazi", city: "Casablanca", price: "299 DH", status: "livré", date: "2 mins ago" },
        { id: "#ORD-002", client: "Salma Bennani", city: "Rabat", price: "450 DH", status: "en_cours", date: "15 mins ago" },
        { id: "#ORD-003", client: "Mehdi Alami", city: "Tanger", price: "199 DH", status: "expédié", date: "1 hour ago" },
        { id: "#ORD-004", client: "Sofia El Fassi", city: "Marrakech", price: "890 DH", status: "retour", date: "3 hours ago" },
        { id: "#ORD-005", client: "Omar Berrada", city: "Fes", price: "150 DH", status: "livré", date: "5 hours ago" },
    ];

    const getStatusColor = (status) => {
        switch (status) {
            case 'livré': return 'bg-green-100 text-green-700 border-green-200';
            case 'en_cours': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'expédié': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'retour': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'livré': return <CheckCircle className="w-3 h-3" />;
            case 'en_cours': return <Clock className="w-3 h-3" />;
            case 'expédié': return <Truck className="w-3 h-3" />;
            case 'retour': return <XCircle className="w-3 h-3" />;
            default: return null;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-900">{t('orders')}</h2>
                    <p className="text-sm text-slate-500">Gérez vos commandes et vos expéditions.</p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:flex-initial">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input type="text" placeholder="Rechercher..." className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full" />
                    </div>
                    <button className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">
                        <Filter className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 font-medium text-slate-500">
                        <tr>
                            <th className="px-4 py-3">ID</th>
                            <th className="px-4 py-3">Client</th>
                            <th className="px-4 py-3 hidden sm:table-cell">Ville</th>
                            <th className="px-4 py-3">Prix</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {orders.map((order, i) => (
                            <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="px-4 py-3 font-medium text-indigo-600">{order.id}</td>
                                <td className="px-4 py-3">
                                    <div className="font-medium text-slate-900">{order.client}</div>
                                    <div className="text-xs text-slate-500 sm:hidden">{order.city}</div>
                                </td>
                                <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">{order.city}</td>
                                <td className="px-4 py-3 font-semibold text-slate-900">{order.price}</td>
                                <td className="px-4 py-3">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusColor(order.status)}`}>
                                        {getStatusIcon(order.status)}
                                        {order.status.replace('_', ' ').toUpperCase()}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <button className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                                        <MoreHorizontal className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
