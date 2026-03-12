/**
 * Returns.jsx — Module SAV & Retours
 * Manages customer returns with automatic stock reintegration and Quality Vigilance.
 */
import { useState, useEffect, useCallback } from 'react';
import {
    collection, query, where, getDocs, addDoc, doc,
    updateDoc, serverTimestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useTenant } from '../context/TenantContext';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
    RefreshCw, Plus, CheckCircle, Clock, Package,
    X, Search, AlertTriangle, ChevronDown, ChevronUp, RotateCcw,
    ShieldAlert, History, ClipboardList
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const RETURN_REASONS = [
    'Produit défectueux',
    'Ne correspond pas à la description',
    'Erreur de commande',
    'Produit endommagé à la livraison',
    'Remords d\'achat',
    'Autre',
];

const CONDITIONS = [
    { value: 'Non ouvert', label: '✅ Non ouvert (stock réintégré)', badge: 'bg-emerald-100 text-emerald-700' },
    { value: 'Ouvert', label: '⚠️ Ouvert (stock NON réintégré)', badge: 'bg-amber-100 text-amber-700' },
    { value: 'Endommagé', label: '❌ Endommagé (stock NON réintégré)', badge: 'bg-rose-100 text-rose-600' },
];

const STATUS_CFG = {
    pending: { label: 'En attente', cls: 'bg-amber-100 text-amber-700' },
    validated: { label: 'Validé', cls: 'bg-emerald-100 text-emerald-700' },
    rejected: { label: 'Rejeté', cls: 'bg-rose-100 text-rose-600' },
};

function StatusBadge({ status }) {
    const { label, cls } = STATUS_CFG[status] || STATUS_CFG.pending;
    return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cls}`}>{label}</span>;
}

// ─── New Return Modal ─────────────────────────────────────────────────────────

function NewReturnModal({ storeId, onClose, onCreated }) {
    const [form, setForm] = useState({
        orderId: '',
        productName: '',
        sku: '',
        quantity: 1,
        reason: RETURN_REASONS[0],
        condition: 'Non ouvert',
        notes: '',
    });
    const [orderSearch, setOrderSearch] = useState('');
    const [foundOrder, setFoundOrder] = useState(null);
    const [searching, setSearching] = useState(false);
    const [saving, setSaving] = useState(false);

    async function searchOrder() {
        if (!orderSearch.trim()) return;
        setSearching(true);
        try {
            const snap = await getDocs(
                query(collection(db, 'orders'),
                    where('storeId', '==', storeId),
                    where('orderNumber', '==', orderSearch.trim())
                )
            );
            if (!snap.empty) {
                const order = { id: snap.docs[0].id, ...snap.docs[0].data() };
                setFoundOrder(order);
                setForm(f => ({
                    ...f,
                    orderId: order.id,
                    productName: order.articleName || '',
                    sku: order.sku || '',
                    quantity: parseInt(order.quantity) || 1,
                }));
            } else {
                toast.error('Commande introuvable');
            }
        } finally { setSearching(false); }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (!form.orderId) { toast.error('Liez une commande d\'abord'); return; }
        setSaving(true);
        try {
            await addDoc(collection(db, 'returns'), {
                storeId,
                orderId: form.orderId,
                orderNumber: foundOrder?.orderNumber || '',
                clientName: foundOrder?.clientName || '',
                productName: form.productName,
                sku: form.sku,
                quantity: parseInt(form.quantity) || 1,
                reason: form.reason,
                condition: form.condition,
                notes: form.notes,
                status: 'pending',
                stockReintegrated: false,
                createdAt: serverTimestamp(),
            });
            toast.success('Retour créé !');
            onCreated();
            onClose();
        } catch (e) {
            toast.error('Erreur');
        } finally { setSaving(false); }
    }

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
        >
            <motion.div
                initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
                <div className="flex items-center justify-between p-5 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <RefreshCw className="w-5 h-5 text-indigo-600" />
                        Créer un Retour SAV
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    {/* Order Search */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">N° de commande</label>
                        <div className="flex gap-2">
                            <input
                                type="text" placeholder="ex: CMD-001"
                                value={orderSearch} onChange={e => setOrderSearch(e.target.value)}
                                className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                            />
                            <button type="button" onClick={searchOrder} disabled={searching}
                                className="px-3 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">
                                <Search className="w-4 h-4" />
                            </button>
                        </div>
                        {foundOrder && (
                            <div className="mt-2 bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-sm">
                                <p className="font-semibold text-indigo-900">{foundOrder.clientName}</p>
                                <p className="text-indigo-600 text-xs">{foundOrder.articleName} · {foundOrder.orderNumber}</p>
                            </div>
                        )}
                    </div>

                    {/* Product Info */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Produit</label>
                            <input type="text" value={form.productName} onChange={e => setForm(f => ({ ...f, productName: e.target.value }))}
                                className="block w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">SKU</label>
                            <input type="text" value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))}
                                placeholder="DSVP001"
                                className="block w-full font-mono text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Quantité</label>
                            <input type="number" min="1" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                                className="block w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Raison</label>
                            <select value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                                className="block w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300">
                                {RETURN_REASONS.map(r => <option key={r}>{r}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Condition (critical for stock) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">État du produit retourné</label>
                        <div className="space-y-2">
                            {CONDITIONS.map(c => (
                                <label key={c.value} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${form.condition === c.value ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-indigo-200'}`}>
                                    <input type="radio" name="condition" value={c.value} checked={form.condition === c.value}
                                        onChange={e => setForm(f => ({ ...f, condition: e.target.value }))} className="text-indigo-600" />
                                    <span className="text-sm font-medium text-gray-800">{c.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Notes</label>
                        <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                            placeholder="Détails supplémentaires..."
                            className="block w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                    </div>

                    <button type="submit" disabled={saving}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm disabled:opacity-50">
                        {saving ? 'Création...' : '📦 Enregistrer le Retour'}
                    </button>
                </form>
            </motion.div>
        </motion.div>
    );
}

// ─── New Incident Modal ───────────────────────────────────────────────────

function NewIncidentModal({ storeId, onClose, onCreated }) {
    const [form, setForm] = useState({
        sku: '',
        batchNumber: '',
        description: '',
        gravity: 'Moyen',
    });
    const [saving, setSaving] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        if (!form.sku || !form.batchNumber) { toast.error('SKU et Lot obligatoires'); return; }
        setSaving(true);
        try {
            await addDoc(collection(db, 'incidents'), {
                storeId,
                sku: form.sku.toUpperCase(),
                batchNumber: form.batchNumber,
                description: form.description,
                gravity: form.gravity,
                createdAt: serverTimestamp(),
            });
            toast.success('Incident signalé !');
            onCreated();
            onClose();
        } catch (e) {
            toast.error('Erreur');
        } finally { setSaving(false); }
    }

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
        >
            <motion.div
                initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
                <div className="flex items-center justify-between p-5 border-b border-rose-50 bg-rose-50/30">
                    <h2 className="text-lg font-bold text-rose-900 flex items-center gap-2">
                        <ShieldAlert className="w-5 h-5" />
                        Signaler un Incident Qualité
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">SKU Produit *</label>
                            <input type="text" value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))}
                                placeholder="ex: DREN001"
                                className="block w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-rose-300 outline-none" required />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">N° de Lot (Batch) *</label>
                            <input type="text" value={form.batchNumber} onChange={e => setForm(f => ({ ...f, batchNumber: e.target.value }))}
                                placeholder="ex: LOT-2024-X"
                                className="block w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-rose-300 outline-none" required />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Gravité</label>
                        <div className="flex gap-2">
                            {['Moyen', 'Haut'].map(g => (
                                <button key={g} type="button" onClick={() => setForm(f => ({ ...f, gravity: g }))}
                                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${form.gravity === g ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-gray-100 text-gray-400'}`}>
                                    {g}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Description</label>
                        <textarea rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                            className="block w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-rose-300 outline-none" />
                    </div>

                    <button type="submit" disabled={saving}
                        className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-sm shadow-lg shadow-rose-200 transition-all">
                        {saving ? 'Envoi...' : '🚀 Envoyer le rapport'}
                    </button>
                </form>
            </motion.div>
        </motion.div>
    );
}

// ─── Return Card ──────────────────────────────────────────────────────────────

function ReturnCard({ ret, onValidate, onReject }) {
    const [expanded, setExpanded] = useState(false);
    const [validating, setValidating] = useState(false);

    const condCfg = CONDITIONS.find(c => c.value === ret.condition) || CONDITIONS[1];

    async function handleValidate() {
        setValidating(true);
        try { await onValidate(ret); }
        finally { setValidating(false); }
    }

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
        >
            <button className="w-full text-left p-4 flex items-center gap-3" onClick={() => setExpanded(e => !e)}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${ret.condition === 'Non ouvert' ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                    <RefreshCw className={`w-5 h-5 ${ret.condition === 'Non ouvert' ? 'text-emerald-600' : 'text-amber-600'}`} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900 text-sm truncate">{ret.clientName || 'Client'}</p>
                        <StatusBadge status={ret.status} />
                        {ret.sku && <span className="text-xs font-mono bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-100">{ret.sku}</span>}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{ret.productName} · Qté: {ret.quantity} · {ret.reason}</p>
                </div>
                <div className="ml-2">
                    {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
            </button>

            <AnimatePresence>
                {expanded && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
                        <div className="border-t border-gray-100 p-4 space-y-3">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <p className="text-xs text-gray-400">N° Commande</p>
                                    <p className="font-medium text-gray-800">{ret.orderNumber || '—'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400">État produit</p>
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${condCfg.badge}`}>{ret.condition}</span>
                                </div>
                            </div>

                            {ret.status === 'pending' && (
                                <div className="flex gap-2 pt-1">
                                    <button onClick={handleValidate} disabled={validating}
                                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl disabled:opacity-50">
                                        <CheckCircle className="w-4 h-4" />
                                        {validating ? 'Validation...' : 'Valider'}
                                    </button>
                                    <button onClick={() => onReject(ret.id)}
                                        className="px-3 py-2.5 border border-rose-200 text-rose-600 hover:bg-rose-50 text-sm font-semibold rounded-xl">
                                        Rejeter
                                    </button>
                                </div>
                            )}

                            {ret.status === 'validated' && ret.stockReintegrated && (
                                <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2 flex items-center gap-1.5">
                                    <Package className="w-3.5 h-3.5" /> Stock réintégré automatiquement
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Returns() {
    const { store } = useTenant();
    const [returns, setReturns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showNew, setShowNew] = useState(false);
    const [showNewIncident, setShowNewIncident] = useState(false);
    const [tab, setTab] = useState('pending'); // pending | history | quality
    const [incidents, setIncidents] = useState([]);

    const loadReturns = useCallback(async () => {
        if (!store?.id) return;
        setLoading(true);
        try {
            const rSnap = await getDocs(query(collection(db, 'returns'), where('storeId', '==', store.id)));
            setReturns(rSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));

            const iSnap = await getDocs(query(collection(db, 'incidents'), where('storeId', '==', store.id)));
            setIncidents(iSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
        } finally { setLoading(false); }
    }, [store?.id]);

    useEffect(() => { loadReturns(); }, [loadReturns]);

    async function handleValidate(ret) {
        const returnRef = doc(db, 'returns', ret.id);
        let stockReintegrated = false;

        if (ret.condition === 'Non ouvert' && ret.sku) {
            const pSnap = await getDocs(query(collection(db, 'products'), where('storeId', '==', store.id), where('sku', '==', ret.sku)));
            if (!pSnap.empty) {
                const pDoc = pSnap.docs[0];
                await updateDoc(doc(db, 'products', pDoc.id), { stock: (parseFloat(pDoc.data().stock) || 0) + (parseInt(ret.quantity) || 1) });
                stockReintegrated = true;
                toast.success(`Stock réintégré : +${ret.quantity} pour ${ret.productName}`);
            }
        }

        await updateDoc(returnRef, { status: 'validated', stockReintegrated, validatedAt: serverTimestamp() });
        loadReturns();
    }

    async function handleReject(id) {
        await updateDoc(doc(db, 'returns', id), { status: 'rejected' });
        loadReturns();
        toast.success('Retour rejeté');
    }

    const filtered = returns.filter(r => tab === 'pending' ? r.status === 'pending' : (tab === 'history' ? r.status !== 'pending' : false));
    const pendingCount = returns.filter(r => r.status === 'pending').length;

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <RefreshCw className="h-6 w-6 text-indigo-600" />
                        SAV & Retours
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Gérez les retours et la traçabilité qualité</p>
                </div>
                <button onClick={() => tab === 'quality' ? setShowNewIncident(true) : setShowNew(true)}
                    className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors">
                    <Plus className="w-4 h-4" /> {tab === 'quality' ? 'Signaler Incident' : 'Nouveau retour'}
                </button>
            </div>

            <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
                <button onClick={() => setTab('pending')} className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${tab === 'pending' ? 'bg-white shadow-sm text-indigo-700' : 'text-gray-600'}`}>
                    En attente {pendingCount > 0 && <span className="ml-1 bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{pendingCount}</span>}
                </button>
                <button onClick={() => setTab('history')} className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${tab === 'history' ? 'bg-white shadow-sm text-indigo-700' : 'text-gray-600'}`}>
                    <History className="w-4 h-4 inline mr-1" /> Historique
                </button>
                <button onClick={() => setTab('quality')} className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${tab === 'quality' ? 'bg-white shadow-sm text-rose-600' : 'text-gray-600'}`}>
                    <ShieldAlert className="w-4 h-4 inline mr-1" /> Qualité
                </button>
            </div>

            {tab !== 'quality' ? (
                <div className="space-y-3">
                    {filtered.length === 0 ? <p className="text-center py-10 text-gray-400">Aucun enregistrement</p> : filtered.map(ret => <ReturnCard key={ret.id} ret={ret} onValidate={handleValidate} onReject={handleReject} />)}
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="bg-rose-50 p-4 rounded-xl text-xs text-rose-700 flex items-start gap-3 border border-rose-100 italic">
                        <AlertTriangle className="w-4 h-4" /> Traçabilité obligatoire par <b>Numéro de Lot</b>.
                    </div>
                    {incidents.length === 0 ? <p className="text-center py-10 text-gray-400">Aucun incident</p> : incidents.map(inc => (
                        <div key={inc.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex gap-2 items-center">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${inc.gravity === 'Haut' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-700'}`}>{inc.gravity}</span>
                                    <span className="font-bold text-gray-900">{inc.sku}</span>
                                    <span className="text-xs font-mono bg-gray-50 px-2 rounded">Lot: {inc.batchNumber}</span>
                                </div>
                            </div>
                            <p className="text-sm text-gray-600">{inc.description}</p>
                        </div>
                    ))}
                </div>
            )}

            <AnimatePresence>
                {showNew && <NewReturnModal storeId={store?.id} onClose={() => setShowNew(false)} onCreated={loadReturns} />}
                {showNewIncident && <NewIncidentModal storeId={store?.id} onClose={() => setShowNewIncident(false)} onCreated={loadReturns} />}
            </AnimatePresence>
        </div>
    );
}
