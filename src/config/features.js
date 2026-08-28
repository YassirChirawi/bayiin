/**
 * Registre des modules non livrés.
 *
 * Un module à `false` n'est PAS rendu du tout : ni carte grisée, ni overlay
 * "Bientôt Disponible". Le code du module reste en place — seul le point de
 * montage est conditionné. Passer le flag à `true` le remet en ligne.
 *
 * Règle : on ne montre jamais à un client payant une fonctionnalité qu'il ne
 * peut pas utiliser. Soit c'est livré, soit ça n'existe pas dans l'UI.
 */
export const FEATURES = {
    /** Intégration YouCan (OAuth + webhooks) — en review côté YouCan. */
    youcanIntegration: false,

    /** Intégration Shopify (webhooks HMAC) — backend prêt, UI non validée. */
    shopifyIntegration: false,

    /** Transporteur Cathedis (API Username/Password). */
    carrierCathedis: false,

    /** Transporteurs sans implémentation : Amana, Tawssil. */
    carrierAmana: false,
    carrierTawssil: false,

    /**
     * Upsell post-achat sur la page de remerciement.
     * Le bloc actuel affiche un produit INVENTÉ codé en dur (image Unsplash) au
     * client final du marchand. À ne rallumer qu'une fois adossé à un vrai
     * catalogue d'offres paramétrable par le marchand.
     */
    postPurchaseUpsell: false,

    /**
     * Vitrine publique : éditeur (/customizer), catalogue public
     * (/catalog/:storeId), partage de catalogue et étape d'onboarding associée.
     *
     * Masquée en production sur décision produit : le StoreBuilder n'est pas
     * fini (il était déjà derrière un code promo) et plusieurs de ses blocs ne
     * sont pas rendus. Vérifié avant de couper : sur 81 boutiques en
     * production, AUCUNE n'avait publicCatalogEnabled à true — aucun lien
     * client en circulation, donc rien de casse.
     *
     * Repasser à true rétablit l'ensemble d'un coup.
     */
    storefront: false,

    /**
     * Section Témoignages de la landing.
     * Les trois témoignages actuels sont inventés, avec des avatars générés par
     * i.pravatar.cc. Publier de faux avis clients est un risque juridique autant
     * qu'un risque de crédibilité. À rallumer avec de vrais clients ayant donné
     * leur accord écrit.
     */
    landingTestimonials: false,

    /**
     * Bandeau de chiffres de la landing (« 99 % uptime », « 24/7 »).
     * Aucun des deux n'est adossé à quoi que ce soit : pas de status page, et
     * le 24/7 contredit les horaires annoncés ailleurs dans le produit.
     */
    landingStats: false,

    /** Blocs StoreBuilder : preuve sociale, RTL vitrine, pixels Meta/TikTok. */
    builderConversionKit: false,
    builderLocalization: false,
    builderTrackingPixels: false,
};

export const isEnabled = (key) => FEATURES[key] === true;
