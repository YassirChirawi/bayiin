import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, Plus, Minus, Trash2, ArrowRight, Zap, ChevronLeft } from 'lucide-react';

import { useCart } from '../../context/CartContext';

export default function CartDrawer({ 
    theme,
    upsellProduct,
    onAddUpsell,
    isCheckingOut,
    onCheckoutClick,
    // PublicCatalog et StorefrontPreview passaient deja `cities`, mais la prop
    // n'etait pas declaree : l'etape « Ville » du tunnel referencait un
    // identifiant inexistant et levait une ReferenceError au rendu. Le client
    // du marchand ne pouvait pas finaliser sa commande.
    cities = [],
}) {
    const { isCartOpen: isOpen, closeCart: onClose, cartItems: cart, updateQuantity: onUpdateQuantity, removeFromCart: onRemove, cartTotal: total } = useCart();
    const primaryColor = theme?.primaryColor || '#4f46e5';
    
    const [isCheckoutStep, setIsCheckoutStep] = useState(false);
    const [clientForm, setClientForm] = useState({ name: '', phone: '', city: '', address: '' });

    const cartTotal = total || 0;
    const freeShippingThreshold = 300; // configurable later
    const amountToFreeShipping = Math.max(0, freeShippingThreshold - cartTotal);
    const progress = Math.min(100, (cartTotal / freeShippingThreshold) * 100);

    // Reset step when closed
    React.useEffect(() => {
        if (!isOpen) {
            setTimeout(() => setIsCheckoutStep(false), 300);
        }
    }, [isOpen]);

    const handleCheckoutSubmit = () => {
        if (!clientForm.name || !clientForm.phone) {
            alert("Veuillez remplir votre nom et téléphone.");
            return;
        }
        if (onCheckoutClick) {
            onCheckoutClick(clientForm);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed inset-y-0 right-0 w-full sm:w-[400px] bg-slate-50 shadow-2xl z-50 flex flex-col"
                    >
                        {/* Header */}
                        <div className="px-6 py-5 bg-white border-b border-slate-100 flex justify-between items-center shrink-0">
                            {isCheckoutStep ? (
                                <button onClick={() => setIsCheckoutStep(false)} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-bold text-lg">
                                    <ChevronLeft size={20} />
                                    Retour
                                </button>
                            ) : (
                                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                                    <ShoppingBag className="w-6 h-6" style={{ color: primaryColor }} />
                                    Mon Panier
                                </h2>
                            )}
                            <button 
                                onClick={onClose} 
                                className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {!isCheckoutStep ? (
                            <>
                                {/* Shipping Progress */}
                                {cart.length > 0 && (
                                    <div className="px-6 py-4 bg-white border-b border-slate-100 shrink-0">
                                        {amountToFreeShipping > 0 ? (
                                            <>
                                                <p className="text-sm text-slate-600 mb-2 font-medium">
                                                    🚚 Plus que <strong style={{ color: primaryColor }}>{amountToFreeShipping.toFixed(0)} MAD</strong> pour la livraison gratuite !
                                                </p>
                                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                                    <motion.div 
                                                        className="h-full rounded-full"
                                                        style={{ backgroundColor: primaryColor }}
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${progress}%` }}
                                                        transition={{ duration: 0.5, ease: "easeOut" }}
                                                    />
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-2 rounded-lg text-sm font-bold">
                                                <Zap size={16} className="fill-current" />
                                                Félicitations, livraison gratuite débloquée !
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Cart Items */}
                                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                    {cart.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                                            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center">
                                                <ShoppingBag size={40} className="opacity-50" />
                                            </div>
                                            <p className="font-medium text-lg text-slate-500">Votre panier est vide</p>
                                        </div>
                                    ) : (
                                        <AnimatePresence>
                                            {cart.map(item => (
                                                <motion.div 
                                                    layout
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, scale: 0.9 }}
                                                    key={item.id + (item.selectedVariant?.id || '')} 
                                                    className="flex gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100"
                                                >
                                                    <div className="w-20 h-24 bg-slate-100 rounded-xl overflow-hidden shrink-0 border border-slate-200">
                                                        <img src={item.photoUrl || item.images?.[0] || 'https://via.placeholder.com/150'} alt={item.name} className="w-full h-full object-cover" />
                                                    </div>
                                                    <div className="flex-1 flex flex-col justify-between">
                                                        <div className="flex justify-between items-start gap-2">
                                                            <div>
                                                                <h3 className="font-bold text-slate-900 text-sm line-clamp-2">{item.name}</h3>
                                                                {item.selectedVariant && (
                                                                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                                                                        Variante: {item.selectedVariant.name}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <button onClick={() => onRemove(item.id)} className="text-slate-400 hover:text-red-500 transition-colors p-1">
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                        <div className="flex justify-between items-end mt-2">
                                                            <span className="font-black text-slate-900">{parseFloat(item.price).toFixed(0)} MAD</span>
                                                            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
                                                                <button onClick={() => onUpdateQuantity(item.id, -1)} className="text-slate-500 hover:text-slate-900 p-1"><Minus size={14} /></button>
                                                                <span className="text-sm font-bold text-slate-900 w-4 text-center">{item.quantity}</span>
                                                                <button onClick={() => onUpdateQuantity(item.id, 1)} className="text-slate-500 hover:text-slate-900 p-1"><Plus size={14} /></button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>
                                    )}
                                </div>

                                {/* Upsell Module */}
                                {upsellProduct && cart.length > 0 && (
                                    <div className="px-6 pb-4 shrink-0">
                                        <div className="bg-slate-100 rounded-2xl p-4 border border-slate-200/60 relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-amber-200 to-amber-400 rounded-bl-[40px] opacity-20 pointer-events-none" />
                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Offre spéciale pour vous</p>
                                            <div className="flex gap-3 items-center">
                                                <img src={upsellProduct.photoUrl} alt="" className="w-14 h-14 rounded-lg object-cover bg-white" />
                                                <div className="flex-1">
                                                    <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{upsellProduct.name}</h4>
                                                    <p className="text-xs font-bold" style={{ color: primaryColor }}>+{parseFloat(upsellProduct.price).toFixed(0)} MAD</p>
                                                </div>
                                                <button 
                                                    onClick={() => onAddUpsell(upsellProduct)}
                                                    className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-md active:scale-95 transition-transform"
                                                    style={{ backgroundColor: primaryColor }}
                                                >
                                                    <Plus size={20} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Footer / Checkout */}
                                {cart.length > 0 && (
                                    <div className="p-6 bg-white border-t border-slate-100 shrink-0 space-y-4 shadow-[0_-10px_20px_rgba(0,0,0,0.03)] z-10 relative">
                                        <div className="flex justify-between items-center text-lg font-black text-slate-900">
                                            <span>Total (TTC)</span>
                                            <span>{cartTotal.toFixed(0)} MAD</span>
                                        </div>
                                        
                                        <button 
                                            onClick={() => setIsCheckoutStep(true)}
                                            className="w-full py-4 rounded-xl text-white font-black text-lg shadow-xl shadow-current/20 active:scale-95 transition-all flex justify-center items-center gap-2 group"
                                            style={{ backgroundColor: primaryColor }}
                                        >
                                            Valider ma commande
                                            <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                                        </button>
                                        <p className="text-xs text-center font-medium text-slate-400 flex items-center justify-center gap-1.5">
                                            <Zap size={14} className="fill-current text-amber-400" />
                                            Paiement à la livraison
                                        </p>
                                    </div>
                                )}
                            </>
                        ) : (
                            // CHECKOUT FORM STEP
                            <div className="flex-1 overflow-y-auto p-6 flex flex-col">
                                <h3 className="text-xl font-bold text-slate-900 mb-6">Vos coordonnées de livraison</h3>
                                
                                <div className="space-y-4 flex-1">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Nom Complet *</label>
                                        <input 
                                            type="text" 
                                            placeholder="ex: Ahmed" 
                                            value={clientForm.name} 
                                            onChange={e => setClientForm(f => ({ ...f, name: e.target.value }))} 
                                            className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 outline-none transition-shadow" 
                                            style={{ '--tw-ring-color': primaryColor }}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Numéro de Téléphone *</label>
                                        <input 
                                            type="tel" 
                                            placeholder="ex: 06 00 00 00 00" 
                                            value={clientForm.phone} 
                                            onChange={e => setClientForm(f => ({ ...f, phone: e.target.value }))} 
                                            className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 outline-none transition-shadow" 
                                            style={{ '--tw-ring-color': primaryColor }}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Ville</label>
                                        {cities && cities.length > 0 ? (
                                            <select
                                                value={clientForm.city} 
                                                onChange={e => setClientForm(f => ({ ...f, city: e.target.value }))} 
                                                className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 outline-none transition-shadow bg-white" 
                                                style={{ '--tw-ring-color': primaryColor }}
                                            >
                                                <option value="">Sélectionnez votre ville</option>
                                                {cities.map(city => (
                                                    <option key={city.id} value={city.name}>{city.name}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <input 
                                                type="text" 
                                                placeholder="ex: Casablanca" 
                                                value={clientForm.city} 
                                                onChange={e => setClientForm(f => ({ ...f, city: e.target.value }))} 
                                                className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 outline-none transition-shadow" 
                                                style={{ '--tw-ring-color': primaryColor }}
                                            />
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Adresse Complète</label>
                                        <input 
                                            type="text" 
                                            placeholder="ex: Quartier Maarif, Rue..." 
                                            value={clientForm.address} 
                                            onChange={e => setClientForm(f => ({ ...f, address: e.target.value }))} 
                                            className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 outline-none transition-shadow" 
                                            style={{ '--tw-ring-color': primaryColor }}
                                        />
                                    </div>
                                </div>
                                
                                <div className="mt-8">
                                    <button 
                                        onClick={handleCheckoutSubmit}
                                        disabled={isCheckingOut}
                                        className="w-full py-4 rounded-xl text-white font-black text-lg shadow-xl shadow-current/20 active:scale-95 transition-all flex justify-center items-center gap-2 disabled:opacity-70 disabled:scale-100"
                                        style={{ backgroundColor: '#25D366' }}
                                    >
                                        {isCheckingOut ? (
                                            <span className="flex items-center gap-2">
                                                <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                                Validation...
                                            </span>
                                        ) : (
                                            <>
                                                Commander via WhatsApp
                                                <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
