import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Circle, Rocket, X, ArrowRight } from "lucide-react";
import { useTenant } from "../context/TenantContext";
import { FEATURES } from '../config/features';

/**
 * SetupChecklist — guide de démarrage sur le dashboard (activation).
 * Après l'onboarding minimal (nom + téléphone), oriente le marchand vers sa 1re commande :
 * ajouter un produit, configurer la livraison, connecter WhatsApp, publier la boutique.
 * Se calcule sur des données réelles, se masque quand tout est fait ou si l'utilisateur ferme.
 */
export default function SetupChecklist({ hasProduct = false, hasOrder = false }) {
    const navigate = useNavigate();
    const { store } = useTenant();
    const dismissKey = `setup_dismissed_${store?.id || 'x'}`;
    const [dismissed, setDismissed] = useState(() => {
        try { return localStorage.getItem(dismissKey) === '1'; } catch { return false; }
    });

    if (!store || dismissed) return null;

    const carrierDone = !!(store.senditPublicKey || store.olivraisonApiKey || (store.senditCities && store.senditCities.length));
    const steps = [
        { id: 'store', label: 'Créer votre boutique', done: true },
        { id: 'product', label: 'Ajouter un premier produit', done: hasProduct, to: '/products', cta: 'Ajouter' },
        { id: 'shipping', label: 'Configurer la livraison (transporteur)', done: carrierDone, to: '/settings?tab=shipping', cta: 'Configurer' },
        { id: 'whatsapp', label: 'Connecter WhatsApp', done: !!store.whatsappEnabled, to: '/settings?tab=whatsapp', cta: 'Connecter' },
        ...(FEATURES.storefront ? [{ id: 'storefront', label: 'Personnaliser & publier la boutique', done: !!store.publicCatalogEnabled, to: '/customizer', cta: 'Ouvrir' }] : []),
        { id: 'order', label: 'Recevoir votre première commande', done: hasOrder, to: '/orders', cta: 'Voir' },
    ];

    const doneCount = steps.filter(s => s.done).length;
    const pct = Math.round((doneCount / steps.length) * 100);

    if (doneCount === steps.length) return null; // tout fait → on masque

    const dismiss = () => {
        try { localStorage.setItem(dismissKey, '1'); } catch { /* ignore */ }
        setDismissed(true);
    };

    // Première étape non terminée = celle à mettre en avant.
    const nextStep = steps.find(s => !s.done);

    return (
        <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
        >
            <div className="p-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white relative">
                <button onClick={dismiss} title="Masquer" className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors">
                    <X className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg"><Rocket className="w-5 h-5" /></div>
                    <div>
                        <h3 className="font-bold text-base">Bien démarrer sur BayIIn</h3>
                        <p className="text-xs text-white/80">{doneCount} / {steps.length} étapes — jusqu'à votre première commande</p>
                    </div>
                </div>
                <div className="mt-4 h-2 bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full bg-white rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
            </div>

            <ul className="divide-y divide-gray-50">
                {steps.map(s => (
                    <li key={s.id} className={`flex items-center gap-3 px-5 py-3 ${s.done ? 'opacity-60' : ''}`}>
                        {s.done
                            ? <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                            : <Circle className="w-5 h-5 text-gray-300 flex-shrink-0" />}
                        <span className={`flex-1 text-sm ${s.done ? 'line-through text-gray-400' : 'font-medium text-gray-800'}`}>{s.label}</span>
                        {!s.done && s.to && (
                            <button
                                onClick={() => navigate(s.to)}
                                className={`text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors ${s.id === nextStep?.id ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'text-indigo-600 hover:bg-indigo-50'}`}
                            >
                                {s.cta} <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </li>
                ))}
            </ul>
        </motion.div>
    );
}
