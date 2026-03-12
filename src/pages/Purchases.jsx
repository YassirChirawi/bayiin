import { useState, useEffect, useCallback } from 'react';
import {
    collection, query, where, getDocs, doc, updateDoc, serverTimestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useTenant } from '../context/TenantContext';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ShoppingCart, Package, FileText, BarChart3, Plus, Upload,
    CheckCircle, Clock, XCircle, Download, AlertTriangle, RefreshCcw,
    ChevronDown, ChevronUp, Truck, Send, X, Search
} from 'lucide-react';
import {
    parseOdooCSV, matchProductsBySupplierRef, createPurchaseOrder,
    validateReception, exportOrderForOdoo, updatePOStatus, getSupplierStats
} from '../lib/supplierService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const tabVariants = {
    enter: (dir) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
};

function StatusBadge({ status }) {
    const cfg = {
        draft: { label: 'Brouillon', cls: 'bg-gray-100 text-gray-600' },
        sent: { label: 'Envoyé', cls: 'bg-blue-100 text-blue-700' },
        partial: { label: 'Partiel', cls: 'bg-amber-100 text-amber-700' },
        received: { label: 'Réceptionné', cls: 'bg-emerald-100 text-emerald-700' },
        cancelled: { label: 'Annulé', cls: 'bg-rose-100 text-rose-600' },
    };
    const { label, cls } = cfg[status] || cfg.draft;
    return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cls}`}>{label}</span>;
}

function downloadText(content, filename, mime = 'text/csv') {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

// ─── Tab: Tableau de Bord ─────────────────────────────────────────────────────

function DashboardTab({ storeId }) {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!storeId) return;
        getSupplierStats(storeId)
            .then(setStats)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [storeId]);

    if (loading) return <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="bg-white rounded-xl border border-gray-100 h-20 animate-pulse" />)}</div>;

    const pendingOrders = (stats?.orders || []).filter(o => o.status === 'draft' || o.status === 'sent');
    const recentOrders = (stats?.orders || []).slice(0, 5);

    return (
        <div className="space-y-5">
            {/* KPI Row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
                    <p className="text-xl font-bold text-rose-600">{(stats?.totalDue || 0).toLocaleString('fr-MA')} MAD</p>
                    <p className="text-xs text-gray-500 mt-0.5">Total dû au fournisseur</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
                    <p className="text-xl font-bold text-indigo-700">{stats?.lastOrderDate || '—'}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Dernière réception</p>
                </div>
                <div className="col-span-2 sm:col-span-1 bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
                    <p className="text-xl font-bold text-amber-600">{stats?.stockoutProducts?.length || 0}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Produits en rupture</p>
                </div>
            </div>

            {/* Pending Orders */}
            {pendingOrders.length > 0 && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 space-y-2">
                    <p className="text-sm font-semibold text-amber-800 flex items-center gap-2">
                        <Clock className="w-4 h-4" /> {pendingOrders.length} commande(s) en attente
                    </p>
                    {pendingOrders.map(o => (
                        <div key={o.id} className="flex items-center justify-between text-sm">
                            <span className="text-gray-700">{o.supplierName} · {o.lines?.length || 0} ligne(s)</span>
                            <span className="font-semibold text-amber-700">{o.totalHT?.toFixed(2)} MAD</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Stockout List */}
            {stats?.stockoutProducts?.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-2">
                    <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-500" /> Produits en rupture de stock
                    </p>
                    <div className="divide-y divide-gray-50">
                        {stats.stockoutProducts.map(p => (
                            <div key={p.id} className="flex items-center justify-between py-1.5 text-sm">
                                <span className="text-gray-700 truncate">{p.name}</span>
                                <span className="text-xs text-rose-600 font-semibold ml-2 flex-shrink-0">Stock : {p.stock || 0}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Recent Orders */}
            {recentOrders.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
                    <p className="text-sm font-semibold text-gray-800">Historique des commandes</p>
                    <div className="space-y-2">
                        {recentOrders.map(o => (
                            <div key={o.id} className="flex items-center justify-between text-sm">
                                <div>
                                    <span className="font-medium text-gray-800">{o.supplierName}</span>
                                    <span className="ml-2 text-gray-400 text-xs">{o.createdAt?.toDate?.()?.toLocaleDateString('fr-MA') || '—'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <StatusBadge status={o.status} />
                                    <span className="font-semibold text-gray-700">{o.totalHT?.toFixed(2)} MAD</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {recentOrders.length === 0 && (
                <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-200">
                    <ShoppingCart className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">Aucune commande encore créée</p>
                </div>
            )}
        </div>
    );
}

// ─── Tab: Purchase Orders ─────────────────────────────────────────────────────

function PurchaseOrdersTab({ storeId }) {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showNew, setShowNew] = useState(false);
    const [expanded, setExpanded] = useState(null);

    // New PO form
    const [supplierName, setSupplierName] = useState('');
    const [notes, setNotes] = useState('');
    const [lines, setLines] = useState([{ supplier_ref: '', name: '', qty: 1, unit_price: 0 }]);
    const [creating, setCreating] = useState(false);

    useEffect(() => { loadOrders(); }, [storeId]);

    async function loadOrders() {
        setLoading(true);
        try {
            const snap = await getDocs(query(collection(db, 'purchase_orders'), where('storeId', '==', storeId)));
            setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
        } finally { setLoading(false); }
    }

    function addLine() { setLines(p => [...p, { supplier_ref: '', name: '', qty: 1, unit_price: 0 }]); }
    function removeLine(i) { setLines(p => p.filter((_, idx) => idx !== i)); }
    function updateLine(i, field, val) { setLines(p => p.map((l, idx) => idx === i ? { ...l, [field]: val } : l)); }

    async function handleCreate(e) {
        e.preventDefault();
        if (!supplierName.trim() || lines.length === 0) return;
        setCreating(true);
        try {
            const id = await createPurchaseOrder(storeId, {
                supplierName,
                notes,
                lines: lines.map(l => ({ ...l, qty: parseFloat(l.qty) || 0, unit_price: parseFloat(l.unit_price) || 0 }))
            });
            toast.success('Bon de commande créé !');
            setShowNew(false);
            setSupplierName(''); setNotes('');
            setLines([{ supplier_ref: '', name: '', qty: 1, unit_price: 0 }]);
            await loadOrders();
        } catch { toast.error('Erreur'); } finally { setCreating(false); }
    }

    async function handleMarkSent(orderId) {
        await updatePOStatus(orderId, 'sent');
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'sent' } : o));
        toast.success('Commande marquée comme envoyée');
    }

    function handleExportCSV(order) {
        const csv = exportOrderForOdoo(order);
        downloadText(csv, `BC-${order.id.slice(0, 8)}-odoo.csv`);
        toast.success('CSV exporté pour Odoo !');
    }

    const totalHT = lines.reduce((s, l) => s + (parseFloat(l.qty) || 0) * (parseFloat(l.unit_price) || 0), 0);

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <button onClick={loadOrders} className="text-gray-400 hover:text-indigo-600"><RefreshCcw className="w-4 h-4" /></button>
                <button onClick={() => setShowNew(p => !p)}
                    className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-3 py-2 rounded-xl transition-colors">
                    <Plus className="w-4 h-4" /> Nouveau Bon de Commande
                </button>
            </div>

            {/* New PO Form */}
            <AnimatePresence>
                {showNew && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                        <form onSubmit={handleCreate} className="bg-white border border-indigo-100 rounded-xl p-5 space-y-4">
                            <p className="font-semibold text-gray-800 text-sm">Créer un Bon de Commande</p>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2">
                                    <label className="text-xs text-gray-500">Nom du fournisseur *</label>
                                    <input required type="text" value={supplierName} onChange={e => setSupplierName(e.target.value)} placeholder="ex: KUO'S Grossiste Espagne"
                                        className="block w-full mt-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-300 focus:outline-none" />
                                </div>
                            </div>

                            {/* Lines */}
                            <div className="space-y-2">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Lignes de commande</p>
                                {lines.map((line, i) => (
                                    <div key={i} className="grid grid-cols-12 gap-2 items-center">
                                        <input type="text" placeholder="Réf. fournisseur" value={line.supplier_ref}
                                            onChange={e => updateLine(i, 'supplier_ref', e.target.value)}
                                            className="col-span-2 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-200 focus:outline-none" />
                                        <input type="text" placeholder="Nom produit" value={line.name}
                                            onChange={e => updateLine(i, 'name', e.target.value)}
                                            className="col-span-4 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-200 focus:outline-none" />
                                        <input type="number" placeholder="Qté" min="0" value={line.qty}
                                            onChange={e => updateLine(i, 'qty', e.target.value)}
                                            className="col-span-2 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-200 focus:outline-none" />
                                        <input type="number" placeholder="PU (MAD)" min="0" step="0.01" value={line.unit_price}
                                            onChange={e => updateLine(i, 'unit_price', e.target.value)}
                                            className="col-span-3 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-200 focus:outline-none" />
                                        <button type="button" onClick={() => removeLine(i)} className="col-span-1 text-gray-300 hover:text-rose-500 flex justify-center">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                                <button type="button" onClick={addLine} className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                                    <Plus className="w-3 h-3" /> Ajouter une ligne
                                </button>
                                <div className="text-right text-sm font-bold text-gray-800">Total HT : {totalHT.toFixed(2)} MAD</div>
                            </div>

                            <textarea rows={2} placeholder="Notes (optionnel)" value={notes} onChange={e => setNotes(e.target.value)}
                                className="block w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-300 focus:outline-none" />

                            <div className="flex gap-2">
                                <button type="submit" disabled={creating}
                                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl disabled:opacity-50">
                                    {creating ? 'Création...' : 'Créer le bon de commande'}
                                </button>
                                <button type="button" onClick={() => setShowNew(false)} className="px-4 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Annuler</button>
                            </div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Orders List */}
            {loading ? (
                <div className="space-y-3">{[1, 2].map(i => <div key={i} className="bg-white h-16 rounded-xl border border-gray-100 animate-pulse" />)}</div>
            ) : orders.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-200">
                    <FileText className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">Aucun bon de commande</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {orders.map(order => (
                        <div key={order.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                            <button className="w-full text-left p-4 flex items-center gap-3" onClick={() => setExpanded(e => e === order.id ? null : order.id)}>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="font-semibold text-gray-900 text-sm">{order.supplierName}</p>
                                        <StatusBadge status={order.status} />
                                    </div>
                                    <p className="text-xs text-gray-400">{order.lines?.length || 0} ligne(s) · {order.createdAt?.toDate?.()?.toLocaleDateString('fr-MA') || '—'}</p>
                                </div>
                                <div className="text-right flex-shrink-0 mr-1">
                                    <p className="font-bold text-indigo-700 text-sm">{order.totalHT?.toFixed(2)} MAD</p>
                                </div>
                                {expanded === order.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                            </button>

                            <AnimatePresence>
                                {expanded === order.id && (
                                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
                                        <div className="border-t border-gray-100 px-4 py-3 space-y-3">
                                            {/* Lines table */}
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-xs text-left">
                                                    <thead><tr className="text-gray-400 border-b border-gray-100">
                                                        <th className="pb-1.5 pr-3">Réf.</th>
                                                        <th className="pb-1.5 pr-3">Produit</th>
                                                        <th className="pb-1.5 pr-3 text-right">Qté</th>
                                                        <th className="pb-1.5 pr-3 text-right">PU</th>
                                                        <th className="pb-1.5 text-right">Total</th>
                                                    </tr></thead>
                                                    <tbody className="divide-y divide-gray-50">
                                                        {(order.lines || []).map((l, i) => (
                                                            <tr key={i} className="text-gray-700">
                                                                <td className="py-1 pr-3 font-mono text-gray-400">{l.supplier_ref || '—'}</td>
                                                                <td className="py-1 pr-3">{l.name}</td>
                                                                <td className="py-1 pr-3 text-right">{l.qty}</td>
                                                                <td className="py-1 pr-3 text-right">{parseFloat(l.unit_price).toFixed(2)}</td>
                                                                <td className="py-1 text-right font-semibold">{(l.qty * l.unit_price).toFixed(2)} MAD</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                            {order.notes && <p className="text-xs text-gray-500 italic">{order.notes}</p>}

                                            {/* Actions */}
                                            <div className="flex flex-wrap gap-2 pt-1">
                                                <button onClick={() => handleExportCSV(order)}
                                                    className="flex items-center gap-1.5 text-xs bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 font-medium px-3 py-1.5 rounded-lg">
                                                    <Download className="w-3.5 h-3.5" /> Exporter CSV Odoo
                                                </button>
                                                {order.status === 'draft' && (
                                                    <button onClick={() => handleMarkSent(order.id)}
                                                        className="flex items-center gap-1.5 text-xs bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-medium px-3 py-1.5 rounded-lg">
                                                        <Send className="w-3.5 h-3.5" /> Marquer comme envoyé
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Tab: Import Facture Odoo ─────────────────────────────────────────────────

function ImportTab({ storeId }) {
    const [dragging, setDragging] = useState(false);
    const [parsing, setParsing] = useState(false);
    const [result, setResult] = useState(null); // { matched, unmatched, errors, rawHeaders }
    const [savedId, setSavedId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [supplierName, setSupplierName] = useState('');

    async function handleFile(file) {
        if (!file) return;
        setParsing(true);
        setResult(null);
        try {
            const parsed = await parseOdooCSV(file);
            const matching = await matchProductsBySupplierRef(storeId, parsed.rows);
            setResult({ ...matching, errors: parsed.errors, rawHeaders: parsed.rawHeaders });
            if (parsed.errors.length > 0) toast.error(`${parsed.errors.length} ligne(s) ignorée(s)`);
        } catch (e) {
            toast.error('Erreur lors du parsing');
        } finally {
            setParsing(false);
        }
    }

    async function handleImportAsPO() {
        if (!result?.matched?.length) return;
        setSaving(true);
        try {
            const lines = result.matched.map(r => ({
                supplier_ref: r.supplier_ref,
                name: r.name || r.product?.name,
                productId: r.product?.id,
                qty: r.qty,
                unit_price: r.unit_price,
            }));
            const id = await createPurchaseOrder(storeId, {
                supplierName: supplierName || 'Import Odoo',
                lines,
                notes: 'Importé depuis fichier Odoo CSV',
            });
            setSavedId(id);
            toast.success('Facture importée comme bon de commande !');
        } catch { toast.error('Erreur'); } finally { setSaving(false); }
    }

    return (
        <div className="space-y-4">
            {/* Drop Zone */}
            <div
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                className={`border-2 border-dashed rounded-2xl p-10 text-center transition-colors ${dragging ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 bg-white hover:border-indigo-300'}`}
            >
                <Upload className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-semibold text-gray-700">Glissez un fichier CSV Odoo ici</p>
                <p className="text-xs text-gray-400 mt-1">Ou cliquez pour choisir un fichier</p>
                <label className="mt-4 inline-block cursor-pointer text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-xl transition-colors">
                    {parsing ? 'Analyse...' : 'Choisir fichier CSV'}
                    <input type="file" accept=".csv,.txt" className="hidden" onChange={e => handleFile(e.target.files[0])} disabled={parsing} />
                </label>
            </div>

            {/* Odoo Column format hint */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-xs text-indigo-700 space-y-1">
                <p className="font-semibold">📋 Format CSV Odoo attendu</p>
                <p>Le fichier doit contenir les colonnes : <code className="bg-indigo-100 px-1 rounded">Internal Reference</code>, <code className="bg-indigo-100 px-1 rounded">Product</code>, <code className="bg-indigo-100 px-1 rounded">Quantity</code>, <code className="bg-indigo-100 px-1 rounded">Unit Price</code></p>
                <p>Les colonnes en français (<code className="bg-indigo-100 px-1 rounded">Référence interne</code>, <code className="bg-indigo-100 px-1 rounded">Produit</code>…) sont aussi reconnues.</p>
            </div>

            {/* Parsing Results */}
            {result && (
                <div className="space-y-4">
                    {/* Summary */}
                    <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                            <p className="text-xl font-bold text-emerald-700">{result.matched.length}</p>
                            <p className="text-xs text-emerald-600">Produits matchés</p>
                        </div>
                        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                            <p className="text-xl font-bold text-amber-700">{result.unmatched.length}</p>
                            <p className="text-xs text-amber-600">Non reconnus</p>
                        </div>
                        <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                            <p className="text-xl font-bold text-gray-600">{result.errors.length}</p>
                            <p className="text-xs text-gray-500">Erreurs</p>
                        </div>
                    </div>

                    {/* Matched Lines */}
                    {result.matched.length > 0 && (
                        <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
                            <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-emerald-500" /> Produits reconnus
                            </p>
                            <div className="space-y-2 max-h-56 overflow-y-auto">
                                {result.matched.map((r, i) => (
                                    <div key={i} className="flex items-center justify-between text-xs bg-emerald-50 rounded-lg px-3 py-2">
                                        <div>
                                            <span className="font-semibold text-gray-800">{r.product?.name}</span>
                                            <span className="ml-2 text-gray-400">(réf: {r.supplier_ref || '—'})</span>
                                        </div>
                                        <span className="font-bold text-emerald-700">{r.qty} × {r.unit_price} MAD</span>
                                    </div>
                                ))}
                            </div>

                            <div>
                                <label className="text-xs text-gray-500">Nom du fournisseur</label>
                                <input type="text" value={supplierName} onChange={e => setSupplierName(e.target.value)} placeholder="ex: KUO'S Grossiste"
                                    className="block w-full mt-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-300 focus:outline-none" />
                            </div>

                            {savedId ? (
                                <div className="text-center text-sm font-semibold text-emerald-700 py-2">✅ Importé ! ID : {savedId.slice(0, 8)}</div>
                            ) : (
                                <button onClick={handleImportAsPO} disabled={saving}
                                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm disabled:opacity-50">
                                    {saving ? 'Import...' : 'Créer Bon de Commande depuis ce fichier'}
                                </button>
                            )}
                        </div>
                    )}

                    {/* Unmatched */}
                    {result.unmatched.length > 0 && (
                        <div className="bg-white border border-amber-100 rounded-xl p-4 space-y-2">
                            <p className="text-sm font-semibold text-amber-800 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4" /> Lignes non reconnues
                            </p>
                            <p className="text-xs text-gray-500">Ces produits n'ont pas de <code>supplier_ref</code> correspondante dans BayIIn. Ajoutez-la dans la fiche produit.</p>
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                                {result.unmatched.map((r, i) => (
                                    <div key={i} className="text-xs bg-amber-50 rounded-lg px-3 py-1.5 text-amber-800">
                                        {r.supplier_ref || '(no ref)'} — {r.name || '(no name)'}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Tab: Réception ───────────────────────────────────────────────────────────

function ReceptionTab({ storeId }) {
    const [pendingOrders, setPendingOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(null);
    const [receptionForms, setReceptionForms] = useState({}); // orderId → [lines]
    const [validating, setValidating] = useState(null);

    useEffect(() => { loadPendingOrders(); }, [storeId]);

    async function loadPendingOrders() {
        setLoading(true);
        try {
            const snap = await getDocs(
                query(collection(db, 'purchase_orders'), where('storeId', '==', storeId),
                    where('status', 'in', ['draft', 'sent', 'partial']))
            );
            const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setPendingOrders(orders);

            // Init reception forms
            const forms = {};
            orders.forEach(o => {
                forms[o.id] = (o.lines || []).map(l => ({
                    ...l,
                    receivedQty: l.qty,
                    batchNumber: '',
                    expiryDate: '',
                }));
            });
            setReceptionForms(forms);
        } finally { setLoading(false); }
    }

    function updateReceptionLine(orderId, lineIdx, field, value) {
        setReceptionForms(prev => ({
            ...prev,
            [orderId]: prev[orderId].map((l, i) => i === lineIdx ? { ...l, [field]: value } : l)
        }));
    }

    async function handleValidate(order) {
        setValidating(order.id);
        try {
            const receivedLines = (receptionForms[order.id] || [])
                .filter(l => l.productId && parseFloat(l.receivedQty) > 0)
                .map(l => ({
                    productId: l.productId,
                    name: l.name,
                    qty: parseFloat(l.receivedQty) || 0,
                    unit_price: parseFloat(l.unit_price) || 0,
                    batchNumber: l.batchNumber || `LOT-${Date.now()}`,
                    expiryDate: l.expiryDate || null,
                }));

            if (receivedLines.length === 0) {
                toast.error('Aucune ligne avec un productId valide. Ajoutez la supplier_ref sur les produits.');
                return;
            }

            await validateReception(order.id, receivedLines, storeId);
            toast.success(`Réception validée ! ${receivedLines.length} produit(s) mis à jour.`);
            setPendingOrders(prev => prev.filter(o => o.id !== order.id));
        } catch (e) {
            console.error(e);
            toast.error('Erreur lors de la validation');
        } finally { setValidating(null); }
    }

    return (
        <div className="space-y-4">
            {loading ? (
                <div className="space-y-3">{[1, 2].map(i => <div key={i} className="bg-white h-16 rounded-xl border border-gray-100 animate-pulse" />)}</div>
            ) : pendingOrders.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-200">
                    <Truck className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">Aucune commande en attente de réception</p>
                </div>
            ) : (
                pendingOrders.map(order => (
                    <div key={order.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                        <button className="w-full text-left p-4 flex items-center gap-3" onClick={() => setExpanded(e => e === order.id ? null : order.id)}>
                            <Truck className="w-8 h-8 text-indigo-300 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="font-semibold text-gray-900 text-sm">{order.supplierName}</p>
                                    <StatusBadge status={order.status} />
                                </div>
                                <p className="text-xs text-gray-400">{order.lines?.length} ligne(s) · HT {order.totalHT?.toFixed(2)} MAD</p>
                            </div>
                            {expanded === order.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                        </button>

                        <AnimatePresence>
                            {expanded === order.id && (
                                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
                                    <div className="border-t border-gray-100 p-4 space-y-3">
                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Saisir les quantités reçues + N° de lots</p>
                                        <div className="space-y-3">
                                            {(receptionForms[order.id] || []).map((line, i) => (
                                                <div key={i} className="bg-gray-50 rounded-xl p-3 space-y-2">
                                                    <p className="text-sm font-semibold text-gray-800">{line.name}</p>
                                                    {!line.productId && (
                                                        <p className="text-xs text-amber-600">⚠️ Produit non lié — ajoutez la <code>supplier_ref</code> dans la fiche produit</p>
                                                    )}
                                                    <div className="grid grid-cols-3 gap-2">
                                                        <div>
                                                            <label className="text-xs text-gray-400">Qté reçue</label>
                                                            <input type="number" min="0" value={line.receivedQty}
                                                                onChange={e => updateReceptionLine(order.id, i, 'receivedQty', e.target.value)}
                                                                className="block w-full text-sm border border-gray-200 rounded-lg px-2 py-1 mt-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-200" />
                                                        </div>
                                                        <div>
                                                            <label className="text-xs text-gray-400">N° Lot</label>
                                                            <input type="text" placeholder="LOT-001" value={line.batchNumber}
                                                                onChange={e => updateReceptionLine(order.id, i, 'batchNumber', e.target.value)}
                                                                className="block w-full text-sm border border-gray-200 rounded-lg px-2 py-1 mt-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-200" />
                                                        </div>
                                                        <div>
                                                            <label className="text-xs text-gray-400">Date expiration</label>
                                                            <input type="date" value={line.expiryDate}
                                                                onChange={e => updateReceptionLine(order.id, i, 'expiryDate', e.target.value)}
                                                                className="block w-full text-sm border border-gray-200 rounded-lg px-2 py-1 mt-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-200" />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <button onClick={() => handleValidate(order)} disabled={validating === order.id}
                                            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                                            <CheckCircle className="w-4 h-4" />
                                            {validating === order.id ? 'Validation...' : 'Valider la Réception → Mettre à jour le stock'}
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                ))
            )}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const MAIN_TABS = [
    { key: 'dashboard', label: 'Tableau de Bord', icon: BarChart3 },
    { key: 'orders', label: 'Bons de Commande', icon: FileText },
    { key: 'import', label: 'Import Odoo', icon: Upload },
    { key: 'reception', label: 'Réception', icon: Truck },
];

export default function Purchases() {
    const { store } = useTenant();
    const [tab, setTab] = useState('dashboard');
    const [tabDir, setTabDir] = useState(1);

    const switchTab = (newTab) => {
        const oi = MAIN_TABS.findIndex(t => t.key === tab);
        const ni = MAIN_TABS.findIndex(t => t.key === newTab);
        setTabDir(ni >= oi ? 1 : -1);
        setTab(newTab);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <ShoppingCart className="h-6 w-6 text-indigo-600" />
                    Module Achats
                </h1>
                <p className="text-sm text-gray-500 mt-1">Fournisseurs · Bons de commande · Import Odoo · Réception & Stock</p>
            </div>

            {/* Tab Bar */}
            <div className="flex gap-1 p-1 bg-gray-100 rounded-xl overflow-x-auto">
                {MAIN_TABS.map(({ key, label, icon: Icon }) => (
                    <button key={key} onClick={() => switchTab(key)}
                        className={`flex-1 min-w-max flex items-center justify-center gap-1.5 py-2.5 px-2 text-xs sm:text-sm font-semibold rounded-lg transition-all whitespace-nowrap ${tab === key ? 'bg-white shadow-sm text-indigo-700' : 'text-gray-600 hover:text-gray-800'
                            }`}>
                        <Icon className="h-4 w-4 flex-shrink-0" />
                        <span>{label}</span>
                    </button>
                ))}
            </div>

            {/* Animated Content */}
            <AnimatePresence mode="wait" custom={tabDir}>
                <motion.div key={tab} custom={tabDir} variants={tabVariants}
                    initial="enter" animate="center" exit="exit"
                    transition={{ duration: 0.2, ease: 'easeInOut' }}>
                    {tab === 'dashboard' && <DashboardTab storeId={store?.id} />}
                    {tab === 'orders' && <PurchaseOrdersTab storeId={store?.id} />}
                    {tab === 'import' && <ImportTab storeId={store?.id} />}
                    {tab === 'reception' && <ReceptionTab storeId={store?.id} />}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
