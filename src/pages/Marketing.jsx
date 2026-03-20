import { useState, useMemo } from 'react';
import { useStoreData } from '../hooks/useStoreData';
import { useTenant } from '../context/TenantContext';
import { Megaphone, Users, MessageCircle, Search, Filter, Wand2, PenTool, Copy, Sparkles } from 'lucide-react';
import { createRawWhatsAppLink } from '../utils/whatsappTemplates';
import { generateAdsCopy } from '../services/aiService';
import Button from '../components/Button';
import toast from 'react-hot-toast';

export default function Marketing() {
    const { store } = useTenant();
    const { data: products } = useStoreData('products');
    const { data: customers } = useStoreData('customers');
    const { data: orders } = useStoreData('orders');

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSku, setSelectedSku] = useState('');

    // AI Ads Generator State
    const [adsProduct, setAdsProduct] = useState('');
    const [adsCopy, setAdsCopy] = useState('');
    const [isGeneratingAds, setIsGeneratingAds] = useState(false);

    const handleGenerateAds = async () => {
        if (!adsProduct) {
            toast.error("Veuillez choisir un produit.");
            return;
        }
        setIsGeneratingAds(true);
        try {
            const product = products.find(p => p.id === adsProduct || p.sku === adsProduct);
            const name = product ? product.name : adsProduct;
            const copy = await generateAdsCopy(name);
            setAdsCopy(copy);
        } catch(e) {
            toast.error("Erreur Gemini");
        } finally {
            setIsGeneratingAds(false);
        }
    };

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
                        Marketing & CRM Hub
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Générez des publicités avec l'IA et relancez automatiquement vos clients.</p>
                </div>
            </div>

            {/* AI Ad Generator Widget */}
            <div className="bg-gradient-to-r from-fuchsia-50 to-indigo-50 border border-fuchsia-100 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-fuchsia-500 rounded-xl shadow-lg shadow-fuchsia-200">
                        <Wand2 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 tracking-tight">Studio Créatif Beya3 (Meta Ads)</h2>
                        <p className="text-sm text-gray-600 font-medium mt-0.5">Sélectionnez un produit pour que l'IA rédige instantanément 3 textes publicitaires percutants.</p>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 space-y-3">
                        <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Produit à promouvoir</label>
                        <select
                            value={adsProduct}
                            onChange={(e) => setAdsProduct(e.target.value)}
                            className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-fuchsia-300 outline-none shadow-sm"
                        >
                            <option value="">Sélectionnez un produit dans le catalogue...</option>
                            {products.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                        <Button 
                            onClick={handleGenerateAds} 
                            isLoading={isGeneratingAds}
                            icon={PenTool}
                            className="w-full bg-gray-900 hover:bg-black text-white py-3 mt-2 shadow-lg shadow-gray-300"
                        >
                            Générer les textes (IA)
                        </Button>
                    </div>

                    <div className="flex-[2] relative">
                        {adsCopy ? (
                            <div className="bg-white rounded-xl border border-fuchsia-200 p-5 h-full min-h-[200px] shadow-sm relative group">
                                <p className="text-xs text-fuchsia-600 font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <Sparkles className="w-3.5 h-3.5" /> Résultat de la génération
                                </p>
                                <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed max-h-[300px] overflow-y-auto custom-scrollbar pr-2 pb-8">
                                    {adsCopy}
                                </div>
                                <button 
                                    onClick={() => { navigator.clipboard.writeText(adsCopy); toast.success("Copié !"); }}
                                    className="absolute bottom-4 right-4 bg-white border border-gray-200 text-gray-600 p-2 rounded-lg shadow-sm hover:text-indigo-600 hover:border-indigo-200 transition-colors"
                                    title="Copier le texte"
                                >
                                    <Copy className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <div className="bg-white/50 border-2 border-dashed border-fuchsia-200 rounded-xl flex items-center justify-center p-8 h-full min-h-[200px]">
                                <p className="text-sm text-gray-400 font-medium italic">Le copywriting généré apparaîtra ici...</p>
                            </div>
                        )}
                    </div>
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
