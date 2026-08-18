import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Truck, ExternalLink, Package, PlusCircle, CheckCircle2 } from 'lucide-react';

export default function ThankYouPage({ order, theme, onBackToCatalog, onAcceptUpsell }) {
    const primaryColor = theme?.primaryColor || '#4f46e5';
    const [upsellStatus, setUpsellStatus] = useState('idle'); // idle, loading, success
    
    // Mock Upsell Offer
    const upsellOffer = {
        name: "Sérum Anti-âge à l'Acide Hyaluronique",
        price: 99,
        originalPrice: 250,
        image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=300&q=80",
        discountText: "OFFRE EXCLUSIVE : -60%"
    };

    // Fallback order info for preview
    const orderNumber = order?.orderNumber || 'CMD-1042';
    const amount = parseFloat(order?.price || 0).toFixed(0) || '0';
    const whatsappNumber = order?.storeWhatsapp || '212600000000';
    
    const whatsappMessage = encodeURIComponent(`Bonjour, j'aimerais accélérer la préparation de ma commande ${orderNumber} au nom de ${order?.clientName || 'Client'}.`);
    const waLink = `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}?text=${whatsappMessage}`;

    const handleAcceptUpsell = () => {
        setUpsellStatus('loading');
        setTimeout(() => {
            setUpsellStatus('success');
            if (onAcceptUpsell) onAcceptUpsell(upsellOffer);
        }, 800);
    };

    return (
        <div className="min-h-[80vh] bg-slate-50 flex items-center justify-center p-4 py-12">
            <div className="max-w-md w-full">
                {/* Success Animation & Header */}
                <div className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/50 text-center relative overflow-hidden">
                    {/* Background confetti / decoration (simplified) */}
                    <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-emerald-50 to-white" />
                    
                    <div className="relative z-10 flex flex-col items-center">
                        <motion.div 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 200, damping: 20 }}
                            className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mb-6"
                        >
                            <motion.svg 
                                className="w-12 h-12 text-emerald-500" 
                                fill="none" 
                                viewBox="0 0 24 24" 
                                stroke="currentColor"
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
                            >
                                <motion.path 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round" 
                                    strokeWidth={3} 
                                    d="M5 13l4 4L19 7" 
                                />
                            </motion.svg>
                        </motion.div>

                        <h1 className="text-3xl font-black text-slate-900 mb-2">Commande confirmée !</h1>
                        <p className="text-slate-500 font-medium">
                            Merci pour votre confiance. Votre commande est en cours de traitement.
                        </p>
                    </div>

                    {/* Order Summary */}
                    <div className="mt-8 border-t border-slate-100 pt-6 space-y-4 text-left">
                        <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Numéro de commande</p>
                                <p className="text-lg font-black text-slate-900">#{orderNumber}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Montant à payer (COD)</p>
                                <p className="text-lg font-black text-emerald-600">{amount} MAD</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100/50">
                            <Truck className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-bold text-amber-900">Paiement à la livraison</p>
                                <p className="text-xs text-amber-700/80 mt-1 font-medium leading-relaxed">
                                    Préparez le montant exact s'il vous plaît. Le livreur vous contactera sur le numéro indiqué avant son passage.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-8 space-y-3">
                        {/* WhatsApp Accelerator */}
                        <a 
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 transition-colors shadow-lg shadow-[#25D366]/20 active:scale-95"
                        >
                            <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" className="h-6 w-6 filter brightness-0 invert" alt="WhatsApp" />
                            Accélérer l'expédition via WhatsApp
                        </a>

                        <button 
                            onClick={onBackToCatalog}
                            className="w-full bg-white border-2 border-slate-200 text-slate-700 hover:border-slate-300 font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-2 transition-colors active:scale-95"
                        >
                            <Package className="w-5 h-5 text-slate-400" />
                            Continuer mes achats
                        </button>
                    </div>
                </div>

                {/* POST-PURCHASE UPSELL SECTION */}
                {theme?.postPurchaseUpsell !== false && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1 }}
                        className="mt-6 bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border-2 overflow-hidden relative"
                        style={{ borderColor: `${primaryColor}40` }}
                    >
                        <div className="absolute top-0 left-0 w-full bg-rose-500 text-white text-center text-xs font-black py-1.5 uppercase tracking-widest animate-pulse">
                            Ne fermez pas cette page !
                        </div>
                        
                        <div className="pt-6 text-center">
                            <h3 className="text-lg font-black text-slate-900 mb-1">Ajoutez ceci à votre commande</h3>
                            <p className="text-sm text-slate-500 mb-4 font-medium">Profitez de cette offre unique (Non disponible sur la boutique)</p>
                            
                            <div className="flex gap-4 items-center bg-slate-50 p-4 rounded-2xl border border-slate-100 text-left mb-6">
                                <img src={upsellOffer.image} alt={upsellOffer.name} className="w-20 h-20 rounded-xl object-cover border border-slate-200" />
                                <div className="flex-1">
                                    <span className="text-[10px] font-black text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full mb-1 inline-block">
                                        {upsellOffer.discountText}
                                    </span>
                                    <h4 className="font-bold text-sm text-slate-900 leading-tight mb-1">{upsellOffer.name}</h4>
                                    <div className="flex items-end gap-2">
                                        <span className="font-black text-lg text-slate-900">{upsellOffer.price} MAD</span>
                                        <span className="text-sm font-medium text-slate-400 line-through mb-0.5">{upsellOffer.originalPrice} MAD</span>
                                    </div>
                                </div>
                            </div>

                            <AnimatePresence mode="wait">
                                {upsellStatus === 'idle' && (
                                    <motion.button 
                                        key="idle"
                                        onClick={handleAcceptUpsell}
                                        className="w-full py-4 rounded-xl font-black text-white transition-transform hover:scale-[1.02] shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
                                        style={{ backgroundColor: '#10b981' }} // Force green for buy
                                    >
                                        <PlusCircle size={20} />
                                        Oui, ajouter à ma commande !
                                    </motion.button>
                                )}
                                {upsellStatus === 'loading' && (
                                    <motion.button 
                                        key="loading"
                                        className="w-full py-4 rounded-xl font-black text-white bg-emerald-400 flex items-center justify-center gap-2 cursor-not-allowed"
                                    >
                                        <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                        Mise à jour de la commande...
                                    </motion.button>
                                )}
                                {upsellStatus === 'success' && (
                                    <motion.div 
                                        key="success"
                                        className="w-full py-4 rounded-xl font-black text-emerald-700 bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center gap-2"
                                    >
                                        <CheckCircle2 size={20} className="text-emerald-500" />
                                        Produit ajouté avec succès !
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            
                            {upsellStatus === 'idle' && (
                                <button className="mt-4 text-xs font-bold text-slate-400 hover:text-slate-600 underline">
                                    Non merci, je refuse cette offre
                                </button>
                            )}
                        </div>
                    </motion.div>
                )}

                <div className="text-center mt-6">
                    <button className="text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors flex items-center justify-center gap-1 mx-auto">
                        Suivre ma commande <ExternalLink className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
