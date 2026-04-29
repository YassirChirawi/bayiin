import { useState, useEffect, useMemo } from "react";
import { useTenant } from "../context/TenantContext";
import { QA_MODULES } from "../data/qaTests";
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { 
    ShieldCheck, 
    ChevronRight, 
    CheckCircle2, 
    XCircle, 
    AlertCircle,
    Navigation,
    X,
    Maximize2,
    Minimize2
} from "lucide-react";
import { toast } from "react-hot-toast";
import { vibrate } from "../utils/haptics";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

const MODULE_ROUTES = {
    "auth": "/login",
    "onboarding": "/settings",
    "catalog": "/products",
    "orders": "/orders",
    "logistics": "/orders",
    "finances": "/finances",
    "ai": "/dashboard",
    "e2e": "/dashboard"
};

export default function QAGuide() {
    const { store } = useTenant();
    const location = useLocation();
    const [results, setResults] = useState({});
    const [comment, setComment] = useState("");
    const [minimized, setMinimized] = useState(false);
    const [hidden, setHidden] = useState(false);

    useEffect(() => {
        if (!store?.id || !store?.guidedQaMode) return;
        
        const unsub = onSnapshot(doc(db, "stores", store.id, "qa_runs", "current"), (snap) => {
            if (snap.exists()) {
                setResults(snap.data().tests || {});
            }
        });
        return () => unsub();
    }, [store?.id, store?.guidedQaMode]);

    const nextTest = useMemo(() => {
        for (const module of QA_MODULES) {
            for (const test of module.tests) {
                if (!results[test.id] || results[test.id].status === 'pending') {
                    return { ...test, moduleName: module.name, moduleId: module.id };
                }
            }
        }
        return null;
    }, [results]);

    const updateTest = async (testId, status) => {
        if (!store?.id) return;

        if (status === 'ok' && (!comment || comment.trim().length < 5)) {
            toast.error("Preuve de test requise !");
            vibrate('error');
            return;
        }

        const newResults = { ...results, [testId]: { 
            status, 
            comment: comment,
            timestamp: new Date().toISOString() 
        } };
        setResults(newResults);
        
        try {
            await setDoc(doc(db, "stores", store.id, "qa_runs", "current"), {
                tests: newResults,
                updatedAt: serverTimestamp(),
                testerId: store.ownerId || 'unknown'
            });
            vibrate(status === 'ok' ? 'success' : 'error');
            if (status === 'ok') toast.success("Test validé ! Passons au suivant.");
            setComment(""); // Reset comment for next test
        } catch (e) {
            console.error(e);
            toast.error("Erreur de sauvegarde");
        }
    };

    if (!store?.guidedQaMode || hidden) return null;

    return (
        <AnimatePresence>
            <motion.div 
                initial={{ x: 300, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 300, opacity: 0 }}
                className={`fixed bottom-6 right-6 z-[9999] w-80 bg-white shadow-2xl rounded-2xl border border-indigo-100 overflow-hidden ${minimized ? 'h-14' : ''} transition-all duration-300`}
            >
                {/* Header */}
                <div className="bg-indigo-600 px-4 py-3 flex items-center justify-between text-white">
                    <div className="flex items-center gap-2">
                        <ShieldCheck size={18} className="text-indigo-200" />
                        <span className="text-xs font-bold uppercase tracking-wider">Assistant QA</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <button onClick={() => setMinimized(!minimized)} className="p-1 hover:bg-white/10 rounded">
                            {minimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
                        </button>
                        <button onClick={() => setHidden(true)} className="p-1 hover:bg-white/10 rounded">
                            <X size={14} />
                        </button>
                    </div>
                </div>

                {!minimized && (
                    <div className="p-5 space-y-4">
                        {nextTest ? (
                            <>
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[10px] font-bold text-indigo-500 uppercase">{nextTest.moduleName}</span>
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                            nextTest.severity === 'Critique' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                                        }`}>{nextTest.severity}</span>
                                    </div>
                                    <h4 className="text-sm font-black text-gray-900 leading-tight mb-2">{nextTest.task}</h4>
                                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                                        <p className="text-xs text-gray-500 italic">Attendu : {nextTest.expected}</p>
                                    </div>
                                    <div className="mt-3">
                                        <label className="text-[9px] font-bold text-gray-400 uppercase mb-1 block">Ce que vous avez fait :</label>
                                        <textarea 
                                            className="w-full text-[10px] p-2 border border-gray-100 rounded-lg bg-white focus:ring-1 focus:ring-indigo-200"
                                            placeholder="Ex: Création produit SER-01 avec stock 10..."
                                            rows={2}
                                            value={comment}
                                            onChange={(e) => setComment(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => updateTest(nextTest.id, 'ok')}
                                            className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-2 rounded-xl text-xs font-bold transition-all shadow-md shadow-green-100"
                                        >
                                            <CheckCircle2 size={14} /> Succès
                                        </button>
                                        <button 
                                            onClick={() => updateTest(nextTest.id, 'fail')}
                                            className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white py-2 rounded-xl text-xs font-bold transition-all shadow-md shadow-red-100"
                                        >
                                            <XCircle size={14} /> Échec
                                        </button>
                                    </div>
                                    
                                    {MODULE_ROUTES[nextTest.moduleId] && location.pathname !== MODULE_ROUTES[nextTest.moduleId] && (
                                        <Link 
                                            to={MODULE_ROUTES[nextTest.moduleId]}
                                            className="flex items-center justify-center gap-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 py-2 rounded-xl text-[10px] font-bold transition-all border border-indigo-100"
                                        >
                                            <Navigation size={12} /> Aller à la page du test
                                        </Link>
                                    )}
                                </div>
                                
                                <div className="pt-2 border-t border-gray-50 flex items-center justify-between">
                                    <p className="text-[9px] text-gray-400 font-medium">Test ID: {nextTest.id}</p>
                                    <Link to="/qa" className="text-[9px] text-indigo-400 hover:underline font-bold">Voir checklist complète</Link>
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-4">
                                <CheckCircle2 className="mx-auto text-green-500 mb-2" size={32} />
                                <h4 className="text-sm font-bold text-gray-900">Félicitations !</h4>
                                <p className="text-xs text-gray-500 mt-1">Tous les tests ont été complétés.</p>
                                <button 
                                    onClick={() => setHidden(true)}
                                    className="mt-4 text-xs font-bold text-indigo-600"
                                >
                                    Fermer l'assistant
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </motion.div>
        </AnimatePresence>
    );
}
