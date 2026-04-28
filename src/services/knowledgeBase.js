/**
 * Knowledge Base for BayIIn Local Copilot
 * Contains expert advice across multiple domains: Marketing, Finance, Logistics, CRO.
 */

export const EXPERT_KNOWLEDGE = {
    marketing: {
        keywords: ["marketing", "pub", "ads", "facebook", "meta", "instagram", "tiktok", "audience", "campagne"],
        advice: [
            "**Stratégie Meta Ads :** Utilise la structure 'Broad' (sans ciblage d'intérêt) pour laisser l'algorithme trouver tes clients. Assure-toi d'avoir un Pixel bien configuré.",
            "**Conseil Créative :** La vidéo (UGC) convertit 3x plus que l'image statique. Teste des vidéos de déballage ou de démonstration produit.",
            "**CBO vs ABO :** Utilise le CBO (Campaign Budget Optimization) pour scaler tes ventes et l'ABO pour tester de nouvelles audiences avec un budget fixe.",
            "**Scaling :** N'augmente pas ton budget de plus de 20% par jour pour ne pas relancer la phase d'apprentissage de l'algorithme Meta."
        ]
    },
    finance: {
        keywords: ["finance", "argent", "profit", "marge", "rentable", "coût", "dépense", "bilan", "calcul"],
        advice: [
            "**Règle de la Marge :** Pour être sain, ton produit doit être vendu au moins 3x son prix d'achat (COGS).",
            "**Gestion du Cash Flow :** Toujours garder une réserve de cash pour 15 jours de stock d'avance afin d'éviter les ruptures pendant le scaling.",
            "**Calcul du Net :** N'oublie pas d'inclure les frais de retour (moyenne 15-20%) et le CAC (Coût d'Acquisition Client) dans ton calcul de profit réel.",
            "**Optimisation :** Réduire tes frais de livraison de 5 DH peut augmenter ton profit net de 10% sur le long terme."
        ]
    },
    logistics: {
        keywords: ["logistique", "livraison", "retour", "transport", "expédition", "suivi", "colis", "livreur"],
        advice: [
            "**Réduction des Retours :** Appelle systématiquement tes clients après la commande pour confirmer l'adresse. Un client engagé au téléphone a 80% plus de chances de réceptionner son colis.",
            "**Confirmation WhatsApp :** Envoie un message automatique via BayIIn dès que le colis est expédié pour prévenir le client.",
            "**Zones à risque :** Analyse tes données de livraison par ville. Si une ville a plus de 40% de retour, envisage de suspendre la livraison dans cette zone temporairement.",
            "**Rapidité :** Un colis livré en moins de 48h réduit ton taux de retour de 15% par rapport à une livraison en 5 jours."
        ]
    },
    cro: {
        keywords: ["conversion", "cro", "ventes", "boutique", "panier", "achat", "client", "site"],
        advice: [
            "**Preuve Sociale :** Affiche des avis clients ou des photos réelles du produit. C'est le facteur N°1 de confiance.",
            "**Urgence :** Utilise des compteurs de stock faible ('Plus que 3 en stock') pour encourager l'achat immédiat sans être trop agressif.",
            "**Simplification :** Moins il y a d'étapes entre le clic et l'achat, plus ton taux de conversion sera élevé. Le formulaire BayIIn est optimisé pour ça.",
            "**Offre Irrésistible :** Propose des 'Bundles' (ex: Achetez-en 2, le 3ème à -50%) pour augmenter ton panier moyen (AOV)."
        ]
    },
    platform: {
        keywords: ["comment", "ajouter", "faire", "bayiin", "aide", "utiliser", "fonctionne", "tuto"],
        advice: [
            "**Ajouter un produit :** Va dans l'onglet 'Produits' et clique sur le bouton '+' en haut à droite.",
            "**Suivre tes profits :** Utilise l'onglet 'Finances' pour voir ton profit net calculé automatiquement avec tes dépenses publicitaires.",
            "**Gérer les retours :** Quand un colis revient, change son statut en 'Retourné' pour qu'il soit réintégré automatiquement dans ton stock.",
            "**WhatsApp :** Configure tes modèles de messages dans les paramètres pour notifier tes clients en un clic."
        ]
    }
};

/**
 * Get random advice from a specific domain
 */
export const getRandomAdvice = (domain) => {
    const list = EXPERT_KNOWLEDGE[domain]?.advice || [];
    return list[Math.floor(Math.random() * list.length)];
};
