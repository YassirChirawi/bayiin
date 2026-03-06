import {
    CheckCircle, XCircle, PhoneMissed, Clock,
    Truck, Package, AlertCircle, Home, MapPin,
    RotateCcw
} from "lucide-react";

export const ORDER_STATUS = {
    RECEIVED: 'reçu',
    CONFIRMED: 'confirmation',
    PACKING: 'packing',
    RAMASSAGE: 'ramassage',
    SHIPPING: 'livraison',
    DELIVERED: 'livré',
    PAID: 'payé',
    CANCELLED: 'annulé',
    RETURNED: 'retour',
    RETURN_IN_PROGRESS: 'retour en cours',
    NO_ANSWER: 'pas de réponse',
    POSTPONED: 'reporté',
    PENDING_CATALOG: 'pending_catalog'
};

export const ORDER_STATUS_CONFIG = {
    [ORDER_STATUS.RECEIVED]: {
        label: 'Reçu',
        color: 'bg-gray-100 text-gray-800',
        icon: Package
    },
    [ORDER_STATUS.CONFIRMED]: {
        label: 'Confirmé',
        color: 'bg-blue-100 text-blue-800',
        icon: CheckCircle
    },
    [ORDER_STATUS.PACKING]: {
        label: 'Packing',
        color: 'bg-yellow-100 text-yellow-800',
        icon: Package
    },
    [ORDER_STATUS.RAMASSAGE]: {
        label: 'À Ramasser',
        color: 'bg-orange-100 text-orange-800',
        icon: Package
    },
    [ORDER_STATUS.SHIPPING]: {
        label: 'En Livraison',
        color: 'bg-purple-100 text-purple-800',
        icon: Truck
    },
    [ORDER_STATUS.DELIVERED]: {
        label: 'Livré',
        color: 'bg-green-100 text-green-800',
        icon: CheckCircle
    },
    [ORDER_STATUS.PAID]: {
        label: 'Payé',
        color: 'bg-emerald-100 text-emerald-800',
        icon: CheckCircle
    },
    [ORDER_STATUS.CANCELLED]: {
        label: 'Annulé',
        color: 'bg-gray-100 text-gray-400 line-through', // Reverting to original Orders.jsx styling for cancelled, or keep red? Let's use red-100
        icon: AlertCircle
    },
    [ORDER_STATUS.RETURNED]: {
        label: 'Retour Déposé',
        color: 'bg-red-100 text-red-800',
        icon: RotateCcw
    },
    [ORDER_STATUS.RETURN_IN_PROGRESS]: {
        label: 'Retour Livreur',
        color: 'bg-rose-100 text-rose-700',
        icon: RotateCcw
    },
    [ORDER_STATUS.NO_ANSWER]: {
        label: 'Pas de réponse',
        color: 'bg-amber-100 text-amber-800',
        icon: PhoneMissed
    },
    [ORDER_STATUS.POSTPONED]: {
        label: 'Reporté',
        color: 'bg-gray-100 text-gray-700',
        icon: Clock
    },
    [ORDER_STATUS.PENDING_CATALOG]: {
        label: 'Panier',
        color: 'bg-yellow-100 text-yellow-800',
        icon: Package
    }
};

export const getOrderStatusConfig = (status) => {
    // Return the config or a safe fallback
    return ORDER_STATUS_CONFIG[status] || {
        label: status || 'Inconnu',
        color: 'bg-gray-100 text-gray-800',
        icon: MapPin
    };
};

// Also export tracking specific mappings (often fully capitalized and external)
export const TRACKING_STATUS_CONFIG = {
    'DELIVERED': ORDER_STATUS_CONFIG[ORDER_STATUS.DELIVERED],
    'LIVRÉ': ORDER_STATUS_CONFIG[ORDER_STATUS.DELIVERED],
    'CANCELED': ORDER_STATUS_CONFIG[ORDER_STATUS.CANCELLED],
    'ANNULÉ': ORDER_STATUS_CONFIG[ORDER_STATUS.CANCELLED],
    'REFUSE': ORDER_STATUS_CONFIG[ORDER_STATUS.RETURNED],
    'REFUSÉ': ORDER_STATUS_CONFIG[ORDER_STATUS.RETURNED],
    'DELIVERING': ORDER_STATUS_CONFIG[ORDER_STATUS.SHIPPING],
    'EN COURS DE LIVRAISON': ORDER_STATUS_CONFIG[ORDER_STATUS.SHIPPING],
    'PICKED_UP': ORDER_STATUS_CONFIG[ORDER_STATUS.RAMASSAGE],
    'RAMASSÉ': ORDER_STATUS_CONFIG[ORDER_STATUS.RAMASSAGE],
    'WAREHOUSE': { label: 'Entrepôt', color: 'bg-indigo-100 text-indigo-800', icon: Home },
    'ENTREPÔT': { label: 'Entrepôt', color: 'bg-indigo-100 text-indigo-800', icon: Home },
    'CREATED': { label: 'Créé', color: 'bg-gray-100 text-gray-500', icon: Clock },
    'PENDING': { label: 'En attente', color: 'bg-gray-100 text-gray-500', icon: Clock },
    'FAILED': { label: 'Échec', color: 'bg-red-100 text-red-800', icon: AlertCircle },
    'ÉCHEC': { label: 'Échec', color: 'bg-red-100 text-red-800', icon: AlertCircle },
};

export const getTrackingStatusConfig = (status) => {
    if (!status) return { label: 'Inconnu', color: 'bg-gray-100 text-gray-500', icon: MapPin };
    const normalized = typeof status === 'string' ? status.toUpperCase() : String(status);
    return TRACKING_STATUS_CONFIG[normalized] || {
        label: status,
        color: 'bg-gray-100 text-gray-500',
        icon: MapPin
    };
};
