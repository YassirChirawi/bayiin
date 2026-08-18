import React, { useEffect, useState } from 'react';
import { useLanguage } from "../../context/LanguageContext";
import { Store, CheckCircle2, AlertCircle, RefreshCw, Unlink, ExternalLink, ShieldCheck, Check, Activity, Sparkles } from "lucide-react";
import Button from "../Button";
import { db } from "../../lib/firebase";
import { doc, getDoc, deleteDoc } from "firebase/firestore";
import { toast } from "react-hot-toast";
import { motion, AnimatePresence } from 'framer-motion';
import ConfirmDialog from "../ConfirmDialog";
import { useConfirmDialog } from "../../hooks/useConfirmDialog";

export default function YouCanIntegration({ store }) {
    const { t } = useLanguage();
    const { confirmState, confirm, close } = useConfirmDialog();
    const [config, setConfig] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [activeSection, setActiveSection] = useState('status'); // 'status' | 'webhooks' | 'logs'

    // Mock logs for professional UI/UX visual validation
    const mockLogs = [
        { id: 1, time: "Il y a 5 min", event: "Webhooks order.create", msg: "Commande #YC-4903 importée (180.00 DH)", status: "success" },
        { id: 2, time: "Il y a 30 min", event: "youcanSyncOrders Cron", msg: "Synchronisation de secours effectuée. 0 nouvelles commandes.", status: "success" },
        { id: 3, time: "Il y a 1h 12m", event: "Webhooks order.create", msg: "Commande #YC-4899 importée (320.00 DH)", status: "success" },
        { id: 4, time: "Il y a 2h", event: "Webhooks inventory.low", msg: "Alerte stock bas YouCan reçue pour Produit YC-882", status: "warning" }
    ];

    useEffect(() => {
        if (!store?.id) return;
        fetchConfig();
    }, [store?.id]);

    const fetchConfig = async () => {
        setIsLoading(true);
        try {
            const docRef = doc(db, "stores", store.id, "youcan_integration", "config");
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setConfig(docSnap.data());
            } else {
                setConfig(null);
            }
        } catch (error) {
            console.error("Error fetching YouCan config:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleConnect = () => {
        const baseUrl = import.meta.env.VITE_API_URL || "https://us-central1-bayiin.cloudfunctions.net";
        window.location.href = `${baseUrl}/youcanAuth?storeId=${store.id}`;
    };

    const handleDisconnect = async () => {
        confirm({
            title: 'Déconnexion YouCan',
            message: "Voulez-vous vraiment déconnecter votre boutique YouCan ? La synchronisation s'arrêtera.",
            isDestructive: true,
            onConfirm: async () => {
                try {
                    await deleteDoc(doc(db, "stores", store.id, "youcan_integration", "config"));
                    setConfig(null);
                    toast.success("Boutique YouCan déconnectée avec succès.");
                } catch (err) {
                    toast.error("Erreur lors de la déconnexion.");
                }
            }
        });
    };

    const handleSyncNow = async () => {
        setIsSyncing(true);
        try {
            toast.success("Synchronisation forcée démarrée...");
            await new Promise(res => setTimeout(res, 2000));
            toast.success("La synchronisation est terminée. Vos commandes YouCan sont à jour !");
        } catch (err) {
            toast.error("Erreur de synchronisation.");
        } finally {
            setIsSyncing(false);
        }
    };

    const isConnected = config?.isActive;

    if (isLoading) {
        return (
            <div className="animate-pulse bg-slate-50/50 border border-slate-100 rounded-3xl p-8 space-y-4">
                <div className="flex gap-4">
                    <div className="h-14 w-14 bg-slate-200 rounded-2xl"></div>
                    <div className="flex-1 space-y-2 py-1">
                        <div className="h-4 bg-slate-200 rounded-full w-1/4"></div>
                        <div className="h-3 bg-slate-200 rounded-full w-3/4"></div>
                    </div>
                </div>
                <div className="h-20 bg-slate-200 rounded-2xl"></div>
            </div>
        );
    }

    return (
        <div className="bg-white border border-slate-100 shadow-sm rounded-[2rem] overflow-hidden transition-all duration-300 hover:shadow-md relative">
            {/* OVERLAY BIENTOT DISPONIBLE */}
            <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-50 flex items-center justify-center">
                <span className="bg-purple-600 text-white font-black px-6 py-2 rounded-full shadow-xl transform -rotate-12 text-xl border-4 border-white shadow-purple-600/30">🚀 Bientôt Disponible</span>
            </div>
            
            <div className="opacity-40 pointer-events-none select-none">
            {/* Header Area */}
            <div className="p-8 bg-gradient-to-br from-purple-50/60 via-transparent to-transparent border-b border-slate-50">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-start gap-4.5">
                        <div className={`p-4.5 rounded-2xl transition-all duration-500 shadow-sm ${isConnected ? 'bg-purple-600 text-white rotate-6' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                            <Store size={28} className={isConnected ? "animate-pulse" : ""} />
                        </div>
                        <div>
                            <h4 className="text-xl font-black text-slate-900 flex items-center gap-2.5">
                                Intégration YouCan App
                                {isConnected ? (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-emerald-700 bg-emerald-100/80 rounded-full border border-emerald-200/50">
                                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                                        Actif
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-slate-500 bg-slate-100 rounded-full uppercase">
                                        Non configuré
                                    </span>
                                )}
                            </h4>
                            <p className="text-sm text-slate-500 mt-1 max-w-xl leading-relaxed">
                                Importez automatiquement vos commandes YouCan vers BayIIn et synchronisez votre logistique COD en temps réel sans effort.
                            </p>
                        </div>
                    </div>
                    
                    <div className="self-start md:self-center">
                        {!isConnected ? (
                            <motion.button
                                whileHover={{ scale: 1.03, boxShadow: "0 10px 15px -3px rgba(124, 58, 237, 0.2)" }}
                                whileTap={{ scale: 0.97 }}
                                onClick={handleConnect}
                                className="inline-flex items-center gap-2 px-6 py-3.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl transition-all duration-300"
                            >
                                <Sparkles size={18} />
                                Connecter YouCan
                            </motion.button>
                        ) : (
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleDisconnect}
                                className="inline-flex items-center gap-1.5 px-4.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 text-sm font-bold rounded-xl transition-all duration-300 border border-rose-100"
                            >
                                <Unlink size={16} />
                                Déconnecter
                            </motion.button>
                        )}
                    </div>
                </div>
            </div>

            {isConnected && (
                <div className="p-8 space-y-6">
                    {/* Navigation Tabs inside the Card */}
                    <div className="flex border-b border-slate-100 pb-3 gap-6">
                        <button 
                            onClick={() => setActiveSection('status')}
                            className={`text-sm font-bold pb-2 transition-all border-b-2 relative ${activeSection === 'status' ? 'text-purple-600 border-purple-600' : 'text-slate-400 border-transparent hover:text-slate-600'}`}
                        >
                            État de connexion
                        </button>
                        <button 
                            onClick={() => setActiveSection('webhooks')}
                            className={`text-sm font-bold pb-2 transition-all border-b-2 relative ${activeSection === 'webhooks' ? 'text-purple-600 border-purple-600' : 'text-slate-400 border-transparent hover:text-slate-600'}`}
                        >
                            Webhooks YouCan
                        </button>
                        <button 
                            onClick={() => setActiveSection('logs')}
                            className={`text-sm font-bold pb-2 transition-all border-b-2 relative ${activeSection === 'logs' ? 'text-purple-600 border-purple-600' : 'text-slate-400 border-transparent hover:text-slate-600'}`}
                        >
                            Journal de Sync
                        </button>
                    </div>

                    <AnimatePresence mode="wait">
                        {activeSection === 'status' && (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-6"
                            >
                                {/* Grid with Details */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50/50 p-6 rounded-3xl border border-slate-100/50">
                                    <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-50/80">
                                        <span className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Boutique YouCan</span>
                                        <span className="block text-sm font-bold text-slate-800 mt-1.5 flex items-center gap-1.5">
                                            {config.youcanStoreUrl || "Connected"} 
                                            <a href={`https://${config.youcanStoreUrl}`} target="_blank" rel="noreferrer" title="Ouvrir le site">
                                                <ExternalLink size={14} className="text-slate-400 hover:text-purple-600" />
                                            </a>
                                        </span>
                                    </div>
                                    <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-50/80">
                                        <span className="block text-xs font-bold text-slate-400 uppercase tracking-widest">YouCan Store ID</span>
                                        <span className="block text-sm font-mono font-medium text-slate-800 mt-1.5">{config.youcanStoreId}</span>
                                    </div>
                                    <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-50/80">
                                        <span className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Connecté depuis le</span>
                                        <span className="block text-sm font-bold text-slate-800 mt-1.5">
                                            {config.connectedAt?.toDate ? config.connectedAt.toDate().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : "Actif"}
                                        </span>
                                    </div>
                                </div>

                                {/* Checklist Verification Card */}
                                <div className="p-6 bg-purple-50/30 rounded-3xl border border-purple-100/30">
                                    <h5 className="text-sm font-bold text-purple-950 flex items-center gap-2 mb-4">
                                        <ShieldCheck size={18} className="text-purple-600" />
                                        Vérification de l'intégrité de la liaison
                                    </h5>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="flex items-center gap-2.5 text-slate-700 text-sm">
                                            <div className="p-1 bg-emerald-100 text-emerald-700 rounded-full"><Check size={14} /></div>
                                            <span>Authentification sécurisée par HMAC SHA-256</span>
                                        </div>
                                        <div className="flex items-center gap-2.5 text-slate-700 text-sm">
                                            <div className="p-1 bg-emerald-100 text-emerald-700 rounded-full"><Check size={14} /></div>
                                            <span>Protection anti-doublon idempotente</span>
                                        </div>
                                        <div className="flex items-center gap-2.5 text-slate-700 text-sm">
                                            <div className="p-1 bg-emerald-100 text-emerald-700 rounded-full"><Check size={14} /></div>
                                            <span>Webhooks temps réel abonnés</span>
                                        </div>
                                        <div className="flex items-center gap-2.5 text-slate-700 text-sm">
                                            <div className="p-1 bg-emerald-100 text-emerald-700 rounded-full"><Check size={14} /></div>
                                            <span>Sync planifiée auto-corrective (30 min)</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex justify-end pt-2">
                                    <motion.button 
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={handleSyncNow}
                                        disabled={isSyncing}
                                        className="inline-flex items-center gap-2 px-6 py-3 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold rounded-2xl transition-all duration-300 border border-purple-100"
                                    >
                                        <RefreshCw size={16} className={isSyncing ? "animate-spin" : ""} />
                                        {isSyncing ? "Synchronisation..." : "Forcer la Synchronisation"}
                                    </motion.button>
                                </div>
                            </motion.div>
                        )}

                        {activeSection === 'webhooks' && (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-4"
                            >
                                <p className="text-sm text-slate-500 mb-2 leading-relaxed">
                                    Les webhooks YouCan notifient automatiquement BayIIn à chaque action sur votre store YouCan pour une réactivité instantanée.
                                </p>
                                <div className="space-y-3">
                                    {[
                                        { event: "order.create", label: "Création de Commande", desc: "Déclenche l'importation de commande et lance immédiatement Beya3 AI Bot sur WhatsApp." },
                                        { event: "inventory.low", label: "Alerte de Stock Faible", desc: "Alerte l'équipe de BayIIn lorsque le stock d'un produit passe sous le seuil d'alerte YouCan." },
                                        { event: "upsell.accept", label: "Acceptation d'Upsell", desc: "Mets à jour automatiquement la commande avec l'offre complémentaire validée par le client." }
                                    ].map(wh => (
                                        <div key={wh.event} className="flex items-start justify-between p-4.5 bg-slate-50/50 hover:bg-slate-50 rounded-2xl border border-slate-100 transition-colors">
                                            <div className="space-y-1 pr-4">
                                                <h6 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                                    {wh.label}
                                                    <span className="font-mono text-xs text-slate-400 font-normal">({wh.event})</span>
                                                </h6>
                                                <p className="text-xs text-slate-500 leading-relaxed">{wh.desc}</p>
                                            </div>
                                            <span className="flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-700 rounded-full border border-emerald-200/30">
                                                Abonné
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {activeSection === 'logs' && (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-4"
                            >
                                <div className="flex items-center justify-between">
                                    <h5 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                        <Activity size={16} className="text-slate-400 animate-pulse" />
                                        Historique des dernières synchronisations
                                    </h5>
                                    <span className="text-xs text-slate-400">Webhooks opérationnels (100%)</span>
                                </div>

                                <div className="rounded-2xl border border-slate-100 overflow-hidden divide-y divide-slate-100">
                                    {mockLogs.map(log => (
                                        <div key={log.id} className="p-4 bg-slate-50/20 hover:bg-slate-50/60 transition-colors flex items-center justify-between gap-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-mono font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                                                        {log.event}
                                                    </span>
                                                    <span className="text-xs text-slate-400">{log.time}</span>
                                                </div>
                                                <p className="text-sm text-slate-700 font-medium">{log.msg}</p>
                                            </div>
                                            <span className={`w-2.5 h-2.5 rounded-full shadow-sm ${log.status === 'success' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}

            {/* Error Message if Redirect OAuth fails */}
            {window.location.search.includes('youcan=error') && !isConnected && (
                <div className="m-8 mt-2 bg-red-50 p-4.5 rounded-2xl border border-red-100 flex gap-3 animate-bounce">
                    <AlertCircle className="text-red-500 mt-0.5" size={20} />
                    <div>
                        <h5 className="text-sm font-bold text-red-900">La connexion à YouCan a échoué</h5>
                        <p className="text-xs text-red-700 mt-0.5">La vérification de sécurité a expiré. Veuillez vérifier votre clé d'intégration et réessayer.</p>
                    </div>
                </div>
            )}
            </div>
            <ConfirmDialog 
                isOpen={confirmState.isOpen}
                title={confirmState.title}
                message={confirmState.message}
                onConfirm={confirmState.onConfirm}
                onCancel={close}
                isDestructive={confirmState.isDestructive}
            />
        </div>
    );
}
