import React from 'react';
import { motion } from 'framer-motion';
import { Truck, ExternalLink, Package } from 'lucide-react';

export default function ThankYouPage({ order, theme, onBackToCatalog }) {
    const primaryColor = theme?.primaryColor || '#4f46e5';
    
    // Fallback order info for preview
    const orderNumber = order?.orderNumber || 'CMD-1042';
    const amount = parseFloat(order?.price || 0).toFixed(0) || '0';
    const whatsappNumber = order?.storeWhatsapp || '212600000000';
    
    const whatsappMessage = encodeURIComponent(`Bonjour, j'aimerais accélérer la préparation de ma commande ${orderNumber} au nom de ${order?.clientName || 'Client'}.`);
    const waLink = `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}?text=${whatsappMessage}`;

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

                <div className="text-center mt-6">
                    <button className="text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors flex items-center justify-center gap-1 mx-auto">
                        Suivre ma commande <ExternalLink className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
