import { motion } from 'framer-motion';
import { Star, Gift, ChevronRight, TrendingUp, Award, Sparkles } from 'lucide-react';
import { getCustomerLoyalty, NQAT_CONFIG } from '../utils/loyaltyEngine';
import { useLanguage } from '../context/LanguageContext';

/**
 * LoyaltyCard — Carte de fidélité premium avec glassmorphism
 * Affiche : niveau actuel, points, barre de progression, récompenses disponibles
 */
export default function LoyaltyCard({ customer, onClose, compact = false }) {
    const { t } = useLanguage();
    const loyalty = getCustomerLoyalty(customer);
    const { points, level, availableRewards } = loyalty;

    if (compact) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${level.bgColor} ${level.borderColor} border cursor-pointer hover:shadow-md transition-shadow`}
            >
                <span className="text-sm">{level.icon}</span>
                <span className={`text-xs font-bold ${level.textColor}`}>
                    {points} Nqat
                </span>
                <span className={`text-[10px] font-medium ${level.textColor} opacity-70`}>
                    {level.name}
                </span>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden"
        >
            {/* Main Card */}
            <div className={`relative bg-gradient-to-br ${level.color} rounded-2xl p-6 text-white shadow-xl overflow-hidden`}>
                {/* Decorative circles */}
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full" />
                <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/5 rounded-full" />
                <div className="absolute top-1/2 right-1/4 w-20 h-20 bg-white/5 rounded-full" />

                {/* Header */}
                <div className="relative z-10 flex items-start justify-between mb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Sparkles className="w-5 h-5 text-white/80" />
                            <span className="text-xs font-medium text-white/70 uppercase tracking-wider">Programme Nqat</span>
                        </div>
                        <h3 className="text-xl font-bold">{customer?.name || 'Client'}</h3>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-black">{level.icon}</div>
                        <span className="text-xs font-bold uppercase tracking-widest text-white/80">{level.name}</span>
                    </div>
                </div>

                {/* Points Display */}
                <div className="relative z-10 mb-6">
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black tracking-tight">{loyalty.formattedPoints}</span>
                        <span className="text-lg font-semibold text-white/70">Nqat</span>
                    </div>
                    <span className="text-xs text-white/60">
                        {loyalty.totalSpent.toLocaleString('fr-FR')} DH dépensés au total
                    </span>
                </div>

                {/* Progress to Next Level */}
                {level.nextLevel && (
                    <div className="relative z-10">
                        <div className="flex justify-between items-center mb-1.5">
                            <span className="text-xs text-white/70">
                                Prochain niveau: {level.nextLevel.icon} {level.nextLevel.name}
                            </span>
                            <span className="text-xs font-bold text-white/90">
                                {level.pointsToNext} pts restants
                            </span>
                        </div>
                        <div className="w-full bg-white/20 rounded-full h-2.5 overflow-hidden backdrop-blur-sm">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${level.progressPercent}%` }}
                                transition={{ duration: 1, ease: 'easeOut' }}
                                className="h-full bg-white/90 rounded-full shadow-sm"
                            />
                        </div>
                        <span className="text-[10px] text-white/50 mt-1 block">
                            {level.progressPercent}% du niveau {level.nextLevel.name}
                        </span>
                    </div>
                )}

                {level.progressPercent === 100 && !level.nextLevel && (
                    <div className="relative z-10 flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2 backdrop-blur-sm">
                        <Award className="w-4 h-4" />
                        <span className="text-xs font-medium">Niveau maximum atteint ! 🎉</span>
                    </div>
                )}
            </div>

            {/* Perks Section */}
            <div className="mt-4 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-50 flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-bold text-gray-800">Avantages {level.name}</span>
                </div>
                <div className="p-3 space-y-2">
                    {level.perks.map((perk, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                            <span>{perk}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Available Rewards */}
            {availableRewards.length > 0 && (
                <div className="mt-4 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-50 flex items-center gap-2">
                        <Gift className="w-4 h-4 text-rose-500" />
                        <span className="text-sm font-bold text-gray-800">Récompenses disponibles</span>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {NQAT_CONFIG.rewards.map((reward) => {
                            const canAfford = points >= reward.pointsCost;
                            return (
                                <div key={reward.id} className={`flex items-center justify-between px-4 py-3 ${!canAfford ? 'opacity-40' : 'hover:bg-gray-50 cursor-pointer'} transition-colors`}>
                                    <div>
                                        <span className="text-sm font-medium text-gray-800">{reward.name}</span>
                                        <span className="text-xs text-gray-500 ml-2">{reward.pointsCost} pts</span>
                                    </div>
                                    {canAfford ? (
                                        <ChevronRight className="w-4 h-4 text-gray-400" />
                                    ) : (
                                        <span className="text-[10px] text-gray-400 font-medium">
                                            -{reward.pointsCost - points} pts
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* How to earn */}
            <div className="mt-4 p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-indigo-500" />
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Comment gagner des Nqat</span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">
                    Chaque <strong>10 DH</strong> dépensés vous rapportent <strong>1 Nqat</strong>.
                    Montez de niveau pour débloquer des avantages exclusifs et des remises.
                </p>
            </div>
        </motion.div>
    );
}
