/**
 * loyaltyEngine.js — Nqat Loyalty Program Engine
 * 
 * Règles:
 * - 1 Nqat = 10 DH dépensés (configurable)
 * - Niveaux: Bronze, Silver, Gold, Platinum
 * - Récompenses par niveau
 */

// --- CONFIGURATION ---
export const NQAT_CONFIG = {
    pointsPerDH: 0.1,      // 1 Nqat pour 10 DH (0.1 point par DH)
    currency: 'DH',
    levels: [
        { 
            id: 'bronze', 
            name: 'Bronze', 
            minPoints: 0, 
            maxPoints: 99,
            color: 'from-amber-600 to-amber-800',
            bgColor: 'bg-amber-50',
            textColor: 'text-amber-800',
            borderColor: 'border-amber-200',
            icon: '🥉',
            perks: ['Accès au programme']
        },
        { 
            id: 'silver', 
            name: 'Silver', 
            minPoints: 100, 
            maxPoints: 499,
            color: 'from-gray-400 to-gray-600',
            bgColor: 'bg-gray-50',
            textColor: 'text-gray-700',
            borderColor: 'border-gray-300',
            icon: '🥈',
            perks: ['5% de remise', 'Accès prioritaire']
        },
        { 
            id: 'gold', 
            name: 'Gold', 
            minPoints: 500, 
            maxPoints: 999,
            color: 'from-yellow-400 to-amber-500',
            bgColor: 'bg-yellow-50',
            textColor: 'text-yellow-800',
            borderColor: 'border-yellow-300',
            icon: '🥇',
            perks: ['10% de remise', 'Livraison gratuite', 'Accès VIP']
        },
        { 
            id: 'platinum', 
            name: 'Platinum', 
            minPoints: 1000, 
            maxPoints: Infinity,
            color: 'from-violet-500 to-purple-700',
            bgColor: 'bg-violet-50',
            textColor: 'text-violet-800',
            borderColor: 'border-violet-300',
            icon: '💎',
            perks: ['15% de remise', 'Livraison gratuite', 'Produits exclusifs', 'Support prioritaire']
        }
    ],
    rewards: [
        { id: 'discount_5', name: '5% de remise', pointsCost: 50, type: 'discount', value: 5 },
        { id: 'discount_10', name: '10% de remise', pointsCost: 100, type: 'discount', value: 10 },
        { id: 'free_shipping', name: 'Livraison gratuite', pointsCost: 75, type: 'free_shipping', value: 0 },
        { id: 'discount_20', name: '20% de remise', pointsCost: 200, type: 'discount', value: 20 },
    ]
};

// --- CALCUL DES POINTS ---

/**
 * Calcule les points Nqat accumulés pour un montant donné
 * @param {number} amountDH - Montant en DH
 * @returns {number} - Points Nqat
 */
export function calculatePoints(amountDH) {
    return Math.floor((amountDH || 0) * NQAT_CONFIG.pointsPerDH);
}

/**
 * Détermine le niveau de fidélité d'un client
 * @param {number} totalPoints - Total de points accumulés
 * @returns {object} - Objet niveau { id, name, color, icon, perks, ... }
 */
export function getLevel(totalPoints) {
    const points = totalPoints || 0;
    const levels = NQAT_CONFIG.levels;
    
    for (let i = levels.length - 1; i >= 0; i--) {
        if (points >= levels[i].minPoints) {
            return {
                ...levels[i],
                currentPoints: points,
                nextLevel: levels[i + 1] || null,
                pointsToNext: levels[i + 1] ? levels[i + 1].minPoints - points : 0,
                progressPercent: levels[i + 1] 
                    ? Math.min(100, Math.round(((points - levels[i].minPoints) / (levels[i + 1].minPoints - levels[i].minPoints)) * 100))
                    : 100
            };
        }
    }
    return { ...levels[0], currentPoints: points, progressPercent: 0 };
}

/**
 * Calcule les points d'un client depuis son historique de commandes
 * @param {object} customer - Customer object with totalSpent
 * @returns {object} - { points, level, rewards }
 */
export function getCustomerLoyalty(customer) {
    const totalSpent = customer?.totalSpent || 0;
    const points = calculatePoints(totalSpent);
    const level = getLevel(points);
    const availableRewards = NQAT_CONFIG.rewards.filter(r => r.pointsCost <= points);

    return {
        points,
        level,
        availableRewards,
        totalSpent,
        formattedPoints: points.toLocaleString('fr-FR'),
    };
}

/**
 * Calcule les points gagnés par une commande spécifique
 * @param {object} order - Order with price and quantity
 * @returns {number} - Points earned
 */
export function getOrderPoints(order) {
    const total = (parseFloat(order.price) || 0) * (parseInt(order.quantity) || 1);
    return calculatePoints(total);
}
