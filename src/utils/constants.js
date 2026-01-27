export const ORDER_STATUS = {
    RECEIVED: 'reçu',
    CONFIRMED: 'confirmation',
    PACKING: 'packing',
    SHIPPING: 'livraison', // En cours de livraison
    DELIVERED: 'livré',
    PAID: 'payé', // Might be a separate flag, but keeping as status for legacy compat for now
    CANCELLED: 'annulé',
    RETURNED: 'retour',
    NO_ANSWER: 'pas de réponse',
    POSTPONED: 'reporté'
};

export const ORDER_STATUS_LABELS = {
    [ORDER_STATUS.RECEIVED]: { label: 'Reçu', color: 'bg-gray-100 text-gray-800' },
    [ORDER_STATUS.CONFIRMED]: { label: 'Confirmé', color: 'bg-blue-100 text-blue-800' },
    [ORDER_STATUS.PACKING]: { label: 'Packing', color: 'bg-yellow-100 text-yellow-800' },
    [ORDER_STATUS.SHIPPING]: { label: 'En Livraison', color: 'bg-purple-100 text-purple-800' },
    [ORDER_STATUS.DELIVERED]: { label: 'Livré', color: 'bg-green-100 text-green-800' },
    [ORDER_STATUS.PAID]: { label: 'Payé', color: 'bg-emerald-100 text-emerald-800' },
    [ORDER_STATUS.CANCELLED]: { label: 'Annulé', color: 'bg-red-100 text-red-800' },
    [ORDER_STATUS.RETURNED]: { label: 'Retour', color: 'bg-orange-100 text-orange-800' },
    [ORDER_STATUS.NO_ANSWER]: { label: 'Pas de réponse', color: 'bg-gray-400 text-white' },
    [ORDER_STATUS.POSTPONED]: { label: 'Reporté', color: 'bg-indigo-100 text-indigo-800' }
};

export const PAYMENT_METHODS = {
    COD: 'cod',
    BANK_TRANSFER: 'virement',
    CARD: 'carte'
};

export const PAYMENT_METHOD_LABELS = {
    [PAYMENT_METHODS.COD]: 'Paiement à la livraison (Cash)',
    [PAYMENT_METHODS.BANK_TRANSFER]: 'Virement Bancaire',
    [PAYMENT_METHODS.CARD]: 'Carte Bancaire'
};
