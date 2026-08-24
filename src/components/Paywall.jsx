import { useNavigate } from "react-router-dom";
import { Lock, Sparkles, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTenant } from "../context/TenantContext";

/**
 * Paywall — écran de blocage effectif quand l'essai gratuit (1 mois) est terminé ou que
 * l'abonnement a expiré. Bloque l'usage de l'app ; seule voie de sortie : s'abonner
 * (→ Réglages) ou se déconnecter. Les comptes testerMode / promo / abonnés actifs ne le
 * voient jamais (cf. isStoreActive dans TenantContext).
 */
export default function Paywall() {
    const navigate = useNavigate();
    const { logout } = useAuth() || {};
    const { store } = useTenant();

    const expiredPlan = store?.plan === 'pro' || store?.plan === 'starter' || store?.plan === 'unlimited';

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-indigo-50 via-white to-purple-50">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-gray-100 p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-indigo-100 flex items-center justify-center">
                    <Lock className="w-8 h-8 text-indigo-600" />
                </div>

                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    {expiredPlan ? "Votre abonnement a expiré" : "Votre essai gratuit est terminé"}
                </h1>
                <p className="text-gray-500 mb-8 leading-relaxed">
                    {expiredPlan
                        ? "Renouvelez votre abonnement pour retrouver l'accès à votre boutique, vos commandes et vos finances."
                        : "Vous avez profité de votre mois gratuit. Abonnez-vous pour continuer à gérer votre boutique sans interruption — vos données sont conservées."}
                </p>

                <button
                    onClick={() => navigate('/settings?tab=subscription')}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold shadow-lg shadow-indigo-200 hover:-translate-y-0.5 transition-transform flex items-center justify-center gap-2"
                >
                    <Sparkles className="w-5 h-5" />
                    Voir les plans &amp; s'abonner
                </button>

                <button
                    onClick={() => (logout ? logout() : navigate('/'))}
                    className="mt-4 text-sm text-gray-400 hover:text-gray-600 transition-colors inline-flex items-center gap-1.5"
                >
                    <LogOut className="w-4 h-4" /> Se déconnecter
                </button>

                <p className="mt-8 text-xs text-gray-400">
                    Un souci de paiement ? Écris-nous — on t'aide à réactiver ton compte.
                </p>
            </div>
        </div>
    );
}
