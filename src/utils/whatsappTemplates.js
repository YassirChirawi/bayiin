

/**
 * Replaces all {variable} placeholders in a template string.
 *
 * Rules:
 *  - Known variables are replaced with the provided value.
 *  - Unknown / missing variables are left as-is (e.g. {tracking} stays {tracking}).
 *  - An empty/null template returns an empty string without throwing.
 *
 * @param {string} template - Template string with {placeholder} syntax
 * @param {Object} data     - Key→value map of replacements
 * @returns {string}
 */
export const renderTemplate = (template, data = {}) => {
    if (!template) return '';
    return template.replace(/\{(\w+)\}/g, (match, key) => {
        return Object.prototype.hasOwnProperty.call(data, key) ? (data[key] ?? '') : match;
    });
};

/**
 * WhatsApp Message Templates for Customer Segments
 * Keys must match the 'messageKey' returned by aiSegmentation.js
 */
export const WHATSAPP_TEMPLATES = {
    fr: {
        vip_offer: "Bonjour {name} ! 🌟 Merci d'être l'un de nos meilleurs clients. Pour vous remercier, voici -20% sur votre prochaine commande avec le code VIP20 !",
        vip_comeback: "Bonjour {name}, nos nouveautés vous attendent ! 🏆 En tant que VIP, on ne veut pas vous perdre. Revenez vite voir la nouvelle collection.",
        loyalty_reward: "Salut {name} ! ⭐ Merci pour votre fidélité. Saviez-vous que vous avez la livraison offerte sur votre prochaine commande ?",
        comeback: "Bonjour {name}, ça fait longtemps ! 👋 Vous nous manquez. Voici un petit cadeau pour votre retour : -10% avec le code WELCOMEBACK.",
        winback: "Toc toc {name} ? 💤 On n'a plus de nouvelles... Profitez de nos soldes exclusives pour vous faire plaisir !",
        welcome: "Bienvenue {name} ! 🌱 Merci pour votre première commande. N'hésitez pas si vous avez des questions.",
        standard_promo: "Bonjour {name}, découvrez nos offres de la semaine sur le site ! À très vite."
    },
    en: {
        vip_offer: "Hi {name}! 🌟 Thanks for being a top customer. Here is 20% OFF your next order with code VIP20!",
        vip_comeback: "Hi {name}! 🏆 We miss our VIPs! Come check out our new collection.",
        loyalty_reward: "Hello {name}! ⭐ Thanks for your loyalty. Free shipping on your next order!",
        comeback: "Hi {name}, long time no see! 👋 Here is 10% OFF with code WELCOMEBACK.",
        winback: "Knock knock {name}? 💤 We miss you! Check out our exclusive sales.",
        welcome: "Welcome {name}! 🌱 Thanks for your first order.",
        standard_promo: "Hi {name}, check out our weekly offers! See you soon."
    }
};

/**
 * Generates a WhatsApp link with pre-filled message
 * @param {string} phone - Customer phone number
 * @param {string} name - Customer name
 * @param {string} key - Template key (e.g. 'vip_offer')
 * @param {string} lang - Language code ('fr' or 'en')
 */
export const getWhatsAppLink = (phone, name, key, lang = 'fr') => {
    if (!phone) return '#';

    // Clean phone number (remove spaces, ensure international format if needed)
    // Assuming Input is roughly correct or local format. 
    // Ideally user inputs 06... for Morocco, we transform to 2126...
    let cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = '212' + cleanPhone.substring(1); // Default to Morocco if 0 start

    const templates = WHATSAPP_TEMPLATES[lang] || WHATSAPP_TEMPLATES['fr'];
    let message = templates[key] || templates['standard_promo'];

    // Personalize
    message = message.replace('{name}', name || 'Client');

    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
};

/**
 * Creates a WhatsApp link with a raw message
 * @param {string} phone 
 * @param {string} message 
 */
export const createRawWhatsAppLink = (phone, message) => {
    if (!phone) return '#';
    let cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = '212' + cleanPhone.substring(1);
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
};

/**
 * Generates specific order status messages
 * @param {string} status - Order status
 * @param {object} order - Order object
 * @param {object} store - Store object
 */
export const getWhatsappMessage = (status, order, store) => {
    const storeName = store?.name || 'Notre Boutique';
    const clientName = order?.clientName || 'Client';
    const product = order?.articleName || 'votre commande';
    const price = order?.price || '';

    // Status keys from constants.js: 'reçu', 'confirmation', 'livraison', 'livré', 'annulé', etc.
    switch (status) {
        case 'reçu':
        case 'pending_catalog':
            return `Bonjour ${clientName}, nous avons bien reçu votre commande pour ${product}. Nous vous contacterons bientôt pour confirmer. - ${storeName}`;
        case 'confirmation':
            return `Bonjour ${clientName}, votre commande ${product} est confirmée à ${price} DH. Merci de votre confiance ! - ${storeName}`;
        case 'livraison':
            return `Bonjour ${clientName}, bonne nouvelle ! Votre commande ${product} a été expédiée. Vous la recevrez très bientôt. - ${storeName}`;
        case 'livré':
            return `Bonjour ${clientName}, votre commande ${product} est livrée. Nous espérons qu'elle vous plaît ! - ${storeName}`;
        case 'annulé':
            return `Bonjour ${clientName}, votre commande ${product} a été annulée. N'hésitez pas à nous contacter si besoin. - ${storeName}`;
        case 'reporté':
            return `Bonjour ${clientName}, comme convenu, la livraison de votre commande ${product} a été reportée. À bientôt ! - ${storeName}`;
        case 'pas de réponse':
            return `Bonjour ${clientName}, nous avons essayé de vous joindre pour votre commande ${product}. Quand êtes-vous disponible ? - ${storeName}`;
        default:
            return `Bonjour ${clientName}, concernant votre commande ${product} chez ${storeName}...`;
    }
};

/**
 * Default French Templates for Settings
 */
export const DEFAULT_TEMPLATES = {
    'reçu': "Bonjour, nous avons bien reçu votre commande. Nous vous contacterons bientôt pour confirmer.",
    'confirmation': "Bonjour, votre commande est confirmée. Merci de votre confiance !",
    'livraison': "Bonjour, bonne nouvelle ! Votre commande a été expédiée. Vous la recevrez très bientôt.",
    'livré': "Bonjour, votre commande est livrée. Nous espérons qu'elle vous plaît !",
    'annulé': "Bonjour, votre commande a été annulée. N'hésitez pas à nous contacter si besoin.",
    'retour': "Bonjour, nous avons bien reçu votre retour.",
    'pas de réponse': "Bonjour, nous avons essayé de vous joindre pour votre commande. Quand êtes-vous disponible ?",
    'reporté': "Bonjour, comme convenu, la livraison de votre commande a été reportée."
};

/**
 * Default Darija Templates for Settings
 */
export const DARIJA_TEMPLATES = {
    'reçu': "Salam, wselna talab dyalk. Ghadi ntaslo bik qrib bach nawkdo.",
    'confirmation': "Salam, talab dyalk tkonfirma. Chokran 3la tiqa dyalk !",
    'livraison': "Salam, khbar zwina ! Talab dyalk rah f triq, ghadi iwslk qrib.",
    'livré': "Salam, talab dyalk wsel. Ntamnaw i3jbkom !",
    'annulé': "Salam, talab dyalk tlagha. Ila htajiti chi haja hna mojodin.",
    'retour': "Salam, wslna retour dyalk.",
    'pas de réponse': "Salam, hawlna ntaslo bik 3la qbal talab dyalk walakin ma jawbtich. Waqtach nqdro nhdro m3ak ?",
    'reporté': "Salam, kima tfahmna, la livraison dyal talab dyalk t2ajlat."
};
