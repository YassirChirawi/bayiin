import React, { useEffect, useState } from 'react';
import { useLanguage } from "../../context/LanguageContext";
import { Store, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import Button from "../Button";
import { db } from "../../lib/firebase";
import { doc, getDoc, deleteDoc } from "firebase/firestore";
import { toast } from "react-hot-toast";

export default function YouCanIntegration({ store }) {
    const { t } = useLanguage();
    const [config, setConfig] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);

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
        // Redirection vers la Cloud Function youcanAuth
        const baseUrl = import.meta.env.VITE_API_URL || "https://us-central1-bayiin.cloudfunctions.net";
        window.location.href = `${baseUrl}/youcanAuth?storeId=${store.id}`;
    };

    const handleDisconnect = async () => {
        if (!window.confirm("Voulez-vous vraiment déconnecter votre boutique YouCan ? La synchronisation s'arrêtera.")) return;
        
        try {
            // Note: Idealement, il faudrait aussi appeler une Cloud Function pour supprimer les webhooks côté YouCan.
            // Pour l'instant, on supprime le document de configuration local.
            await deleteDoc(doc(db, "stores", store.id, "youcan_integration", "config"));
            setConfig(null);
            toast.success("Boutique YouCan déconnectée.");
        } catch (err) {
            toast.error("Erreur lors de la déconnexion.");
        }
    };

    const handleSyncNow = async () => {
        setIsSyncing(true);
        try {
            // Optionnel : déclencher une Cloud Function HTTP pour la synchro manuelle
            // Par défaut, la tâche cron (youcanSyncOrders) s'en occupe toutes les 30 minutes.
            toast.success("Synchronisation programmée. Cela peut prendre quelques minutes.");
            // Simulation
            await new Promise(res => setTimeout(res, 2000));
        } catch (err) {
            toast.error("Erreur de synchronisation.");
        } finally {
            setIsSyncing(false);
        }
    };

    const isConnected = config?.isActive;

    if (isLoading) {
        return <div className="animate-pulse h-24 bg-gray-100 rounded-xl"></div>;
    }

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-start justify-between">
                <div className="flex gap-4">
                    <div className={`p-3 rounded-2xl ${isConnected ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-500'}`}>
                        <Store size={28} />
                    </div>
                    <div>
                        <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            Intégration YouCan
                            {isConnected && <CheckCircle className="text-purple-500" size={18} />}
                        </h4>
                        <p className="text-sm text-gray-500 mt-1 max-w-lg">
                            Importez automatiquement vos commandes YouCan vers BayIIn et gérez vos stocks de manière centralisée.
                        </p>
                    </div>
                </div>
                
                <div>
                    {!isConnected ? (
                        <Button
                            onClick={handleConnect}
                            className="bg-purple-600 hover:bg-purple-700 border-none text-white"
                        >
                            Connecter YouCan
                        </Button>
                    ) : (
                        <div className="flex flex-col items-end gap-2">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                Connecté
                            </span>
                            <button 
                                onClick={handleDisconnect}
                                className="text-xs text-red-600 hover:text-red-800 font-medium transition-colors"
                            >
                                Déconnecter
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {isConnected && (
                <div className="mt-6 pt-6 border-t border-gray-100 grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                        <span className="block text-xs font-medium text-gray-500 uppercase">YouCan Store ID</span>
                        <span className="block text-sm font-mono text-gray-900 mt-1">{config.youcanStoreId}</span>
                    </div>
                    <div>
                        <span className="block text-xs font-medium text-gray-500 uppercase">Connecté le</span>
                        <span className="block text-sm text-gray-900 mt-1">
                            {config.connectedAt?.toDate().toLocaleDateString('fr-FR')}
                        </span>
                    </div>
                    <div className="flex items-center justify-end">
                        <Button 
                            variant="secondary" 
                            size="small" 
                            onClick={handleSyncNow}
                            isLoading={isSyncing}
                            icon={RefreshCw}
                        >
                            Sync Maintenant
                        </Button>
                    </div>
                </div>
            )}
            
            {/* Affichage d'erreur si redirection OAuth échouée */}
            {window.location.search.includes('youcan=error') && !isConnected && (
                <div className="mt-4 bg-red-50 p-3 rounded-md border border-red-100 flex gap-2">
                    <AlertCircle className="text-red-500" size={16} />
                    <p className="text-sm text-red-700">La connexion à YouCan a échoué. Veuillez réessayer.</p>
                </div>
            )}
        </div>
    );
}
