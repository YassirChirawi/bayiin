export const ORDER_STATUS_TEMPLATES = {
    'reçu': "Bonjour [Client], nous avons bien reçu votre commande.",
    'packing': "Bonjour [Client], votre commande est en cours de préparation.",
    'ramassage': "Bonjour [Client], votre commande est prête pour le ramassage.",
    'livraison': "Bonjour [Client], votre commande est en cours de livraison. Le livreur vous contactera bientôt.",
    'livré': "Bonjour [Client], votre commande a été livrée avec succès. Merci de votre confiance !",
    'pas de réponse': "Bonjour [Client], nous avons tenté de vous joindre concernant votre commande sans succès.",
    'retour': "Bonjour [Client], votre commande nous a été retournée."
};

export const getWhatsappMessage = (status, clientName) => {
    const template = ORDER_STATUS_TEMPLATES[status] || "Bonjour [Client], mise à jour concernant votre commande.";
    return template.replace("[Client]", clientName || "Client");
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
