import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { CreditCard, Check, Zap, ExternalLink, ShoppingBag } from "lucide-react";
import Button from "../Button";
import { toast } from "react-hot-toast";
import { createCheckoutSession } from "../../lib/stripeService";

export default function BillingSettings({ store, setStore, t }) {
    const [loading, setLoading] = useState(null);

    const handleUpgrade = async (planId) => {
        if (!store?.id) return;
        try {
            setLoading(planId);
            await createCheckoutSession(store.id, planId);
        } catch (error) {
            console.error("Error upgrading:", error);
            toast.error(t('err_upgrade_failed') || "Erreur de changement de plan");
            setLoading(null);
        }
    };

    // ── YouCan Managed Billing ────────────────────────────────────────────────
    // Si le store vient de YouCan, NE PAS afficher les boutons Stripe.
    // L'abonnement est géré directement par YouCan.
    if (store?.subscriptionSource === 'youcan') {
        const planLabel = store.plan === 'pro' ? 'Pro' : 'Free';

        return (
            <div className="space-y-6">
                <div className="bg-white shadow rounded-lg border border-gray-100 overflow-hidden">
                    <div className="px-4 py-5 sm:p-6">
                        <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center gap-2">
                            <ShoppingBag className="h-5 w-5 text-[#6c47ff]" />
                            Abonnement YouCan
                        </h3>

                        {/* Current plan badge */}
                        <div className={`mt-6 p-6 rounded-xl border-2 ${store.plan === 'pro' ? 'border-purple-200 bg-purple-50' : 'border-gray-200 bg-gray-50'} flex items-start gap-4`}>
                            <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${store.plan === 'pro' ? 'bg-purple-100' : 'bg-gray-100'}`}>
                                <span className="text-2xl">🛒</span>
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-bold text-gray-900">
                                        Plan actuel : {planLabel}
                                    </h4>
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${store.plan === 'pro' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                                        {store.subscriptionStatus === 'active' ? '● Actif' : store.subscriptionStatus}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-600 leading-relaxed">
                                    Votre abonnement BayIIn est géré directement via <strong>YouCan</strong>.
                                    Pour modifier, annuler ou mettre à niveau votre plan, rendez-vous dans votre espace YouCan.
                                </p>
                                {store.currentPeriodEnd && (
                                    <p className="text-xs text-gray-400 mt-2">
                                        Prochain renouvellement :{' '}
                                        {new Date(store.currentPeriodEnd?.toDate?.() || store.currentPeriodEnd).toLocaleDateString('fr-FR', {
                                            day: 'numeric', month: 'long', year: 'numeric'
                                        })}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Action links */}
                        <div className="mt-4 flex flex-col sm:flex-row gap-3">
                            <a
                                href="https://seller-area.youcan.shop"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#6c47ff] hover:bg-[#5a38d9] text-white font-semibold rounded-xl transition-colors shadow-sm text-sm"
                            >
                                <ShoppingBag size={16} />
                                Gérer dans YouCan Admin
                                <ExternalLink size={14} />
                            </a>
                            {store.plan !== 'pro' && (
                                <a
                                    href={`https://seller-area.youcan.shop/admin/apps/${store.youcanAppHandle || 'bayiin'}?upgrade=1`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center gap-2 px-5 py-3 border border-purple-300 text-purple-700 hover:bg-purple-50 font-semibold rounded-xl transition-colors text-sm"
                                >
                                    <Zap size={16} />
                                    Passer au Plan Pro (99 MAD/mois)
                                </a>
                            )}
                        </div>

                        {/* Info box */}
                        <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100 text-sm text-blue-700">
                            <p className="font-semibold mb-1">ℹ️ Pourquoi ce message ?</p>
                            <p className="leading-relaxed">
                                Vous avez installé BayIIn depuis le <strong>marketplace YouCan</strong>.
                                Votre facturation est centralisée sur votre compte YouCan pour simplifier la gestion de vos abonnements.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ── Stripe Billing (stores créés directement sur bayiin.shop) ────────────
    return (
        <div className="space-y-6">
            <div className="bg-white shadow rounded-lg border border-gray-100 overflow-hidden">
                <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-gray-400" />
                        {t('section_subscription_plan')}
                    </h3>
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Starter Plan */}
                        <div className={`border rounded-lg p-6 relative flex flex-col ${store?.plan === 'starter' ? 'border-indigo-600 ring-1 ring-indigo-600 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300'}`}>
                            {store?.plan === 'starter' && (
                                <div className="absolute top-0 right-0 -mt-2 -mr-2">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 border border-indigo-200">
                                        {t('active')}
                                    </span>
                                </div>
                            )}
                            <h4 className="text-lg font-bold text-gray-900">Starter</h4>
                            <p className="mt-2 text-sm text-gray-500 flex-1">
                                {t('plan_starter_desc') || 'Idéal pour démarrer avec les fonctionnalités de base.'}
                            </p>
                            <div className="mt-4 mb-6">
                                <span className="text-4xl font-extrabold text-gray-900">79 DH</span>
                                <span className="text-base font-medium text-gray-500">/mo</span>
                                <p className="text-xs text-green-600 font-semibold mt-1">1 Mois Gratuit</p>
                            </div>
                            <ul className="space-y-3 mb-6 text-sm text-gray-600">
                                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> {t('plan_feature_50_orders') || "50 Commandes / mois"}</li>
                                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> {t('plan_feature_basic_analytics') || "Analytics basiques"}</li>
                            </ul>
                            <Button
                                onClick={() => handleUpgrade('starter')}
                                isLoading={loading === 'starter'}
                                disabled={store?.plan === 'starter'}
                                className={`w-full justify-center ${store?.plan === 'starter' ? 'bg-indigo-200 text-indigo-700 cursor-default' : 'bg-white text-indigo-600 border border-indigo-600 hover:bg-indigo-50'}`}
                            >
                                {store?.plan === 'starter' ? t('current_plan') : t('start_trial')}
                            </Button>
                        </div>

                        {/* Pro Plan */}
                        <div className={`border rounded-lg p-6 relative flex flex-col ${store?.plan === 'pro' ? 'border-purple-600 ring-1 ring-purple-600 bg-purple-50' : 'border-gray-200 hover:border-purple-300'}`}>
                            {store?.plan === 'pro' && (
                                <div className="absolute top-0 right-0 -mt-2 -mr-2">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                                        {t('active')}
                                    </span>
                                </div>
                            )}
                            <h4 className="text-lg font-bold text-gray-900">Pro</h4>
                            <p className="mt-2 text-sm text-gray-500 flex-1">
                                {t('plan_pro_desc') || "Débloquez tout le potentiel avec les commandes illimitées et l'IA."}
                            </p>
                            <div className="mt-4 mb-6">
                                <span className="text-4xl font-extrabold text-gray-900">179 DH</span>
                                <span className="text-base font-medium text-gray-500">/mo</span>
                                <p className="text-xs text-green-600 font-semibold mt-1">1 Mois Gratuit</p>
                            </div>
                            <ul className="space-y-3 mb-6 text-sm text-gray-600">
                                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> {t('plan_feature_unlimited_orders') || "Commandes illimitées"}</li>
                                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> {t('plan_feature_adv_analytics') || "Analytics & IA Avancés"}</li>
                            </ul>
                            <Button
                                onClick={() => handleUpgrade('pro')}
                                isLoading={loading === 'pro'}
                                disabled={store?.plan === 'pro'}
                                className={`w-full justify-center ${store?.plan === 'pro' ? 'bg-purple-200 text-purple-700 cursor-default' : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-md shadow-indigo-200'}`}
                                icon={Zap}
                            >
                                {store?.plan === 'pro' ? t('current_plan') : t('start_trial')}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Promo Code */}
            <div className="bg-white shadow rounded-lg border border-gray-100 overflow-hidden">
                <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center gap-2">
                        <Zap className="h-5 w-5 text-yellow-500" />
                        {t('redeem_promo_code') || "Code Promo"}
                    </h3>
                    <form
                        onSubmit={async (e) => {
                            e.preventDefault();
                            const code = e.target.elements.promoCode.value.trim().toUpperCase();
                            if (!code) return;
                            const VALID_CODES = ['EYA1907', 'VIP2026', 'LAUNCH_PRO', 'ADMIN_ACCESS'];
                            if (VALID_CODES.includes(code)) {
                                setLoading('promo');
                                try {
                                    await updateDoc(doc(db, "stores", store.id), {
                                        plan: 'pro',
                                        subscriptionStatus: 'active_promo',
                                        promoCodeUsed: code
                                    });
                                    setStore(prev => ({ ...prev, plan: 'pro', subscriptionStatus: 'active_promo' }));
                                    toast.success(t('msg_code_redeemed') || "Code validé !");
                                    e.target.reset();
                                } catch (err) {
                                    console.error(err);
                                    toast.error(t('err_code_apply') || "Erreur d'application");
                                } finally {
                                    setLoading(null);
                                }
                            } else {
                                toast.error(t('err_invalid_code') || "Code invalide");
                            }
                        }}
                        className="flex gap-2 max-w-md mt-4"
                    >
                        <input
                            name="promoCode"
                            type="text"
                            placeholder={t('enter_code') || "Entrez votre code"}
                            className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                        />
                        <Button type="submit" isLoading={loading === 'promo'}>
                            {t('apply') || "Appliquer"}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}
