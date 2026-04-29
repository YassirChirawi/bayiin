import { useState, useEffect } from "react";
import { useTenant } from "../context/TenantContext";
import { useSearchParams } from "react-router-dom";
import { QA_MODULES } from "../data/qaTests";
import { collection, addDoc, getDoc, setDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { 
    ShieldCheck, 
    ChevronDown, 
    ChevronUp, 
    CheckCircle2, 
    XCircle, 
    AlertCircle, 
    Save,
    RotateCcw,
    FileText,
    ExternalLink,
    Database,
    Zap
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
    const [expandedModules, setExpandedModules] = useState([QA_MODULES[0].id]);

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

    const updateTest = (testId, status, comment = null) => {
        if (isReadOnly) return;
        const currentComment = comment !== null ? comment : (results[testId]?.comment || "");
        
        if (status === 'ok' && (!currentComment || currentComment.trim().length < 5)) {
            toast.error("Veuillez fournir une preuve de test (minimum 5 caractères) !");
            vibrate('error');
            return;
        }

        const newResults = { ...results, [testId]: { 
            ...(results[testId] || {}),
            status, 
            comment: currentComment,
            timestamp: new Date().toISOString() 
        } };
        setResults(newResults);
        vibrate('soft');
    };

    const updateComment = (testId, comment) => {
        if (isReadOnly) return;
        const newResults = { ...results, [testId]: { 
            ...(results[testId] || {}),
            comment,
            timestamp: new Date().toISOString() 
        } };
        setResults(newResults);
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
            toast.success("Progression QA sauvegardée !");
            vibrate('success');
        } catch (e) {
            console.error(e);
            toast.error("Erreur lors de la sauvegarde");
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

    if (loading) return <div className="flex justify-center p-20"><RotateCcw className="animate-spin text-indigo-600" /></div>;

    const progress = calculateProgress();

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-20">
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
                            <p className="text-4xl font-black text-indigo-600">{progress.percent}%</p>
                            <p className="text-xs text-gray-400 mt-1">{progress.completed} / {progress.total} tests validés</p>
                        </div>
                        <div className="w-48 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-indigo-600 transition-all duration-500" 
                                style={{ width: `${progress.percent}%` }}
                            />
                        </div>
                    </div>
                </div>
                <div className="mt-8 flex flex-wrap gap-4 pt-6 border-t border-gray-100">
                    {!isReadOnly && (
                        <>
                            <Button onClick={handleSave} isLoading={saving} icon={Save}>
                                Sauvegarder l'état actuel
                            </Button>
                            <Button 
                                onClick={seedDemoData} 
                                isLoading={seeding} 
                                icon={Database}
                                className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                            >
                                Générer Données Démo
                            </Button>
                        </>
                    )}
                    <a 
                        href="https://docs.google.com/document/d/..." 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                        <FileText size={18} /> Documentation QA
                        <ExternalLink size={14} className="opacity-50" />
                    </a>
                </div>
            </div>

            {/* Modules List */}
            <div className="space-y-4">
                {QA_MODULES.map((module) => {
                    const isExpanded = expandedModules.includes(module.id);
                    const moduleTests = module.tests;
                    const completedInModule = moduleTests.filter(t => results[t.id]?.status === 'ok').length;
                    const isModuleComplete = completedInModule === moduleTests.length;

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
                                <div className="flex items-center gap-6">
                                    <div className="hidden sm:block text-right">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase">Score</p>
                                        <p className={`text-sm font-black ${isModuleComplete ? 'text-green-600' : 'text-gray-900'}`}>
                                            {completedInModule} / {moduleTests.length}
                                        </p>
                                    </div>
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
                                                    <th className="px-6 py-3">Cas de Test</th>
                                                    <th className="px-6 py-3">Résultat Attendu</th>
                                                    <th className="px-6 py-3 text-center">Sévérité</th>
                                                    <th className="px-6 py-3 text-center">Statut</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {module.tests.map((test) => {
                                                    const status = results[test.id]?.status || 'pending';
                                                    return (
                                                        <tr key={test.id} className={`group hover:bg-gray-50/50 transition-colors ${status === 'ok' ? 'opacity-60' : ''}`}>
                                                            <td className="px-6 py-4 text-xs font-mono font-bold text-gray-400">{test.id}</td>
                                                            <td className="px-6 py-4">
                                                                <p className="text-sm font-bold text-gray-900">{test.task}</p>
                                                                <div className="mt-2">
                                                                    <textarea 
                                                                        placeholder="Ce que j'ai fait (1-2 phrases)..."
                                                                        className="w-full text-xs p-2 border border-gray-100 rounded-lg bg-gray-50/50 focus:bg-white focus:ring-1 focus:ring-indigo-200 transition-all"
                                                                        rows={1}
                                                                        value={results[test.id]?.comment || ""}
                                                                        readOnly={isReadOnly}
                                                                        onChange={(e) => updateComment(test.id, e.target.value)}
                                                                    />
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 text-sm text-gray-500 italic">{test.expected}</td>
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
