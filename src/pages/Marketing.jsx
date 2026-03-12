import { useState, useMemo } from 'react';
import { useStoreData } from '../hooks/useStoreData';
import { useTenant } from '../context/TenantContext';
import { Megaphone, Users, MessageCircle, Search, Filter } from 'lucide-react';
import { createRawWhatsAppLink } from '../utils/whatsappTemplates';

export default function Marketing() {
    const { store } = useTenant();
    const { data: products } = useStoreData('products');
    const { data: customers } = useStoreData('customers');
    const { data: orders } = useStoreData('orders');

    const [selectedSku, setSelectedSku] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    // Logic: Segment customers who bought a specific SKU
    const segmentedCustomers = useMemo(() => {
        if (!selectedSku) return customers;

        // Find phone numbers/IDs of customers who bought the SKU (or product name match as fallback)
        const buyersPhones = new Set(
            orders
                .filter(o => o.sku === selectedSku || o.articleId === selectedSku)
                .map(o => o.clientPhone)
        );

        return customers.filter(c => buyersPhones.has(c.phone));
    }, [customers, orders, selectedSku]);

    const filteredCustomers = segmentedCustomers.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.includes(searchTerm)
    );

    const handleSendReorder = (customer) => {
        const customerOrders = orders.filter(o => o.clientPhone === customer.phone);
        const lastOrder = [...customerOrders].sort((a, b) => new Date(b.date) - new Date(a.date))[0];

        const message = `Bonjour ${customer.name}, c'est ${store?.name}. Nous avons pensé que vous auriez bientôt besoin de renouveler votre produit ${lastOrder?.articleName || 'favori'}. Souhaitez-vous passer une nouvelle commande ?`;
        const link = createRawWhatsAppLink(customer.phone, message);
        window.open(link, '_blank');
    };

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Megaphone className="h-6 w-6 text-indigo-600" />
                        Marketing & Segmentation
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Ciblez vos clients par habitudes d'achat et automatisez les relances.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Filters Sidebar */}
                <div className="md:col-span-1 space-y-4">
                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-4 text-sm font-medium">
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider">
                            <Filter className="w-4 h-4 text-indigo-500" />
                            Segmentation par SKU
                        </div>

                        <div>
                            <select
                                value={selectedSku}
                                onChange={(e) => setSelectedSku(e.target.value)}
                                className="w-full text-sm border border-gray-200 rounded-lg p-2 focus:ring-2 focus:ring-indigo-300 outline-none"
                            >
                                <option value="">Toute la collection</option>
                                {products.map(p => (
                                    <option key={p.id} value={p.sku || p.id}>{p.sku ? `[${p.sku}] ` : ''}{p.name}</option>
                                ))}
                            </select>
                            <p className="text-[10px] text-gray-400 mt-2 italic px-1">
                                Retrouvez les clients ayant acheté ce SKU spécifique pour des relances ciblées.
                            </p>
                        </div>

                        <div className="pt-4 border-t border-gray-50">
                            <div className="text-center p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                                <p className="text-3xl font-black text-indigo-700">{filteredCustomers.length}</p>
                                <p className="text-[10px] text-indigo-600 uppercase font-black tracking-widest mt-1">Cibles Actives</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Customers List */}
                <div className="md:col-span-3 space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Rechercher par nom ou téléphone..."
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-300 outline-none shadow-sm text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50/50 text-gray-500 uppercase text-[10px] font-bold tracking-widest border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4">Client</th>
                                        <th className="px-6 py-4">Dernier Achat</th>
                                        <th className="px-6 py-4">Produit Favori</th>
                                        <th className="px-6 py-4 text-right">Automation</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredCustomers.map(customer => {
                                        const customerOrders = orders.filter(o => o.clientPhone === customer.phone);
                                        const lastOrder = [...customerOrders].sort((a, b) => new Date(b.date) - new Date(a.date))[0];

                                        return (
                                            <tr key={customer.id} className="hover:bg-indigo-50/30 transition-all group">
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-gray-900 group-hover:text-indigo-700 transition-colors uppercase tracking-tight text-xs">{customer.name}</div>
                                                    <div className="text-[11px] text-gray-500 font-mono mt-0.5">{customer.phone}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-gray-700 font-semibold text-xs">{lastOrder?.date || '—'}</div>
                                                    <div className="text-[9px] text-gray-400 font-bold uppercase mt-0.5">{lastOrder?.status || ''}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {lastOrder ? (
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                                                            <span className="truncate max-w-[180px] font-medium text-gray-600 text-[11px]">{lastOrder.articleName}</span>
                                                        </div>
                                                    ) : '—'}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={() => handleSendReorder(customer)}
                                                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl text-[10px] font-bold hover:bg-emerald-600 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
                                                    >
                                                        <MessageCircle className="w-3.5 h-3.5 fill-white" />
                                                        WhatsApp Re-order
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        {filteredCustomers.length === 0 && (
                            <div className="py-20 text-center text-gray-400 flex flex-col items-center">
                                <Users className="w-16 h-16 mb-4 opacity-10 text-indigo-900" />
                                <p className="text-sm font-medium">Aucun client ne correspond à ces critères d'achat.</p>
                                <p className="text-xs mt-1">Essayez d'élargir votre segmentation ou de modifier votre recherche.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
