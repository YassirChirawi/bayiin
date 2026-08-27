import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Building2, ExternalLink, ShieldAlert, Megaphone, AlertTriangle, TrendingUp, Activity, Zap, X, Star,
    Wallet, ShieldCheck, Globe, Users, Search, CheckCircle, Phone, Mail, MessageCircle, Truck, Package,
    Clock, Ban, Sparkles, Store as StoreIcon, XCircle, History, Coins, Percent } from "lucide-react";
import { motion } from "framer-motion";
import Button from "../components/Button";
import Input from "../components/Input";
import toast from "react-hot-toast";
import { useAdminData } from "../hooks/useAdminData";
import { doc, getDoc, updateDoc, deleteDoc, setDoc, addDoc, collection, query, where, getDocs, onSnapshot, serverTimestamp, orderBy, limit } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../lib/firebase";
import { getStoreAccess } from "../utils/storeAccess";
import { computeSubscriptionFinance } from "../utils/subscriptionFinance";
import { planPrice, CURRENCY } from "../config/pricing";
import { RevenueChart, PlanDistributionChart } from "../components/admin/AdminCharts";
import { MetricCard, PerformanceTrend, StoreActivityTable } from "../components/admin/AdminMetrics";

// Styles de la pastille de statut d'abonnement (aligné sur getStoreAccess).
const STATUS_STYLES = {
    paid:      'bg-emerald-100 text-emerald-700',
    tester:    'bg-purple-100 text-purple-700',
    promo:     'bg-indigo-100 text-indigo-700',
    grace:     'bg-amber-100 text-amber-700',
    trial:     'bg-amber-100 text-amber-700',
    expired:   'bg-red-100 text-red-700',
    suspended: 'bg-red-100 text-red-700',
    unknown:   'bg-gray-100 text-gray-500',
};

/** Pastille de statut d'abonnement d'un store — même règle que le paywall. */
function StatusPill({ store }) {
    const a = getStoreAccess(store);
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap ${STATUS_STYLES[a.status] || STATUS_STYLES.unknown}`}>
            {a.active ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
            {a.label}
        </span>
    );
}

/** Ligne d'un point de santé (intégration configurée ou non). */
function HealthRow({ icon: Icon, label, ok, okText = 'Actif', koText = 'Non configuré' }) {
    return (
        <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-gray-600"><Icon className="w-4 h-4 text-gray-400" /> {label}</span>
            <span className={`font-bold text-xs px-2 py-0.5 rounded-full ${ok ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                {ok ? okText : koText}
            </span>
        </div>
    );
}

/** Carte KPI financière. */
function FinKpi({ label, value, sub, icon: Icon, tone = 'indigo' }) {
    const tones = {
        indigo: 'bg-indigo-50 text-indigo-600', emerald: 'bg-emerald-50 text-emerald-600',
        amber: 'bg-amber-50 text-amber-600', purple: 'bg-purple-50 text-purple-600',
    };
    return (
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${tones[tone]}`}><Icon className="w-4 h-4" /></div>
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
            <p className="text-2xl font-black text-gray-900 mt-1">{value}</p>
            {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
        </div>
    );
}

export default function AdminDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('stores');
    const [searchTerm, setSearchTerm] = useState("");
    const [qaProgress, setQaProgress] = useState({});
    const [contacts, setContacts] = useState([]);
    const [contactsLoading, setContactsLoading] = useState(false);
    const [newContactsCount, setNewContactsCount] = useState(0);
    const [promoCodes, setPromoCodes] = useState([]);
    const [promoLoading, setPromoLoading] = useState(false);
    const [selectedQaStore, setSelectedQaStore] = useState(null);
    const [auditStore, setAuditStore] = useState(null);
    const [conversionRate, setConversionRate] = useState(0.3); // hypothèse de conversion des essais (prévision)
    const [supportHistory, setSupportHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyQuery, setHistoryQuery] = useState("");
    const [mrrSnapshots, setMrrSnapshots] = useState([]);
    const [snapshotting, setSnapshotting] = useState(false);
    const [storeHistory, setStoreHistory] = useState([]);
    const [storeNote, setStoreNote] = useState("");
    const [storeNoteMeta, setStoreNoteMeta] = useState(null);
    const [savingNote, setSavingNote] = useState(false);

    // Custom Hook
    const { stats, stores, usersList, franchises, broadcastData, loading, refreshData, setStores, setUsersList } = useAdminData(user);

    // Finance abonnements + prévision (recalculé sur les stores réels + l'hypothèse de conversion).
    const finance = useMemo(() => computeSubscriptionFinance(stores, { conversionRate }), [stores, conversionRate]);

    // Historique filtré (boutique / action / agent).
    const filteredHistory = supportHistory.filter(h => {
        if (!historyQuery) return true;
        const s = historyQuery.toLowerCase();
        return (h.storeName?.toLowerCase().includes(s) || h.action?.toLowerCase().includes(s)
            || h.adminEmail?.toLowerCase().includes(s) || h.storeId?.toLowerCase().includes(s));
    });

    // Fige le MRR du mois courant à la demande (callable super_admin), puis recharge les snapshots.
    const runSnapshotNow = async () => {
        setSnapshotting(true);
        try {
            await httpsCallable(functions, 'runMrrSnapshotNow')();
            const snap = await getDocs(query(collection(db, 'mrr_snapshots'), orderBy('month', 'desc'), limit(12)));
            setMrrSnapshots(snap.docs.map(d => d.data()).reverse());
            toast.success('Snapshot MRR enregistré');
        } catch (e) {
            console.error(e);
            toast.error("Échec du snapshot");
        } finally {
            setSnapshotting(false);
        }
    };

    // Export CSV des finances (téléchargement navigateur).
    const exportFinanceCsv = () => {
        const rows = [
            ['Métrique', 'Valeur'],
            ['MRR', finance.mrr], ['ARR', finance.arr], ['ARPU', finance.arpu],
            ['Abonnés payants', finance.activePaying],
            ['Essais en cours', finance.trials], ['Essais expirant <=7j', finance.trialsExpiring7d],
            ['Promo (offert)', finance.promoCount], ['Testeurs (offert)', finance.testers],
            ['Expirés', finance.expired], ['Suspendus', finance.suspended],
            ['Prévision MRR', finance.forecastMrr], ['Prévision ARR', finance.forecastArr],
            ['Hypothèse conversion', `${Math.round(finance.conversionRate * 100)}%`],
            [],
            ['Plan', 'Abonnés', 'Prix (MAD)', 'MRR (MAD)'],
            ...Object.entries(finance.byPlan).map(([p, d]) => [p, d.count, planPrice(p), d.mrr]),
        ];
        const csv = rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bayiin-finances-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Franchise Modal State
    const [isFranchiseModalOpen, setIsFranchiseModalOpen] = useState(false);
    const [newFranchiseName, setNewFranchiseName] = useState("");
    const [newFranchiseAdminEmail, setNewFranchiseAdminEmail] = useState("");

    const handleCreateFranchise = async (e) => {
        e.preventDefault();
        if (!newFranchiseName || !newFranchiseAdminEmail) return toast.error("All fields required");
        try {
            // Check if user exists first
            const userQ = query(collection(db, "users"), where("email", "==", newFranchiseAdminEmail.trim()));
            const userSnap = await getDocs(userQ);

            if (userSnap.empty) {
                return toast.error("User not found. Admin must sign up first.");
            }

            // Create franchise
            const franchiseRef = await addDoc(collection(db, "franchises"), {
                name: newFranchiseName,
                createdAt: new Date(),
            });

            // Update user
            const targetUser = userSnap.docs[0];
            await updateDoc(doc(db, "users", targetUser.id), {
                role: "franchise_admin",
                franchiseId: franchiseRef.id
            });

            // Attach user's existing stores to this new franchise
            const storesQ = query(collection(db, "stores"), where("ownerId", "==", targetUser.id));
            const storesSnap = await getDocs(storesQ);

            const storePromises = storesSnap.docs.map(storeDoc =>
                updateDoc(doc(db, "stores", storeDoc.id), { franchiseId: franchiseRef.id })
            );
            await Promise.all(storePromises);

            toast.success("Franchise created and Admin assigned!");
            setIsFranchiseModalOpen(false);
            setNewFranchiseName("");
            setNewFranchiseAdminEmail("");
            refreshData();
        } catch (err) {
            console.error(err);
            toast.error("Failed to create franchise");
        }
    };

    // Local Broadcast State (syncs with data on load)
    const [broadcastMsg, setBroadcastMsg] = useState(broadcastData.message);
    const [broadcastActive, setBroadcastActive] = useState(broadcastData.active);

    const handleBroadcastSave = async () => {
        try {
            await setDoc(doc(db, "system", "announcements"), {
                message: broadcastMsg,
                active: broadcastActive,
                updatedAt: new Date(),
                updatedBy: user.email
            });
            toast.success("Broadcast updated!");
            refreshData(); // Refresh to ensure sync
        } catch (err) {
            toast.error("Failed to update broadcast");
        }
    };

    // Derived Data for Charts — historique RÉEL du MRR (snapshots mensuels) + point "Maintenant".
    const monthLabel = (m) => {
        const [y, mo] = (m || '').split('-');
        const d = new Date(Number(y), Number(mo) - 1, 1);
        return isNaN(d.getTime()) ? m : d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
    };
    const hasSnapshots = mrrSnapshots.length > 0;
    const chartData = [
        ...mrrSnapshots.map(s => ({ name: monthLabel(s.month), mrr: s.mrr })),
        { name: 'Maintenant', mrr: finance.mrr },
    ];

    const pieData = [
        { name: 'Pro', value: stats.proStores },
        { name: 'Free', value: stats.stores - stats.proStores },
    ];

    // Propriétaire d'un store (contact support) : par ownerId, sinon par storeId associé.
    const ownerOf = (store) => usersList.find(u => u.id === store.ownerId) || usersList.find(u => u.storeId === store.id);

    // Journalise une action support (append-only, collection support_actions).
    const logSupportAction = async (store, action, detail) => {
        try {
            await addDoc(collection(db, 'support_actions'), {
                storeId: store.id,
                storeName: store.name || '',
                action,
                detail: detail || '',
                adminId: user.uid,
                adminEmail: user.email || '',
                at: serverTimestamp(),
            });
        } catch (e) {
            console.error('logSupportAction', e);
        }
    };

    // Action support : patch le doc store + màj locale optimiste + journalisation.
    const patchStore = async (id, fields, msg, action) => {
        try {
            const store = stores.find(s => s.id === id) || { id };
            await updateDoc(doc(db, "stores", id), fields);
            setStores(prev => prev.map(s => s.id === id ? { ...s, ...fields } : s));
            if (action) logSupportAction(store, action, msg);
            if (msg) toast.success(msg);
        } catch (e) {
            console.error(e);
            toast.error("Échec de l'action");
        }
    };

    const q = searchTerm.toLowerCase();
    const filteredStores = stores.filter(store => {
        const owner = ownerOf(store);
        return (
            store.name?.toLowerCase().includes(q) ||
            store.id?.toLowerCase().includes(q) ||
            owner?.email?.toLowerCase().includes(q) ||
            owner?.phone?.toLowerCase?.().includes(q)
        );
    });

    const filteredUsers = usersList.filter(u =>
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredFranchises = (franchises || []).filter(f =>
        f.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Fetch QA Progress
    const fetchQaProgress = async () => {
        const progress = {};
        // Load QA test definitions for task/severity metadata
        const { QA_MODULES: QA_MODS } = await import('../data/qaTests');
        const testMeta = {};
        QA_MODS.forEach(mod => mod.tests.forEach(t => { testMeta[t.id] = t; }));

        for (const store of stores) {
            try {
                const snap = await getDocs(collection(db, "stores", store.id, "qa_runs"));
                if (!snap.empty) {
                    const currentRun = snap.docs.find(d => d.id === 'current')?.data();
                    if (currentRun?.tests) {
                        const entries = Object.entries(currentRun.tests);
                        const total = Object.keys(testMeta).length || 49;
                        const completed = entries.filter(([, t]) => t.status === 'ok').length;
                        const failed = entries.filter(([, t]) => t.status === 'fail').length;

                        // UX Rating average (only rated entries)
                        const rated = entries.filter(([, t]) => t.uxRating > 0);
                        const avgUxRating = rated.length > 0
                            ? rated.reduce((s, [, t]) => s + t.uxRating, 0) / rated.length
                            : 0;

                        // Full results for auditing
                        const fullResults = currentRun.tests;
                        const failedTests = entries.filter(([, t]) => t.status === 'fail').map(([id]) => id);
                        const startTime = currentRun.startTime?.toDate ? currentRun.startTime.toDate() : null;
                        const endTime = currentRun.updatedAt?.toDate ? currentRun.updatedAt.toDate() : null;
                        const durationMinutes = (startTime && endTime) ? Math.round((endTime - startTime) / 60000) : null;

                        progress[store.id] = { 
                            completed, 
                            total, 
                            failed, 
                            avgUxRating, 
                            failedTests, 
                            fullResults,
                            startTime,
                            updatedAt: currentRun.updatedAt,
                            durationMinutes
                        };
                    }
                }
            } catch (e) { console.error(e); }
        }
        setQaProgress(progress);
    };

    // Badge de l'onglet Contacts.
    //
    // Les alertes email étant désactivées, ce badge est le SEUL signal d'arrivée
    // d'une demande : il doit donc être temps réel. Un simple getDocs au montage
    // resterait figé sur un dashboard laissé ouvert, et une demande arrivée entre
    // temps passerait inaperçue jusqu'au prochain rechargement.
    useEffect(() => {
        const unsub = onSnapshot(
            query(collection(db, 'contact_requests'), where('status', '==', 'new')),
            (snap) => setNewContactsCount(snap.size),
            (err) => {
                console.error('[contacts] badge listener:', err);
                setNewContactsCount(0);
            }
        );
        return unsub;
    }, []);

    useEffect(() => {
        if (activeTab === 'qa' && stores.length > 0) {
            fetchQaProgress();
        }
        if (activeTab === 'contacts') {
            setContactsLoading(true);
            getDocs(collection(db, 'contact_requests'))
                .then(snap => {
                    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                    data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
                    setContacts(data);
                })
                .catch(console.error)
                .finally(() => setContactsLoading(false));
        }
        if (activeTab === 'promo') {
            setPromoLoading(true);
            getDocs(collection(db, 'promo_codes'))
                .then(snap => {
                    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                    data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
                    setPromoCodes(data);
                })
                .catch(console.error)
                .finally(() => setPromoLoading(false));
        }
        if (activeTab === 'history') {
            setHistoryLoading(true);
            getDocs(query(collection(db, 'support_actions'), orderBy('at', 'desc'), limit(100)))
                .then(snap => setSupportHistory(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
                .catch(console.error)
                .finally(() => setHistoryLoading(false));
        }
    }, [activeTab, stores]);

    // Alerte proactive : erreurs PROD des dernières 24h (monitoring — complète /admin/errors).
    const [prodErrors24h, setProdErrors24h] = useState(null);
    useEffect(() => {
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
        getDocs(query(collection(db, 'error_logs'), where('at', '>=', cutoff)))
            .then(snap => {
                let n = 0;
                snap.forEach(d => { if (d.data().mode === 'prod') n++; });
                setProdErrors24h(n);
            })
            .catch(() => setProdErrors24h(null));
    }, []);

    // Historique réel du MRR (12 derniers snapshots mensuels), trié croissant.
    useEffect(() => {
        getDocs(query(collection(db, 'mrr_snapshots'), orderBy('month', 'desc'), limit(12)))
            .then(snap => setMrrSnapshots(snap.docs.map(d => d.data()).reverse()))
            .catch(() => setMrrSnapshots([]));
    }, []);

    // Historique + note interne de la boutique ouverte dans la fiche.
    useEffect(() => {
        if (!auditStore?.id) { setStoreHistory([]); setStoreNote(""); setStoreNoteMeta(null); return; }
        // Historique (tri client → pas d'index composite).
        getDocs(query(collection(db, 'support_actions'), where('storeId', '==', auditStore.id), limit(50)))
            .then(snap => {
                const rows = snap.docs.map(d => d.data());
                rows.sort((a, b) => (b.at?.seconds || 0) - (a.at?.seconds || 0));
                setStoreHistory(rows.slice(0, 10));
            })
            .catch(() => setStoreHistory([]));
        // Note interne (collection séparée, invisible du marchand).
        getDoc(doc(db, 'support_notes', auditStore.id))
            .then(d => { setStoreNote(d.exists() ? (d.data().note || "") : ""); setStoreNoteMeta(d.exists() ? d.data() : null); })
            .catch(() => { setStoreNote(""); setStoreNoteMeta(null); });
    }, [auditStore]);

    // Enregistre la note interne d'une boutique + journalise l'action.
    const saveStoreNote = async (store) => {
        if (!store?.id) return;
        setSavingNote(true);
        try {
            await setDoc(doc(db, 'support_notes', store.id), {
                note: storeNote, storeId: store.id,
                updatedByEmail: user.email || '', updatedById: user.uid, updatedAt: serverTimestamp(),
            });
            setStoreNoteMeta({ updatedByEmail: user.email, updatedAt: { toDate: () => new Date() } });
            logSupportAction(store, 'Note interne');
            toast.success('Note enregistrée');
        } catch (e) {
            console.error(e);
            toast.error("Échec de l'enregistrement de la note");
        } finally {
            setSavingNote(false);
        }
    };


    if (loading) return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <ShieldAlert className="h-8 w-8 text-indigo-600" />
                            Admin Command Center
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">Overview of system health and performance</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="hidden md:block text-right mr-2">
                            <p className="text-xs font-medium text-gray-400">Logged in as</p>
                            <p className="text-sm font-bold text-gray-900">{user?.email}</p>
                        </div>
                        <Button variant="secondary" onClick={() => navigate('/admin/errors')}>Journal d'erreurs</Button>
                        <Button variant="secondary" onClick={() => navigate('/')}>Exit Admin</Button>
                    </div>
                </header>

                {/* Alerte monitoring : erreurs prod des dernières 24h */}
                {prodErrors24h > 0 && (
                    <motion.button
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => navigate('/admin/errors')}
                        className="w-full flex items-center gap-3 bg-red-50 border border-red-200 text-red-800 px-5 py-4 rounded-2xl hover:bg-red-100 transition-colors text-left"
                    >
                        <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-600" />
                        <span className="flex-1 text-sm font-semibold">
                            {prodErrors24h} erreur{prodErrors24h > 1 ? 's' : ''} de production dans les dernières 24h
                        </span>
                        <span className="text-xs font-bold underline">Voir le journal →</span>
                    </motion.button>
                )}

                {/* Analytics Pulse Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <MetricCard
                        title="Revenu récurrent (MRR)"
                        value={`${stats.mrr.toLocaleString()} MAD`}
                        subtitle={`${stats.proStores} abonnés`}
                        icon={Wallet}
                        color="indigo"
                    />
                    <MetricCard
                        title="Boutiques actives"
                        value={stats.stores}
                        trend={stats.growth}
                        icon={TrendingUp}
                        color="emerald"
                    />
                    <MetricCard
                        title="Engagement plateforme"
                        value={`${stats.platformActivity.toFixed(1)}%`}
                        subtitle="stores avec activité"
                        icon={Activity}
                        color="amber"
                    />
                    <MetricCard
                        title="Rétention"
                        value={`${(100 - stats.churnRate).toFixed(1)}%`}
                        subtitle="stores avec produits"
                        icon={ShieldCheck}
                        color="rose"
                    />
                </div>

                {/* Secondary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-3xl border border-gray-100 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-2xl bg-blue-50 text-blue-600">
                                <Users className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Accounts</p>
                                <p className="text-xl font-black text-gray-900">{stats.users.toLocaleString()}</p>
                            </div>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-1 bg-blue-50 text-blue-600 rounded-lg">LIVE</span>
                    </div>

                    <div className="bg-white p-6 rounded-3xl border border-gray-100 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-2xl bg-purple-50 text-purple-600">
                                <Zap className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Premium Conversion</p>
                                <p className="text-xl font-black text-gray-900">{((stats.proStores/stats.stores)*100).toFixed(1)}%</p>
                            </div>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-1 bg-purple-50 text-purple-600 rounded-lg">UPGRADE</span>
                    </div>

                    <div className="bg-white p-6 rounded-3xl border border-gray-100 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-2xl bg-orange-50 text-orange-600">
                                <Globe className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Avg GMV Estimate</p>
                                <p className="text-xl font-black text-gray-900">{stats.avgStoreRevenue.toLocaleString()} DH</p>
                            </div>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-1 bg-orange-50 text-orange-600 rounded-lg">ECO</span>
                    </div>
                </div>

                {/* Revenue Trend - Full Width */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h4 className="font-bold text-gray-900 mb-6">Évolution du MRR <span className="text-xs font-normal text-gray-400">{hasSnapshots ? '(historique réel, snapshot mensuel)' : "(l'historique se remplira chaque mois)"}</span></h4>
                    <RevenueChart data={chartData} />
                </div>

                {/* Main Content Areas */}
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 min-h-[500px] overflow-hidden">
                    <div className="border-b border-gray-100 px-6 pt-6 bg-white sticky top-0 z-10">
                        <nav className="-mb-px flex space-x-6 overflow-x-auto no-scrollbar">
                            {['stores', 'finances', 'history', 'users', 'franchises', 'insights', 'qa', 'contacts', 'promo', 'broadcast'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`
                                        whitespace-nowrap pb-4 px-1 border-b-2 font-black text-[10px] uppercase tracking-widest transition-all duration-200
                                        ${activeTab === tab
                                            ? 'border-indigo-600 text-indigo-600'
                                            : 'border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-200'}
                                    `}
                                >
                                    {tab === 'finances' ? '💰 Finances' : tab === 'history' ? '📋 Historique' : tab === 'insights' ? '📊 Insights' : tab === 'qa' ? '🛡️ QA Recette' : tab === 'contacts' ? '📬 Contacts' : tab === 'promo' ? '🎁 Codes Beta' : tab}
                                    {tab === 'contacts' && newContactsCount > 0 && (
                                        <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-black align-middle">
                                            {newContactsCount}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </nav>
                    </div>

                    <div className="p-6">
                        {/* Control Bar for Lists */}
                        {activeTab !== 'broadcast' && activeTab !== 'contacts' && activeTab !== 'promo' && activeTab !== 'insights' && activeTab !== 'finances' && activeTab !== 'history' && (
                            <div className="mb-6 flex flex-col sm:flex-row justify-between gap-4">
                                <div className="w-full sm:w-72">
                                    <Input
                                        icon={Search}
                                        placeholder="Nom, ID, email ou téléphone…"
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        className="bg-gray-50 border-transparent focus:bg-white transition-all"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    {activeTab === 'franchises' && (
                                        <Button onClick={() => setIsFranchiseModalOpen(true)}>Create Franchise</Button>
                                    )}
                                    <Button variant="ghost" size="sm">Filter</Button>
                                    <Button variant="ghost" size="sm">Export</Button>
                                </div>
                            </div>
                        )}

                        {/* STORES TAB */}
                        {activeTab === 'stores' && (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-100">
                                    <thead>
                                        <tr className="bg-gray-50/50">
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider rounded-l-lg">Boutique</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Activité</th>
                                            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider rounded-r-lg">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {filteredStores.map(store => (
                                            <tr key={store.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center">
                                                        <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 flex items-center justify-center text-indigo-600 font-black mr-4 shadow-sm">
                                                            {store.name?.[0]?.toUpperCase() || 'S'}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-gray-900 text-sm">{store.name}</div>
                                                            <div className="text-[10px] text-gray-400 font-mono flex items-center gap-1">
                                                                <Globe className="w-2 h-2" /> {store.id.slice(0, 8)}...
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col gap-1.5 items-start">
                                                        <StatusPill store={store} />
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${store.plan === 'pro' || store.plan === 'unlimited' ? 'bg-indigo-50 text-indigo-700' : 'bg-gray-100 text-gray-500'}`}>
                                                            {store.plan?.toUpperCase() || 'FREE'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm">
                                                    {(() => {
                                                        const owner = ownerOf(store);
                                                        if (!owner) return <span className="text-gray-300 italic text-xs">Propriétaire inconnu</span>;
                                                        return (
                                                            <div className="flex flex-col gap-0.5 min-w-0">
                                                                <span className="text-gray-700 text-xs truncate max-w-[180px]" title={owner.email}>{owner.email || '—'}</span>
                                                                {owner.phone && <span className="text-gray-400 text-[11px]">{owner.phone}</span>}
                                                            </div>
                                                        );
                                                    })()}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-xs">{store.products || 0} produits</span>
                                                        <span className="text-[11px] text-gray-400">Créé {store.createdAt?.toDate ? new Date(store.createdAt.toDate()).toLocaleDateString('fr-FR') : 'N/A'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right flex justify-end gap-2">
                                                    <Button size="sm" variant="ghost" className="text-indigo-600 hover:bg-indigo-50" onClick={() => setAuditStore(store)}>
                                                        Audit
                                                    </Button>
                                                    <Button size="sm" variant="secondary" icon={ExternalLink} onClick={async () => {
                                                        if (!confirm("Access this store?")) return;
                                                        await updateDoc(doc(db, "users", user.uid), { storeId: store.id });
                                                        window.location.href = '/dashboard';
                                                    }}>Access</Button>

                                                    <div className="relative group">
                                                        <Button size="sm" variant="ghost">More</Button>
                                                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 hidden group-hover:block z-20 overflow-hidden">
                                                            <button
                                                                onClick={() => {
                                                                    const newPlan = store.plan === 'pro' ? 'free' : 'pro';
                                                                    patchStore(store.id, { plan: newPlan }, `Plan → ${newPlan}`, 'Changement de plan');
                                                                }}
                                                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                                            >
                                                                {store.plan === 'pro' ? 'Downgrade to Free' : 'Upgrade to Pro'}
                                                            </button>
                                                            <button
                                                                onClick={async () => {
                                                                    if (!confirm("PERMANENTLY DELETE STORE? This cannot be undone.")) return;
                                                                    await logSupportAction(store, 'Suppression boutique');
                                                                    await deleteDoc(doc(db, "stores", store.id));
                                                                    setStores(prev => prev.filter(s => s.id !== store.id));
                                                                    toast.success("Store deleted");
                                                                }}
                                                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                                            >
                                                                Delete Store
                                                            </button>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {filteredStores.length === 0 && (
                                    <div className="p-12 text-center text-gray-500">No stores found matching your search.</div>
                                )}
                            </div>
                        )}

                        {/* FINANCES TAB — abonnements réels + prévision */}
                        {activeTab === 'finances' && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between flex-wrap gap-3">
                                    <h3 className="font-black text-gray-900 flex items-center gap-2"><Coins className="w-5 h-5 text-indigo-600" /> Finances des abonnements</h3>
                                    <div className="flex gap-2">
                                        <Button size="sm" variant="secondary" icon={TrendingUp} onClick={runSnapshotNow} disabled={snapshotting}>{snapshotting ? 'Snapshot…' : 'Snapshot maintenant'}</Button>
                                        <Button size="sm" variant="secondary" icon={ExternalLink} onClick={exportFinanceCsv}>Export CSV</Button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                    <FinKpi label="MRR" value={`${finance.mrr.toLocaleString('fr-FR')} ${CURRENCY}`} sub={`${finance.activePaying} abonné${finance.activePaying > 1 ? 's' : ''} payant${finance.activePaying > 1 ? 's' : ''}`} icon={Wallet} tone="indigo" />
                                    <FinKpi label="ARR (annualisé)" value={`${finance.arr.toLocaleString('fr-FR')} ${CURRENCY}`} sub="MRR × 12" icon={TrendingUp} tone="emerald" />
                                    <FinKpi label="Revenu / abonné" value={`${finance.arpu.toLocaleString('fr-FR')} ${CURRENCY}`} sub="ARPU mensuel" icon={Coins} tone="amber" />
                                    <FinKpi label="Prévision MRR" value={`${finance.forecastMrr.toLocaleString('fr-FR')} ${CURRENCY}`} sub={`+${(finance.forecastMrr - finance.mrr).toLocaleString('fr-FR')} ${CURRENCY} potentiels`} icon={Sparkles} tone="purple" />
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Répartition par plan */}
                                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                                        <h4 className="font-black text-xs uppercase tracking-widest mb-4 text-gray-400">Répartition du MRR par plan</h4>
                                        {Object.keys(finance.byPlan).length === 0 ? (
                                            <p className="text-sm text-gray-400 italic py-6 text-center">Aucun abonnement payant pour le moment.</p>
                                        ) : (
                                            <table className="min-w-full text-sm">
                                                <thead>
                                                    <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                        <th className="text-left pb-2">Plan</th>
                                                        <th className="text-right pb-2">Abonnés</th>
                                                        <th className="text-right pb-2">Prix</th>
                                                        <th className="text-right pb-2">MRR</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {Object.entries(finance.byPlan).sort((a, b) => b[1].mrr - a[1].mrr).map(([plan, d]) => (
                                                        <tr key={plan}>
                                                            <td className="py-2 font-bold text-gray-900 uppercase">{plan}</td>
                                                            <td className="py-2 text-right text-gray-600">{d.count}</td>
                                                            <td className="py-2 text-right text-gray-400">{planPrice(plan)} {CURRENCY}</td>
                                                            <td className="py-2 text-right font-black text-gray-900">{d.mrr.toLocaleString('fr-FR')} {CURRENCY}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                                <tfoot>
                                                    <tr className="border-t-2 border-gray-100">
                                                        <td className="pt-2 font-black text-indigo-600 uppercase text-xs">Total</td>
                                                        <td className="pt-2 text-right font-bold text-gray-900">{finance.activePaying}</td>
                                                        <td></td>
                                                        <td className="pt-2 text-right font-black text-indigo-600">{finance.mrr.toLocaleString('fr-FR')} {CURRENCY}</td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        )}
                                    </div>

                                    {/* Pipeline & manque à gagner */}
                                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                                        <h4 className="font-black text-xs uppercase tracking-widest mb-4 text-gray-400">Pipeline & accès offerts</h4>
                                        <div className="space-y-3 text-sm">
                                            <div className="flex items-center justify-between"><span className="text-gray-500">Essais en cours</span><span className="font-bold text-gray-900">{finance.trials}</span></div>
                                            <div className="flex items-center justify-between"><span className="text-gray-500">↳ dont expirant ≤ 7 j</span><span className={`font-bold ${finance.trialsExpiring7d > 0 ? 'text-amber-600' : 'text-gray-900'}`}>{finance.trialsExpiring7d}</span></div>
                                            <div className="flex items-center justify-between"><span className="text-gray-500">Valeur du pipeline d'essais</span><span className="font-bold text-gray-900">{finance.trialPipelineValue.toLocaleString('fr-FR')} {CURRENCY}/mois</span></div>
                                            <div className="pt-3 mt-1 border-t border-gray-50 flex items-center justify-between"><span className="text-gray-500">Promo (offert)</span><span className="font-bold text-indigo-600">{finance.promoCount}</span></div>
                                            <div className="flex items-center justify-between"><span className="text-gray-500">Testeurs (offert)</span><span className="font-bold text-purple-600">{finance.testers}</span></div>
                                            <div className="flex items-center justify-between"><span className="text-gray-500">Expirés</span><span className="font-bold text-red-500">{finance.expired}</span></div>
                                            <div className="flex items-center justify-between"><span className="text-gray-500">Suspendus</span><span className="font-bold text-red-500">{finance.suspended}</span></div>
                                        </div>
                                    </div>
                                </div>

                                {/* Prévision ajustable */}
                                <div className="bg-gradient-to-br from-indigo-50 to-white p-6 rounded-3xl border border-indigo-100">
                                    <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
                                        <div>
                                            <h4 className="font-black text-sm text-gray-900 flex items-center gap-2"><Percent className="w-4 h-4 text-indigo-600" /> Prévision de MRR</h4>
                                            <p className="text-xs text-gray-500 mt-0.5">Hypothèse : part des {finance.trials} essais en cours qui convertissent.</p>
                                        </div>
                                        <div className="flex gap-2">
                                            {[0.1, 0.2, 0.3, 0.5].map(r => (
                                                <button key={r} onClick={() => setConversionRate(r)}
                                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${conversionRate === r ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'}`}>
                                                    {Math.round(r * 100)}%
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div className="bg-white p-4 rounded-2xl border border-gray-100">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">MRR actuel</p>
                                            <p className="text-xl font-black text-gray-900 mt-1">{finance.mrr.toLocaleString('fr-FR')} {CURRENCY}</p>
                                        </div>
                                        <div className="bg-white p-4 rounded-2xl border border-gray-100">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">MRR prévu (mois +1)</p>
                                            <p className="text-xl font-black text-indigo-600 mt-1">{finance.forecastMrr.toLocaleString('fr-FR')} {CURRENCY}</p>
                                        </div>
                                        <div className="bg-white p-4 rounded-2xl border border-gray-100">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ARR prévu</p>
                                            <p className="text-xl font-black text-emerald-600 mt-1">{finance.forecastArr.toLocaleString('fr-FR')} {CURRENCY}</p>
                                        </div>
                                    </div>
                                    <p className="text-[11px] text-gray-400 mt-4">Prix de référence : {planPrice('pro')} {CURRENCY}/mois (Pro). Ajuste les tarifs dans <code className="bg-white px-1 rounded">config/pricing.js</code>.</p>
                                </div>
                            </div>
                        )}

                        {/* HISTORIQUE TAB — journal des actions support */}
                        {activeTab === 'history' && (
                            <div className="space-y-4">
                                <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-2xl flex items-center gap-3">
                                    <History className="w-5 h-5 text-indigo-600" />
                                    <div>
                                        <h3 className="font-bold text-indigo-900">Historique des actions support</h3>
                                        <p className="text-sm text-indigo-700 mt-0.5">100 dernières actions (suspension, promo, prolongation, plan…) — traçabilité par agent.</p>
                                    </div>
                                </div>
                                <div className="w-full sm:w-80">
                                    <Input icon={Search} placeholder="Filtrer par boutique, action ou agent…" value={historyQuery} onChange={e => setHistoryQuery(e.target.value)} className="bg-gray-50 border-transparent focus:bg-white transition-all" />
                                </div>
                                {historyLoading ? (
                                    <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" /></div>
                                ) : filteredHistory.length === 0 ? (
                                    <div className="text-center py-16 text-gray-400">{supportHistory.length === 0 ? 'Aucune action enregistrée pour le moment.' : 'Aucune action ne correspond au filtre.'}</div>
                                ) : (
                                    <div className="overflow-x-auto rounded-2xl border border-gray-100">
                                        <table className="min-w-full divide-y divide-gray-100 text-sm">
                                            <thead className="bg-gray-50/50">
                                                <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                    <th className="px-4 py-3 text-left">Date</th>
                                                    <th className="px-4 py-3 text-left">Action</th>
                                                    <th className="px-4 py-3 text-left">Boutique</th>
                                                    <th className="px-4 py-3 text-left">Détail</th>
                                                    <th className="px-4 py-3 text-left">Agent</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {filteredHistory.map(h => (
                                                    <tr key={h.id} className="hover:bg-gray-50/50">
                                                        <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{h.at?.toDate ? h.at.toDate().toLocaleString('fr-FR') : '—'}</td>
                                                        <td className="px-4 py-3"><span className="font-bold text-gray-900 text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">{h.action}</span></td>
                                                        <td className="px-4 py-3 text-gray-700 text-xs">{h.storeName || <span className="font-mono text-gray-400">{h.storeId?.slice(0, 8)}…</span>}</td>
                                                        <td className="px-4 py-3 text-gray-500 text-xs">{h.detail || '—'}</td>
                                                        <td className="px-4 py-3 text-gray-500 text-xs truncate max-w-[160px]" title={h.adminEmail}>{h.adminEmail || '—'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* USERS TAB */}
                        {activeTab === 'users' && (
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
                                                <td className="px-6 py-4 text-right">
                                                    <Button size="sm" variant="secondary" onClick={async () => {
                                                        if (!confirm("Access this user's store?")) return;
                                                        await updateDoc(doc(db, "users", user.uid), { storeId: u.storeId });
                                                        window.location.href = '/dashboard';
                                                    }}>Visit</Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* FRANCHISES TAB */}
                        {activeTab === 'franchises' && (
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
                        )}

                        {/* CONTACTS TAB */}
                        {activeTab === 'contacts' && (
                            <div className="space-y-4">
                                <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-2xl">
                                    <h3 className="font-bold text-indigo-900">📬 Demandes de contact & devis</h3>
                                    <p className="text-sm text-indigo-700 mt-1">Toutes les demandes soumises depuis la landing page ou le centre d'aide.</p>
                                    <p className="text-xs text-indigo-600/80 mt-2">
                                        Les alertes email sont désactivées : cette page est le seul point de réception.
                                        Le compteur de l'onglet est en temps réel. Pour recevoir aussi une alerte par mail,
                                        définir <code className="bg-white/70 px-1 rounded">SUPPORT_INBOX_EMAIL</code> côté Cloud Functions.
                                    </p>
                                </div>
                                {contactsLoading ? (
                                    <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" /></div>
                                ) : contacts.length === 0 ? (
                                    <div className="text-center py-16 text-gray-400">Aucune demande reçue pour le moment.</div>
                                ) : (
                                    <div className="space-y-3">
                                        {contacts.map(c => (
                                            <div key={c.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-all">
                                                <div className="flex items-start justify-between gap-4 flex-wrap">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${c.type === 'support' ? 'bg-blue-100 text-blue-700' : c.type === 'devis' ? 'bg-indigo-100 text-indigo-700' : c.type === 'integration' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'}`}>{c.type || 'contact'}</span>
                                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.status === 'done' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{c.status === 'done' ? '✅ Traité' : '🆕 Nouveau'}</span>
                                                            <span className="text-xs text-gray-400">{c.createdAt?.toDate ? c.createdAt.toDate().toLocaleString('fr-FR') : '—'}</span>
                                                            {c.notifyError && (
                                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700" title="L'alerte email n'a pas pu être envoyée — traiter cette demande à la main.">
                                                                    ⚠️ Alerte email KO
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="font-bold text-gray-900">{c.name || 'Anonyme'}</p>
                                                        <p className="text-sm text-gray-500">{c.company ? `${c.company} · ` : ''}{c.email}</p>
                                                        {c.budget && <p className="text-xs text-gray-400 mt-0.5">Budget : {c.budget}</p>}
                                                        {c.storeCount && c.storeCount !== '1' && <p className="text-xs text-gray-400">Boutiques : {c.storeCount}</p>}
                                                        {c.message && <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-3 rounded-xl italic">"{c.message}"</p>}
                                                        {c.integrationOptions?.length > 0 && (
                                                            <div className="flex flex-wrap gap-1 mt-2">
                                                                {c.integrationOptions.map(o => <span key={o} className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">{o}</span>)}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                                        {c.phone && (
                                                            <a href={`https://wa.me/${c.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                                                                className="flex items-center gap-1.5 text-xs font-bold text-white bg-[#25D366] hover:bg-[#1DAE57] px-3 py-1.5 rounded-xl transition-colors">
                                                                📱 {c.phone}
                                                            </a>
                                                        )}
                                                        <button
                                                            onClick={async () => {
                                                                const next = c.status === 'done' ? 'new' : 'done';
                                                                try {
                                                                    await updateDoc(doc(db, 'contact_requests', c.id), {
                                                                        status: next,
                                                                        handledAt: serverTimestamp(),
                                                                        handledBy: user?.email || 'admin',
                                                                    });
                                                                    setContacts(prev => prev.map(x => x.id === c.id ? { ...x, status: next } : x));
                                                                    // Le badge est mis à jour par le listener temps réel, pas ici.
                                                                } catch (err) {
                                                                    console.error('[contacts] update failed:', err);
                                                                    toast.error("Impossible de mettre à jour cette demande.");
                                                                }
                                                            }}
                                                            className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-colors ${c.status === 'done' ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                                        >
                                                            {c.status === 'done' ? 'Rouvrir' : 'Marquer traité'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* PROMO CODES TAB */}
                        {activeTab === 'promo' && (
                            <div className="space-y-4">
                                <div className="bg-amber-50 border border-amber-100 p-5 rounded-2xl flex items-start gap-4">
                                    <span className="text-3xl">🏆</span>
                                    <div>
                                        <h3 className="font-bold text-amber-900">Codes Beta Testeur</h3>
                                        <p className="text-sm text-amber-700 mt-0.5">Codes générés automatiquement après complétion de la recette QA (80%+, min 20 min, preuves obligatoires).</p>
                                    </div>
                                </div>
                                {promoLoading ? (
                                    <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" /></div>
                                ) : promoCodes.length === 0 ? (
                                    <div className="text-center py-16 text-gray-400">Aucun code généré pour le moment.</div>
                                ) : (
                                    <div className="space-y-3">
                                        {promoCodes.map(c => (
                                            <div key={c.id} className={`bg-white rounded-2xl border p-5 hover:shadow-md transition-all ${c.used ? 'border-gray-100 opacity-60' : 'border-amber-100'}`}>
                                                <div className="flex flex-wrap items-start justify-between gap-4">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                            <code className="text-lg font-black tracking-widest text-indigo-700 bg-indigo-50 px-3 py-1 rounded-xl">{c.code}</code>
                                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.used ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-700'}`}>
                                                                {c.used ? '✅ Utilisé' : '🟢 Actif'}
                                                            </span>
                                                        </div>
                                                        <p className="font-bold text-gray-900">{c.storeName}</p>
                                                        <div className="flex flex-wrap gap-3 text-xs text-gray-400 mt-1">
                                                            <span>📊 {c.completedTests}/{c.totalTests} tests</span>
                                                            <span>📅 Généré : {c.createdAt?.toDate ? c.createdAt.toDate().toLocaleDateString('fr-FR') : '—'}</span>
                                                            <span>⏳ Expire : {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString('fr-FR') : '—'}</span>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={async () => {
                                                            const { updateDoc: ud, doc: fd } = await import('firebase/firestore');
                                                            await ud(fd(db, 'promo_codes', c.id), { used: !c.used });
                                                            setPromoCodes(prev => prev.map(x => x.id === c.id ? { ...x, used: !x.used } : x));
                                                        }}
                                                        className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-colors flex-shrink-0 ${
                                                            c.used ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                                        }`}
                                                    >
                                                        {c.used ? 'Réactiver' : 'Marquer utilisé'}
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* QA TAB */}
                        {activeTab === 'qa' && (
                            <div className="space-y-6">
                                <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-2xl">
                                    <h3 className="text-lg font-bold text-indigo-900 mb-1">Suivi Global de la Recette QA</h3>
                                    <p className="text-sm text-indigo-700">Vue en temps réel des résultats, bugs signalés et notes UX par boutique.</p>
                                </div>

                                {/* Proofs Modal */}
                                {selectedQaStore && (
                                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90dvh] overflow-hidden flex flex-col">
                                            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                                <div>
                                                    <h2 className="text-xl font-bold text-gray-900">Audit des Proofs : {selectedQaStore.name}</h2>
                                                    <p className="text-xs text-gray-500">Session de {selectedQaStore.durationMinutes || '?'} minutes</p>
                                                </div>
                                                <button onClick={() => setSelectedQaStore(null)} className="text-gray-400 hover:text-gray-600 text-2xl font-bold">&times;</button>
                                            </div>
                                            <div className="flex-1 overflow-auto p-6">
                                                <table className="min-w-full divide-y divide-gray-200">
                                                    <thead>
                                                        <tr className="bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                            <th className="px-4 py-3 text-left">Test</th>
                                                            <th className="px-4 py-3 text-center">Status</th>
                                                            <th className="px-4 py-3 text-center">UX</th>
                                                            <th className="px-4 py-3 text-left">Proof / Comment</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100">
                                                        {Object.entries(selectedQaStore.fullResults || {}).sort((a, b) => b[1].status === 'fail' ? 1 : -1).map(([id, t]) => (
                                                            <tr key={id} className={`text-sm ${t.status === 'fail' ? 'bg-red-50/30' : ''}`}>
                                                                <td className="px-4 py-3">
                                                                    <div className="font-bold text-gray-900">{id}</div>
                                                                    <div className="text-[10px] text-gray-400 truncate max-w-xs">Test ID: {id}</div>
                                                                </td>
                                                                <td className="px-4 py-3 text-center">
                                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${t.status === 'ok' ? 'bg-green-100 text-green-700' : t.status === 'fail' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
                                                                        {t.status === 'ok' ? 'VALIDÉ' : t.status === 'fail' ? 'BUG' : 'PENDING'}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-3 text-center">
                                                                    <div className="flex justify-center gap-0.5">
                                                                        {[...Array(5)].map((_, i) => (
                                                                            <Star key={i} size={10} className={i < (t.uxRating || 0) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'} />
                                                                        ))}
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    {t.comment && <p className="text-gray-700 italic">"{t.comment}"</p>}
                                                                    {t.bugDescription && <p className="text-red-600 mt-1 font-bold text-xs">🐛 Bug: {t.bugDescription}</p>}
                                                                    {!t.comment && !t.bugDescription && <span className="text-gray-300 italic">No proof provided</span>}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                            <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end">
                                                <Button onClick={() => setSelectedQaStore(null)}>Fermer l'audit</Button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {stores.length === 0 ? (
                                    <div className="text-center py-12 text-gray-400">Aucune boutique trouvée.</div>
                                ) : stores.map(store => {
                                    const p = qaProgress[store.id];
                                    if (!p) return (
                                        <div key={store.id} className="bg-white p-5 rounded-2xl border border-gray-100 flex items-center gap-4">
                                            <div className="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center font-bold text-gray-400">{store.name?.[0]}</div>
                                            <div className="flex-1">
                                                <p className="font-bold text-gray-900">{store.name}</p>
                                                <p className="text-xs text-gray-400">Aucun test commencé</p>
                                            </div>
                                            <Button size="sm" variant="secondary" icon={ExternalLink} onClick={() => navigate(`/qa?storeId=${store.id}`)}>Ouvrir QA</Button>
                                        </div>
                                    );

                                    const { completed, total, failed = 0, avgUxRating, failedTests = [], updatedAt, durationMinutes } = p;
                                    const pct = Math.round((completed / total) * 100);

                                    return (
                                        <div key={store.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-all">
                                            {/* Store Header */}
                                            <div className="p-5 flex flex-wrap items-center gap-4">
                                                <div className="h-11 w-11 rounded-xl bg-indigo-50 flex items-center justify-center font-black text-indigo-600 text-lg">{store.name?.[0]}</div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-gray-900">{store.name}</p>
                                                    {updatedAt && <p className="text-[10px] text-gray-400">Mis à jour : {new Date(updatedAt.seconds * 1000).toLocaleString('fr-FR')}</p>}
                                                </div>
                                                {/* KPI Pills */}
                                                <div className="flex flex-wrap gap-2">
                                                    {durationMinutes !== null && <span className="px-2 py-1 rounded-full text-[11px] font-bold bg-purple-100 text-purple-700">⏱️ {durationMinutes} min</span>}
                                                    <span className="px-2 py-1 rounded-full text-[11px] font-bold bg-green-100 text-green-700">{completed} ✅ validés</span>
                                                    {failed > 0 && <span className="px-2 py-1 rounded-full text-[11px] font-bold bg-red-100 text-red-700">{failed} ❌ bugs</span>}
                                                    {avgUxRating > 0 && <span className="px-2 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700">⭐ {avgUxRating.toFixed(1)} UX moy.</span>}
                                                    <span className="px-2 py-1 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-700">{total - completed - failed} ⏳ en attente</span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button size="sm" variant="secondary" onClick={() => setSelectedQaStore({ ...store, ...p })}>Audit Proofs</Button>
                                                    <Button size="sm" variant="ghost" icon={ExternalLink} onClick={() => navigate(`/qa?storeId=${store.id}`)}>Voir QA</Button>
                                                </div>
                                            </div>

                                            {/* Progress bar */}
                                            <div className="px-5 pb-4">
                                                <div className="flex justify-between text-xs mb-1 font-bold">
                                                    <span className="text-indigo-600">{pct}% complété</span>
                                                    <span className="text-gray-400">{completed} / {total}</span>
                                                </div>
                                                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden flex">
                                                    <div className="h-full bg-green-500 transition-all duration-700" style={{ width: `${pct}%` }} />
                                                    {failed > 0 && <div className="h-full bg-red-400 transition-all duration-700" style={{ width: `${Math.round((failed / total) * 100)}%` }} />}
                                                </div>
                                            </div>

                                            {/* Bug list */}
                                            {failedTests.length > 0 && (
                                                <div className="border-t border-red-50 bg-red-50/50 px-5 py-4">
                                                    <p className="text-xs font-bold text-red-700 mb-3 flex items-center gap-1.5">🐛 Bugs signalés ({failedTests.length})</p>
                                                    <div className="space-y-2">
                                                        {failedTests.map(t => (
                                                            <div key={t.id} className="bg-white rounded-xl p-3 border border-red-100">
                                                                <div className="flex items-start justify-between gap-2">
                                                                    <div className="min-w-0">
                                                                        <span className="text-[10px] font-mono text-gray-400 mr-1">{t.id}</span>
                                                                        <span className="text-xs font-bold text-gray-900">{t.task}</span>
                                                                        {t.bugDescription && <p className="text-xs text-red-600 mt-1 italic">"{t.bugDescription}"</p>}
                                                                        {t.comment && <p className="text-[10px] text-gray-400 mt-0.5">Preuve : {t.comment}</p>}
                                                                    </div>
                                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${t.severity === 'Critique' ? 'bg-red-100 text-red-700' : t.severity === 'Majeur' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>{t.severity}</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Fiche Support — données réelles + actions câblées */}
                        {auditStore && (() => {
                            // Store "live" (reflète les actions optimistes) + propriétaire pour le contact.
                            const s = stores.find(x => x.id === auditStore.id) || auditStore;
                            const owner = ownerOf(s);
                            const access = getStoreAccess(s);
                            const whatsappOk = !!(s.whatsappEnabled && s.whatsappAccessToken);
                            const carrierOk = !!(s.senditPublicKey || s.olivraisonApiKey || (s.senditCities && s.senditCities.length));
                            const catalogOk = !!s.publicCatalogEnabled;
                            const isPaid = s.plan === 'pro' || s.plan === 'unlimited';
                            const createdStr = s.createdAt?.toDate ? s.createdAt.toDate().toLocaleDateString('fr-FR') : (s.createdAt ? new Date(s.createdAt).toLocaleDateString('fr-FR') : '—');
                            const lastOrderStr = s.lastOrderDate ? new Date(s.lastOrderDate?.toDate ? s.lastOrderDate.toDate() : s.lastOrderDate).toLocaleDateString('fr-FR') : 'Aucune';

                            const extendTrial = () => {
                                const created = s.createdAt?.toDate ? s.createdAt.toDate() : (s.createdAt ? new Date(s.createdAt) : new Date());
                                const curEnd = s.trialEndsAt ? new Date(s.trialEndsAt.toDate ? s.trialEndsAt.toDate() : s.trialEndsAt) : new Date(created.getTime() + 30 * 86400000);
                                const base = curEnd > new Date() ? curEnd : new Date();
                                const newEnd = new Date(base.getTime() + 30 * 86400000).toISOString();
                                patchStore(s.id, { trialEndsAt: newEnd }, 'Essai prolongé de 30 jours', 'Prolongation essai');
                            };

                            return (
                            <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    className="bg-white rounded-[32px] shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col"
                                >
                                    <div className="p-6 md:p-8 border-b border-gray-50 flex justify-between items-center bg-gradient-to-r from-gray-50 to-white">
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className="h-14 w-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-xl font-black shadow-lg shadow-indigo-100 shrink-0">
                                                {s.name?.[0]?.toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <h2 className="text-xl font-black text-gray-900 tracking-tight truncate">{s.name}</h2>
                                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                    <StatusPill store={s} />
                                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${isPaid ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'}`}>{s.plan || 'Free'}</span>
                                                    {s.testerMode && <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-purple-100 text-purple-700">Testeur</span>}
                                                    <span className="text-[10px] text-gray-400 font-mono">ID: {s.id.slice(0, 10)}…</span>
                                                </div>
                                            </div>
                                        </div>
                                        <button onClick={() => setAuditStore(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors shrink-0">
                                            <X className="w-6 h-6 text-gray-400" />
                                        </button>
                                    </div>

                                    <div className="flex-1 overflow-auto p-6 md:p-8 bg-gray-50/30 space-y-6">
                                        {/* Contact + Abonnement */}
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                                                <h4 className="font-black text-xs uppercase tracking-widest mb-4 text-gray-400">Contact propriétaire</h4>
                                                {owner ? (
                                                    <div className="space-y-3">
                                                        <p className="font-bold text-gray-900">{owner.name || 'Sans nom'}</p>
                                                        {owner.email && (
                                                            <a href={`mailto:${owner.email}`} className="flex items-center gap-2 text-sm text-indigo-600 hover:underline break-all">
                                                                <Mail className="w-4 h-4 shrink-0" /> {owner.email}
                                                            </a>
                                                        )}
                                                        {owner.phone && (
                                                            <a href={`https://wa.me/${owner.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm font-bold text-[#25D366] hover:underline">
                                                                <MessageCircle className="w-4 h-4 shrink-0" /> {owner.phone}
                                                            </a>
                                                        )}
                                                        {s.phone && !owner.phone && (
                                                            <p className="flex items-center gap-2 text-sm text-gray-600"><Phone className="w-4 h-4" /> {s.phone}</p>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-gray-400 italic">Propriétaire introuvable dans la liste des utilisateurs.</p>
                                                )}
                                            </div>

                                            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                                                <h4 className="font-black text-xs uppercase tracking-widest mb-4 text-gray-400">Abonnement</h4>
                                                <div className="space-y-3 text-sm">
                                                    <div className="flex items-center justify-between"><span className="text-gray-500">Statut</span><StatusPill store={s} /></div>
                                                    <div className="flex items-center justify-between"><span className="text-gray-500">Plan</span><span className="font-bold text-gray-900">{(s.plan || 'free').toUpperCase()}</span></div>
                                                    {access.daysLeft !== null && (
                                                        <div className="flex items-center justify-between"><span className="text-gray-500">Jours restants</span><span className={`font-bold ${access.daysLeft <= 3 ? 'text-red-600' : 'text-gray-900'}`}>{access.daysLeft > 0 ? `${access.daysLeft} j` : 'Expiré'}</span></div>
                                                    )}
                                                    <div className="flex items-center justify-between"><span className="text-gray-500">Créé le</span><span className="font-medium text-gray-700">{createdStr}</span></div>
                                                    {s.subscriptionStatus && <div className="flex items-center justify-between"><span className="text-gray-500">subscriptionStatus</span><span className="font-mono text-xs text-gray-500">{s.subscriptionStatus}</span></div>}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Santé intégrations (réelle) */}
                                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                                            <h4 className="font-black text-xs uppercase tracking-widest mb-4 text-gray-400">Configuration & activité</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                                                <HealthRow icon={MessageCircle} label="WhatsApp" ok={whatsappOk} okText="Connecté" />
                                                <HealthRow icon={Truck} label="Transporteur" ok={carrierOk} okText="Configuré" />
                                                <HealthRow icon={Globe} label="Boutique publique" ok={catalogOk} okText="Publiée" koText="Non publiée" />
                                                <HealthRow icon={Package} label={`Produits`} ok={(s.products || 0) > 0} okText={`${s.products || 0} produits`} koText="0 produit" />
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="flex items-center gap-2 text-gray-600"><Clock className="w-4 h-4 text-gray-400" /> Dernière commande</span>
                                                    <span className="text-xs font-bold text-gray-500">{lastOrderStr}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions support (câblées) */}
                                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                                            <h4 className="font-black text-xs uppercase tracking-widest mb-4 text-gray-400">Actions support</h4>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                <Button size="sm" variant="secondary" icon={ExternalLink} className="w-full justify-center" onClick={async () => {
                                                    if (!confirm("Accéder à cette boutique ?")) return;
                                                    await logSupportAction(s, 'Accès store');
                                                    await updateDoc(doc(db, "users", user.uid), { storeId: s.id });
                                                    window.location.href = '/dashboard';
                                                }}>Accéder</Button>

                                                <Button size="sm" variant="secondary" icon={Sparkles} className="w-full justify-center" onClick={() => patchStore(s.id, { testerMode: !s.testerMode }, s.testerMode ? 'Mode testeur retiré' : 'Mode testeur activé', 'Mode testeur')}>
                                                    {s.testerMode ? 'Retirer testeur' : 'Mode testeur'}
                                                </Button>

                                                {access.status === 'promo' ? (
                                                    <Button size="sm" variant="secondary" className="w-full justify-center" onClick={() => patchStore(s.id, { subscriptionStatus: 'none' }, 'Activation promo retirée', 'Promo retirée')}>Retirer promo</Button>
                                                ) : (
                                                    <Button size="sm" variant="secondary" icon={CheckCircle} className="w-full justify-center" onClick={() => patchStore(s.id, { subscriptionStatus: 'active_promo', suspended: false }, 'Boutique activée (promo)', 'Activation promo')}>Activer (promo)</Button>
                                                )}

                                                <Button size="sm" variant="secondary" icon={Clock} className="w-full justify-center" onClick={extendTrial}>Prolonger 30j</Button>

                                                <Button size="sm" variant="secondary" icon={StoreIcon} className="w-full justify-center" onClick={() => patchStore(s.id, { plan: isPaid ? 'free' : 'pro' }, `Plan → ${isPaid ? 'free' : 'pro'}`, 'Changement de plan')}>
                                                    {isPaid ? 'Passer en Free' : 'Passer en Pro'}
                                                </Button>

                                                {s.suspended ? (
                                                    <Button size="sm" variant="secondary" icon={CheckCircle} className="w-full justify-center text-emerald-600" onClick={() => patchStore(s.id, { suspended: false }, 'Boutique réactivée', 'Réactivation')}>Réactiver</Button>
                                                ) : (
                                                    <Button size="sm" variant="secondary" icon={Ban} className="w-full justify-center text-red-600" onClick={() => { if (confirm("Suspendre cette boutique ? L'accès sera bloqué immédiatement.")) patchStore(s.id, { suspended: true }, 'Boutique suspendue', 'Suspension'); }}>Suspendre</Button>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-gray-400 mt-4 flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Les modifications s'appliquent immédiatement (paywall marchand inclus).</p>
                                        </div>

                                        {/* Note interne support (invisible du marchand) */}
                                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                                            <div className="flex items-center justify-between mb-3">
                                                <h4 className="font-black text-xs uppercase tracking-widest text-gray-400 flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Note interne <span className="normal-case font-normal text-gray-300">(support only)</span></h4>
                                                {storeNoteMeta?.updatedAt && (
                                                    <span className="text-[10px] text-gray-400">Modifiée le {storeNoteMeta.updatedAt.toDate ? storeNoteMeta.updatedAt.toDate().toLocaleDateString('fr-FR') : '—'}{storeNoteMeta.updatedByEmail ? ` · ${storeNoteMeta.updatedByEmail}` : ''}</span>
                                                )}
                                            </div>
                                            <textarea
                                                value={storeNote}
                                                onChange={e => setStoreNote(e.target.value)}
                                                rows={3}
                                                placeholder="Contexte, incident en cours, geste commercial accordé, à rappeler…"
                                                className="w-full rounded-xl border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 text-sm resize-none"
                                            />
                                            <div className="flex justify-end mt-3">
                                                <Button size="sm" onClick={() => saveStoreNote(s)} disabled={savingNote}>{savingNote ? 'Enregistrement…' : 'Enregistrer la note'}</Button>
                                            </div>
                                        </div>

                                        {/* Historique des actions sur cette boutique */}
                                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                                            <h4 className="font-black text-xs uppercase tracking-widest mb-4 text-gray-400 flex items-center gap-2"><History className="w-4 h-4" /> Historique de cette boutique</h4>
                                            {storeHistory.length === 0 ? (
                                                <p className="text-sm text-gray-400 italic">Aucune action support enregistrée sur cette boutique.</p>
                                            ) : (
                                                <ul className="space-y-2">
                                                    {storeHistory.map((h, i) => (
                                                        <li key={i} className="flex items-center gap-3 text-sm">
                                                            <span className="text-[10px] text-gray-400 font-mono whitespace-nowrap w-28 shrink-0">{h.at?.toDate ? h.at.toDate().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                                                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 whitespace-nowrap">{h.action}</span>
                                                            <span className="text-gray-400 text-xs truncate">{h.detail || ''}</span>
                                                            <span className="text-gray-300 text-[10px] ml-auto truncate max-w-[120px] hidden sm:block" title={h.adminEmail}>{h.adminEmail}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    </div>

                                    <div className="p-4 md:p-6 border-t border-gray-100 bg-white flex justify-end items-center">
                                        <Button onClick={() => setAuditStore(null)}>Fermer</Button>
                                    </div>
                                </motion.div>
                            </div>
                            );
                        })()}

                        {/* INSIGHTS TAB */}
                        {activeTab === 'insights' && (
                            <div className="space-y-8 animate-in fade-in duration-500">
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    <div className="lg:col-span-2">
                                        <PerformanceTrend
                                            title={hasSnapshots ? "Évolution du MRR (réel)" : "MRR actuel"}
                                            data={chartData.map(d => ({ name: d.name, value: d.mrr }))}
                                        />
                                    </div>
                                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
                                        <div>
                                            <h4 className="font-black text-gray-900 text-sm uppercase tracking-widest mb-6">Plan Distribution</h4>
                                            <PlanDistributionChart data={pieData} />
                                        </div>
                                        <div className="space-y-3 mt-4">
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-gray-500 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-indigo-600"></div> Pro Merchants</span>
                                                <span className="font-bold text-gray-900">{stats.proStores}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-gray-500 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-gray-200"></div> Free Merchants</span>
                                                <span className="font-bold text-gray-900">{stats.stores - stats.proStores}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <h4 className="font-black text-gray-900 text-sm uppercase tracking-widest ml-1 flex items-center gap-2">
                                            <TrendingUp className="w-4 h-4 text-emerald-500" />
                                            Top Performers (by activity)
                                        </h4>
                                        <StoreActivityTable stores={stores.sort((a, b) => (b.products || 0) - (a.products || 0))} />
                                    </div>
                                    
                                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                                        <h4 className="font-black text-gray-900 text-sm uppercase tracking-widest mb-6 flex items-center gap-2">
                                            <ShieldAlert className="w-4 h-4 text-amber-500" />
                                            État plateforme
                                        </h4>
                                        <div className="space-y-4">
                                            <button onClick={() => navigate('/admin/errors')} className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-colors ${prodErrors24h > 0 ? 'bg-red-50 border-red-100 hover:bg-red-100' : 'bg-emerald-50 border-emerald-100'}`}>
                                                <span className="flex items-center gap-3 text-xs font-bold text-gray-700">
                                                    <span className={`p-2 rounded-xl ${prodErrors24h > 0 ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}><AlertTriangle className="w-4 h-4" /></span>
                                                    Erreurs prod (24h)
                                                </span>
                                                <span className={`text-sm font-black ${prodErrors24h > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{prodErrors24h ?? '…'}</span>
                                            </button>
                                            <div className="flex items-center justify-between p-3">
                                                <span className="flex items-center gap-3 text-xs font-bold text-gray-700">
                                                    <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600"><Activity className="w-4 h-4" /></span>
                                                    Boutiques avec accès actif
                                                </span>
                                                <span className="text-sm font-black text-gray-900">{stores.filter(st => getStoreAccess(st).active).length} / {stores.length}</span>
                                            </div>
                                            <div className="flex items-center justify-between p-3">
                                                <span className="flex items-center gap-3 text-xs font-bold text-gray-700">
                                                    <span className="p-2 rounded-xl bg-amber-50 text-amber-600"><Clock className="w-4 h-4" /></span>
                                                    En essai / expiré
                                                </span>
                                                <span className="text-sm font-black text-gray-900">
                                                    {stores.filter(st => getStoreAccess(st).status === 'trial').length} / {stores.filter(st => getStoreAccess(st).status === 'expired').length}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between p-3">
                                                <span className="flex items-center gap-3 text-xs font-bold text-gray-700">
                                                    <span className="p-2 rounded-xl bg-purple-50 text-purple-600"><Sparkles className="w-4 h-4" /></span>
                                                    Comptes testeur
                                                </span>
                                                <span className="text-sm font-black text-gray-900">{stores.filter(st => st.testerMode).length}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'broadcast' && (
                            <div className="max-w-2xl mx-auto py-8">
                                <div className="bg-gradient-to-br from-indigo-50 to-white p-8 rounded-2xl border border-indigo-100 text-center mb-8">
                                    <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 mb-4 shadow-sm">
                                        <Megaphone className="h-7 w-7 text-indigo-600" />
                                    </div>
                                    <h2 className="text-xl font-bold text-gray-900">System Broadcast</h2>
                                    <p className="text-gray-500 mt-2 max-w-md mx-auto">
                                        Send a persistent message to all users. This will appear as a banner in their dashboard.
                                    </p>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Message Content</label>
                                        <textarea
                                            className="w-full rounded-xl border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-4 text-sm resize-none"
                                            rows={4}
                                            placeholder="Example: We are performing scheduled maintenance on Saturday at 2 AM UTC."
                                            value={broadcastMsg}
                                            onChange={(e) => setBroadcastMsg(e.target.value)}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                id="active"
                                                checked={broadcastActive}
                                                onChange={(e) => setBroadcastActive(e.target.checked)}
                                                className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                            />
                                            <label htmlFor="active" className="font-medium text-gray-900 cursor-pointer select-none">Activate Announcement Banner</label>
                                        </div>
                                        {broadcastActive && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold animate-pulse">LIVE</span>}
                                    </div>

                                    <Button className="w-full justify-center py-3 text-base" onClick={handleBroadcastSave}>
                                        Save & Broadcast
                                    </Button>

                                    <div className="flex items-start gap-3 p-4 bg-yellow-50 text-yellow-800 rounded-xl text-sm">
                                        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                                        <p>Warning: This message will be visible to <strong>{stats.users} users</strong> immediately. Please double check for typos.</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Franchise Creation Modal */}
            {isFranchiseModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-indigo-600" />
                                Create Franchise
                            </h2>
                            <button onClick={() => setIsFranchiseModalOpen(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
                        </div>
                        <form onSubmit={handleCreateFranchise} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Franchise Name</label>
                                <Input
                                    placeholder="e.g. Boutique Global"
                                    value={newFranchiseName}
                                    onChange={e => setNewFranchiseName(e.target.value)}
                                    required autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Franchise Admin Email</label>
                                <p className="text-xs text-gray-500 mb-2">User must have already signed up with this email.</p>
                                <Input
                                    type="email"
                                    placeholder="admin@franchise.com"
                                    value={newFranchiseAdminEmail}
                                    onChange={e => setNewFranchiseAdminEmail(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="pt-4 flex justify-end gap-3">
                                <Button type="button" variant="ghost" onClick={() => setIsFranchiseModalOpen(false)}>Cancel</Button>
                                <Button type="submit">Create Franchise</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
