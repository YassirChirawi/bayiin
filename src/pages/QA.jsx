import { useState, useEffect, useRef, useCallback } from "react";
import { useTenant } from "../context/TenantContext";
import { useSearchParams } from "react-router-dom";
import { QA_MODULES } from "../data/qaTests";
import { collection, addDoc, getDoc, setDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import {
    ShieldCheck, ChevronDown, ChevronUp, CheckCircle2, XCircle,
    AlertCircle, Save, RotateCcw, FileText, ExternalLink,
    Database, Star, Bug, Zap, CheckCheck, Filter, Gift, Copy, Trophy
} from "lucide-react";
import { toast } from "react-hot-toast";
import Button from "../components/Button";
import { vibrate } from "../utils/haptics";

export default function QA() {
    const { store: currentStore } = useTenant();
    const [searchParams] = useSearchParams();
    const adminStoreId = searchParams.get('storeId');
    const targetStoreId = adminStoreId || currentStore?.id;
    const isReadOnly = !!adminStoreId;

    const [results, setResults] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [autoSaved, setAutoSaved] = useState(false);
    const [expandedModules, setExpandedModules] = useState([QA_MODULES[0].id]);
    const [statusFilter, setStatusFilter] = useState('all');
    const [rewardCode, setRewardCode] = useState(null);
    const [claiming, setClaiming] = useState(false);
    const [showRewardModal, setShowRewardModal] = useState(false);
    const saveTimerRef = useRef(null);

    useEffect(() => {
        if (!targetStoreId) return;
        const fetchResults = async () => {
            try {
                const snap = await getDoc(doc(db, "stores", targetStoreId, "qa_runs", "current"));
                if (snap.exists()) {
                    setResults(snap.data().tests || {});
                }
            } catch (e) {
                console.error("Error fetching QA results:", e);
            } finally {
                setLoading(false);
            }
        };
        fetchResults();
    }, [targetStoreId]);

    const toggleModule = (id) => {
        setExpandedModules(prev =>
            prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
        );
    };

    // ── Autosave (debounce 3s) ──────────────────────────────────────────────
    const doSave = useCallback(async (data) => {
        if (isReadOnly || !targetStoreId) return;
        try {
            await setDoc(doc(db, "stores", targetStoreId, "qa_runs", "current"), {
                tests: data,
                updatedAt: serverTimestamp(),
                testerId: currentStore?.ownerId || 'admin'
            });
            setAutoSaved(true);
            setTimeout(() => setAutoSaved(false), 2000);
        } catch (e) { console.error('autosave', e); }
    }, [isReadOnly, targetStoreId, currentStore]);

    const scheduleAutosave = useCallback((data) => {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => doSave(data), 3000);
    }, [doSave]);

    const patchResults = (newResults) => {
        setResults(newResults);
        if (!isReadOnly) scheduleAutosave(newResults);
    };

    // ── Test mutations ──────────────────────────────────────────────────────
    const updateTest = (testId, status) => {
        if (isReadOnly) return;
        const comment = results[testId]?.comment || "";
        if (status === 'ok' && comment.trim().length < 5) {
            toast.error("Ajoutez une preuve (min 5 car.) avant de valider !");
            vibrate('error'); return;
        }
        patchResults({ ...results, [testId]: { ...(results[testId] || {}), status, timestamp: new Date().toISOString() } });
        vibrate('soft');
    };

    const updateComment = (testId, comment) => {
        if (isReadOnly) return;
        patchResults({ ...results, [testId]: { ...(results[testId] || {}), comment, timestamp: new Date().toISOString() } });
    };

    const updateBug = (testId, bugDescription) => {
        if (isReadOnly) return;
        patchResults({ ...results, [testId]: { ...(results[testId] || {}), bugDescription, timestamp: new Date().toISOString() } });
    };

    const updateRating = (testId, rating) => {
        if (isReadOnly) return;
        patchResults({ ...results, [testId]: { ...(results[testId] || {}), uxRating: rating, timestamp: new Date().toISOString() } });
        vibrate('soft');
    };

    const validateModule = (moduleTests) => {
        if (isReadOnly) return;
        const unproven = moduleTests.filter(t => !(results[t.id]?.comment?.trim().length >= 5));
        if (unproven.length > 0) {
            toast.error(`${unproven.length} test(s) n'ont pas encore de preuve. Remplissez d'abord les commentaires.`);
            vibrate('error'); return;
        }
        const patch = { ...results };
        moduleTests.forEach(t => {
            patch[t.id] = { ...(patch[t.id] || {}), status: 'ok', timestamp: new Date().toISOString() };
        });
        patchResults(patch);
        toast.success('Module entier validé ✅');
        vibrate('success');
    };

    const handleSave = async () => {
        if (isReadOnly || !targetStoreId) return;
        setSaving(true);
        try {
            await setDoc(doc(db, "stores", targetStoreId, "qa_runs", "current"), {
                tests: results,
                updatedAt: serverTimestamp(),
                testerId: currentStore?.ownerId || 'admin'
            });
            toast.success('Progression QA sauvegardée !');
            vibrate('success');
        } catch (e) {
            toast.error('Erreur lors de la sauvegarde');
            vibrate('error');
        } finally {
            setSaving(false);
        }
    };

    const [seeding, setSeeding] = useState(false);
    const seedDemoData = async () => {
        if (isReadOnly) return;
        if (!targetStoreId || !window.confirm("Voulez-vous peupler la boutique avec des données de test (Produits & Clients) ?")) return;
        setSeeding(true);
        try {
            // Seed Products
            const products = [
                { name: "Sérum Vitamine C", category: "Soins Visage", price: 250, costPrice: 120, stock: 50, description: "Sérum éclat haute concentration" },
                { name: "Crème Hydratante", category: "Soins Visage", price: 180, costPrice: 80, stock: 100, description: "Hydratation intense 24h" },
                { name: "Huile d'Argan Bio", category: "Corps", price: 150, costPrice: 60, stock: 30, description: "Huile pure 100% naturelle" },
                { name: "Shampoing solide", category: "Cheveux", price: 90, costPrice: 35, stock: 75, description: "Shampoing écologique sans sulfates" }
            ];

            for (const p of products) {
                await addDoc(collection(db, "products"), {
                    ...p,
                    storeId: targetStoreId,
                    isVariable: false,
                    photoUrl: "",
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });
            }

            // Seed Customers
            const customers = [
                { name: "Yassir Chirawi", phone: "+212600000001", email: "yassir@example.com", city: "Casablanca", totalSpent: 0, orderCount: 0 },
                { name: "Amine Bennani", phone: "+212600000002", email: "amine@example.com", city: "Rabat", totalSpent: 0, orderCount: 0 },
                { name: "Sara El Fassi", phone: "+212600000003", email: "sara@example.com", city: "Marrakech", totalSpent: 0, orderCount: 0 }
            ];

            for (const c of customers) {
                await addDoc(collection(db, "customers"), {
                    ...c,
                    storeId: targetStoreId,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });
            }

            // Seed Orders (Last 7 days)
            const orderStatuses = ['livré', 'livré', 'retour', 'annulé', 'confirmation', 'reçu'];
            for (let i = 0; i < 15; i++) {
                const status = orderStatuses[i % orderStatuses.length];
                const date = new Date();
                date.setDate(date.getDate() - (i % 7)); // Spread over 7 days
                
                await addDoc(collection(db, "orders"), {
                    storeId: targetStoreId,
                    customerName: customers[i % customers.length].name,
                    customerPhone: customers[i % customers.length].phone,
                    price: 150 + (i * 20),
                    quantity: 1,
                    status: status,
                    city: customers[i % customers.length].city,
                    createdAt: date,
                    updatedAt: date,
                    statusHistory: [{ status, timestamp: date.toISOString(), note: "Auto-généré pour test" }]
                });
            }

            // Seed Expenses
            const expenses = [
                { label: "Publicité Facebook", amount: 500, category: "Marketing", date: new Date() },
                { label: "Loyer Bureau", amount: 2000, category: "Fixe", date: new Date() },
                { label: "Achat Emballages", amount: 350, category: "Logistique", date: new Date() }
            ];

            for (const e of expenses) {
                await addDoc(collection(db, "expenses"), {
                    ...e,
                    storeId: targetStoreId,
                    createdAt: serverTimestamp()
                });
            }


            toast.success("Toute la plateforme a été peuplée avec succès !");
            vibrate('success');
        } catch (e) {
            console.error(e);
            toast.error("Erreur lors de l'ajout des données");
        } finally {
            setSeeding(false);
        }
    };

    const calculateProgress = () => {
        const totalTests = QA_MODULES.reduce((acc, mod) => acc + mod.tests.length, 0);
        const completedTests = Object.values(results).filter(r => r.status === 'ok').length;
        return {
            percent: Math.round((completedTests / totalTests) * 100) || 0,
            completed: completedTests,
            total: totalTests
        };
    };

    // ── Reward Claim with Anti-Cheat ─────────────────────────────────────────
    const claimReward = async () => {
        const progress = calculateProgress();
        const MIN_PERCENT = 80;
        const MIN_SPAN_MINUTES = 20;
        const MIN_COMMENT_LEN = 5;

        // 1. Min completion
        if (progress.percent < MIN_PERCENT) {
            toast.error(`Vous devez valider au moins ${MIN_PERCENT}% des tests (${Math.ceil(progress.total * MIN_PERCENT / 100)} tests).`);
            return;
        }

        // 2. All completed tests must have real proofs
        const validatedEntries = Object.entries(results).filter(([, r]) => r.status === 'ok');
        const noProof = validatedEntries.filter(([, r]) => !r.comment || r.comment.trim().length < MIN_COMMENT_LEN);
        if (noProof.length > 0) {
            toast.error(`${noProof.length} test(s) validé(s) sans preuve suffisante. Vérifiez vos commentaires.`);
            return;
        }

        // 3. Time span anti-cheat: first → last timestamp must be > MIN_SPAN_MINUTES
        const timestamps = validatedEntries
            .map(([, r]) => r.timestamp ? new Date(r.timestamp).getTime() : null)
            .filter(Boolean);
        if (timestamps.length > 1) {
            const spanMs = Math.max(...timestamps) - Math.min(...timestamps);
            const spanMin = spanMs / 60000;
            if (spanMin < MIN_SPAN_MINUTES) {
                toast.error(`Tests complétés trop rapidement (${Math.round(spanMin)} min). Les tests doivent être réellement effectués sur au moins ${MIN_SPAN_MINUTES} minutes.`);
                return;
            }
        }

        // 4. Check if already claimed
        const existingDoc = await getDoc(doc(db, 'promo_codes', targetStoreId));
        if (existingDoc.exists()) {
            const existing = existingDoc.data();
            setRewardCode(existing.code);
            setShowRewardModal(true);
            toast.success('Votre code existe déjà !');
            return;
        }

        // 5. Generate unique code and save
        setClaiming(true);
        try {
            const seg = () => Math.random().toString(36).substring(2, 6).toUpperCase();
            const code = `BETA-${seg()}-${seg()}`;
            const expiresAt = new Date();
            expiresAt.setMonth(expiresAt.getMonth() + 3); // 3 months to use it

            await setDoc(doc(db, 'promo_codes', targetStoreId), {
                code,
                storeId: targetStoreId,
                storeName: currentStore?.name || 'Inconnu',
                testerId: currentStore?.ownerId || 'unknown',
                completedTests: progress.completed,
                totalTests: progress.total,
                createdAt: serverTimestamp(),
                expiresAt: expiresAt.toISOString(),
                used: false,
                rewardType: '1_month_free',
            });

            setRewardCode(code);
            setShowRewardModal(true);
            vibrate('success');
            toast.success('🎉 Code généré avec succès !');
        } catch (e) {
            console.error(e);
            toast.error('Erreur lors de la génération du code.');
        } finally {
            setClaiming(false);
        }
    };

    if (loading) return <div className="flex justify-center p-20"><RotateCcw className="animate-spin text-indigo-600" /></div>;

    const progress = calculateProgress();

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-20">

            {/* 🎉 Reward Modal */}
            {showRewardModal && rewardCode && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50 opacity-60" />
                        <div className="relative z-10">
                            <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-200">
                                <Trophy className="w-10 h-10 text-white" />
                            </div>
                            <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Félicitations ! 🎉</h2>
                            <p className="text-gray-500 mb-6">Vous avez complété la recette QA BayIIn. Voici votre code pour <strong>1 mois gratuit</strong> :</p>

                            <div className="bg-gray-900 rounded-2xl p-5 mb-6">
                                <p className="text-3xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">{rewardCode}</p>
                                <p className="text-gray-500 text-xs mt-2">Valable 3 mois — à communiquer au support BayIIn</p>
                            </div>

                            <button
                                onClick={() => { navigator.clipboard.writeText(rewardCode); toast.success('Code copié !'); }}
                                className="flex items-center gap-2 mx-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-colors mb-4"
                            >
                                <Copy className="w-4 h-4" /> Copier le code
                            </button>

                            <a
                                href={`https://wa.me/212600000000?text=Bonjour%20BayIIn%2C%20voici%20mon%20code%20beta%20testeur%20%3A%20${rewardCode}`}
                                target="_blank" rel="noopener noreferrer"
                                className="block text-sm text-green-600 font-bold hover:underline mb-4"
                            >
                                📱 Envoyer par WhatsApp au support
                            </a>

                            <button onClick={() => setShowRewardModal(false)} className="text-xs text-gray-400 hover:text-gray-600">
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Header Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                    <ShieldCheck size={120} className="text-indigo-600" />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                                Mode Testeur Actif
                            </span>
                        </div>
                        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
                            <ShieldCheck className="text-indigo-600 h-8 w-8" />
                            Recette QA BayIIn
                        </h1>
                        <p className="mt-2 text-gray-500 max-w-xl">
                            Validation exhaustive de la plateforme avant mise en production. 
                            Cochez chaque module pour garantir une expérience utilisateur sans faille.
                        </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <div className="text-right">
                            <p className="text-sm font-bold text-gray-400 uppercase">Progression Globale</p>
                            <p className={`text-4xl font-black ${progress.percent >= 80 ? 'text-green-600' : 'text-indigo-600'}`}>{progress.percent}%</p>
                            <p className="text-xs text-gray-400 mt-1">{progress.completed} / {progress.total} tests validés</p>
                        </div>
                        <div className="w-48 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full transition-all duration-500 ${progress.percent >= 80 ? 'bg-green-500' : 'bg-indigo-600'}`} style={{ width: `${progress.percent}%` }} />
                        </div>
                        {autoSaved && <span className="text-[10px] text-green-500 font-bold animate-pulse">💾 Sauvegardé auto</span>}
                        {/* Claim button when 80%+ */}
                        {!isReadOnly && progress.percent >= 80 && (
                            <button
                                onClick={claimReward}
                                disabled={claiming}
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-amber-200 transition-all hover:-translate-y-0.5 disabled:opacity-60"
                            >
                                {claiming ? <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : <Gift className="w-4 h-4" />}
                                Réclamer mon mois gratuit
                            </button>
                        )}
                    </div>
                </div>

                {/* Status Filter */}
                <div className="mt-6 flex flex-wrap gap-2 pt-5 border-t border-gray-100">
                    <span className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1 mr-2"><Filter size={12}/> Filtrer :</span>
                    {[['all','Tous','bg-gray-100 text-gray-700'],['pending','À faire','bg-indigo-100 text-indigo-700'],['fail','Échoués','bg-red-100 text-red-700'],['ok','Validés','bg-green-100 text-green-700']].map(([val,label,cls]) => (
                        <button key={val} onClick={() => setStatusFilter(val)}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${statusFilter === val ? cls + ' ring-2 ring-offset-1 ring-current' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>
                            {label}
                        </button>
                    ))}
                    <div className="ml-auto flex gap-2">
                        {!isReadOnly && (
                            <>
                                <Button onClick={handleSave} isLoading={saving} icon={Save} size="sm">Sauvegarder</Button>
                                <Button onClick={seedDemoData} isLoading={seeding} icon={Database} size="sm" className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100">Données Démo</Button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Modules List */}
            <div className="space-y-4">
                {QA_MODULES.map((module) => {
                    const isExpanded = expandedModules.includes(module.id);
                    const allModuleTests = module.tests;
                    // Apply filter
                    const moduleTests = statusFilter === 'all'
                        ? allModuleTests
                        : allModuleTests.filter(t => (results[t.id]?.status || 'pending') === statusFilter);
                    if (statusFilter !== 'all' && moduleTests.length === 0) return null;
                    const completedInModule = allModuleTests.filter(t => results[t.id]?.status === 'ok').length;
                    const failedInModule = allModuleTests.filter(t => results[t.id]?.status === 'fail').length;
                    const isModuleComplete = completedInModule === allModuleTests.length;

                    return (
                        <div 
                            key={module.id} 
                            className={`bg-white rounded-xl border transition-all duration-200 overflow-hidden ${isExpanded ? 'shadow-md border-indigo-200 ring-1 ring-indigo-50' : 'border-gray-100'}`}
                        >
                            <button 
                                onClick={() => toggleModule(module.id)}
                                className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`p-2 rounded-lg ${isModuleComplete ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                                        <CheckCircle2 size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900">{module.name}</h3>
                                        <p className="text-xs text-gray-500">{module.description}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="hidden sm:flex items-center gap-3 text-xs font-bold">
                                        <span className="text-green-600">{completedInModule}✅</span>
                                        {failedInModule > 0 && <span className="text-red-500">{failedInModule}❌</span>}
                                        <span className="text-gray-400">/ {allModuleTests.length}</span>
                                    </div>
                                    {!isReadOnly && isExpanded && (
                                        <button onClick={(e) => { e.stopPropagation(); validateModule(allModuleTests); }}
                                            className="hidden sm:flex items-center gap-1 text-[10px] font-bold px-2 py-1 bg-green-50 text-green-700 rounded-lg border border-green-200 hover:bg-green-100 transition-colors">
                                            <CheckCheck size={12}/> Tout valider
                                        </button>
                                    )}
                                    {isExpanded ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                                </div>
                            </button>

                            {isExpanded && (
                                <div className="border-t border-gray-50 bg-white">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="bg-gray-50/50 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">
                                                    <th className="px-6 py-3">ID</th>
                                                    <th className="px-6 py-3">Cas de Test & Étapes</th>
                                                    <th className="px-6 py-3">Résultat Attendu</th>
                                                    <th className="px-6 py-3 text-center">Expérience (UX)</th>
                                                    <th className="px-6 py-3 text-center">Sévérité</th>
                                                    <th className="px-6 py-3 text-center">Statut</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {module.tests.map((test) => {
                                                    const status = results[test.id]?.status || 'pending';
                                                    const uxRating = results[test.id]?.uxRating || 0;
                                                    return (
                                                        <tr key={test.id} className={`group hover:bg-gray-50/50 transition-colors ${status === 'ok' ? 'opacity-60' : ''} ${status === 'fail' ? 'bg-red-50/30' : ''}`}>
                                                            <td className="px-6 py-4 text-xs font-mono font-bold text-gray-400">{test.id}</td>
                                                            <td className="px-6 py-4">
                                                                <p className="text-sm font-bold text-gray-900">{test.task}</p>
                                                                {test.steps && (
                                                                    <div className="mt-2 space-y-1">
                                                                        {test.steps.map((step, idx) => (
                                                                            <p key={idx} className="text-[10px] text-gray-500 flex items-center gap-1.5">
                                                                                <span className="w-4 h-4 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-[8px] font-bold">{idx + 1}</span>
                                                                                {step}
                                                                            </p>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                                <div className="mt-3 space-y-2">
                                                                    <textarea
                                                                        placeholder="✏️ Preuve de test (min 5 car.) — ex: J'ai cliqué sur X et vu Y..."
                                                                        className="w-full text-xs p-2 border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:ring-1 focus:ring-indigo-300 transition-all resize-none"
                                                                        rows={2}
                                                                        value={results[test.id]?.comment || ""}
                                                                        readOnly={isReadOnly}
                                                                        onChange={(e) => updateComment(test.id, e.target.value)}
                                                                    />
                                                                    {status === 'fail' && (
                                                                        <textarea
                                                                            placeholder="🐛 Description du bug — comportement observé, étapes pour reproduire..."
                                                                            className="w-full text-xs p-2 border border-red-200 rounded-lg bg-red-50 focus:bg-white focus:ring-1 focus:ring-red-300 transition-all resize-none"
                                                                            rows={2}
                                                                            value={results[test.id]?.bugDescription || ""}
                                                                            readOnly={isReadOnly}
                                                                            onChange={(e) => updateBug(test.id, e.target.value)}
                                                                        />
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 text-sm text-gray-500 italic max-w-xs">{test.expected}</td>
                                                            <td className="px-6 py-4">
                                                                <div className="flex flex-col items-center gap-1">
                                                                    <div className="flex gap-0.5">
                                                                        {[1, 2, 3, 4, 5].map((star) => (
                                                                            <button
                                                                                key={star}
                                                                                onClick={() => !isReadOnly && updateRating(test.id, star)}
                                                                                className={`p-0.5 transition-colors ${uxRating >= star ? 'text-amber-400' : 'text-gray-200 hover:text-amber-200'}`}
                                                                            >
                                                                                <Star size={16} fill={uxRating >= star ? "currentColor" : "none"} />
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">UX Rating</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                                                    test.severity === 'Critique' ? 'bg-red-50 text-red-600' :
                                                                    test.severity === 'Majeur' ? 'bg-amber-50 text-amber-600' :
                                                                    'bg-green-50 text-green-600'
                                                                }`}>
                                                                    {test.severity}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <div className="flex justify-center gap-2">
                                                                    <button 
                                                                        onClick={() => !isReadOnly && updateTest(test.id, 'ok')}
                                                                        className={`p-2 rounded-lg transition-all ${status === 'ok' ? 'bg-green-500 text-white shadow-sm' : 'bg-gray-100 text-gray-300 hover:text-green-500'} ${isReadOnly ? 'cursor-default' : ''}`}
                                                                        title="Passer"
                                                                    >
                                                                        <CheckCircle2 size={18} />
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => !isReadOnly && updateTest(test.id, 'fail')}
                                                                        className={`p-2 rounded-lg transition-all ${status === 'fail' ? 'bg-red-500 text-white shadow-sm' : 'bg-gray-100 text-gray-300 hover:text-red-500'} ${isReadOnly ? 'cursor-default' : ''}`}
                                                                        title="Échec"
                                                                    >
                                                                        <XCircle size={18} />
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => !isReadOnly && updateTest(test.id, 'pending')}
                                                                        className={`p-2 rounded-lg transition-all ${status === 'pending' ? 'bg-indigo-500 text-white shadow-sm' : 'bg-gray-100 text-gray-300 hover:text-indigo-500'} ${isReadOnly ? 'cursor-default' : ''}`}
                                                                        title="À faire"
                                                                    >
                                                                        <AlertCircle size={18} />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
