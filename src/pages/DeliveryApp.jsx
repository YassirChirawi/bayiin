import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import {
    collection, query, where, getDocs, doc, updateDoc, arrayUnion, runTransaction, increment
} from "firebase/firestore";
import { db } from "../lib/firebase";
import {
    Phone, MapPin, DollarSign, CheckCircle, XCircle,
    PhoneMissed, Package, Truck, ChevronRight, RotateCcw,
    Clock, Star, MessageSquare, Navigation, User, TrendingUp,
    Headphones, ChevronDown, Info, Search
} from "lucide-react";
import { toast } from "react-hot-toast";
import DriverAuth from "../components/DriverAuth";

import { getOrderStatusConfig } from "../utils/statusConfig";

// ── Status options for the livreur ──
const STATUS_ACTIONS = [
    { status: 'livré', label: 'Livré ✓', color: 'bg-emerald-500 hover:bg-emerald-600', icon: CheckCircle },
    { status: 'retour en cours', label: 'Retour', color: 'bg-rose-500 hover:bg-rose-600', icon: XCircle },
    { status: 'pas de réponse', label: 'Pas de réponse', color: 'bg-amber-500 hover:bg-amber-600', icon: PhoneMissed },
    { status: 'reporté', label: 'Reporter', color: 'bg-gray-500 hover:bg-gray-600', icon: Clock },
];

// ── Helpers ──
function getMapsUrl(order) {
    const addr = [order.clientAddress, order.clientCity].filter(Boolean).join(', ');
    if (!addr) return null;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;
}

function getWazeUrl(order) {
    const addr = [order.clientAddress, order.clientCity].filter(Boolean).join(', ');
    if (!addr) return null;
    return `https://waze.com/ul?q=${encodeURIComponent(addr)}&navigate=yes`;
}

// ── Order Card ──
function OrderCard({ order, onUpdateStatus, updating }) {
    const [expanded, setExpanded] = useState(false);
    const [note, setNote] = useState("");
    const statusConfig = getOrderStatusConfig(order.status);
    const isDone = ['livré', 'retour'].includes(order.status);
    const isRetourEnCours = order.status === 'retour en cours';
    const mapsUrl = getMapsUrl(order);
    const wazeUrl = getWazeUrl(order);

    return (
        <div className={`bg-white rounded-2xl shadow-sm border transition-all ${isDone ? 'opacity-60 border-gray-100' : isRetourEnCours ? 'border-rose-200 shadow-md' : 'border-indigo-100 shadow-md'}`}>
            {/* Header */}
            <button className="w-full text-left p-4" onClick={() => setExpanded(e => !e)}>
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusConfig.color}`}>
                                {statusConfig.label}
                            </span>
                            {order.orderNumber && (
                                <span className="text-sm font-bold text-indigo-900 bg-indigo-50 px-2 rounded-full">#{order.orderNumber}</span>
                            )}
                        </div>
                        <p className="font-bold text-gray-900 text-base truncate">{order.clientName}</p>
                        <p className="text-sm text-gray-500 truncate flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            {[order.clientAddress, order.clientCity].filter(Boolean).join(', ') || 'Adresse non spécifiée'}
                        </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className="text-lg font-bold text-indigo-700">
                            {Number(order.price || 0).toFixed(0)} DH
                        </span>
                        <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
                    </div>
                </div>
            </button>

            {/* Expanded detail */}
            {expanded && (
                <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-3">
                    {/* Phone + Call + WhatsApp */}
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                            <Phone className="h-4 w-4 text-indigo-500" />
                            <span className="font-medium">{order.clientPhone || 'N/A'}</span>
                        </div>
                        <div className="flex gap-2">
                            {order.clientPhone && (
                                <>
                                    <a
                                        href={`https://wa.me/${order.clientPhone.replace(/[^\d]/g, '')}?text=${encodeURIComponent(`Bonjour ${order.clientName || ''}, c'est votre livreur BayIIn. Je suis en route pour votre commande. Êtes-vous disponible pour la réception ?`)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center p-2 bg-emerald-100 text-emerald-700 rounded-xl hover:bg-emerald-200 transition-colors"
                                        title="WhatsApp Client"
                                    >
                                        <MessageSquare className="h-5 w-5" />
                                    </a>
                                    <a
                                        href={`tel:${order.clientPhone}`}
                                        className="flex items-center gap-1.5 bg-indigo-600 text-white text-sm font-semibold px-3 py-2 rounded-xl hover:bg-indigo-700 transition-colors"
                                    >
                                        <Phone className="h-4 w-4" />
                                        Appeler
                                    </a>
                                </>
                            )}
                        </div>
                    </div>

                    {/* GPS Navigation */}
                    {(mapsUrl || wazeUrl) && (
                        <div className="flex gap-2">
                            {mapsUrl && (
                                <a
                                    href={mapsUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 flex items-center justify-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-sm font-semibold px-3 py-2.5 rounded-xl hover:bg-blue-100 transition-colors"
                                >
                                    <Navigation className="h-4 w-4" />
                                    Google Maps
                                </a>
                            )}
                            {wazeUrl && (
                                <a
                                    href={wazeUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 flex items-center justify-center gap-1.5 bg-cyan-50 border border-cyan-200 text-cyan-700 text-sm font-semibold px-3 py-2.5 rounded-xl hover:bg-cyan-100 transition-colors"
                                >
                                    <Navigation className="h-4 w-4" />
                                    Waze
                                </a>
                            )}
                        </div>
                    )}

                    {/* Product */}
                    {(order.articleName || order.productName) && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Package className="h-4 w-4 text-gray-400" />
                            <span>{order.articleName || order.productName}</span>
                            {order.quantity > 1 && (
                                <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">×{order.quantity}</span>
                            )}
                        </div>
                    )}

                    {/* Store Note */}
                    {order.note && (
                        <div className="bg-amber-50 border border-amber-100 rounded-lg p-2.5 text-xs text-amber-800">
                            📝 <span className="font-semibold">Note du magasin :</span> {order.note}
                        </div>
                    )}

                    {/* Driver's previous note */}
                    {order.driverNote && (
                        <div className="bg-rose-50 border border-rose-100 rounded-lg p-2.5 text-xs text-rose-700">
                            💬 <span className="font-semibold">Votre remarque :</span> {order.driverNote}
                        </div>
                    )}

                    {/* Action buttons — delivery in progress */}
                    {!isDone && order.status !== 'ramassage' && !isRetourEnCours && (
                        <div className="space-y-3 pt-1">
                            <textarea
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="Ajouter une remarque (optionnel)..."
                                className="w-full text-sm p-3 border border-gray-200 rounded-xl focus:ring-1 focus:ring-indigo-500 outline-none resize-none h-20 bg-gray-50/50"
                            />
                            <div className="grid grid-cols-2 gap-2">
                                {STATUS_ACTIONS.map(({ status, label, color, icon: Icon }) => (
                                    <button
                                        key={status}
                                        disabled={!!updating}
                                        onClick={() => onUpdateStatus(order.id, status, note)}
                                        className={`flex items-center justify-center gap-1.5 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors ${color} disabled:opacity-50`}
                                    >
                                        {updating === order.id + status
                                            ? <div className="h-4 w-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                                            : <Icon className="h-4 w-4" />
                                        }
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Pickup validation */}
                    {!isDone && order.status === 'ramassage' && (
                        <div className="pt-2">
                            <button
                                disabled={!!updating}
                                onClick={() => onUpdateStatus(order.id, 'livraison')}
                                className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 rounded-xl transition-colors disabled:opacity-50"
                            >
                                {updating === order.id + 'livraison'
                                    ? <div className="h-5 w-5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                                    : <Truck className="h-5 w-5" />
                                }
                                Valider le Ramassage
                            </button>
                        </div>
                    )}

                    {/* Return to store confirmation */}
                    {!isDone && isRetourEnCours && (
                        <div className="pt-2 space-y-2">
                            <div className="bg-rose-50 border border-rose-200 rounded-lg p-2.5 text-xs text-rose-700 flex items-center gap-2">
                                <Info className="h-4 w-4 flex-shrink-0" />
                                Confirmer uniquement lorsque vous avez physiquement remis le colis au magasin.
                            </div>
                            <button
                                disabled={!!updating}
                                onClick={() => onUpdateStatus(order.id, 'retour', "Produit déposé au magasin")}
                                className="w-full flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-bold py-3.5 rounded-xl transition-colors disabled:opacity-50"
                            >
                                {updating === order.id + 'retour'
                                    ? <div className="h-5 w-5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                                    : <RotateCcw className="h-5 w-5" />
                                }
                                Confirmer Dépôt au Magasin
                            </button>
                        </div>
                    )}

                    {isDone && (
                        <div className="pt-1 text-center text-sm text-gray-400 italic">
                            {order.status === 'livré' ? '✅ Commande livrée' : '🔁 Retour confirmé'}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Profile Tab ──
function ProfileTab({ token, storeName, storePhone, storeWhatsApp, orders }) {
    const total = orders.length;
    const delivered = orders.filter(o => o.status === 'livré').length;
    const returned = orders.filter(o => ['retour', 'retour en cours'].length).length;
    const rate = total > 0 ? Math.round((delivered / total) * 100) : 0;
    const totalCOD = orders.filter(o => o.status === 'livré').reduce((s, o) => s + Number(o.price || 0), 0);

    return (
        <div className="px-4 pb-8 space-y-4 pt-4">
            {/* Driver info card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center">
                        <User className="h-7 w-7 text-white" />
                    </div>
                    <div>
                        <p className="font-bold text-gray-900 text-lg">Mon Profil</p>
                        {storeName && <p className="text-indigo-600 text-sm font-medium">{storeName}</p>}
                    </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
                    <span className="text-xs text-gray-500">Token Livreur</span>
                    <span className="font-mono text-xs text-gray-700 bg-white border border-gray-200 px-2 py-1 rounded-lg">{token}</span>
                </div>
            </div>

            {/* Performance stats */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <p className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-indigo-500" />
                    Performance du Jour
                </p>
                <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-emerald-50 rounded-xl p-3 text-center">
                        <p className="text-2xl font-bold text-emerald-700">{delivered}</p>
                        <p className="text-xs text-emerald-600">Livrées</p>
                    </div>
                    <div className="bg-rose-50 rounded-xl p-3 text-center">
                        <p className="text-2xl font-bold text-rose-700">{returned}</p>
                        <p className="text-xs text-rose-600">Retours</p>
                    </div>
                    <div className="bg-indigo-50 rounded-xl p-3 text-center">
                        <p className="text-2xl font-bold text-indigo-700">{total}</p>
                        <p className="text-xs text-indigo-600">Total Assignées</p>
                    </div>
                    <div className="bg-amber-50 rounded-xl p-3 text-center">
                        <p className="text-2xl font-bold text-amber-700">{totalCOD.toFixed(0)}</p>
                        <p className="text-xs text-amber-600">DH COD</p>
                    </div>
                </div>
                {/* Score bar */}
                <div>
                    <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-500">Taux de livraison</span>
                        <span className="font-bold text-indigo-700">{rate}%</span>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all ${rate >= 80 ? 'bg-emerald-500' : rate >= 60 ? 'bg-amber-500' : 'bg-rose-500'}`}
                            style={{ width: `${rate}%` }}
                        />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                        {rate >= 80 ? '🏆 Excellent !' : rate >= 60 ? '👍 Bien' : '💪 Continuez !'}
                    </p>
                </div>
            </div>

            {/* Support */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <p className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <Headphones className="h-4 w-4 text-indigo-500" />
                    Support
                </p>
                <p className="text-xs text-gray-500 mb-3">Besoin d'aide ? Contactez directement votre magasin.</p>
                <div className="space-y-2">
                    {storeWhatsApp && (
                        <a
                            href={`https://wa.me/${storeWhatsApp.replace(/[^\d]/g, '')}?text=${encodeURIComponent(`Bonjour, je suis le livreur (token: ${token}). J'ai besoin d'aide.`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition-colors"
                        >
                            <MessageSquare className="h-5 w-5" />
                            WhatsApp Magasin
                        </a>
                    )}
                    {storePhone && (
                        <a
                            href={`tel:${storePhone}`}
                            className="flex items-center justify-center gap-2 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-colors"
                        >
                            <Phone className="h-5 w-5" />
                            Appeler le Magasin
                        </a>
                    )}
                    {!storeWhatsApp && !storePhone && (
                        <p className="text-xs text-center text-gray-400 italic">Aucune info de contact configurée</p>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Main App ──
export default function DeliveryApp() {
    const { token } = useParams();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(null);
    const [filter, setFilter] = useState('pickup'); // pickup | pending | returns | done | profile
    const [storeName, setStoreName] = useState('');
    const [storePhone, setStorePhone] = useState('');
    const [storeWhatsApp, setStoreWhatsApp] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (!token) return;
        setLoading(true);

        async function load() {
            try {
                const q = query(collection(db, 'orders'), where('livreurToken', '==', token));
                const snap = await getDocs(q);
                const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

                if (docs.length > 0 && docs[0].storeId) {
                    try {
                        const { getDoc, doc: docRef } = await import('firebase/firestore');
                        const storeDoc = await getDoc(docRef(db, 'stores', docs[0].storeId));
                        if (storeDoc.exists()) {
                            const sd = storeDoc.data();
                            setStoreName(sd.name || '');
                            setStorePhone(sd.phone || sd.contactPhone || '');
                            setStoreWhatsApp(sd.whatsapp || sd.phone || sd.contactPhone || '');
                        }
                    } catch (_) { }
                }

                setOrders(docs);
            } catch (err) {
                console.error('DeliveryApp load error:', err);
                toast.error('Impossible de charger les commandes');
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [token]);

    const handleUpdateStatus = useCallback(async (orderId, newStatus, noteString = "") => {
        const key = orderId + newStatus;
        setUpdating(key);
        try {
            const order = orders.find(o => o.id === orderId);
            if (!order) throw new Error("Order not found");

            await runTransaction(db, async (transaction) => {
                const orderRef = doc(db, 'orders', orderId);

                const updates = {
                    status: newStatus,
                    [`statusHistory.${newStatus.replace(/\s/g, '_')}`]: new Date().toISOString(),
                    ...(newStatus === 'livré' ? { isPaid: false, codCollected: true, codCollectedAt: new Date().toISOString() } : {})
                };
                if (noteString.trim()) {
                    updates.driverNote = noteString.trim();
                    updates.remarksHistory = arrayUnion({
                        status: newStatus,
                        text: noteString.trim(),
                        date: new Date().toISOString()
                    });
                }

                // 1. Update Order
                transaction.update(orderRef, updates);

                // 2. Handle Stock Re-stocking on 'retour'
                const restockProduct = async (articleId, variantId, quantity) => {
                    const productRef = doc(db, 'products', articleId);
                    const qty = parseInt(quantity) || 1;

                    if (variantId) {
                        const productSnap = await transaction.get(productRef);
                        if (productSnap.exists()) {
                            const product = productSnap.data();
                            const newVariants = (product.variants || []).map(v => {
                                if (v.id === variantId) {
                                    return { ...v, stock: (parseInt(v.stock) || 0) + qty };
                                }
                                return v;
                            });
                            transaction.update(productRef, {
                                variants: newVariants,
                                stock: increment(qty)
                            });
                        }
                    } else {
                        transaction.update(productRef, { stock: increment(qty) });
                    }
                };

                if (newStatus === 'retour') {
                    if (order.articleId) {
                        await restockProduct(order.articleId, order.variantId, order.quantity);
                    } else if (order.products && Array.isArray(order.products)) {
                        for (const item of order.products) {
                            await restockProduct(item.id, item.variantId, item.quantity);
                        }
                    }
                }

                // 3. Update Driver Stats
                if (order.driverId) {
                    const driverRef = doc(db, 'drivers', order.driverId);
                    const driverStatsUpdates = {};

                    if (newStatus === 'livré') {
                        driverStatsUpdates['stats.totalDelivered'] = increment(1);
                        driverStatsUpdates['stats.totalCOD'] = increment(parseFloat(order.price) || 0);
                    } else if (newStatus === 'retour') {
                        driverStatsUpdates['stats.totalReturned'] = increment(1);
                    }

                    if (Object.keys(driverStatsUpdates).length > 0) {
                        transaction.update(driverRef, driverStatsUpdates);
                    }
                }

                // 4. Update Global Store Stats
                const statsRef = doc(db, "stores", order.storeId, "stats", "sales");
                const statsUpdates = {};
                statsUpdates[`statusCounts.${order.status || 'reçu'}`] = increment(-1);
                statsUpdates[`statusCounts.${newStatus}`] = increment(1);

                if (newStatus === 'livré' && order.status !== 'livré') {
                    statsUpdates["totals.deliveredRevenue"] = increment(parseFloat(order.price) || 0);
                    statsUpdates["totals.deliveredCount"] = increment(1);
                } else if (order.status === 'livré' && newStatus !== 'livré') {
                    statsUpdates["totals.deliveredRevenue"] = increment(-(parseFloat(order.price) || 0));
                    statsUpdates["totals.deliveredCount"] = increment(-1);
                }

                transaction.update(statsRef, statsUpdates);
            });

            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus, ...(newStatus === 'livré' ? { isPaid: false, codCollected: true } : {}), ...(noteString.trim() ? { driverNote: noteString.trim() } : {}) } : o));

            if (newStatus === 'livré') toast.success('✅ Commande livrée !');
            else if (newStatus === 'livraison') toast.success('📦 Ramassage validé, en route !');
            else if (newStatus === 'retour') toast.success('🔁 Retour confirmé, stock mis à jour !');
            else if (newStatus === 'retour en cours') toast.success('↩️ Retour initialisé');
            else toast(`Statut : ${newStatus}`, { icon: '🔄' });
        } catch (err) {
            console.error(err);
            toast.error('Erreur de mise à jour');
        } finally {
            setUpdating(null);
        }
    }, [orders]);

    // Derived lists and filtering
    const safeSearch = searchQuery.toLowerCase().trim();
    const filteredOrders = orders.filter(o => 
        !safeSearch || 
        (o.clientName || '').toLowerCase().includes(safeSearch) ||
        (o.clientPhone || '').includes(safeSearch) ||
        (o.orderNumber?.toString() || '').includes(safeSearch)
    );

    const pickup = filteredOrders.filter(o => o.status === 'ramassage');
    const pending = filteredOrders.filter(o => ['livraison', 'reporté', 'pas de réponse'].includes(o.status));
    const returns = filteredOrders.filter(o => o.status === 'retour en cours');
    const done = filteredOrders.filter(o => ['livré', 'retour'].includes(o.status));
    const delivered = orders.filter(o => o.status === 'livré');
    const totalCOD = delivered.reduce((s, o) => s + Number(o.price || 0), 0);
    const displayed = filter === 'pickup' ? pickup : filter === 'pending' ? pending : filter === 'returns' ? returns : filter === 'done' ? done : [];

    const TABS = [
        { key: 'pickup', label: 'Ramassage', count: pickup.length, dot: pickup.length > 0 ? 'bg-orange-400' : null },
        { key: 'pending', label: 'En cours', count: pending.length, dot: pending.length > 0 ? 'bg-blue-400' : null },
        { key: 'returns', label: 'Retours', count: returns.length, dot: returns.length > 0 ? 'bg-rose-500' : null },
        { key: 'done', label: 'Terminé', count: done.length, dot: null },
        { key: 'profile', label: 'Profil', count: null, dot: null, icon: User },
    ];

    if (!token) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
                <div className="text-center">
                    <Truck className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Lien de livraison invalide.</p>
                </div>
            </div>
        );
    }

    return (
        <DriverAuth token={token} storeName={storeName}>
            <div className="min-h-screen bg-gray-50 max-w-lg mx-auto">

                {/* ── Top Bar ── */}
                <div className="sticky top-0 z-20 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 pt-8 pb-4 shadow-lg">
                    <div className="flex items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                            <div className="bg-white/20 rounded-xl p-2">
                                <Truck className="h-6 w-6" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold">App Livreur</h1>
                                {storeName && <p className="text-indigo-200 text-xs">{storeName}</p>}
                            </div>
                        </div>
                        {/* WhatsApp quick support button */}
                        {storeWhatsApp && (
                            <a
                                href={`https://wa.me/${storeWhatsApp.replace(/[^\d]/g, '')}?text=${encodeURIComponent(`Bonjour, je suis le livreur (${token}). J'ai besoin d'aide.`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-emerald-500 hover:bg-emerald-400 rounded-xl p-2.5 transition-colors"
                                title="Contacter le magasin"
                            >
                                <MessageSquare className="h-5 w-5" />
                            </a>
                        )}
                    </div>

                    {/* Daily summary chips */}
                    <div className="flex gap-2 text-xs overflow-x-auto pb-0.5">
                        <div className="bg-white/15 rounded-xl px-3 py-2 flex items-center gap-1.5 flex-shrink-0">
                            <CheckCircle className="h-3.5 w-3.5 text-emerald-300" />
                            <span>{delivered.length} livrée{delivered.length > 1 ? 's' : ''}</span>
                        </div>
                        <div className="bg-white/15 rounded-xl px-3 py-2 flex items-center gap-1.5 flex-shrink-0">
                            <Package className="h-3.5 w-3.5 text-indigo-200" />
                            <span>{pending.length} en cours</span>
                        </div>
                        <div className="bg-white/15 rounded-xl px-3 py-2 flex items-center gap-1.5 flex-shrink-0">
                            <DollarSign className="h-3.5 w-3.5 text-amber-300" />
                            <span>{totalCOD.toFixed(0)} DH COD</span>
                        </div>
                        {returns.length > 0 && (
                            <div className="bg-rose-400/40 rounded-xl px-3 py-2 flex items-center gap-1.5 flex-shrink-0 border border-rose-300/40">
                                <RotateCcw className="h-3.5 w-3.5 text-rose-200" />
                                <span className="text-rose-100 font-semibold">{returns.length} retour{returns.length > 1 ? 's' : ''}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Filter tabs ── */}
                <div className="flex gap-0.5 mx-3 mt-3 mb-3 p-1 bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
                    {TABS.map(({ key, label, count, dot, icon: TabIcon }) => (
                        <button
                            key={key}
                            onClick={() => { setFilter(key); setSearchQuery(''); }}
                            className={`flex-1 relative py-2 px-1 text-xs font-semibold rounded-lg transition-all whitespace-nowrap flex items-center justify-center gap-1 ${filter === key
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {dot && filter !== key && (
                                <span className={`absolute top-1 right-1 h-1.5 w-1.5 rounded-full ${dot}`} />
                            )}
                            {TabIcon && <TabIcon className="h-3.5 w-3.5" />}
                            {label}
                            {count !== null && count > 0 && (
                                <span className={`ml-0.5 text-xs rounded-full px-1 ${filter === key ? 'bg-white/30' : 'bg-gray-100 text-gray-600'}`}>
                                    {count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* ── Search Bar ── */}
                {filter !== 'profile' && (
                    <div className="px-4 mb-3">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Rechercher (Nom, Téléphone, Numéro...)"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm placeholder:text-gray-400"
                            />
                            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                                <Search className="w-4 h-4" />
                            </div>
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                    <XCircle className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Profile Tab ── */}
                {filter === 'profile' ? (
                    <ProfileTab
                        token={token}
                        storeName={storeName}
                        storePhone={storePhone}
                        storeWhatsApp={storeWhatsApp}
                        orders={orders}
                    />
                ) : (
                    <>
                        {/* ── Orders list ── */}
                        <div className="px-4 pb-24 space-y-3">
                            {loading ? (
                                [1, 2, 3].map(i => (
                                    <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 animate-pulse">
                                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                                        <div className="h-3 bg-gray-100 rounded w-1/2" />
                                    </div>
                                ))
                            ) : displayed.length === 0 ? (
                                <div className="text-center py-16">
                                    {filter === 'pickup'
                                        ? <><Package className="h-12 w-12 text-gray-200 mx-auto mb-3" /><p className="text-gray-400">Aucun ramassage prévu</p></>
                                        : filter === 'pending'
                                            ? <><Star className="h-12 w-12 text-emerald-300 mx-auto mb-3" /><p className="text-gray-600 font-medium">Aucune livraison en cours !</p></>
                                            : filter === 'returns'
                                                ? <><RotateCcw className="h-12 w-12 text-rose-200 mx-auto mb-3" /><p className="text-gray-400">Aucun retour à déposer</p></>
                                                : <><CheckCircle className="h-12 w-12 text-emerald-300 mx-auto mb-3" /><p className="text-gray-400">Aucune commande terminée</p></>
                                    }
                                </div>
                            ) : (
                                displayed.map(order => (
                                    <OrderCard
                                        key={order.id}
                                        order={order}
                                        onUpdateStatus={handleUpdateStatus}
                                        updating={updating}
                                    />
                                ))
                            )}
                        </div>

                        {/* ── COD Summary sticky footer ── */}
                        {!loading && delivered.length > 0 && (
                            <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white border-t border-gray-200 px-4 py-3 flex items-center justify-between shadow-lg">
                                <div>
                                    <p className="text-xs text-gray-500">Total COD encaissé</p>
                                    <p className="text-xl font-bold text-indigo-700">{totalCOD.toFixed(0)} DH</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-gray-500">Taux de livraison</p>
                                    <p className="text-sm font-bold text-emerald-600">
                                        {orders.length > 0 ? Math.round((delivered.length / orders.length) * 100) : 0}%
                                    </p>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </DriverAuth>
    );
}
