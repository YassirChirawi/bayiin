// Default Templates (French)
export const DEFAULT_TEMPLATES = {
    'reçu': "Bonjour [Client], [Store] a bien reçu votre commande [Commande] pour [Produit].\n\n📄 *Détails* :\n[Ticket]\n\nVotre commande sera expédiée à [Ville]. Merci !",
    'packing': "Bonjour [Client], votre commande [Commande] est en cours de préparation chez [Store].",
    'ramassage': "Bonjour [Client], votre commande est prête pour le ramassage.",
    'livraison': "Bonjour [Client], votre commande [Commande] est en cours de livraison sur [Ville]. Le livreur vous contactera bientôt.",
    'livré': "Bonjour [Client], votre commande a été livrée avec succès. Merci de votre confiance en [Store] !",
    'pas de réponse': "Bonjour [Client], [Store] a tenté de vous joindre concernant votre commande sans succès. Souhaitez-vous toujours recevoir votre commande ?",
    'retour': "Bonjour [Client], votre commande [Commande] nous a été retournée.",
    'annulé': "Bonjour [Client], votre commande a été annulée."
};

// Darija Templates
export const DARIJA_TEMPLATES = {
    'reçu': "Salam [Client], ra wslatna la commande dialk [Commande] dyal [Produit].\n\n📄 *Tafassil* :\n[Ticket]\n\nGhadi nsiftoha l [Ville]. Chokran !",
    'packing': "Salam [Client], commande dialk [Commande] ra hna kanwjdo fiha daba f [Store].",
    'ramassage': "Salam [Client], commande dialk wjdat bach n3tiwha l livreur.",
    'livraison': "Salam [Client], ra livreur jay 3endk l [Ville], 7di m3a ton tel ghadi i3eyet lik 9rib.",
    'livré': "Salam [Client], commande dialk [Commande] wslatek. Chokran hit teqti fina o ntmenaw ikon produit 3ejbek.",
    'pas de réponse': "Salam [Client], livreur 3eyet likom o malqakomch, mazal baghin la commande ? Chokran.",
    'retour': "Salam [Client], commande dialk [Commande] atrje3 lina. Ila mazal baghiha 3eyet lina f aqreb weqt chokran.",
    'annulé': "Salam [Client], commande dialk tghat (annulée)."
};

/**
 * Generates the WhatsApp message content
 * @param {string} status 
 * @param {object} order - Full order object
 * @param {object} store - Store object containing name and templates
 */
export const getWhatsappMessage = (status, order, store) => {
    const lang = store?.whatsappLanguage || 'fr'; // 'fr' or 'darija'
    const defaults = lang === 'darija' ? DARIJA_TEMPLATES : DEFAULT_TEMPLATES;

    // 1. Get the template: Custom > Default > Fallback
    const customTemplates = store?.whatsappTemplates || {};
    // Note: customTemplates currently doesn't distinction language separate keys likely.
    // If user customizes, it overrides everything.
    // But defaults should switch based on language.
    const rawTemplate = customTemplates[status] || defaults[status] || "Bonjour [Client], mise à jour concernant votre commande.";

    // 2. Prepare Data
    // Handle legacy case where order might be just a name? No, we enforcing object now.
    // Safety check just in case
    const orderObj = (typeof order === 'object') ? order : { clientName: order };

    const clientName = orderObj.clientName || "Client";
    const storeName = store?.name || "Notre Boutique";
    const cityName = orderObj.clientCity || orderObj.city || "";
    const productName = orderObj.articleName || "Article";
    const orderNumber = orderObj.orderNumber || "";

    // 3. Build Ticket Text
    let ticketText = "";
    if (true) {
        const subtotal = (parseFloat(orderObj.price) || 0) * (parseInt(orderObj.quantity) || 1);
        const shipping = parseFloat(orderObj.shippingCost) || 0;
        const total = subtotal + shipping;
        // Ticket language should also adapt? Ideally yes, but let's keep it somewhat standard or localized.
        if (lang === 'darija') {
            ticketText = `----------------\n📦 Produit: ${productName}\n💰 Taman: ${subtotal.toFixed(2)} DH\n🚚 Livraison: ${shipping.toFixed(2)} DH\n💵 *TOTAL: ${total.toFixed(2)} DH*\n----------------`;
        } else {
            ticketText = `----------------\n📦 Article: ${productName}\n💰 Sous-total: ${subtotal.toFixed(2)} DH\n🚚 Livraison: ${shipping.toFixed(2)} DH\n💵 *TOTAL: ${total.toFixed(2)} DH*\n----------------`;
        }
    }

    // 4. Replace Placeholders
    let message = rawTemplate
        .replace(/\[Client\]/g, clientName)
        .replace(/\[Store\]/g, storeName)
        .replace(/\[Ville\]/g, cityName)
        .replace(/\[Produit\]/g, productName)
        .replace(/\[Commande\]/g, orderNumber)
        .replace(/\[Ticket\]/g, ticketText);

    return message;
};

export const getWhatsappLink = (phone, message) => {
    if (!phone) return "#";
    // Basic cleaning of phone number
    let cleanPhone = phone.replace(/\D/g, '');

    // Assume Moroccan numbers if local format (06...)
    if (cleanPhone.startsWith('0')) {
        cleanPhone = '212' + cleanPhone.substring(1);
    }

    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
};
