import { useState, useEffect } from 'react';
import {
    collection, query, where, getDocs, doc, updateDoc,
    setDoc, serverTimestamp, addDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useTenant } from '../context/TenantContext';
import { toast } from 'react-hot-toast';
import {
    Truck, Users, ClipboardList, Link, CheckCircle, XCircle,
    TrendingUp, Phone, MapPin, Clock, QrCode, Copy, UserPlus,
    RotateCcw, Star, Package, DollarSign, ChevronDown, ChevronUp,
    Bike, Car, RefreshCcw
} from 'lucide-react';

// Generate a readable driver token
function generateToken(name) {
    const clean = (name || 'driver').toLowerCase().replace(/\s+/g, '').slice(0, 6);
    const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
    return `${clean}-${rand}`;
}

function ScoreBadge({ rate }) {
    if (rate >= 85) return <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">⭐ Excellent</span>;
    if (rate >= 70) return <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">👍 Bon</span>;
    if (rate >= 50) return <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">📈 Passable</span>;
    return <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">⚠️ Faible</span>;
}

function DriverCard({ driver }) {
    const [expanded, setExpanded] = useState(false);
    const total = driver.stats?.totalAssigned ?? 0;
    const delivered = driver.stats?.totalDelivered ?? 0;
    const returned = driver.stats?.totalReturned ?? 0;
    const cod = driver.stats?.totalCOD ?? 0;
    const rate = total > 0 ? Math.round((delivered / total) * 100) : 0;

    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <button className="w-full text-left p-4 flex items-center gap-3" onClick={() => setExpanded(e => !e)}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0 ${driver.status === 'active' ? 'bg-indigo-500' : 'bg-gray-300'}`}>
                    {(driver.name || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900 truncate">{driver.name}</p>
                        <ScoreBadge rate={rate} />
                    </div>
                    <p className="text-xs text-gray-400 truncate">{driver.phone} · {driver.city}</p>
                </div>
                <div className="text-right flex-shrink-0">
                    <p className="font-bold text-indigo-700">{rate}%</p>
                    <p className="text-xs text-gray-400">{delivered}/{total}</p>
                </div>
                {expanded ? <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />}
            </button>

            {expanded && (
                <div className="border-t border-gray-100 px-4 pb-4 pt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-emerald-50 rounded-lg p-2.5 text-center">
                        <p className="text-xl font-bold text-emerald-700">{delivered}</p>
                        <p className="text-xs text-emerald-600">Livrées</p>
                    </div>
                    <div className="bg-rose-50 rounded-lg p-2.5 text-center">
                        <p className="text-xl font-bold text-rose-700">{returned}</p>
                        <p className="text-xs text-rose-600">Retours</p>
                    </div>
                    <div className="bg-indigo-50 rounded-lg p-2.5 text-center">
                        <p className="text-xl font-bold text-indigo-700">{total}</p>
                        <p className="text-xs text-indigo-600">Total</p>
                    </div>
                    <div className="bg-amber-50 rounded-lg p-2.5 text-center">
                        <p className="text-xl font-bold text-amber-700">{cod.toFixed(0)}</p>
                        <p className="text-xs text-amber-600">DH COD</p>
                    </div>
                    <div className="col-span-2 md:col-span-4 mt-1">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>Taux de livraison</span>
                            <span className="font-semibold">{rate}%</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full ${rate >= 85 ? 'bg-emerald-500' : rate >= 70 ? 'bg-blue-500' : rate >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                style={{ width: `${rate}%` }}
                            />
                        </div>
                        <div className="mt-2 bg-gray-50 rounded-lg px-3 py-2 flex items-center justify-between">
                            <span className="text-xs text-gray-500">Token livreur</span>
                            <span className="font-mono text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-lg">{driver.livreurToken}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function ApplicationCard({ app, onApprove, onReject, processing }) {
    const vehicleIcons = { moto: '🏍️', voiture: '🚗', velo: '🚲' };
    return (
        <div className="bg-white rounded-xl border border-indigo-100 shadow-sm p-4 space-y-3">
            <div className="flex items-start justify-between">
                <div>
                    <p className="font-semibold text-gray-900">{app.name}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <Phone className="h-3 w-3" /> {app.phone} · <MapPin className="h-3 w-3" /> {app.city}
                    </p>
                </div>
                <span className="text-lg">{vehicleIcons[app.vehicle] || '🚚'}</span>
            </div>
            {app.message && (
                <p className="text-sm text-gray-600 italic bg-gray-50 rounded-lg p-2">"{app.message}"</p>
            )}
            <div className="flex gap-2 pt-1">
                <button
                    onClick={() => onApprove(app)}
                    disabled={!!processing}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold py-2 rounded-xl transition-colors disabled:opacity-50"
                >
                    {processing === app.id ? <div className="h-4 w-4 border-2 border-white/50 border-t-white rounded-full animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                    Approuver
                </button>
                <button
                    onClick={() => onReject(app.id)}
                    disabled={!!processing}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold py-2 rounded-xl hover:bg-rose-100 transition-colors disabled:opacity-50"
                >
                    <XCircle className="h-4 w-4" />
                    Rejeter
                </button>
            </div>
        </div>
    );
}

export default function Drivers() {
    const { store } = useTenant();
    const [tab, setTab] = useState('roster'); // roster | applications | recruitment
    const [drivers, setDrivers] = useState([]);
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(null);

    const formUrl = store?.id ? `${window.location.origin}/apply/driver/${store.id}` : '';
    const qrUrl = formUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(formUrl)}` : '';

    useEffect(() => {
        if (!store?.id) return;
        loadData();
    }, [store?.id]);

    async function loadData() {
        setLoading(true);
        try {
            // Load drivers
            const driversQ = query(collection(db, 'drivers'), where('storeId', '==', store.id));
            const driversSnap = await getDocs(driversQ);
            setDrivers(driversSnap.docs.map(d => ({ id: d.id, ...d.data() })));

            // Load pending applications
            const appsQ = query(
                collection(db, 'driverApplications'),
                where('storeId', '==', store.id),
                where('status', '==', 'pending')
            );
            const appsSnap = await getDocs(appsQ);
            setApplications(appsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (err) {
            console.error(err);
            toast.error('Erreur de chargement');
        } finally {
            setLoading(false);
        }
    }

    async function handleApprove(app) {
        setProcessing(app.id);
        try {
            const token = generateToken(app.name);
            const driverId = crypto.randomUUID();

            await setDoc(doc(db, 'drivers', driverId), {
                storeId: store.id,
                name: app.name,
                phone: app.phone,
                city: app.city || '',
                vehicle: app.vehicle || '',
                livreurToken: token,
                status: 'active',
                createdAt: serverTimestamp(),
                stats: { totalAssigned: 0, totalDelivered: 0, totalReturned: 0, totalCOD: 0 }
            });

            await updateDoc(doc(db, 'driverApplications', app.id), { status: 'approved' });

            setDrivers(prev => [...prev, {
                id: driverId, storeId: store.id, name: app.name,
                phone: app.phone, city: app.city, vehicle: app.vehicle,
                livreurToken: token, status: 'active',
                stats: { totalAssigned: 0, totalDelivered: 0, totalReturned: 0, totalCOD: 0 }
            }]);
            setApplications(prev => prev.filter(a => a.id !== app.id));
            toast.success(`✅ ${app.name} approuvé ! Token : ${token}`);
            setTab('roster');
        } catch (err) {
            console.error(err);
            toast.error('Erreur lors de l\'approbation');
        } finally {
            setProcessing(null);
        }
    }

    async function handleReject(appId) {
        try {
            await updateDoc(doc(db, 'driverApplications', appId), { status: 'rejected' });
            setApplications(prev => prev.filter(a => a.id !== appId));
            toast.success('Candidature rejetée');
        } catch (err) {
            toast.error('Erreur');
        }
    }

    function copyLink() {
        navigator.clipboard.writeText(formUrl).then(() => toast.success('Lien copié !'));
    }

    const TABS = [
        { key: 'roster', label: 'Livreurs', icon: Users, count: drivers.length },
        { key: 'applications', label: 'Candidatures', icon: ClipboardList, count: applications.length, badge: applications.length > 0 },
        { key: 'recruitment', label: 'Recrutement', icon: UserPlus, count: null },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Truck className="h-6 w-6 text-indigo-600" />
                        Gestion des Livreurs
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Gérez votre équipe de livraison interne Bayiin</p>
                </div>
                <button onClick={loadData} className="text-gray-400 hover:text-indigo-600 transition-colors" title="Actualiser">
                    <RefreshCcw className="h-5 w-5" />
                </button>
            </div>

            {/* KPI Strip */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
                    <p className="text-2xl font-bold text-indigo-700">{drivers.filter(d => d.status === 'active').length}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Livreurs actifs</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
                    <p className="text-2xl font-bold text-amber-600">{applications.length}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Candidatures</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
                    <p className="text-2xl font-bold text-emerald-700">
                        {drivers.length > 0
                            ? Math.round(drivers.reduce((s, d) => {
                                const t = d.stats?.totalAssigned ?? 0;
                                const deli = d.stats?.totalDelivered ?? 0;
                                return s + (t > 0 ? (deli / t) * 100 : 0);
                            }, 0) / drivers.length)
                            : 0}%
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">Taux équipe</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
                {TABS.map(({ key, label, icon: Icon, count, badge }) => (
                    <button
                        key={key}
                        onClick={() => setTab(key)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold rounded-lg transition-all relative ${tab === key ? 'bg-white shadow-sm text-indigo-700' : 'text-gray-600 hover:text-gray-800'}`}
                    >
                        {badge && tab !== key && <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-amber-400 rounded-full" />}
                        <Icon className="h-4 w-4" />
                        {label}
                        {count !== null && count > 0 && (
                            <span className={`text-xs px-1.5 rounded-full ${tab === key ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-200 text-gray-600'}`}>{count}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* Content */}
            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-white rounded-xl border border-gray-100 h-16 animate-pulse" />
                    ))}
                </div>
            ) : tab === 'roster' ? (
                <div className="space-y-3">
                    {drivers.length === 0 ? (
                        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-200">
                            <Truck className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                            <p className="text-gray-500 mb-1">Aucun livreur actif</p>
                            <button onClick={() => setTab('recruitment')} className="text-sm text-indigo-600 underline">
                                Partager le formulaire de recrutement
                            </button>
                        </div>
                    ) : (
                        drivers.map(driver => <DriverCard key={driver.id} driver={driver} />)
                    )}
                </div>
            ) : tab === 'applications' ? (
                <div className="space-y-3">
                    {applications.length === 0 ? (
                        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-200">
                            <ClipboardList className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                            <p className="text-gray-500">Aucune candidature en attente</p>
                        </div>
                    ) : (
                        applications.map(app => (
                            <ApplicationCard
                                key={app.id}
                                app={app}
                                onApprove={handleApprove}
                                onReject={handleReject}
                                processing={processing}
                            />
                        ))
                    )}
                </div>
            ) : (
                /* Recruitment Tab */
                <div className="space-y-4">
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                        <p className="font-semibold text-gray-800 mb-1">Lien du formulaire de candidature</p>
                        <p className="text-xs text-gray-500 mb-3">Partagez ce lien avec les candidats. Ils rempliront un formulaire et vous recevrez leur candidature dans l'onglet "Candidatures".</p>
                        <div className="flex gap-2">
                            <input
                                readOnly
                                value={formUrl}
                                className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-600 font-mono truncate"
                            />
                            <button
                                onClick={copyLink}
                                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
                            >
                                <Copy className="h-4 w-4" />
                                Copier
                            </button>
                        </div>
                    </div>

                    {qrUrl && (
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col items-center gap-3">
                            <p className="font-semibold text-gray-800">QR Code à imprimer / partager</p>
                            <img src={qrUrl} alt="QR Code candidature" className="h-44 w-44 rounded-xl border border-gray-100" />
                            <a href={qrUrl} download="qr-livreur.png" className="text-sm text-indigo-600 hover:underline">
                                Télécharger le QR Code
                            </a>
                        </div>
                    )}

                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-sm text-indigo-700">
                        <p className="font-semibold mb-1">🔗 Comment ça marche ?</p>
                        <ol className="list-decimal list-inside space-y-1 text-indigo-600">
                            <li>Partagez le lien ou le QR code avec vos candidats livreurs</li>
                            <li>Ils remplissent le formulaire de candidature</li>
                            <li>Vous les voyez dans l'onglet "Candidatures"</li>
                            <li>Vous approuvez → un token unique est généré automatiquement</li>
                            <li>Le livreur utilise le lien <code className="bg-indigo-100 px-1 rounded">/delivery/&#123;token&#125;</code> pour accéder à son app</li>
                        </ol>
                    </div>
                </div>
            )}
        </div>
    );
}
