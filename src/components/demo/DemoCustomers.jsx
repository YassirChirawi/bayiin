import { Search, Mail, Phone, MapPin } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";

export default function DemoCustomers() {
    const { t } = useLanguage();

    const customers = [
        { id: 1, name: "Amine Harit", email: "amine@example.com", phone: "06 61 23 45 67", city: "Casablanca", orders: 12, spent: "3,400 DH" },
        { id: 2, name: "Yassine Bounou", email: "yassine@example.com", phone: "06 62 34 56 78", city: "Fes", orders: 5, spent: "1,200 DH" },
        { id: 3, name: "Hakim Ziyech", email: "hakim@example.com", phone: "06 63 45 67 89", city: "Rabat", orders: 8, spent: "2,150 DH" },
        { id: 4, name: "Achraf Hakimi", email: "achraf@example.com", phone: "06 64 56 78 90", city: "Madrid/Tanger", orders: 24, spent: "8,900 DH" },
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-slate-900">{t('customers') || "Clients"}</h2>
                    <p className="text-sm text-slate-500">Votre base de données clients.</p>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" placeholder="Rechercher..." className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48 sm:w-64" />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
                {customers.map((customer) => (
                    <div key={customer.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-200 transition-colors group">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
                                    {customer.name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-900">{customer.name}</h3>
                                    <p className="text-xs text-slate-500">Client VIP</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm font-bold text-indigo-600">{customer.spent}</div>
                                <div className="text-xs text-slate-400">{customer.orders} commandes</div>
                            </div>
                        </div>
                        <div className="space-y-2 text-sm text-slate-600">
                            <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4 text-slate-400" /> {customer.email}
                            </div>
                            <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4 text-slate-400" /> {customer.phone}
                            </div>
                            <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-slate-400" /> {customer.city}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
