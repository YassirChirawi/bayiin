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
