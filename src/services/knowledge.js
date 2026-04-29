// src/services/knowledge.js

export const SHIPPING_INFO = {
    standard: {
        cost: 35,
        deliveryTime: "24-48h",
        areas: ["Casablanca", "Rabat", "Marrakech", "Tanger"]
    },
    express: {
        cost: 50,
        deliveryTime: "24h",
        areas: ["Casablanca"]
    },
    free_shipping_threshold: 500
};

export const SALES_SCRIPTS = {
    greeting: "Salam ! C'est Beya3, ton assistant Head of Growth 🚀. Prêt à exploser les ventes aujourd'hui ?",
    upsell: "Tu sais, ce produit marcherait super bien avec un petit bundle ! On tente une offre '2 achetés = 1 offert' ? 🎁",
    retention: "On a quelques clients qui n'ont pas commandé depuis 30 jours. On leur envoie un petit code promo 'VIMISSYOU' ? 💌",
    closing: "Allez, lance la campagne et on regarde les chiffres monter ! 🚀"
};

export const FAQ = [
    {
        q: "Comment améliorer mon ROAS ?",
        a: "Pour booster ton ROAS, vérifie tes créas ! Les vidéos UGC convertissent 3x mieux. Et n'oublie pas de retargeter ceux qui ont ajouté au panier. 😉"
    },
    {
        q: "Quel budget pour commencer ?",
        a: "Commence doucement ! 100-200 DH par jour sur Meta Ads pour tester tes audiences. Si ça prend, on scale ! 📈"
    },
    {
        q: "Pourquoi mes ventes baissent ?",
        a: "Pas de panique ! Vérifie : 1) Ta vitesse de livraison (tes clients sont impatients !), 2) Tes avis clients (réponds-y !), 3) Tes stocks (ne tombe jamais en rupture sur tes best-sellers !)."
    }
];

export const GROWTH_MODULES = {
    META_ADS: "Expertise Meta Ads: Ciblage, Retargeting, Lookalike, Créas performantes.",
    GOOGLE_ADS: "Expertise Google Ads: Search, Shopping, YouTube, Mots-clés.",
    EMAIL_MARKETING: "Expertise Emailing: Flows Klaviyo, Newsletters, Segmentation, Récupération paniers.",
    CRO: "Expertise CRO (Conversion Rate Optimization): UX/UI, Copywriting, A/B Testing, Landing Pages.",
    SALES: "Expertise Vente: Scripts, Négociation, Closing, Upsell/Cross-sell.",
    DATA: "Expertise Data: Analyse de cohortes, LTV, CAC, Retention, Marges.",
    INFLUENCER: "Expertise Influence: Partenariats, Briefing, Tracking, ROI.",
    CONTENT: "Expertise Contenu: Stratégie éditoriale, Réseaux Sociaux, Blog, Vidéo.",
    COMMUNITY: "Expertise Communauté: Engagement, Gestion de crise, Fidélisation."
};

export const SYSTEM_PERSONA_INSTRUCTIONS = `
Tu es Beya3, le 'Head of Growth' virtuel de l'application BayIIn. 
Ton rôle est d'aider les e-commerçants à développer leur business avec des conseils concrets et data-driven.
Tu es un expert en marketing digital, logistique et finance e-commerce.

TON STYLE :
- Ton : Amical, direct, professionnel et orienté résultats ("Growth Hacker" vibe).
- Emojis : Utilise-les pour dynamiser la conversation ! 🚀 📈 🔥 💡
- Langue : Un mix naturel de Français et de Darija (ex: "Ssi Mohamed", "Tbarkallah", "Yallah").
- Tu tutoyes l'utilisateur.
- Tu es proactif : Propose toujours une action concrète à la fin de tes réponses.

TES SUPER-POUVOIRS (RAG-lite) :
- Tu as accès aux infos logistiques (SHIPPING_INFO). Utilise-les pour répondre aux questions sur les livraisons.
- Tu connais les meilleurs scripts de vente (SALES_SCRIPTS).
- Tu as une base de FAQ (FAQ) pour les questions courantes.
- Tu maîtrises 9 modules de croissance (GROWTH_MODULES). Si l'utilisateur parle de "Pubs", active le module META ou GOOGLE.

RÈGLES D'OR :
1. Si on te demande une analyse financière, sois précis et stratégique.
2. Si on te demande de rédiger un message, fais-le avec ton style "Beya3".
3. Ne donne jamais de conseils juridiques ou médicaux.
4. Si tu ne sais pas, dis-le honnêtement (ex: "Je n'ai pas cette info pour le moment, mais on peut regarder autre chose ! 🧐").
`;

// ============================================================
// BEYA3 KNOWLEDGE BASE — Expert knowledge for e-commerce Maroc
// ============================================================

export const EXPERT_KNOWLEDGE = {
  marketing: [
    "Lance tes pubs le mardi ou jeudi soir entre 20h-23h — c'est le pic d'engagement au Maroc.",
    "Un ROAS > 3x est le minimum viable. En dessous, coupe la pub et revoir l'offre.",
    "Teste toujours 3 visuels différents sur le même audience avant de scaler.",
    "Les vidéos UGC (clients réels) convertissent 2x mieux que les visuels studio.",
    "Ajoute un compte à rebours dans ta pub : l'urgence augmente le CTR de 30%.",
    "Cible d'abord tes clients existants (Custom Audience) — le CAC est 5x moins cher.",
    "Un hook fort dans les 3 premières secondes de ta vidéo = tout. Sans ça, personne regarde.",
    "Retargeting : montre une pub différente aux gens qui ont vu ta page produit sans acheter.",
  ],
  finance: [
    "Vise une marge nette de 25-35% minimum en e-commerce Maroc.",
    "Ton CAC (Coût d'Acquisition Client) ne doit pas dépasser 30% de la valeur de commande.",
    "Calcule ton point mort : (Charges fixes) / (Marge sur coût variable). C'est le nombre de commandes à faire chaque mois.",
    "Un taux de retour > 20% mange ta marge. Chaque retour = livraison + produit bloqué.",
    "Négocie les frais de livraison dès 50 colis/mois — les transporteurs font des remises.",
    "Sépare ton argent business de ton argent perso dès le 1er DH. Ouvre un compte dédié.",
    "Le cashflow prime sur le profit. Une boutique rentable peut couler si le cash manque.",
    "Réinvestis 20% de ton profit net en pub chaque mois pour maintenir la croissance.",
  ],
  cro: [
    "Ajoute des avis clients avec photos sur ta fiche produit — conversion +25%.",
    "Réduis le nombre d'étapes de commande. Chaque clic supplémentaire = -10% de conversion.",
    "Propose la livraison gratuite dès un certain montant — augmente le panier moyen.",
    "Un pop-up de sortie avec -10% récupère 5-8% des visiteurs qui allaient partir.",
    "Affiche le stock restant ('Plus que 3 en stock !') pour créer l'urgence.",
    "Les photos produit sur fond blanc + lifestyle ensemble augmentent la confiance.",
    "Réponds aux messages WhatsApp en moins d'1h — la rapidité = confiance = vente.",
  ],
  logistics: [
    "Confirme chaque commande par appel avant expédition — réduit les retours de 40%.",
    "Regroupe tes expéditions sur 2 jours par semaine pour optimiser les coûts.",
    "Prends des photos de l'emballage avant livraison — preuve en cas de litige.",
    "Envoie un message WhatsApp avec le code de suivi dès l'expédition.",
    "Un emballage soigné = client qui poste sur Instagram = pub gratuite.",
    "Négocie le retour gratuit avec tes transporteurs si tu dépasses 100 colis/mois.",
  ],
  platform: [
    "Utilise les filtres de statut dans les commandes pour traiter en batch (ex: tous les 'Reçu' d'un coup).",
    "Configure tes templates WhatsApp dans Paramètres pour notifier automatiquement tes clients.",
    "Le Dashboard te montre ton profit en temps réel — vérifie-le chaque matin.",
    "Ajoute les coûts produits dans la fiche article pour que le profit soit calculé automatiquement.",
    "Utilise la section CRM pour noter les préférences de tes clients fidèles.",
    "Les rapports Finances montrent ton ROAS si tu renseignes tes dépenses publicitaires.",
    "Active les notifications de stock faible pour ne jamais être en rupture sans le savoir.",
  ],
};

// Retourne un conseil aléatoire par domaine
export function getRandomAdvice(domain) {
  const list = EXPERT_KNOWLEDGE[domain] || EXPERT_KNOWLEDGE.finance;
  return list[Math.floor(Math.random() * list.length)];
}
