import { motion } from "framer-motion";
import { useLanguage } from "../../context/LanguageContext";
import {
    ShoppingBag, Boxes, Wallet, Truck, Sparkles, Users2, Check,
} from "lucide-react";

/**
 * Section « Fonctionnalités » de la landing.
 *
 * Elle n'existait PAS : le lien #features de la navigation — présent en desktop
 * et en mobile — pointait vers une ancre inexistante, et la page ne décrivait
 * nulle part ce que fait le produit.
 *
 * Règle de contenu : ne lister QUE des modules réellement livrés et accessibles
 * dans l'application. Les modules derrière un drapeau (YouCan, Shopify,
 * Cathedis, vitrine publique) n'ont rien à faire ici tant qu'ils sont coupés —
 * c'est ce qui a produit les overlays « Bientôt Disponible » qu'on a retirés.
 */
const PILLARS = [
    {
        id: 'orders',
        icon: ShoppingBag,
        accent: 'from-indigo-500 to-blue-500',
        titleKey: 'feat_orders_title',
        titleFallback: 'Commandes & COD',
        descKey: 'feat_orders_desc',
        descFallback:
            "Le cycle complet, pensé pour le paiement à la livraison : de la réception au règlement, avec les transitions de statut verrouillées côté serveur.",
        pointKeys: ['feat_orders_p1', 'feat_orders_p2', 'feat_orders_p3'],
        pointFallbacks: [
            'Confirmation WhatsApp automatique',
            'SAV & retours avec restockage',
            'Import Excel / CSV en un clic',
        ],
    },
    {
        id: 'stock',
        icon: Boxes,
        accent: 'from-emerald-500 to-teal-500',
        titleKey: 'feat_stock_title',
        titleFallback: 'Stock en temps réel',
        descKey: 'feat_stock_desc',
        descFallback:
            "Le stock bouge à chaque changement de statut, dans une transaction atomique. Jamais de valeur négative, jamais de double déduction.",
        pointKeys: ['feat_stock_p1', 'feat_stock_p2', 'feat_stock_p3'],
        pointFallbacks: [
            'Variantes et packs (bundles)',
            'Multi-entrepôt et lots à péremption',
            'Scan code-barres depuis le téléphone',
        ],
    },
    {
        id: 'finance',
        icon: Wallet,
        accent: 'from-amber-500 to-orange-500',
        titleKey: 'feat_finance_title',
        titleFallback: 'Finances réelles',
        descKey: 'feat_finance_desc',
        descFallback:
            "Comptabilité de caisse, pas d'estimation : une commande livrée mais non encaissée ne compte pas comme un revenu.",
        pointKeys: ['feat_finance_p1', 'feat_finance_p2', 'feat_finance_p3'],
        pointFallbacks: [
            'Profit net après COGS et livraison',
            'Dépenses, achats et remboursements',
            'Rapports et export CSV',
        ],
    },
    {
        id: 'delivery',
        icon: Truck,
        accent: 'from-sky-500 to-cyan-500',
        titleKey: 'feat_delivery_title',
        titleFallback: 'Livraison & terrain',
        descKey: 'feat_delivery_desc',
        descFallback:
            "Vos transporteurs et vos propres livreurs au même endroit, avec une application dédiée pour la tournée.",
        pointKeys: ['feat_delivery_p1', 'feat_delivery_p2', 'feat_delivery_p3'],
        pointFallbacks: [
            'Sendit et O-Livraison connectés',
            'Application livreur avec lien sécurisé',
            'Réconciliation du cash encaissé',
        ],
    },
    {
        id: 'beya3',
        icon: Sparkles,
        accent: 'from-rose-500 to-pink-500',
        titleKey: 'feat_beya3_title',
        titleFallback: 'Beya3, votre copilote',
        descKey: 'feat_beya3_desc',
        descFallback:
            "Une IA qui lit vos vraies données et agit avec votre accord — chaque action reste annulable pendant une heure.",
        pointKeys: ['feat_beya3_p1', 'feat_beya3_p2', 'feat_beya3_p3'],
        pointFallbacks: [
            'Profit, trésorerie et anomalies',
            'Prévision de rupture de stock',
            'Actions confirmées, avec annulation',
        ],
    },
    {
        id: 'team',
        icon: Users2,
        accent: 'from-violet-500 to-purple-500',
        titleKey: 'feat_team_title',
        titleFallback: 'Équipe & opérations',
        descKey: 'feat_team_desc',
        descFallback:
            "Chacun voit ce qui le concerne : le staff les commandes, le livreur ses tournées, vous les finances.",
        pointKeys: ['feat_team_p1', 'feat_team_p2', 'feat_team_p3'],
        pointFallbacks: [
            'Rôles et permissions par module',
            'RH, absences et paie',
            'Journal d’audit de chaque action',
        ],
    },
];

export default function Features() {
    const { t } = useLanguage();
    const tr = (key, fallback) => {
        const v = t(key);
        return v === key ? fallback : v;
    };

    return (
        <section id="features" className="py-24 bg-white border-t border-slate-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-2xl mx-auto mb-16">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-sm font-semibold mb-4 border border-indigo-100">
                        <Boxes className="w-4 h-4" />
                        {tr('feat_badge', 'Ce que fait BayIIn')}
                    </div>
                    <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4">
                        {tr('feat_title', 'Tout votre commerce, au même endroit')}
                    </h2>
                    <p className="text-xl text-slate-500">
                        {tr(
                            'feat_subtitle',
                            "Six piliers, tous livrés et utilisables aujourd'hui. Pas de promesse à venir."
                        )}
                    </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {PILLARS.map((p, i) => (
                        <motion.div
                            key={p.id}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.06 }}
                            className="flex flex-col rounded-2xl border border-slate-100 bg-white p-7 shadow-sm transition-shadow hover:shadow-md"
                        >
                            <div
                                className={`mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${p.accent} text-white shadow-sm`}
                            >
                                <p.icon className="h-6 w-6" />
                            </div>

                            <h3 className="mb-2 text-xl font-bold text-slate-900">
                                {tr(p.titleKey, p.titleFallback)}
                            </h3>
                            <p className="mb-5 text-sm leading-relaxed text-slate-500">
                                {tr(p.descKey, p.descFallback)}
                            </p>

                            <ul className="mt-auto space-y-2.5">
                                {p.pointKeys.map((k, idx) => (
                                    <li key={k} className="flex items-start gap-2.5 text-sm text-slate-600">
                                        <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                                        <span>{tr(k, p.pointFallbacks[idx])}</span>
                                    </li>
                                ))}
                            </ul>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
