export const defaultAutomations = [
    {
        name: 'Confirmation de Commande (WhatsApp)',
        triggerType: 'order_created',
        actionType: 'send_whatsapp',
        status: 'active',
        nodes: [
            {
                id: 'order_created',
                type: 'trigger',
            },
            {
                id: 'send_whatsapp',
                type: 'action',
                config: {
                    templateKey: 'confirmation',
                    message: "Bonjour {name}, merci pour votre commande de {product} sur {store_name} ! 🛍️\n\nVotre commande d'un montant de {total} (paiement {payment_method}) est bien confirmée et partira bientôt vers {city}.\n\nNous vous enverrons un message dès qu'elle sera expédiée. Merci de votre confiance ! 🙏",
                },
                configPreview: 'WhatsApp: "Bonjour {name}, mer..."'
            }
        ]
    },
    {
        name: 'Alerte Expédition avec Suivi (WhatsApp)',
        triggerType: 'order_updated',
        actionType: 'send_whatsapp',
        status: 'active',
        nodes: [
            {
                id: 'order_updated',
                type: 'trigger',
            },
            {
                id: 'status_equals',
                type: 'condition',
                config: {
                    status: 'livraison'
                },
                configPreview: 'Statut = livraison'
            },
            {
                id: 'send_whatsapp',
                type: 'action',
                config: {
                    templateKey: 'livraison',
                    message: "Bonne nouvelle {name} ! 🎉\n\nVotre commande {product} a été expédiée et est en route vers {city} !\n\nVous pouvez suivre votre colis ici : {tracking}\n\nLe livreur vous contactera bientôt. À très vite ! 🚚",
                },
                configPreview: 'WhatsApp: "Bonne nouvelle {na..."'
            }
        ]
    },
    {
        name: 'Relance Commande Sans Réponse (WhatsApp)',
        triggerType: 'order_updated',
        actionType: 'send_whatsapp',
        status: 'active',
        nodes: [
            {
                id: 'order_updated',
                type: 'trigger',
            },
            {
                id: 'status_equals',
                type: 'condition',
                config: {
                    status: 'pas de réponse'
                },
                configPreview: 'Statut = pas de réponse'
            },
            {
                id: 'send_whatsapp',
                type: 'action',
                config: {
                    templateKey: 'pas de réponse',
                    message: "Bonjour {name}. Nous avons essayé de vous joindre concernant votre commande sur {store_name} mais sans succès 📞\n\nPourriez-vous nous confirmer si vous êtes toujours intéressé(e) par la livraison de votre colis vers {city} à l'adresse fournie ({delivery_address}) ?\n\nMerci de nous tenir informés en répondant à ce message. Bonne journée !",
                },
                configPreview: 'WhatsApp: "Bonjour {name}. No..."'
            }
        ]
    }
];
