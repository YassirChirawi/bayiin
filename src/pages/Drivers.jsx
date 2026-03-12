import { useState, useEffect, useCallback } from 'react';
import {
    collection, query, where, getDocs, doc, updateDoc,
    setDoc, serverTimestamp, addDoc, getDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useTenant } from '../context/TenantContext';
import { useImageUpload } from '../hooks/useImageUpload';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Truck, Users, ClipboardList, CheckCircle, XCircle,
    Phone, MapPin, UserPlus, UserCheck, Copy, RefreshCcw,
    ChevronDown, ChevronUp, Wallet, Calendar, Upload, FileText,
    AlertTriangle, Clock, Star, TrendingUp, Plus, Trash2,
    Award, ShieldCheck, Car
} from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateToken(name) {
    const clean = (name || 'driver').toLowerCase().replace(/\s+/g, '').slice(0, 6);
    const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
    return `${clean}-${rand}`;
}

function ScoreBadge({ score }) {
    if (score >= 90) return <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">⭐ Excellent</span>;
    if (score >= 75) return <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">👍 Bon</span>;
    if (score >= 55) return <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">📈 Passable</span>;
    return <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">⚠️ Faible</span>;
}

const vehicleIcons = { moto: '🏍️', voiture: '🚗', velo: '🚲' };

const tabVariants = {
    enter: (dir) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir) => ({ x: dir > 0 ? -60 : 60, opacity: 0 })
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function PresencePanel({ driverId }) {
    const [absences, setAbsences] = useState([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({ date: '', type: 'absence', justified: false, note: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadAbsences();
    }, [driverId]);

    async function loadAbsences() {
        setLoading(true);
        try {
            const q = query(collection(db, 'drivers', driverId, 'absences'));
            const snap = await getDocs(q);
            setAbsences(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => b.date.localeCompare(a.date)));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    async function handleAddAbsence(e) {
        e.preventDefault();
        if (!form.date) return;
        setSaving(true);
        try {
            const ref = await addDoc(collection(db, 'drivers', driverId, 'absences'), {
                ...form,
                createdAt: serverTimestamp()
            });
            const newAbs = { id: ref.id, ...form };
            const updated = [newAbs, ...absences].sort((a, b) => b.date.localeCompare(a.date));
            setAbsences(updated);

            // Recalculate performance_score
            const retards = updated.filter(a => a.type === 'retard').length;
            const absInjust = updated.filter(a => a.type === 'absence' && !a.justified).length;
            const score = Math.max(0, 100 - retards * 5 - absInjust * 10);
            await updateDoc(doc(db, 'drivers', driverId), { performance_score: score });

            setForm({ date: '', type: 'absence', justified: false, note: '' });
            toast.success('Enregistré !');
        } catch (e) {
            toast.error('Erreur');
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(absId) {
        await deleteDoc(doc(db, 'drivers', driverId, 'absences', absId));
        setAbsences(prev => prev.filter(a => a.id !== absId));
        const updated = absences.filter(a => a.id !== absId);
        const retards = updated.filter(a => a.type === 'retard').length;
        const absInjust = updated.filter(a => a.type === 'absence' && !a.justified).length;
        const score = Math.max(0, 100 - retards * 5 - absInjust * 10);
        await updateDoc(doc(db, 'drivers', driverId), { performance_score: score });
    }

    const retards = absences.filter(a => a.type === 'retard').length;
    const absInjust = absences.filter(a => a.type === 'absence' && !a.justified).length;
    const score = Math.max(0, 100 - retards * 5 - absInjust * 10);

    return (
        <div className="space-y-4">
            {/* Score Gauge */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 flex items-center gap-4">
                <div className="relative w-16 h-16 flex-shrink-0">
                    <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                        <circle
                            cx="18" cy="18" r="15.9" fill="none"
                            stroke={score >= 90 ? '#10b981' : score >= 75 ? '#6366f1' : score >= 55 ? '#f59e0b' : '#ef4444'}
                            strokeWidth="3"
                            strokeDasharray={`${(score / 100) * 100} 100`}
                            strokeLinecap="round"
                        />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-800">{score}</span>
                </div>
                <div>
                    <p className="font-semibold text-gray-800">Score de Performance</p>
                    <p className="text-xs text-gray-500">{retards} retard(s) · {absInjust} absence(s) injustifiée(s)</p>
                    <p className="text-xs text-gray-400 mt-0.5">Base 100 − 5/retard − 10/absence injustifiée</p>
                </div>
            </div>

            {/* Add Absence Form */}
            <form onSubmit={handleAddAbsence} className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Plus className="w-4 h-4 text-indigo-500" /> Enregistrer une absence / retard
                </p>
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="text-xs text-gray-500">Date</label>
                        <input
                            type="date"
                            required
                            value={form.date}
                            onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                            className="block w-full mt-1 text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500">Type</label>
                        <select
                            value={form.type}
                            onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                            className="block w-full mt-1 text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
                        >
                            <option value="absence">Absence</option>
                            <option value="retard">Retard</option>
                        </select>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        id={`just-${driverId}`}
                        checked={form.justified}
                        onChange={e => setForm(p => ({ ...p, justified: e.target.checked }))}
                        className="rounded"
                    />
                    <label htmlFor={`just-${driverId}`} className="text-xs text-gray-600">Justifiée (ne pénalise pas le score)</label>
                </div>
                <input
                    type="text"
                    placeholder="Note (optionnel)"
                    value={form.note}
                    onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
                    className="block w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
                />
                <button
                    type="submit"
                    disabled={saving}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                    {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
            </form>

            {/* History */}
            {loading ? (
                <div className="text-center py-4 text-sm text-gray-400">Chargement...</div>
            ) : absences.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-4">Aucune absence enregistrée 🎉</p>
            ) : (
                <ul className="space-y-2">
                    {absences.map(a => (
                        <li key={a.id} className={`flex items-center justify-between text-sm px-3 py-2 rounded-lg border ${a.type === 'retard' ? 'border-amber-100 bg-amber-50' : a.justified ? 'border-gray-100 bg-gray-50' : 'border-rose-100 bg-rose-50'
                            }`}>
                            <div>
                                <span className="font-medium text-gray-700">{a.date}</span>
                                <span className={`ml-2 text-xs font-semibold px-1.5 py-0.5 rounded ${a.type === 'retard' ? 'text-amber-700 bg-amber-100' : 'text-rose-700 bg-rose-100'
                                    }`}>{a.type}</span>
                                {a.justified && <span className="ml-1 text-xs text-gray-400">(justifié)</span>}
                                {a.note && <span className="ml-1 text-xs text-gray-400">· {a.note}</span>}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function PayrollPanel({ driver }) {
    const [baseSalary, setBaseSalary] = useState(driver.baseSalary || '');
    const [commissionRate, setCommissionRate] = useState(driver.commissionRate || '');
    const [history, setHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [generating, setGenerating] = useState(false);

    const delivered = driver.stats?.totalDelivered ?? 0;

    const base = parseFloat(baseSalary) || 0;
    const rate = parseFloat(commissionRate) || 0;
    const commissions = delivered * rate;

    // Absence deductions — simplified: count from driver's performance_score
    const performanceScore = driver.performance_score ?? 100;
    const deductionPoints = 100 - performanceScore;
    // Each point deducted = 0.5% of base salary
    const deductions = Math.round((deductionPoints / 100) * base * 0.5 * 100) / 100;
    const total = Math.max(0, base + commissions - deductions);

    const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM

    useEffect(() => {
        loadHistory();
    }, [driver.id]);

    async function loadHistory() {
        setLoadingHistory(true);
        try {
            const snap = await getDocs(collection(db, 'drivers', driver.id, 'payroll_history'));
            setHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => b.month?.localeCompare(a.month)));
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingHistory(false);
        }
    }

    async function saveConfig() {
        await updateDoc(doc(db, 'drivers', driver.id), {
            baseSalary: parseFloat(baseSalary) || 0,
            commissionRate: parseFloat(commissionRate) || 0
        });
        toast.success('Configuration sauvegardée !');
    }

    async function generatePayroll() {
        if (!baseSalary) { toast.error('Définissez un salaire de base d\'abord'); return; }
        const alreadyExists = history.some(h => h.month === currentMonth);
        if (alreadyExists) { toast.error('Une paie pour ce mois existe déjà'); return; }

        setGenerating(true);
        try {
            const ref = await addDoc(collection(db, 'drivers', driver.id, 'payroll_history'), {
                month: currentMonth,
                baseSalary: base,
                commissions,
                commissionRate: rate,
                deliveries: delivered,
                deductions,
                total,
                performanceScore,
                generatedAt: serverTimestamp()
            });
            setHistory(prev => [{ id: ref.id, month: currentMonth, baseSalary: base, commissions, deductions, total }, ...prev]);
            toast.success(`Paie de ${currentMonth} générée : ${total.toFixed(2)} MAD`);
        } catch (e) {
            toast.error('Erreur lors de la génération');
        } finally {
            setGenerating(false);
        }
    }

    return (
        <div className="space-y-4">
            {/* Config */}
            <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-indigo-500" /> Configuration Paie
                </p>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-xs text-gray-500">Salaire de base (MAD/mois)</label>
                        <input
                            type="number" min="0" step="50"
                            value={baseSalary}
                            onChange={e => setBaseSalary(e.target.value)}
                            placeholder="ex: 3000"
                            className="block w-full mt-1 text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500">Commission / livraison (MAD)</label>
                        <input
                            type="number" min="0" step="1"
                            value={commissionRate}
                            onChange={e => setCommissionRate(e.target.value)}
                            placeholder="ex: 15"
                            className="block w-full mt-1 text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
                        />
                    </div>
                </div>
                <button
                    onClick={saveConfig}
                    className="text-sm text-indigo-600 hover:underline"
                >
                    Sauvegarder la configuration
                </button>
            </div>

            {/* Payroll Preview */}
            <div className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-xl p-5 space-y-3">
                <p className="text-sm font-semibold opacity-80">Aperçu paie — {currentMonth}</p>
                <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                        <span className="opacity-70">Salaire de base</span>
                        <span className="font-semibold">{base.toFixed(2)} MAD</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="opacity-70">Commissions ({delivered} livr. × {rate} MAD)</span>
                        <span className="font-semibold text-emerald-300">+{commissions.toFixed(2)} MAD</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="opacity-70">Déductions absences</span>
                        <span className="font-semibold text-rose-300">-{deductions.toFixed(2)} MAD</span>
                    </div>
                    <div className="h-px bg-white/20 my-2" />
                    <div className="flex justify-between text-lg font-bold">
                        <span>TOTAL NET</span>
                        <span>{total.toFixed(2)} MAD</span>
                    </div>
                </div>
                <button
                    onClick={generatePayroll}
                    disabled={generating}
                    className="w-full mt-2 py-2.5 bg-white text-indigo-700 font-bold rounded-xl text-sm hover:bg-indigo-50 transition-colors disabled:opacity-60"
                >
                    {generating ? 'Génération...' : `Générer la paie de ${currentMonth}`}
                </button>
            </div>

            {/* History */}
            {!loadingHistory && history.length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Historique des paies</p>
                    {history.map(h => (
                        <div key={h.id} className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-4 py-3">
                            <div>
                                <p className="text-sm font-semibold text-gray-800">{h.month}</p>
                                <p className="text-xs text-gray-400">Base {h.baseSalary?.toFixed(0)} + Comm. {h.commissions?.toFixed(0)} − Déd. {h.deductions?.toFixed(0)}</p>
                            </div>
                            <span className="text-sm font-bold text-indigo-700">{h.total?.toFixed(2)} MAD</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function DocumentsPanel({ driver }) {
    const { uploadImage, uploading } = useImageUpload();
    const [docs, setDocs] = useState({
        permis: driver.docs?.permis || null,
        cin: driver.docs?.cin || null,
        assurance: driver.docs?.assurance || null,
    });

    const DOC_TYPES = [
        { key: 'permis', label: 'Permis de Conduire', icon: Car },
        { key: 'cin', label: 'CIN (Carte Nationale)', icon: ShieldCheck },
        { key: 'assurance', label: 'Assurance Véhicule', icon: FileText },
    ];

    async function handleUpload(docKey, file) {
        if (!file) return;
        const url = await uploadImage(file, `drivers/${driver.id}/docs/${docKey}`);
        if (url) {
            const updatedDocs = { ...docs, [docKey]: url };
            setDocs(updatedDocs);
            await updateDoc(doc(db, 'drivers', driver.id), { docs: updatedDocs });
            toast.success('Document uploadé !');
        }
    }

    return (
        <div className="space-y-3">
            {DOC_TYPES.map(({ key, label, icon: Icon }) => (
                <div key={key} className="bg-white border border-gray-100 rounded-xl p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${docs[key] ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                            <Icon className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-gray-800">{label}</p>
                            <p className="text-xs text-gray-400">{docs[key] ? '✅ Document présent' : '❌ Manquant'}</p>
                        </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                        {docs[key] && (
                            <a
                                href={docs[key]}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-indigo-600 hover:underline px-2 py-1.5 border border-indigo-100 rounded-lg"
                            >
                                Voir
                            </a>
                        )}
                        <label className="cursor-pointer text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 px-3 py-1.5 border border-gray-200 rounded-lg transition-colors flex items-center gap-1.5">
                            <Upload className="w-3.5 h-3.5" />
                            {uploading ? '...' : docs[key] ? 'Remplacer' : 'Uploader'}
                            <input
                                type="file"
                                accept="image/*,application/pdf"
                                className="hidden"
                                onChange={e => handleUpload(key, e.target.files[0])}
                                disabled={uploading}
                            />
                        </label>
                    </div>
                </div>
            ))}
        </div>
    );
}

// ─── Driver Card (Active) ────────────────────────────────────────────────────

function ActiveDriverCard({ driver }) {
    const [expanded, setExpanded] = useState(false);
    const [subTab, setSubTab] = useState('perf');

    const total = driver.stats?.totalAssigned ?? 0;
    const delivered = driver.stats?.totalDelivered ?? 0;
    const returned = driver.stats?.totalReturned ?? 0;
    const cod = driver.stats?.totalCOD ?? 0;
    const rate = total > 0 ? Math.round((delivered / total) * 100) : 0;
    const score = driver.performance_score ?? 100;

    const SUB_TABS = [
        { key: 'perf', label: 'Performances', icon: TrendingUp },
        { key: 'presence', label: 'Présence', icon: Calendar },
        { key: 'paie', label: 'Paie', icon: Wallet },
        { key: 'docs', label: 'Documents', icon: FileText },
    ];

    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Header Row */}
            <button className="w-full text-left p-4 flex items-center gap-3" onClick={() => setExpanded(e => !e)}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0 bg-gradient-to-br from-indigo-500 to-purple-500">
                    {(driver.name || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900 truncate">{driver.name}</p>
                        <ScoreBadge score={score} />
                    </div>
                    <p className="text-xs text-gray-400 truncate">
                        {vehicleIcons[driver.vehicle] || '🚚'} {driver.phone} · {driver.city}
                    </p>
                </div>
                <div className="text-right flex-shrink-0 mr-1">
                    <p className="font-bold text-indigo-700">{rate}%</p>
                    <p className="text-xs text-gray-400">{delivered}/{total}</p>
                </div>
                {expanded ? <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />}
            </button>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22 }}
                        className="overflow-hidden"
                    >
                        {/* Sub-tab Nav */}
                        <div className="flex gap-0 border-t border-gray-100">
                            {SUB_TABS.map(({ key, label, icon: Icon }) => (
                                <button
                                    key={key}
                                    onClick={() => setSubTab(key)}
                                    className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium border-b-2 transition-colors ${subTab === key ? 'border-indigo-500 text-indigo-600 bg-indigo-50/60' : 'border-transparent text-gray-400 hover:text-gray-600'
                                        }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    <span className="hidden sm:block">{label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Sub-tab Content */}
                        <div className="p-4">
                            {subTab === 'perf' && (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
                                    <div className="col-span-2 md:col-span-4">
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
                            {subTab === 'presence' && <PresencePanel driverId={driver.id} />}
                            {subTab === 'paie' && <PayrollPanel driver={driver} />}
                            {subTab === 'docs' && <DocumentsPanel driver={driver} />}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ─── Application Card ─────────────────────────────────────────────────────────

function ApplicationCard({ app, onApprove, onReject, processing }) {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-xl border border-indigo-100 shadow-sm p-4 space-y-3"
        >
            <div className="flex items-start justify-between">
                <div>
                    <p className="font-semibold text-gray-900">{app.name}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <Phone className="h-3 w-3" /> {app.phone} · <MapPin className="h-3 w-3" /> {app.city}
                    </p>
                </div>
                <span className="text-2xl">{vehicleIcons[app.vehicle] || '🚚'}</span>
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
                    {processing === app.id
                        ? <div className="h-4 w-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                        : <UserCheck className="h-4 w-4" />
                    }
                    Valider la candidature
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
        </motion.div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const MAIN_TABS = [
    { key: 'active', label: 'Équipe Active', icon: UserCheck },
    { key: 'applications', label: 'Candidatures', icon: ClipboardList },
    { key: 'recruitment', label: 'Recrutement', icon: UserPlus },
];

export default function Drivers() {
    const { store } = useTenant();
    const [tab, setTab] = useState('active');
    const [tabDir, setTabDir] = useState(1);
    const [drivers, setDrivers] = useState([]);
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(null);

    const formUrl = store?.id ? `${window.location.origin}/apply/driver/${store.id}` : '';
    const qrUrl = formUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(formUrl)}` : '';

    const switchTab = (newTab) => {
        const oldIdx = MAIN_TABS.findIndex(t => t.key === tab);
        const newIdx = MAIN_TABS.findIndex(t => t.key === newTab);
        setTabDir(newIdx >= oldIdx ? 1 : -1);
        setTab(newTab);
    };

    useEffect(() => {
        if (!store?.id) return;
        loadData();
    }, [store?.id]);

    async function loadData() {
        setLoading(true);
        try {
            const driversQ = query(collection(db, 'drivers'), where('storeId', '==', store.id));
            const driversSnap = await getDocs(driversQ);
            setDrivers(driversSnap.docs.map(d => ({ id: d.id, ...d.data() })));

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
                performance_score: 100,
                baseSalary: 0,
                commissionRate: 0,
                docs: {},
                createdAt: serverTimestamp(),
                stats: { totalAssigned: 0, totalDelivered: 0, totalReturned: 0, totalCOD: 0 }
            });

            await updateDoc(doc(db, 'driverApplications', app.id), { status: 'approved' });

            setDrivers(prev => [...prev, {
                id: driverId, storeId: store.id, name: app.name,
                phone: app.phone, city: app.city, vehicle: app.vehicle,
                livreurToken: token, status: 'active', performance_score: 100,
                baseSalary: 0, commissionRate: 0, docs: {},
                stats: { totalAssigned: 0, totalDelivered: 0, totalReturned: 0, totalCOD: 0 }
            }]);
            setApplications(prev => prev.filter(a => a.id !== app.id));
            toast.success(`✅ ${app.name} intégré à l'équipe ! Token : ${token}`);
            switchTab('active');
        } catch (err) {
            console.error(err);
            toast.error("Erreur lors de la validation");
        } finally {
            setProcessing(null);
        }
    }

    async function handleReject(appId) {
        try {
            await updateDoc(doc(db, 'driverApplications', appId), { status: 'rejected' });
            setApplications(prev => prev.filter(a => a.id !== appId));
            toast.success('Candidature rejetée');
        } catch {
            toast.error('Erreur');
        }
    }

    const activeDrivers = drivers.filter(d => d.status === 'active');
    const avgRate = drivers.length > 0
        ? Math.round(drivers.reduce((s, d) => {
            const t = d.stats?.totalAssigned ?? 0;
            const del = d.stats?.totalDelivered ?? 0;
            return s + (t > 0 ? (del / t) * 100 : 0);
        }, 0) / drivers.length)
        : 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Truck className="h-6 w-6 text-indigo-600" />
                        Gestion RH — Livreurs
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Recrutement · Équipe · Présence · Paie · Documents</p>
                </div>
                <button onClick={loadData} className="text-gray-400 hover:text-indigo-600 transition-colors" title="Actualiser">
                    <RefreshCcw className="h-5 w-5" />
                </button>
            </div>

            {/* KPI Strip */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
                    <p className="text-2xl font-bold text-indigo-700">{activeDrivers.length}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Livreurs actifs</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
                    <p className="text-2xl font-bold text-amber-600">{applications.length}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Candidatures</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
                    <p className="text-2xl font-bold text-emerald-700">{avgRate}%</p>
                    <p className="text-xs text-gray-500 mt-0.5">Taux équipe</p>
                </div>
            </div>

            {/* Main Tabs */}
            <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
                {MAIN_TABS.map(({ key, label, icon: Icon }) => (
                    <button
                        key={key}
                        onClick={() => switchTab(key)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold rounded-lg transition-all relative ${tab === key ? 'bg-white shadow-sm text-indigo-700' : 'text-gray-600 hover:text-gray-800'
                            }`}
                    >
                        <Icon className="h-4 w-4" />
                        {label}
                        {key === 'applications' && applications.length > 0 && tab !== key && (
                            <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-amber-400 rounded-full" />
                        )}
                        {(key === 'active' ? activeDrivers.length : key === 'applications' ? applications.length : null) > 0 && (
                            <span className={`text-xs px-1.5 rounded-full ${tab === key ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-200 text-gray-600'}`}>
                                {key === 'active' ? activeDrivers.length : applications.length}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Animated Content */}
            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-white rounded-xl border border-gray-100 h-16 animate-pulse" />
                    ))}
                </div>
            ) : (
                <AnimatePresence mode="wait" custom={tabDir}>
                    <motion.div
                        key={tab}
                        custom={tabDir}
                        variants={tabVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: 0.22, ease: 'easeInOut' }}
                    >
                        {tab === 'active' && (
                            <div className="space-y-3">
                                {activeDrivers.length === 0 ? (
                                    <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-200">
                                        <Users className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                                        <p className="text-gray-500 mb-1">Aucun livreur actif</p>
                                        <button onClick={() => switchTab('recruitment')} className="text-sm text-indigo-600 underline">
                                            Partager le formulaire de recrutement
                                        </button>
                                    </div>
                                ) : (
                                    activeDrivers.map(driver => <ActiveDriverCard key={driver.id} driver={driver} />)
                                )}
                            </div>
                        )}

                        {tab === 'applications' && (
                            <div className="space-y-3">
                                {applications.length === 0 ? (
                                    <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-200">
                                        <ClipboardList className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                                        <p className="text-gray-500">Aucune candidature en attente</p>
                                    </div>
                                ) : (
                                    <AnimatePresence>
                                        {applications.map(app => (
                                            <ApplicationCard
                                                key={app.id}
                                                app={app}
                                                onApprove={handleApprove}
                                                onReject={handleReject}
                                                processing={processing}
                                            />
                                        ))}
                                    </AnimatePresence>
                                )}
                            </div>
                        )}

                        {tab === 'recruitment' && (
                            <div className="space-y-4">
                                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                                    <p className="font-semibold text-gray-800 mb-1">Lien du formulaire de candidature</p>
                                    <p className="text-xs text-gray-500 mb-3">
                                        Partagez ce lien avec les candidats. Ils rempliront un formulaire et vous recevrez leur candidature dans l'onglet "Candidatures".
                                    </p>
                                    <div className="flex gap-2">
                                        <input
                                            readOnly
                                            value={formUrl}
                                            className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-600 font-mono truncate"
                                        />
                                        <button
                                            onClick={() => navigator.clipboard.writeText(formUrl).then(() => toast.success('Lien copié !'))}
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
                                        <li>Vous validez → un token unique est généré automatiquement</li>
                                        <li>Le livreur utilise <code className="bg-indigo-100 px-1 rounded">/delivery/&#123;token&#125;</code> pour accéder à son app</li>
                                    </ol>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            )}
        </div>
    );
}
