import { useState, useEffect, useMemo } from 'react';
import {
    collection, query, where, getDocs, doc, updateDoc,
    setDoc, serverTimestamp, addDoc, deleteDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useTenant } from '../context/TenantContext';
import { useImageUpload } from '../hooks/useImageUpload';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, UserPlus, Wallet, Calendar, FileText, Search, X, Plus,
    ChevronDown, ChevronUp, Phone, MapPin, Briefcase, Star,
    Clock, CheckCircle, AlertTriangle, Upload, ShieldCheck,
    TrendingUp, RefreshCcw, Edit2, Save, Car, Award,
    Home, Contact, GraduationCap, Camera, HeartPulse
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const DEPARTMENTS = ['Vente', 'Magasin', 'Caisse', 'SAV', 'Marketing', 'Administration', 'Autre'];
const CONTRACT_TYPES = ['CDI', 'CDD', 'Stage', 'Freelance', 'Temps partiel'];
const DOC_TYPES = [
    { key: 'cin', label: 'CIN (Carte Nationale)', icon: ShieldCheck, required: true },
    { key: 'contrat', label: 'Contrat de Travail', icon: FileText, required: true },
    { key: 'rib', label: 'RIB Bancaire', icon: Wallet, required: true },
    { key: 'cnss', label: 'Affiliation CNSS', icon: HeartPulse, required: false },
    { key: 'permis', label: 'Permis de Conduire', icon: Car, required: false },
    { key: 'diplome', label: 'Diplôme / CV', icon: GraduationCap, required: false },
    { key: 'casier', label: 'Casier Judiciaire', icon: CheckCircle, required: false },
    { key: 'photo', label: 'Photo Identité', icon: Camera, required: false },
];

const tabVariants = {
    enter: (dir) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
};

// ─── Score Badge ─────────────────────────────────────────────────────────────

function PerfBadge({ score }) {
    if (score >= 90) return <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">⭐ Excellent</span>;
    if (score >= 75) return <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">👍 Bon</span>;
    if (score >= 55) return <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">📈 Passable</span>;
    return <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">⚠️ Faible</span>;
}

function ContractBadge({ type }) {
    const colors = {
        CDI: 'bg-emerald-50 text-emerald-700',
        CDD: 'bg-blue-50 text-blue-700',
        Stage: 'bg-violet-50 text-violet-700',
        Freelance: 'bg-amber-50 text-amber-700',
        'Temps partiel': 'bg-gray-50 text-gray-600',
    };
    return (
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colors[type] || 'bg-gray-100 text-gray-600'}`}>
            {type}
        </span>
    );
}

// ─── Presence Panel ──────────────────────────────────────────────────────────

function PresencePanel({ employeeId }) {
    const [absences, setAbsences] = useState([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({ date: '', type: 'absence', justified: false, note: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => { loadAbsences(); }, [employeeId]);

    async function loadAbsences() {
        setLoading(true);
        try {
            const snap = await getDocs(collection(db, 'employees', employeeId, 'absences'));
            setAbsences(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => b.date?.localeCompare(a.date)));
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }

    async function handleAdd(e) {
        e.preventDefault();
        if (!form.date) return;
        setSaving(true);
        try {
            const ref = await addDoc(collection(db, 'employees', employeeId, 'absences'), { ...form, createdAt: serverTimestamp() });
            const updated = [{ id: ref.id, ...form }, ...absences].sort((a, b) => b.date?.localeCompare(a.date));
            setAbsences(updated);
            const retards = updated.filter(a => a.type === 'retard').length;
            const absInj = updated.filter(a => a.type === 'absence' && !a.justified).length;
            const score = Math.max(0, 100 - retards * 5 - absInj * 10);
            await updateDoc(doc(db, 'employees', employeeId), { performance_score: score });
            setForm({ date: '', type: 'absence', justified: false, note: '' });
            toast.success('Enregistré !');
        } catch { toast.error('Erreur'); }
        finally { setSaving(false); }
    }

    const retards = absences.filter(a => a.type === 'retard').length;
    const absInj = absences.filter(a => a.type === 'absence' && !a.justified).length;
    const score = Math.max(0, 100 - retards * 5 - absInj * 10);

    return (
        <div className="space-y-4">
            {/* Score Ring */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 flex items-center gap-4">
                <div className="relative w-16 h-16 flex-shrink-0">
                    <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                        <circle cx="18" cy="18" r="15.9" fill="none"
                            stroke={score >= 90 ? '#10b981' : score >= 75 ? '#6366f1' : score >= 55 ? '#f59e0b' : '#ef4444'}
                            strokeWidth="3" strokeDasharray={`${score} 100`} strokeLinecap="round" />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-800">{score}</span>
                </div>
                <div>
                    <p className="font-semibold text-gray-800">Score de Présence</p>
                    <p className="text-xs text-gray-500">{retards} retard(s) · {absInj} absence(s) injustifiée(s)</p>
                </div>
            </div>

            {/* Add Form */}
            <form onSubmit={handleAdd} className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold text-gray-700 flex items-center gap-2"><Plus className="w-4 h-4 text-indigo-500" /> Enregistrer</p>
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="text-xs text-gray-500">Date</label>
                        <input type="date" required value={form.date}
                            onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                            className="block w-full mt-1 text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-300 focus:outline-none" />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500">Type</label>
                        <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                            className="block w-full mt-1 text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-300 focus:outline-none">
                            <option value="absence">Absence</option>
                            <option value="retard">Retard</option>
                        </select>
                    </div>
                </div>
                <label className="flex items-center gap-2 text-xs text-gray-600">
                    <input type="checkbox" checked={form.justified} onChange={e => setForm(p => ({ ...p, justified: e.target.checked }))} className="rounded" />
                    Justifié(e)
                </label>
                <input type="text" placeholder="Note (optionnel)" value={form.note}
                    onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
                    className="block w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-300 focus:outline-none" />
                <button type="submit" disabled={saving}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50">
                    {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
            </form>

            {/* History */}
            {!loading && (
                absences.length === 0 ? <p className="text-center text-sm text-gray-400 py-4">Aucun événement enregistré 🎉</p> :
                    <ul className="space-y-2">
                        {absences.map(a => (
                            <li key={a.id} className={`flex items-center justify-between text-sm px-3 py-2 rounded-lg border ${a.type === 'retard' ? 'border-amber-100 bg-amber-50' : a.justified ? 'border-gray-100 bg-gray-50' : 'border-rose-100 bg-rose-50'
                                }`}>
                                <div>
                                    <span className="font-medium text-gray-700">{a.date}</span>
                                    <span className={`ml-2 text-xs font-semibold px-1.5 py-0.5 rounded ${a.type === 'retard' ? 'text-amber-700 bg-amber-100' : 'text-rose-700 bg-rose-100'}`}>{a.type}</span>
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

// ─── Payroll Panel ────────────────────────────────────────────────────────────

function PayrollPanel({ employee }) {
    const [baseSalary, setBaseSalary] = useState(employee.baseSalary || '');
    const [bonus, setBonus] = useState('');
    const [history, setHistory] = useState([]);
    const [loadingH, setLoadingH] = useState(true);
    const [generating, setGenerating] = useState(false);

    const base = parseFloat(baseSalary) || 0;
    const bonusAmt = parseFloat(bonus) || 0;
    const score = employee.performance_score ?? 100;
    const deductPct = Math.max(0, (100 - score) * 0.005);
    const deductions = Math.round(base * deductPct * 100) / 100;
    const total = Math.max(0, base + bonusAmt - deductions);
    const currentMonth = new Date().toISOString().substring(0, 7);

    useEffect(() => { loadHistory(); }, [employee.id]);

    async function loadHistory() {
        setLoadingH(true);
        try {
            const snap = await getDocs(collection(db, 'employees', employee.id, 'payroll_history'));
            setHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => b.month?.localeCompare(a.month)));
        } catch { } finally { setLoadingH(false); }
    }

    async function saveConfig() {
        await updateDoc(doc(db, 'employees', employee.id), { baseSalary: base });
        toast.success('Salaire sauvegardé !');
    }

    async function generatePayroll() {
        if (!baseSalary) { toast.error('Définissez un salaire d\'abord'); return; }
        if (history.some(h => h.month === currentMonth)) { toast.error('Paie déjà générée ce mois'); return; }
        setGenerating(true);
        try {
            const ref = await addDoc(collection(db, 'employees', employee.id, 'payroll_history'), {
                month: currentMonth, baseSalary: base, bonus: bonusAmt, deductions, total,
                performanceScore: score, generatedAt: serverTimestamp()
            });
            setHistory(prev => [{ id: ref.id, month: currentMonth, baseSalary: base, bonus: bonusAmt, deductions, total }, ...prev]);
            toast.success(`Paie de ${currentMonth} générée : ${total.toFixed(2)} MAD`);
        } catch { toast.error('Erreur'); } finally { setGenerating(false); }
    }

    return (
        <div className="space-y-4">
            <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold text-gray-700 flex items-center gap-2"><Wallet className="w-4 h-4 text-indigo-500" /> Configuration</p>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-xs text-gray-500">Salaire de base (MAD)</label>
                        <input type="number" min="0" step="50" value={baseSalary} onChange={e => setBaseSalary(e.target.value)}
                            placeholder="ex: 4000"
                            className="block w-full mt-1 text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-300 focus:outline-none" />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500">Prime ce mois (MAD)</label>
                        <input type="number" min="0" step="50" value={bonus} onChange={e => setBonus(e.target.value)}
                            placeholder="ex: 500"
                            className="block w-full mt-1 text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-300 focus:outline-none" />
                    </div>
                </div>
                <button onClick={saveConfig} className="text-sm text-indigo-600 hover:underline">Sauvegarder le salaire</button>
            </div>

            {/* Preview */}
            <div className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-xl p-5 space-y-3">
                <p className="text-sm font-semibold opacity-80">Aperçu — {currentMonth}</p>
                <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between"><span className="opacity-70">Salaire de base</span><span className="font-semibold">{base.toFixed(2)} MAD</span></div>
                    <div className="flex justify-between"><span className="opacity-70">Prime</span><span className="font-semibold text-emerald-300">+{bonusAmt.toFixed(2)} MAD</span></div>
                    <div className="flex justify-between"><span className="opacity-70">Déductions absences</span><span className="font-semibold text-rose-300">-{deductions.toFixed(2)} MAD</span></div>
                    <div className="h-px bg-white/20 my-2" />
                    <div className="flex justify-between text-lg font-bold"><span>TOTAL NET</span><span>{total.toFixed(2)} MAD</span></div>
                </div>
                <button onClick={generatePayroll} disabled={generating}
                    className="w-full mt-2 py-2.5 bg-white text-indigo-700 font-bold rounded-xl text-sm hover:bg-indigo-50 transition-colors disabled:opacity-60">
                    {generating ? 'Génération...' : `Générer la paie de ${currentMonth}`}
                </button>
            </div>

            {/* History */}
            {!loadingH && history.length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Historique</p>
                    {history.map(h => (
                        <div key={h.id} className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-4 py-3">
                            <div>
                                <p className="text-sm font-semibold text-gray-800">{h.month}</p>
                                <p className="text-xs text-gray-400">Base {h.baseSalary?.toFixed(0)} + Prime {h.bonus?.toFixed(0)} − Déd. {h.deductions?.toFixed(0)}</p>
                            </div>
                            <span className="text-sm font-bold text-indigo-700">{h.total?.toFixed(2)} MAD</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Documents Panel ─────────────────────────────────────────────────────────

function DocumentsPanel({ employee }) {
    const { uploadImage, uploading } = useImageUpload();
    const [docs, setDocs] = useState(employee.docs || {});
    const [personalInfo, setPersonalInfo] = useState(employee.personalInfo || {});
    const [editingInfo, setEditingInfo] = useState(false);
    const [infoForm, setInfoForm] = useState({
        address: employee.personalInfo?.address || '',
        cnssNumber: employee.personalInfo?.cnssNumber || '',
        emergencyContact: employee.personalInfo?.emergencyContact || '',
        emergencyPhone: employee.personalInfo?.emergencyPhone || '',
        bloodGroup: employee.personalInfo?.bloodGroup || '',
    });
    const [savingInfo, setSavingInfo] = useState(false);

    async function savePersonalInfo() {
        setSavingInfo(true);
        try {
            await updateDoc(doc(db, 'employees', employee.id), { personalInfo: infoForm });
            setPersonalInfo(infoForm);
            setEditingInfo(false);
            toast.success('Informations sauvegardées !');
        } catch { toast.error('Erreur'); } finally { setSavingInfo(false); }
    }

    async function handleUpload(key, file) {
        if (!file) return;
        const url = await uploadImage(file, `employees/${employee.id}/docs/${key}`);
        if (url) {
            const updated = { ...docs, [key]: url };
            setDocs(updated);
            await updateDoc(doc(db, 'employees', employee.id), { docs: updated });
            toast.success('Document uploadé !');
        }
    }

    const requiredDocs = DOC_TYPES.filter(d => d.required);
    const optionalDocs = DOC_TYPES.filter(d => !d.required);
    const completionCount = DOC_TYPES.filter(d => docs[d.key]).length;

    return (
        <div className="space-y-4">
            {/* Completion Banner */}
            <div className={`rounded-xl p-3 flex items-center justify-between ${completionCount === DOC_TYPES.length ? 'bg-emerald-50 border border-emerald-100' : 'bg-amber-50 border border-amber-100'
                }`}>
                <span className="text-sm font-medium text-gray-700">
                    {completionCount}/{DOC_TYPES.length} documents fournis
                </span>
                <div className="flex gap-0.5">
                    {DOC_TYPES.map(d => (
                        <div key={d.key} className={`w-3 h-3 rounded-sm ${docs[d.key] ? 'bg-emerald-500' : d.required ? 'bg-rose-300' : 'bg-gray-200'
                            }`} title={d.label} />
                    ))}
                </div>
            </div>

            {/* Personal Info Section */}
            <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                    <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <Contact className="w-4 h-4 text-emerald-500" /> Informations Personnelles
                    </p>
                    {!editingInfo && (
                        <button onClick={() => setEditingInfo(true)}
                            className="text-xs text-emerald-600 hover:underline flex items-center gap-1">
                            <Edit2 className="w-3 h-3" /> Modifier
                        </button>
                    )}
                </div>
                <div className="p-4">
                    {editingInfo ? (
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { key: 'address', label: 'Adresse complète', icon: Home, full: true },
                                    { key: 'cnssNumber', label: 'N° CNSS', icon: HeartPulse },
                                    { key: 'bloodGroup', label: 'Groupe sanguin', icon: HeartPulse, placeholder: 'ex: A+' },
                                    { key: 'emergencyContact', label: 'Contact urgence', icon: Phone },
                                    { key: 'emergencyPhone', label: 'Tél. urgence', icon: Phone },
                                ].map(({ key, label, full, placeholder }) => (
                                    <div key={key} className={full ? 'col-span-2' : ''}>
                                        <label className="text-xs text-gray-500">{label}</label>
                                        <input type="text" value={infoForm[key]}
                                            onChange={e => setInfoForm(p => ({ ...p, [key]: e.target.value }))}
                                            placeholder={placeholder || ''}
                                            className="block w-full mt-1 text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-emerald-300 focus:outline-none" />
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <button onClick={savePersonalInfo} disabled={savingInfo}
                                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-1.5 disabled:opacity-50">
                                    <Save className="w-3.5 h-3.5" /> Sauvegarder
                                </button>
                                <button onClick={() => setEditingInfo(false)} className="px-4 py-2 border border-gray-200 text-sm rounded-lg hover:bg-gray-50">Annuler</button>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            {[
                                { label: 'Adresse', value: personalInfo.address, full: true },
                                { label: 'N° CNSS', value: personalInfo.cnssNumber },
                                { label: 'Groupe sanguin', value: personalInfo.bloodGroup },
                                { label: 'Contact urgence', value: personalInfo.emergencyContact },
                                { label: 'Tél. urgence', value: personalInfo.emergencyPhone },
                            ].map(({ label, value, full }) => value ? (
                                <div key={label} className={`bg-gray-50 rounded-lg p-3 ${full ? 'col-span-2' : ''}`}>
                                    <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                                    <p className="font-medium text-gray-800 text-xs">{value}</p>
                                </div>
                            ) : null)}
                            {!personalInfo.address && !personalInfo.cnssNumber && (
                                <p className="col-span-2 text-center text-xs text-gray-400 py-2">Aucune information renseignée</p>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Required Documents */}
            <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Documents obligatoires</p>
                {requiredDocs.map(({ key, label, icon: Icon }) => (
                    <div key={key} className="bg-white border border-gray-100 rounded-xl p-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${docs[key] ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-400'
                                }`}>
                                <Icon className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-800">{label}</p>
                                <p className="text-xs text-gray-400">{docs[key] ? '✅ Présent' : '❌ Manquant'}</p>
                            </div>
                        </div>
                        <div className="flex gap-1.5 flex-shrink-0">
                            {docs[key] && <a href={docs[key]} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:underline px-2 py-1.5 border border-indigo-100 rounded-lg">Voir</a>}
                            <label className="cursor-pointer text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 px-2.5 py-1.5 border border-gray-200 rounded-lg flex items-center gap-1">
                                <Upload className="w-3 h-3" />{uploading ? '...' : docs[key] ? 'MAJ' : 'Upload'}
                                <input type="file" accept="image/*,application/pdf" className="hidden" onChange={e => handleUpload(key, e.target.files[0])} disabled={uploading} />
                            </label>
                        </div>
                    </div>
                ))}
            </div>

            {/* Optional Documents */}
            <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Documents complémentaires</p>
                {optionalDocs.map(({ key, label, icon: Icon }) => (
                    <div key={key} className={`bg-white border rounded-xl p-3 flex items-center justify-between gap-3 ${docs[key] ? 'border-emerald-100' : 'border-gray-100'
                        }`}>
                        <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${docs[key] ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'
                                }`}>
                                <Icon className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-800">{label}</p>
                                <p className="text-xs text-gray-400">{docs[key] ? '✅ Présent' : 'Non fourni'}</p>
                            </div>
                        </div>
                        <div className="flex gap-1.5 flex-shrink-0">
                            {docs[key] && <a href={docs[key]} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:underline px-2 py-1.5 border border-indigo-100 rounded-lg">Voir</a>}
                            <label className="cursor-pointer text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 px-2.5 py-1.5 border border-gray-200 rounded-lg flex items-center gap-1">
                                <Upload className="w-3 h-3" />{uploading ? '...' : docs[key] ? 'MAJ' : 'Upload'}
                                <input type="file" accept="image/*,application/pdf" className="hidden" onChange={e => handleUpload(key, e.target.files[0])} disabled={uploading} />
                            </label>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Employee Card ────────────────────────────────────────────────────────────

const EMP_SUBTABS = [
    { key: 'info', label: 'Profil', icon: Briefcase },
    { key: 'presence', label: 'Présence', icon: Calendar },
    { key: 'paie', label: 'Paie', icon: Wallet },
    { key: 'docs', label: 'Documents', icon: FileText },
];

function EmployeeCard({ employee, onUpdate }) {
    const [expanded, setExpanded] = useState(false);
    const [subTab, setSubTab] = useState('info');
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({
        name: employee.name, phone: employee.phone || '', city: employee.city || '',
        department: employee.department || 'Vente', contractType: employee.contractType || 'CDI',
        startDate: employee.startDate || '', position: employee.position || '',
    });
    const [saving, setSaving] = useState(false);
    const score = employee.performance_score ?? 100;

    async function saveEdit() {
        setSaving(true);
        try {
            await updateDoc(doc(db, 'employees', employee.id), form);
            onUpdate(employee.id, form);
            setEditing(false);
            toast.success('Profil mis à jour !');
        } catch { toast.error('Erreur'); } finally { setSaving(false); }
    }

    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <button className="w-full text-left p-4 flex items-center gap-3" onClick={() => setExpanded(e => !e)}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0 bg-gradient-to-br from-emerald-500 to-teal-500">
                    {(employee.name || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900 truncate">{employee.name}</p>
                        <PerfBadge score={score} />
                        {employee.contractType && <ContractBadge type={employee.contractType} />}
                    </div>
                    <p className="text-xs text-gray-400 truncate">
                        {employee.position || employee.department || '—'} · {employee.phone}
                    </p>
                </div>
                {expanded ? <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />}
            </button>

            <AnimatePresence>
                {expanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} className="overflow-hidden">
                        {/* Sub-tabs nav */}
                        <div className="flex gap-0 border-t border-gray-100">
                            {EMP_SUBTABS.map(({ key, label, icon: Icon }) => (
                                <button key={key} onClick={() => setSubTab(key)}
                                    className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium border-b-2 transition-colors ${subTab === key ? 'border-emerald-500 text-emerald-600 bg-emerald-50/60' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                                    <Icon className="w-4 h-4" />
                                    <span className="hidden sm:block">{label}</span>
                                </button>
                            ))}
                        </div>

                        <div className="p-4">
                            {subTab === 'info' && (
                                <div className="space-y-4">
                                    {editing ? (
                                        <div className="space-y-3">
                                            <div className="grid grid-cols-2 gap-3">
                                                {[
                                                    { key: 'name', label: 'Nom complet' },
                                                    { key: 'phone', label: 'Téléphone' },
                                                    { key: 'city', label: 'Ville' },
                                                    { key: 'position', label: 'Poste' },
                                                ].map(({ key, label }) => (
                                                    <div key={key}>
                                                        <label className="text-xs text-gray-500">{label}</label>
                                                        <input type="text" value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                                                            className="block w-full mt-1 text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-emerald-300 focus:outline-none" />
                                                    </div>
                                                ))}
                                                <div>
                                                    <label className="text-xs text-gray-500">Département</label>
                                                    <select value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))}
                                                        className="block w-full mt-1 text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-emerald-300 focus:outline-none">
                                                        {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-xs text-gray-500">Type de contrat</label>
                                                    <select value={form.contractType} onChange={e => setForm(p => ({ ...p, contractType: e.target.value }))}
                                                        className="block w-full mt-1 text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-emerald-300 focus:outline-none">
                                                        {CONTRACT_TYPES.map(c => <option key={c}>{c}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-xs text-gray-500">Date d'embauche</label>
                                                    <input type="date" value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))}
                                                        className="block w-full mt-1 text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-emerald-300 focus:outline-none" />
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={saveEdit} disabled={saving}
                                                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5">
                                                    <Save className="w-4 h-4" /> Sauvegarder
                                                </button>
                                                <button onClick={() => setEditing(false)} className="px-4 py-2 border border-gray-200 text-sm rounded-lg hover:bg-gray-50">Annuler</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <div className="grid grid-cols-2 gap-3 text-sm">
                                                <div className="bg-gray-50 rounded-lg p-3">
                                                    <p className="text-xs text-gray-400 mb-0.5">Poste</p>
                                                    <p className="font-medium text-gray-800">{employee.position || '—'}</p>
                                                </div>
                                                <div className="bg-gray-50 rounded-lg p-3">
                                                    <p className="text-xs text-gray-400 mb-0.5">Département</p>
                                                    <p className="font-medium text-gray-800">{employee.department || '—'}</p>
                                                </div>
                                                <div className="bg-gray-50 rounded-lg p-3">
                                                    <p className="text-xs text-gray-400 mb-0.5">Contrat</p>
                                                    <ContractBadge type={employee.contractType || 'CDI'} />
                                                </div>
                                                <div className="bg-gray-50 rounded-lg p-3">
                                                    <p className="text-xs text-gray-400 mb-0.5">Embauche</p>
                                                    <p className="font-medium text-gray-800">{employee.startDate || '—'}</p>
                                                </div>
                                                <div className="bg-gray-50 rounded-lg p-3">
                                                    <p className="text-xs text-gray-400 mb-0.5">Téléphone</p>
                                                    <p className="font-medium text-gray-800">{employee.phone || '—'}</p>
                                                </div>
                                                <div className="bg-gray-50 rounded-lg p-3">
                                                    <p className="text-xs text-gray-400 mb-0.5">Ville</p>
                                                    <p className="font-medium text-gray-800">{employee.city || '—'}</p>
                                                </div>
                                            </div>
                                            <button onClick={() => setEditing(true)}
                                                className="flex items-center gap-1.5 text-sm text-emerald-600 hover:underline">
                                                <Edit2 className="w-3.5 h-3.5" /> Modifier le profil
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                            {subTab === 'presence' && <PresencePanel employeeId={employee.id} />}
                            {subTab === 'paie' && <PayrollPanel employee={employee} />}
                            {subTab === 'docs' && <DocumentsPanel employee={employee} />}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ─── New Employee Modal ───────────────────────────────────────────────────────

function NewEmployeeModal({ storeId, onCreated, onClose }) {
    const [form, setForm] = useState({
        name: '', phone: '', city: '', department: 'Vente',
        contractType: 'CDI', position: '', startDate: new Date().toISOString().split('T')[0]
    });
    const [saving, setSaving] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        if (!form.name.trim()) return;
        setSaving(true);
        try {
            const id = crypto.randomUUID();
            const emp = {
                ...form, storeId, status: 'active', performance_score: 100,
                baseSalary: 0, docs: {}, createdAt: serverTimestamp()
            };
            await setDoc(doc(db, 'employees', id), emp);
            onCreated({ id, ...emp });
            toast.success(`${form.name} ajouté(e) à l'équipe !`);
            onClose();
        } catch { toast.error('Erreur'); } finally { setSaving(false); }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
                className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <UserPlus className="w-5 h-5 text-emerald-600" /> Nouvel Employé
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="text-xs font-medium text-gray-600">Nom complet *</label>
                            <input type="text" required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Prénom Nom"
                                className="block w-full mt-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-300 focus:outline-none" />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-600">Poste / Rôle</label>
                            <input type="text" value={form.position} onChange={e => setForm(p => ({ ...p, position: e.target.value }))} placeholder="ex: Vendeuse"
                                className="block w-full mt-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-300 focus:outline-none" />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-600">Département</label>
                            <select value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))}
                                className="block w-full mt-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-300 focus:outline-none">
                                {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-600">Téléphone</label>
                            <input type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+212 6..."
                                className="block w-full mt-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-300 focus:outline-none" />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-600">Ville</label>
                            <input type="text" value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} placeholder="Casablanca"
                                className="block w-full mt-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-300 focus:outline-none" />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-600">Type de contrat</label>
                            <select value={form.contractType} onChange={e => setForm(p => ({ ...p, contractType: e.target.value }))}
                                className="block w-full mt-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-300 focus:outline-none">
                                {CONTRACT_TYPES.map(c => <option key={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-600">Date d'embauche</label>
                            <input type="date" value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))}
                                className="block w-full mt-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-300 focus:outline-none" />
                        </div>
                    </div>
                    <button type="submit" disabled={saving}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-colors disabled:opacity-50">
                        {saving ? 'Ajout en cours...' : 'Ajouter à l\'équipe'}
                    </button>
                </form>
            </motion.div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const MAIN_TABS = [
    { key: 'team', label: 'Équipe', icon: Users },
    { key: 'stats', label: 'Statistiques', icon: TrendingUp },
];

export default function HR() {
    const { store } = useTenant();
    const [tab, setTab] = useState('team');
    const [tabDir, setTabDir] = useState(1);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [search, setSearch] = useState('');
    const [deptFilter, setDeptFilter] = useState('all');

    const switchTab = (newTab) => {
        const oldIdx = MAIN_TABS.findIndex(t => t.key === tab);
        const newIdx = MAIN_TABS.findIndex(t => t.key === newTab);
        setTabDir(newIdx >= oldIdx ? 1 : -1);
        setTab(newTab);
    };

    useEffect(() => {
        if (!store?.id) return;
        loadEmployees();
    }, [store?.id]);

    async function loadEmployees() {
        setLoading(true);
        try {
            const q = query(collection(db, 'employees'), where('storeId', '==', store.id), where('status', '==', 'active'));
            const snap = await getDocs(q);
            setEmployees(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) {
            console.error(e);
            toast.error('Erreur de chargement');
        } finally {
            setLoading(false);
        }
    }

    function handleCreated(emp) {
        setEmployees(prev => [emp, ...prev]);
    }

    function handleUpdate(id, updates) {
        setEmployees(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
    }

    const filtered = useMemo(() => {
        let list = employees;
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(e => (e.name || '').toLowerCase().includes(q) || (e.position || '').toLowerCase().includes(q));
        }
        if (deptFilter !== 'all') {
            list = list.filter(e => e.department === deptFilter);
        }
        return list;
    }, [employees, search, deptFilter]);

    // Stats derived from employees
    const totalPayroll = employees.reduce((s, e) => s + (parseFloat(e.baseSalary) || 0), 0);
    const avgScore = employees.length > 0
        ? Math.round(employees.reduce((s, e) => s + (e.performance_score ?? 100), 0) / employees.length)
        : 100;
    const deptCounts = employees.reduce((acc, e) => { acc[e.department || 'Autre'] = (acc[e.department || 'Autre'] || 0) + 1; return acc; }, {});

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Users className="h-6 w-6 text-emerald-600" />
                        Ressources Humaines
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Équipe · Contrats · Présence · Paie · Documents</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={loadEmployees} className="text-gray-400 hover:text-emerald-600 transition-colors" title="Actualiser">
                        <RefreshCcw className="h-5 w-5" />
                    </button>
                    <button onClick={() => setShowModal(true)}
                        className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-3 py-2 rounded-xl transition-colors">
                        <UserPlus className="w-4 h-4" /> Nouvel Employé
                    </button>
                </div>
            </div>

            {/* KPI Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
                    <p className="text-2xl font-bold text-emerald-700">{employees.length}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Effectif total</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
                    <p className="text-2xl font-bold text-indigo-700">{avgScore}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Score moyen</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
                    <p className="text-2xl font-bold text-violet-700">{Object.keys(deptCounts).length}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Départements</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
                    <p className="text-lg font-bold text-amber-700">{totalPayroll.toLocaleString('fr-MA')}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Masse salariale (MAD)</p>
                </div>
            </div>

            {/* Main Tabs */}
            <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
                {MAIN_TABS.map(({ key, label, icon: Icon }) => (
                    <button key={key} onClick={() => switchTab(key)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold rounded-lg transition-all ${tab === key ? 'bg-white shadow-sm text-emerald-700' : 'text-gray-600 hover:text-gray-800'}`}>
                        <Icon className="h-4 w-4" /> {label}
                    </button>
                ))}
            </div>

            {/* Animated Content */}
            <AnimatePresence mode="wait" custom={tabDir}>
                <motion.div key={tab} custom={tabDir} variants={tabVariants}
                    initial="enter" animate="center" exit="exit"
                    transition={{ duration: 0.22, ease: 'easeInOut' }}>

                    {tab === 'team' && (
                        <div className="space-y-4">
                            {/* Filters */}
                            <div className="flex flex-col sm:flex-row gap-3">
                                <div className="relative flex-1 max-w-sm">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input type="text" placeholder="Rechercher nom, poste…" value={search} onChange={e => setSearch(e.target.value)}
                                        className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                                    {search && <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"><X className="w-3.5 h-3.5" /></button>}
                                </div>
                                <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
                                    className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300">
                                    <option value="all">Tous les départements</option>
                                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>

                            {loading ? (
                                <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="bg-white rounded-xl border border-gray-100 h-16 animate-pulse" />)}</div>
                            ) : filtered.length === 0 ? (
                                <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-200">
                                    <Users className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                                    <p className="text-gray-500 mb-2">{search || deptFilter !== 'all' ? 'Aucun résultat pour ces filtres' : 'Aucun employé actif'}</p>
                                    <button onClick={() => setShowModal(true)} className="text-sm text-emerald-600 underline flex items-center gap-1 mx-auto">
                                        <UserPlus className="w-4 h-4" /> Ajouter le premier employé
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {filtered.map(emp => <EmployeeCard key={emp.id} employee={emp} onUpdate={handleUpdate} />)}
                                </div>
                            )}
                        </div>
                    )}

                    {tab === 'stats' && (
                        <div className="space-y-4">
                            {/* Department breakdown */}
                            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                    <Briefcase className="w-4 h-4 text-emerald-600" /> Répartition par département
                                </h3>
                                {Object.keys(deptCounts).length === 0 ? (
                                    <p className="text-center text-gray-400 py-6 text-sm">Aucune donnée</p>
                                ) : (
                                    <div className="space-y-3">
                                        {Object.entries(deptCounts).sort((a, b) => b[1] - a[1]).map(([dept, count]) => (
                                            <div key={dept}>
                                                <div className="flex justify-between text-sm mb-1">
                                                    <span className="font-medium text-gray-700">{dept}</span>
                                                    <span className="text-gray-500">{count} employé{count > 1 ? 's' : ''}</span>
                                                </div>
                                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                    <div className="h-full bg-emerald-500 rounded-full transition-all"
                                                        style={{ width: `${(count / employees.length) * 100}%` }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Contract type breakdown */}
                            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-emerald-600" /> Types de contrats
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {CONTRACT_TYPES.map(type => {
                                        const count = employees.filter(e => (e.contractType || 'CDI') === type).length;
                                        return count > 0 ? (
                                            <div key={type} className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">
                                                <ContractBadge type={type} />
                                                <span className="font-bold text-gray-700 text-sm">{count}</span>
                                            </div>
                                        ) : null;
                                    })}
                                </div>
                            </div>

                            {/* Performance scoreboard */}
                            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                    <Award className="w-4 h-4 text-emerald-600" /> Classement Performance
                                </h3>
                                <div className="space-y-2">
                                    {[...employees].sort((a, b) => (b.performance_score ?? 100) - (a.performance_score ?? 100)).map((e, i) => (
                                        <div key={e.id} className="flex items-center gap-3 text-sm">
                                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-gray-100 text-gray-600' : 'bg-orange-50 text-orange-600'}`}>
                                                {i + 1}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-medium text-gray-800 truncate">{e.name}</span>
                                                    <PerfBadge score={e.performance_score ?? 100} />
                                                </div>
                                                <span className="text-xs text-gray-400">{e.position || e.department || '—'}</span>
                                            </div>
                                            <span className="font-bold text-indigo-700 flex-shrink-0">{e.performance_score ?? 100}</span>
                                        </div>
                                    ))}
                                    {employees.length === 0 && <p className="text-center text-gray-400 text-sm py-4">Aucun employé</p>}
                                </div>
                            </div>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>

            {/* New Employee Modal */}
            <AnimatePresence>
                {showModal && (
                    <NewEmployeeModal
                        storeId={store?.id}
                        onCreated={handleCreated}
                        onClose={() => setShowModal(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
