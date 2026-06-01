import React, { useState } from 'react';
import { Sparkles, Trash2, Save, Check } from 'lucide-react';
import { doc, updateDoc, collection, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { toast } from 'react-hot-toast';
import Button from '../Button';
import { useLanguage } from '../../context/LanguageContext';

export default function Beya3Settings({ store, setStore }) {
    const { t } = useLanguage();
    const [isClearing, setIsClearing] = useState(false);
    
    // Default values if not set
    const memoryEnabled = store?.beya3MemoryEnabled ?? true;
    const profilingEnabled = store?.beya3ProfilingEnabled ?? true;

    const handleToggle = async (field, currentValue) => {
        const newValue = !currentValue;
        setStore(prev => ({ ...prev, [field]: newValue }));
        try {
            await updateDoc(doc(db, "stores", store.id), {
                [field]: newValue
            });
            toast.success("Paramètre sauvegardé avec succès.");
        } catch (err) {
            console.error(err);
            toast.error("Erreur lors de la sauvegarde du paramètre.");
            setStore(prev => ({ ...prev, [field]: currentValue })); // revert
        }
    };

    const handleClearMemory = async () => {
        if (!window.confirm("Êtes-vous sûr de vouloir effacer toutes les mémoires de Beya3 ? Le profilage et l'historique d'apprentissage seront supprimés définitivement.")) {
            return;
        }

        setIsClearing(true);
        try {
            const memoryRef = collection(db, `stores/${store.id}/beya3_memory`);
            const snap = await getDocs(memoryRef);
            
            const batch = writeBatch(db);
            snap.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            await batch.commit();
            toast.success("Toutes les mémoires de Beya3 ont été effacées.");
        } catch (err) {
            console.error(err);
            toast.error("Erreur lors de la suppression des mémoires.");
        } finally {
            setIsClearing(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white shadow rounded-lg border border-gray-100 overflow-hidden">
                <div className="px-4 py-5 sm:p-6">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl">
                            <Sparkles size={28} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-900">Paramètres Beya3 (IA)</h3>
                            <p className="text-sm text-slate-500">Gérez le comportement, la mémoire et le profilage de votre Copilot.</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* Memory Toggle */}
                        <div className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border border-slate-100">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <h4 className="text-base font-bold text-slate-900">Mémoire long terme</h4>
                                    {memoryEnabled && (
                                        <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider rounded-full">
                                            <Check size={10} /> Active
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-slate-500 leading-relaxed max-w-sm">
                                    Autorise Beya3 à se souvenir des instructions passées, des préférences du magasin et des discussions antérieures pour des réponses plus pertinentes.
                                </p>
                            </div>
                            
                            <button
                                onClick={() => handleToggle('beya3MemoryEnabled', memoryEnabled)}
                                className={`
                                    relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
                                    ${memoryEnabled ? 'bg-indigo-600' : 'bg-slate-200'}
                                `}
                            >
                                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300 ${memoryEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>

                        {/* Profiling Toggle */}
                        <div className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border border-slate-100">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <h4 className="text-base font-bold text-slate-900">Profilage adaptatif (Comportemental)</h4>
                                    {profilingEnabled && (
                                        <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider rounded-full">
                                            <Check size={10} /> Actif
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-slate-500 leading-relaxed max-w-sm">
                                    Permet à Beya3 d'analyser votre style de communication et d'adapter le ton de ses réponses (RGPD : vous pouvez le désactiver à tout moment).
                                </p>
                            </div>
                            
                            <button
                                onClick={() => handleToggle('beya3ProfilingEnabled', profilingEnabled)}
                                className={`
                                    relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
                                    ${profilingEnabled ? 'bg-indigo-600' : 'bg-slate-200'}
                                `}
                            >
                                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300 ${profilingEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>

                        {/* Clear Memory */}
                        <div className="p-6 bg-red-50 rounded-3xl border border-red-100 mt-8">
                            <h4 className="text-base font-bold text-red-900 mb-2">Zone de Danger</h4>
                            <p className="text-sm text-red-700 mb-4">
                                Cette action supprimera définitivement tout l'historique d'apprentissage de Beya3 pour ce magasin.
                            </p>
                            <Button 
                                onClick={handleClearMemory}
                                isLoading={isClearing}
                                variant="secondary" 
                                className="border-red-200 text-red-600 hover:bg-red-100 hover:text-red-700"
                                icon={Trash2}
                            >
                                Effacer toutes les mémoires Beya3
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
