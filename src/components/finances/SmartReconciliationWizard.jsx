import React, { useState, useRef } from "react";
import Papa from "papaparse";
import { 
    UploadCloud, Check, AlertTriangle, FileText, X, ArrowRight, 
    RefreshCw, Layers, CheckCircle2, DollarSign, AlertCircle, Info
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { doc, writeBatch } from "firebase/firestore";
import toast from "react-hot-toast";

const COURIER_PROFILES = {
    sendit: {
        name: "Sendit 📦",
        refFields: ["code", "reference", "code commande"],
        amountFields: ["amount", "total_amount", "montant"],
        statusFields: ["status", "statut", "etat"],
        deliveredValues: ["paid", "delivered", "livré", "remitted"]
    },
    olivraison: {
        name: "O-Livraison 🚚",
        refFields: ["code commande", "reference", "code"],
        amountFields: ["montant net", "prix", "montant", "amount"],
        statusFields: ["etat", "status", "statut"],
        deliveredValues: ["livré", "remboursé", "payé"]
    },
    custom: {
        name: "Custom CSV / Excel 📁",
        refFields: ["ref", "id", "order", "code", "commande", "reference"],
        amountFields: ["amount", "price", "montant", "prix", "total"],
        statusFields: ["status", "state", "statut", "etat"],
        deliveredValues: ["livré", "payé", "paid", "delivered", "ok", "delivered_cash"]
    }
};

export default function SmartReconciliationWizard({ orders, store, db, onReconcileComplete }) {
    const [selectedCourier, setSelectedCourier] = useState("sendit");
    const [dragActive, setDragActive] = useState(false);
    const [fileName, setFileName] = useState("");
    const [matchedOrders, setMatchedOrders] = useState([]);
    const [wizardStep, setWizardStep] = useState(1); // 1: Upload, 2: Review, 3: Success
    const [selectedRows, setSelectedRows] = useState({});
    const [isReconciling, setIsReconciling] = useState(false);
    const [filterTab, setFilterTab] = useState("all");
    const [reconciliationStats, setReconciliationStats] = useState(null);

    const fileInputRef = useRef(null);

    // Heuristics: Clean reference to compare raw numbers
    const cleanRef = (refStr) => {
        if (!refStr) return "";
        return String(refStr).toLowerCase().replace(/[^a-z0-9]/g, "");
    };

    // Extract raw numbers from a reference string (e.g. CMD-1025 -> 1025)
    const extractNumber = (refStr) => {
        if (!refStr) return "";
        const match = String(refStr).match(/\d+/);
        return match ? match[0] : "";
    };

    // Helper to find matching order in database list
    const findMatchingOrder = (courierRef, courierAmount) => {
        if (!courierRef) return null;
        
        const cleanedCourierRef = cleanRef(courierRef);
        const numCourierRef = extractNumber(courierRef);

        // 1. Try exact reference match
        let matched = orders.find(o => cleanRef(o.orderNumber) === cleanedCourierRef || cleanRef(o.id) === cleanedCourierRef);

        // 2. Try raw number fallback (for cases where courier strips prefixes)
        if (!matched && numCourierRef) {
            matched = orders.find(o => extractNumber(o.orderNumber) === numCourierRef);
        }

        return matched || null;
    };

    // Parsing Handler
    const handleCSVFile = (file) => {
        setFileName(file.name);
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                processParsedData(results.data);
            },
            error: (error) => {
                toast.error("Erreur de lecture du fichier CSV: " + error.message);
            }
        });
    };

    const processParsedData = (rows) => {
        const profile = COURIER_PROFILES[selectedCourier];
        const evaluated = [];
        const initialSelected = {};

        rows.forEach((row, index) => {
            // Find fields based on profile definitions
            let refValue = "";
            let amountValue = 0;
            let statusValue = "";

            // Reference match
            for (const field of profile.refFields) {
                const foundKey = Object.keys(row).find(k => k.toLowerCase().trim() === field);
                if (foundKey) {
                    refValue = row[foundKey];
                    break;
                }
            }

            // Amount match
            for (const field of profile.amountFields) {
                const foundKey = Object.keys(row).find(k => k.toLowerCase().trim() === field);
                if (foundKey) {
                    amountValue = parseFloat(String(row[foundKey]).replace(/[^0-9.]/g, "")) || 0;
                    break;
                }
            }

            // Status match
            for (const field of profile.statusFields) {
                const foundKey = Object.keys(row).find(k => k.toLowerCase().trim() === field);
                if (foundKey) {
                    statusValue = String(row[foundKey]).toLowerCase().trim();
                    break;
                }
            }

            // If we didn't find a reference or amount, try using first few columns as custom fallback
            if (!refValue && Object.keys(row).length > 0) {
                refValue = row[Object.keys(row)[0]];
            }
            if (!amountValue && Object.keys(row).length > 1) {
                amountValue = parseFloat(String(row[Object.keys(row)[1]]).replace(/[^0-9.]/g, "")) || 0;
            }

            if (!refValue) return; // Skip completely empty rows

            const dbOrder = findMatchingOrder(refValue, amountValue);
            
            let matchType = "orphan"; // default
            let dbAmount = 0;
            
            if (dbOrder) {
                dbAmount = (parseFloat(dbOrder.price) || 0) * (parseInt(dbOrder.quantity) || 1);
                
                if (dbOrder.isPaid) {
                    matchType = "already_paid";
                } else {
                    const diff = Math.abs(dbAmount - amountValue);
                    if (diff < 1) {
                        matchType = "perfect";
                    } else {
                        matchType = "mismatch";
                    }
                }
            }

            const evalRow = {
                id: `row-${index}`,
                courierRef: refValue,
                courierAmount: amountValue,
                courierStatus: statusValue,
                matchType,
                dbOrder,
                dbAmount
            };

            evaluated.push(evalRow);

            // Auto-select perfect and mismatch matches for reconciliation
            if (matchType === "perfect" || matchType === "mismatch") {
                initialSelected[evalRow.id] = true;
            }
        });

        if (evaluated.length === 0) {
            toast.error("Aucune donnée exploitable trouvée dans le CSV. Vérifiez le format et les colonnes.");
            return;
        }

        setMatchedOrders(evaluated);
        setSelectedRows(initialSelected);
        setWizardStep(2);
        toast.success(`${evaluated.length} lignes analysées avec succès !`);
    };

    // Drag-and-drop Handlers
    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleCSVFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileInput = (e) => {
        if (e.target.files && e.target.files[0]) {
            handleCSVFile(e.target.files[0]);
        }
    };

    // Filter Logic for Review Step
    const filteredMatches = matchedOrders.filter(row => {
        if (filterTab === "all") return true;
        if (filterTab === "ready") return row.matchType === "perfect";
        if (filterTab === "mismatch") return row.matchType === "mismatch";
        if (filterTab === "orphan") return row.matchType === "orphan";
        if (filterTab === "already_paid") return row.matchType === "already_paid";
        return true;
    });

    const counts = {
        all: matchedOrders.length,
        ready: matchedOrders.filter(r => r.matchType === "perfect").length,
        mismatch: matchedOrders.filter(r => r.matchType === "mismatch").length,
        orphan: matchedOrders.filter(r => r.matchType === "orphan").length,
        already_paid: matchedOrders.filter(r => r.matchType === "already_paid").length
    };

    // Execution Runner
    const runBatchReconciliation = async () => {
        const rowsToApply = matchedOrders.filter(r => selectedRows[r.id]);
        if (rowsToApply.length === 0) {
            toast.error("Veuillez sélectionner au moins une commande à réconcilier.");
            return;
        }

        setIsReconciling(true);
        const toastId = toast.loading(`Réconciliation de ${rowsToApply.length} commandes...`);

        try {
            const batch = writeBatch(db);
            const appliedOrderIds = [];
            let totalUnblockedCash = 0;

            rowsToApply.forEach(row => {
                if (!row.dbOrder) return;
                const orderRef = doc(db, "orders", row.dbOrder.id);
                
                batch.update(orderRef, {
                    isPaid: true,
                    // Record the ACTUAL cash the courier remitted so realized revenue reflects
                    // real collections, not the full order value (handles price mismatches).
                    amountPaid: row.courierAmount,
                    codRemittedAt: new Date().toISOString(),
                    paymentStatus: 'remitted',
                    reconciliationDetails: {
                        reconciledAt: new Date().toISOString(),
                        courierRef: row.courierRef,
                        courierAmount: row.courierAmount,
                        mismatchAmount: row.dbAmount - row.courierAmount,
                        profileUsed: selectedCourier
                    }
                });

                appliedOrderIds.push(row.dbOrder.id);
                totalUnblockedCash += row.courierAmount;
            });

            // Commit Batch
            await batch.commit();

            // Store summary statistics for the success screen
            setReconciliationStats({
                count: rowsToApply.length,
                cash: totalUnblockedCash,
                mismatches: rowsToApply.filter(r => r.matchType === "mismatch").length
            });

            toast.success(`Réconciliation réussie pour ${rowsToApply.length} commandes !`, { id: toastId });
            setWizardStep(3);

            if (onReconcileComplete) {
                // Let parent page refresh KPIs
                onReconcileComplete();
            }
        } catch (error) {
            console.error("Batch Reconciliation Error:", error);
            toast.error("Erreur lors de la réconciliation automatique : " + error.message, { id: toastId });
        } finally {
            setIsReconciling(false);
        }
    };

    const toggleRow = (rowId) => {
        setSelectedRows(prev => ({
            ...prev,
            [rowId]: !prev[rowId]
        }));
    };

    const toggleAllFiltered = () => {
        const allSelected = filteredMatches.every(r => selectedRows[r.id]);
        const nextState = { ...selectedRows };
        filteredMatches.forEach(r => {
            if (r.matchType === "perfect" || r.matchType === "mismatch") {
                nextState[r.id] = !allSelected;
            }
        });
        setSelectedRows(nextState);
    };

    const resetWizard = () => {
        setFileName("");
        setMatchedOrders([]);
        setSelectedRows({});
        setReconciliationStats(null);
        setWizardStep(1);
    };

    return (
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-indigo-50/50 mb-6 overflow-hidden">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-100 pb-4 mb-5 gap-3">
                <div>
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Layers className="w-5 h-5 text-indigo-600" />
                        Rapprochement Automatique (COD Express) ⚡
                    </h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                        {fileName ? (
                            <span>Fichier relevé : <span className="font-bold text-indigo-600">{fileName}</span> ({COURIER_PROFILES[selectedCourier].name})</span>
                        ) : (
                            "Importez vos rapports de coursiers (CSV) pour valider des dizaines de paiements en 1 clic"
                        )}
                    </p>
                </div>
                {wizardStep > 1 && (
                    <button 
                        onClick={resetWizard}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs font-semibold transition-all"
                    >
                        Recommencer
                    </button>
                )}
            </div>

            <AnimatePresence mode="wait">
                {/* STEP 1: UPLOAD & SETTINGS */}
                {wizardStep === 1 && (
                    <motion.div
                        key="step-upload"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-5"
                    >
                        {/* Courier profiles selection */}
                        <div>
                            <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">1. Choisissez le coursier :</span>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {Object.entries(COURIER_PROFILES).map(([key, profile]) => (
                                    <button
                                        key={key}
                                        onClick={() => setSelectedCourier(key)}
                                        className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all relative ${
                                            selectedCourier === key 
                                            ? "border-indigo-600 bg-indigo-50/40 text-indigo-700 font-bold shadow-sm" 
                                            : "border-gray-200 hover:border-gray-300 text-gray-600 bg-white"
                                        }`}
                                    >
                                        <span className="text-sm font-semibold">{profile.name}</span>
                                        {selectedCourier === key && (
                                            <span className="absolute top-2 right-2 text-indigo-600">
                                                <CheckCircle2 className="w-4 h-4 fill-indigo-100" />
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Drag and drop zone */}
                        <div
                            onDragEnter={handleDrag}
                            onDragOver={handleDrag}
                            onDragLeave={handleDrag}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current.click()}
                            className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all ${
                                dragActive 
                                ? "border-indigo-500 bg-indigo-50/20" 
                                : "border-gray-200 hover:border-indigo-300 bg-gray-50/30 hover:bg-gray-50/60"
                            }`}
                        >
                            <input 
                                ref={fileInputRef}
                                type="file" 
                                accept=".csv" 
                                onChange={handleFileInput}
                                className="hidden"
                            />
                            <div className="w-12 h-12 rounded-full bg-indigo-100/50 flex items-center justify-center text-indigo-600 mb-3 animate-pulse">
                                <UploadCloud className="w-6 h-6" />
                            </div>
                            <p className="text-sm font-semibold text-gray-700">Déposez votre fichier CSV ici ou <span className="text-indigo-600 font-bold">parcourez vos fichiers</span></p>
                            <p className="text-xs text-gray-400 mt-1">Fichier de relevé .csv uniquement (max 10 Mo)</p>
                        </div>
                    </motion.div>
                )}

                {/* STEP 2: REVIEW TABLE */}
                {wizardStep === 2 && (
                    <motion.div
                        key="step-review"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        className="space-y-4"
                    >
                        {/* Summary Widget */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-indigo-50/30 border border-indigo-100/50 rounded-2xl p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
                                    <CheckCircle2 className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 font-medium">Prêts pour réconciliation</p>
                                    <p className="text-lg font-bold text-gray-900">{counts.ready + counts.mismatch} commandes</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-amber-100 text-amber-600 rounded-xl">
                                    <DollarSign className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 font-medium">Cash Reçu Estimé</p>
                                    <p className="text-lg font-bold text-emerald-700">
                                        {matchedOrders
                                            .filter(r => selectedRows[r.id] && r.dbOrder)
                                            .reduce((s, r) => s + r.courierAmount, 0)
                                            .toLocaleString()} {store?.currency || "MAD"}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-rose-100 text-rose-600 rounded-xl">
                                    <AlertTriangle className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 font-medium">Écarts de Montant Flaggués</p>
                                    <p className="text-lg font-bold text-rose-700">{counts.mismatch} écarts</p>
                                </div>
                            </div>
                        </div>

                        {/* Filter Tabs */}
                        <div className="flex flex-wrap gap-1.5 border-b border-gray-100 pb-2">
                            <button
                                onClick={() => setFilterTab("all")}
                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${filterTab === "all" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                            >
                                Tous ({counts.all})
                            </button>
                            <button
                                onClick={() => setFilterTab("ready")}
                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${filterTab === "ready" ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}
                            >
                                Prêts 🟢 ({counts.ready})
                            </button>
                            <button
                                onClick={() => setFilterTab("mismatch")}
                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${filterTab === "mismatch" ? "bg-amber-500 text-white" : "bg-amber-50 text-amber-700 hover:bg-amber-100"}`}
                            >
                                Écarts de Prix 🟡 ({counts.mismatch})
                            </button>
                            <button
                                onClick={() => setFilterTab("orphan")}
                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${filterTab === "orphan" ? "bg-rose-600 text-white" : "bg-rose-50 text-rose-700 hover:bg-rose-100"}`}
                            >
                                Inconnus 🔴 ({counts.orphan})
                            </button>
                            <button
                                onClick={() => setFilterTab("already_paid")}
                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${filterTab === "already_paid" ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-700 hover:bg-blue-100"}`}
                            >
                                Déjà payés 🔵 ({counts.already_paid})
                            </button>
                        </div>

                        {/* Interactive Table Container */}
                        <div className="overflow-x-auto max-h-80 border border-gray-100 rounded-2xl">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left">
                                            <input 
                                                type="checkbox" 
                                                checked={filteredMatches.length > 0 && filteredMatches.every(r => selectedRows[r.id] || r.matchType === "orphan" || r.matchType === "already_paid")}
                                                onChange={toggleAllFiltered}
                                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                                            />
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Ref (Coursier)</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">État Match</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Montant Relevé</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Commande Interne</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Prix Attendu</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                    {filteredMatches.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="text-center py-6 text-gray-500 text-sm">
                                                Aucune ligne ne correspond à ce filtre.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredMatches.map(row => (
                                            <tr key={row.id} className={`hover:bg-gray-50/50 ${selectedRows[row.id] ? "bg-indigo-50/10" : ""}`}>
                                                <td className="px-4 py-3">
                                                    {(row.matchType === "perfect" || row.matchType === "mismatch") ? (
                                                        <input 
                                                            type="checkbox" 
                                                            checked={!!selectedRows[row.id]}
                                                            onChange={() => toggleRow(row.id)}
                                                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                                                        />
                                                    ) : (
                                                        <span className="block w-4 h-4"></span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900">
                                                    {row.courierRef}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    {row.matchType === "perfect" && (
                                                        <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-xl bg-emerald-100 text-emerald-800">
                                                            Prêt 🟢
                                                        </span>
                                                    )}
                                                    {row.matchType === "mismatch" && (
                                                        <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-xl bg-amber-100 text-amber-800 flex items-center gap-1">
                                                            <AlertCircle className="w-3.5 h-3.5 text-amber-600" /> Écart 🟡
                                                        </span>
                                                    )}
                                                    {row.matchType === "orphan" && (
                                                        <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-xl bg-red-100 text-red-800">
                                                            Inconnu 🔴
                                                        </span>
                                                    )}
                                                    {row.matchType === "already_paid" && (
                                                        <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-xl bg-blue-100 text-blue-800">
                                                            Déjà payé 🔵
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-800">
                                                    {row.courierAmount.toFixed(2)} DH
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                                    {row.dbOrder ? (
                                                        <div className="flex flex-col">
                                                            <span className="font-semibold text-gray-900">{row.dbOrder.orderNumber}</span>
                                                            <span className="text-xs text-gray-400">{row.dbOrder.clientName}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400">—</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                                    {row.dbOrder ? `${row.dbAmount.toFixed(2)} DH` : "—"}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Action buttons */}
                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                onClick={resetWizard}
                                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-sm font-bold transition-all"
                            >
                                Retour
                            </button>
                            <button
                                onClick={runBatchReconciliation}
                                disabled={isReconciling || Object.values(selectedRows).filter(Boolean).length === 0}
                                className="flex items-center gap-1.5 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-bold rounded-xl shadow-sm transition-all"
                            >
                                {isReconciling ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        Mise à jour...
                                    </>
                                ) : (
                                    <>
                                        <Check className="w-4 h-4" />
                                        Appliquer la réconciliation ({Object.values(selectedRows).filter(Boolean).length})
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* STEP 3: SUCCESS AND AUDIT REPORT */}
                {wizardStep === 3 && reconciliationStats && (
                    <motion.div
                        key="step-success"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        className="flex flex-col items-center justify-center text-center py-6 space-y-4"
                    >
                        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-1">
                            <CheckCircle2 className="w-8 h-8" />
                        </div>
                        <div>
                            <h4 className="text-xl font-bold text-gray-900">Réconciliation Terminée ! 🎉</h4>
                            <p className="text-sm text-gray-500 mt-1">Les statuts de paiement ont été mis à jour avec succès dans Firestore.</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-md bg-emerald-50/30 border border-emerald-100 p-5 rounded-2xl mt-2">
                            <div className="text-center">
                                <p className="text-xs text-gray-500 font-medium">Commandes Lettrées</p>
                                <p className="text-2xl font-bold text-gray-900">{reconciliationStats.count}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-xs text-gray-500 font-medium">Cash Débloqué (En caisse)</p>
                                <p className="text-2xl font-bold text-emerald-700">{reconciliationStats.cash.toLocaleString()} MAD</p>
                            </div>
                        </div>

                        {reconciliationStats.mismatches > 0 && (
                            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-left text-xs text-amber-800 max-w-md">
                                <Info className="w-4 h-4 flex-shrink-0 text-amber-600" />
                                <span>{reconciliationStats.mismatches} commandes présentaient des écarts de prix par rapport au relevé du livreur mais ont été validées selon votre sélection.</span>
                            </div>
                        )}

                        <button
                            onClick={resetWizard}
                            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-sm transition-all"
                        >
                            Fermer & Retour
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
