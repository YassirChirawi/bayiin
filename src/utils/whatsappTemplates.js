// Default Templates
export const DEFAULT_TEMPLATES = {
    'reçu': "Bonjour [Client], [Store] a bien reçu votre commande [Commande] pour [Produit].\n\n📄 *Détails* :\n[Ticket]\n\nVotre commande sera expédiée à [Ville]. Merci !",
    'packing': "Bonjour [Client], votre commande [Commande] est en cours de préparation chez [Store].",
    'ramassage': "Bonjour [Client], votre commande est prête pour le ramassage.",
    'livraison': "Bonjour [Client], votre commande [Commande] est en cours de livraison sur [Ville]. Le livreur vous contactera bientôt.",
    'livré': "Bonjour [Client], votre commande a été livrée avec succès. Merci de votre confiance en [Store] !",
    'pas de réponse': "Bonjour [Client], [Store] a tenté de vous joindre concernant votre commande sans succès.",
    'retour': "Bonjour [Client], votre commande [Commande] nous a été retournée."
};

/**
 * Generates the WhatsApp message content
 * @param {string} status 
 * @param {object} order - Full order object
 * @param {object} store - Store object containing name and templates
 */
export const getWhatsappMessage = (status, order, store) => {
    // 1. Get the template: Custom > Default > Fallback
    const customTemplates = store?.whatsappTemplates || {};
    const rawTemplate = customTemplates[status] || DEFAULT_TEMPLATES[status] || "Bonjour [Client], mise à jour concernant votre commande.";

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
        ticketText = `----------------\n📦 Article: ${productName}\n💰 Sous-total: ${subtotal.toFixed(2)} DH\n🚚 Livraison: ${shipping.toFixed(2)} DH\n💵 *TOTAL: ${total.toFixed(2)} DH*\n----------------`;
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
