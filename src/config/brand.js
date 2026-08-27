/**
 * Identité de contact BayIIn.
 *
 * Source unique de vérité — aucun numéro ni email ne doit être écrit en dur
 * ailleurs dans l'application.
 *
 * SUPPORT_WHATSAPP est volontairement `null` tant qu'aucune ligne réelle n'est
 * ouverte : les composants masquent le bouton WhatsApp au lieu d'afficher un
 * numéro qui ne répond pas. Renseigner le numéro ici (format international sans
 * espaces, ex. "212612345678") rallume tous les points d'entrée d'un coup.
 */

/** Numéro WhatsApp support, format international sans "+" ni espaces. */
export const SUPPORT_WHATSAPP = null;

/**
 * Adresse de contact affichée publiquement.
 *
 * `null` tant qu'aucune boîte n'existe réellement sur le domaine. Afficher une
 * adresse qui n'est pas relevée est exactement le même défaut que le numéro
 * WhatsApp fictif : l'UI bascule alors sur le formulaire, qui lui aboutit
 * réellement dans le panel admin.
 *
 * Ceci n'est PAS la boîte qui reçoit les alertes : celle-là est privée et se
 * configure via SUPPORT_INBOX_EMAIL côté Cloud Functions. Les deux sont
 * volontairement distinctes — on peut recevoir les alertes sur une adresse
 * personnelle sans jamais l'exposer.
 */
export const SUPPORT_EMAIL = null;

/**
 * Point de contact accessible SANS authentification.
 * /help est derrière ProtectedRoute : y renvoyer un visiteur non connecté
 * depuis une page légale publique l'enverrait sur l'écran de connexion.
 */
export const PUBLIC_CONTACT_PATH = '/#contact';

/**
 * Réseaux sociaux officiels. `null` = l'icône n'est pas affichée.
 * Un lien social en href="#" est un cul-de-sac : mieux vaut aucune icône.
 */
export const SOCIALS = {
    facebook: null,
    instagram: null,
    linkedin: null,
    twitter: null,
};

/** Handle Twitter/X pour les meta cards. `null` = balise omise. */
export const TWITTER_HANDLE = null;

/** Horaires réels du support, affichés partout où on annonce une disponibilité. */
export const SUPPORT_HOURS = 'Lundi – Samedi, 9h – 20h';

/** Délai de réponse annoncé. Doit rester tenable. */
export const SUPPORT_SLA = 'sous 24h ouvrées';

/** true si une adresse de contact publique est réellement relevée. */
export const hasEmailSupport = () => Boolean(SUPPORT_EMAIL);

/** Lien mailto vers le support, ou null si aucune boîte n'existe. */
export const supportMailtoLink = (subject, body) => {
    if (!SUPPORT_EMAIL) return null;
    const params = [];
    if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
    if (body) params.push(`body=${encodeURIComponent(body)}`);
    return `mailto:${SUPPORT_EMAIL}${params.length ? '?' + params.join('&') : ''}`;
};

/** true si un canal WhatsApp support est réellement ouvert. */
export const hasWhatsappSupport = () => Boolean(SUPPORT_WHATSAPP);

/**
 * Lien wa.me vers le support BayIIn, ou null si aucune ligne n'est configurée.
 * @param {string} [text] Message pré-rempli.
 */
export const supportWhatsappLink = (text) => {
    if (!SUPPORT_WHATSAPP) return null;
    const digits = String(SUPPORT_WHATSAPP).replace(/[^0-9]/g, '');
    return text
        ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
        : `https://wa.me/${digits}`;
};

/** Numéro formaté pour affichage, ou null. */
export const supportPhoneDisplay = () => {
    if (!SUPPORT_WHATSAPP) return null;
    const d = String(SUPPORT_WHATSAPP).replace(/[^0-9]/g, '');
    return d.startsWith('212') ? `+${d.slice(0, 3)} ${d.slice(3)}` : `+${d}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// Identité légale
//
// Tout est `null` tant que l'information n'est pas réelle et vérifiable. Les
// pages Conditions et Confidentialité masquent alors la mention concernée au
// lieu d'afficher un placeholder : « ICE : 00XXXXXXXXXXXXX » sur une page
// légale publique est pire qu'une absence de mention.
//
// À renseigner avant lancement commercial — voir docs/LAUNCH_AUDIT.md.
// ─────────────────────────────────────────────────────────────────────────────

/** Raison sociale exacte, une fois la société immatriculée. Ex. "BayIIn SARL". */
export const LEGAL_ENTITY = null;

/** Identifiant Commun de l'Entreprise (15 chiffres). */
export const LEGAL_ICE = null;

/** Numéro de Registre de Commerce. */
export const LEGAL_RC = null;

/** Identifiant Fiscal. */
export const LEGAL_IF = null;

/** Adresse du siège social. */
export const LEGAL_ADDRESS = null;

/** Adresse du DPO. Distincte du support : obligation de la loi 09-08. */
export const DPO_EMAIL = null;

/**
 * Déclaration CNDP effectuée (loi 09-08 sur la protection des données).
 * Ne passer à true qu'une fois le récépissé obtenu : l'affirmer sans dépôt est
 * une fausse déclaration sur une page légale publique.
 */
export const CNDP_DECLARED = false;

/** true si l'identité légale est complète et publiable. */
export const hasLegalIdentity = () => Boolean(LEGAL_ENTITY && LEGAL_ICE && LEGAL_RC);
