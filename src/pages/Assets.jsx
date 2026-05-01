import { useState } from 'react';
import { useStoreData } from '../hooks/useStoreData';
import { Building2, Plus, Calendar, AlertCircle, Trash2, Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import ProFeatureGuard from '../components/ProFeatureGuard';
import { useTenant } from '../context/TenantContext';

export default function Assets() {
    const { store } = useTenant();
    const { data: assets, addStoreItem, deleteStoreItem, loading } = useStoreData('assets');
    const [showNew, setShowNew] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [form, setForm] = useState({
        name: '',
        category: 'Informatique',
        acquisitionDate: '',
        expiryDate: '',
        serialNumber: '',
    });

    const categories = ['Informatique', 'Véhicule', 'Terminal Paiement', 'Mobilier', 'Autre'];

    const filtered = assets.filter(a =>
        !a.deleted && (
            (a.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (a.category?.toLowerCase() || '').includes(searchTerm.toLowerCase())
        )
    );

    const handleAdd = async (e) => {
        e.preventDefault();
        try {
            await addStoreItem(form);
            toast.success('Matériel ajouté à l\'inventaire');
            setShowNew(false);
            setForm({ name: '', category: 'Informatique', acquisitionDate: '', expiryDate: '', serialNumber: '' });
        } catch (err) { toast.error('Erreur lors de l\'ajout'); }
    };

    const isExpiringSoon = (date) => {
        if (!date) return false;
        const expiry = new Date(date);
        const today = new Date();
        const diff = expiry.getTime() - today.getTime();
        return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000; // 30 days
    };

    const isExpired = (date) => {
        if (!date) return false;
        return new Date(date).getTime() < new Date().getTime();
    };

    return (
        <div className="space-y-6">
            <ProFeatureGuard title="Gestion des Assets">
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <Building2 className="h-6 w-6 text-indigo-600" />
                            Gestion des Assets
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">Inventaire et suivi du matériel professionnel (échéances, garanties).</p>
                    </div>
                    <button
                        onClick={() => setShowNew(true)}
                        disabled={!store?.testerMode}
                        className={`px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${!store?.testerMode ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                    >
                        <Plus className="w-4 h-4" /> Nouvel Asset {!store?.testerMode && "(PRO)"}
                    </button>
                </div>

            <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                <input
                    type="text" placeholder="Rechercher par nom, catégorie, numéro de série..."
                    className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50/50 focus:border-indigo-300 transition-all shadow-sm"
                    value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? [1, 2, 3].map(i => <div key={i} className="h-44 bg-gray-50 rounded-2xl animate-pulse" />) :
                    filtered.length === 0 ? (
                        <div className="col-span-full py-20 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                            <Building2 className="w-16 h-16 mx-auto mb-4 opacity-10 text-indigo-900" />
                            <p className="text-gray-400 font-medium italic">Aucun matériel répertorié pour le moment.</p>
                        </div>
                    ) :
                        filtered.map(asset => {
                            const expiringSoon = isExpiringSoon(asset.expiryDate);
                            const expired = isExpired(asset.expiryDate);

                            return (
                                <motion.div
                                    layout
                                    key={asset.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`bg-white p-6 rounded-2xl border ${expired ? 'border-rose-200 bg-rose-50/30' : expiringSoon ? 'border-amber-200 bg-amber-50/30' : 'border-gray-100'} shadow-sm relative group hover:shadow-md transition-all`}
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <span className={`text-[9px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-full mb-1 inline-block ${expired ? 'bg-rose-100 text-rose-700' : expiringSoon ? 'bg-amber-100 text-amber-700' : 'bg-indigo-50 text-indigo-700'}`}>
                                                {asset.category}
                                            </span>
                                            <h3 className="font-bold text-gray-900 text-base leading-tight mt-1">{asset.name}</h3>
                                            {asset.serialNumber && <p className="text-[10px] text-gray-400 font-mono mt-1">S/N: {asset.serialNumber}</p>}
                                        </div>
                                        <button
                                            onClick={() => deleteStoreItem(asset.id)}
                                            disabled={!store?.testerMode}
                                            className={`opacity-0 group-hover:opacity-100 p-2 text-gray-300 transition-all ${store?.testerMode ? 'hover:text-red-600' : 'cursor-not-allowed'}`}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <div className="space-y-3 pt-4 border-t border-gray-50">
                                        <div className="flex items-center gap-3 text-xs text-gray-500">
                                            <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center">
                                                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                            </div>
                                            <div>
                                                <p className="text-[9px] text-gray-400 uppercase font-bold tracking-tight">Acquisition</p>
                                                <p className="font-semibold text-gray-700">{asset.acquisitionDate ? format(new Date(asset.acquisitionDate), 'dd MMMM yyyy', { locale: fr }) : '—'}</p>
                                            </div>
                                        </div>

                                        <div className={`flex items-center gap-3 text-xs ${expired ? 'text-rose-600' : expiringSoon ? 'text-amber-600' : 'text-gray-500'}`}>
                                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${expired ? 'bg-rose-100' : expiringSoon ? 'bg-amber-100' : 'bg-gray-50'}`}>
                                                <AlertCircle className={`w-3.5 h-3.5 ${expired ? 'text-rose-600' : expiringSoon ? 'text-amber-600' : 'text-gray-400'}`} />
                                            </div>
                                            <div>
                                                <p className="text-[9px] uppercase font-bold tracking-tight opacity-70">Échéance / Garantie</p>
                                                <p className="font-bold">
                                                    {asset.expiryDate ? format(new Date(asset.expiryDate), 'dd MMMM yyyy', { locale: fr }) : 'Maintenance Illimitée'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {expired && (
                                        <div className="mt-4 p-3 bg-rose-100/50 rounded-xl text-[10px] text-rose-700 font-black flex items-center gap-2 border border-rose-200">
                                            <AlertCircle className="w-4 h-4" /> DÉPASSÉ : Renouvellement Requis
                                        </div>
                                    )}
                                    {expiringSoon && !expired && (
                                        <div className="mt-4 p-3 bg-amber-100/50 rounded-xl text-[10px] text-amber-700 font-black flex items-center gap-2 border border-amber-200">
                                            <AlertCircle className="w-4 h-4 animate-bounce" /> ATTENTION : Échéance &lt; 30 jours
                                        </div>
                                    )}
                                </motion.div>
                            );
                        })}
            </div>

            <AnimatePresence>
                {showNew && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-lg border border-gray-100 overflow-hidden relative"
                        >
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Nouvel Asset</h2>
                                <button onClick={() => setShowNew(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                    <X className="w-5 h-5 text-gray-400" />
                                </button>
                            </div>

                            <form onSubmit={handleAdd} className="space-y-5">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Désignation du matériel</label>
                                        <input type="text" required placeholder="ex: MacBook Pro 14'" className="w-full border-2 border-gray-100 rounded-2xl p-3 text-sm focus:border-indigo-400 outline-none transition-all font-medium" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Catégorie</label>
                                        <select className="w-full border-2 border-gray-100 rounded-2xl p-3 text-sm focus:border-indigo-400 outline-none transition-all font-bold text-gray-700 cursor-pointer" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                                            {categories.map(c => <option key={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-span-1">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Numéro de Série</label>
                                        <input type="text" placeholder="SN-XXXXX" className="w-full border-2 border-gray-100 rounded-2xl p-3 text-sm focus:border-indigo-400 outline-none transition-all font-mono" value={form.serialNumber} onChange={e => setForm({ ...form, serialNumber: e.target.value })} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                        <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1.5">Date Acquisition</label>
                                        <input type="date" required className="w-full bg-transparent border-0 p-0 text-sm font-bold text-indigo-900 outline-none cursor-pointer" value={form.acquisitionDate} onChange={e => setForm({ ...form, acquisitionDate: e.target.value })} />
                                    </div>
                                    <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100">
                                        <label className="block text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1.5">Date Échéance</label>
                                        <input type="date" className="w-full bg-transparent border-0 p-0 text-sm font-bold text-rose-900 outline-none cursor-pointer" value={form.expiryDate} onChange={e => setForm({ ...form, expiryDate: e.target.value })} />
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button type="submit" className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-indigo-100 hover:bg-indigo-700 hover:-translate-y-1 transition-all active:scale-95">
                                        CONSERVER DANS L'INVENTAIRE
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            </ProFeatureGuard>
        </div>
    );
}

