import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, ChevronDown, ChevronUp, Truck, ShieldCheck, Eye, Plus, Minus } from 'lucide-react';

export default function ProductPage({ product, theme, onAddToCart, onExpressCheckout, cities, isCheckingOut }) {
    const primaryColor = theme?.primaryColor || '#4f46e5';
    
    // States
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [viewers, setViewers] = useState(0);
    const [selectedVariant, setSelectedVariant] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const [openAccordion, setOpenAccordion] = useState('description');
    
    // Form State
    const [clientForm, setClientForm] = useState({ name: '', phone: '', city: '', address: '' });

    const handleExpressCheckout = () => {
        if (!clientForm.name || !clientForm.phone) {
            alert("Veuillez remplir votre nom et téléphone.");
            return;
        }
        if (onExpressCheckout) {
            onExpressCheckout({
                product: { ...product, selectedVariant, quantity },
                clientForm
            });
        }
    };
    
    // Mock variants if not provided by the product data
    const variants = product?.variants || [
        { id: '1', color: '#000000', size: 'M', name: 'Noir M' },
        { id: '2', color: '#000000', size: 'L', name: 'Noir L' },
        { id: '3', color: '#ffffff', size: 'M', name: 'Blanc M' },
    ];

    // Images
    const images = product?.images?.length ? product.images : [product?.photoUrl || 'https://via.placeholder.com/800x800?text=Produit'];

    const formRef = useRef(null);

    useEffect(() => {
        // Generate random FOMO viewers between 12 and 89
        setViewers(Math.floor(Math.random() * (89 - 12 + 1)) + 12);
        
        // Select first variant by default
        if (variants.length > 0 && !selectedVariant) {
            setSelectedVariant(variants[0]);
        }
    }, [product]);

    const handleSwipe = (direction) => {
        if (direction === 'left') {
            setCurrentImageIndex((prev) => (prev + 1) % images.length);
        } else if (direction === 'right') {
            setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
        }
    };

    const scrollToForm = () => {
        formRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleAddToCart = () => {
        onAddToCart({
            ...product,
            selectedVariant,
            quantity
        });
    };

    return (
        <div className="bg-white pb-32">
            {/* Image Gallery */}
            <div className="relative w-full aspect-[4/5] md:aspect-square bg-slate-100 overflow-hidden">
                <AnimatePresence initial={false}>
                    <motion.img
                        key={currentImageIndex}
                        src={images[currentImageIndex]}
                        alt={product?.name}
                        className="absolute inset-0 w-full h-full object-cover"
                        initial={{ opacity: 0, x: 100 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={1}
                        onDragEnd={(e, { offset, velocity }) => {
                            const swipe = Math.abs(offset.x) * velocity.x;
                            if (swipe < -10000) handleSwipe('left');
                            else if (swipe > 10000) handleSwipe('right');
                        }}
                    />
                </AnimatePresence>
                
                {/* Urgent Sticker */}
                <div className="absolute top-4 left-4 bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider shadow-lg">
                    🔥 Stock Limité
                </div>

                {/* Dots indicator */}
                {images.length > 1 && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                        {images.map((_, idx) => (
                            <button 
                                key={idx} 
                                onClick={() => setCurrentImageIndex(idx)}
                                className={`w-2 h-2 rounded-full transition-all ${idx === currentImageIndex ? 'w-6 bg-slate-900' : 'bg-slate-400'}`}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Product Details */}
            <div className="px-4 py-6 md:px-8 max-w-2xl mx-auto space-y-6">
                
                {/* Title & FOMO */}
                <div className="space-y-3">
                    <div className="flex items-center gap-1 text-amber-400 text-sm">
                        <Star className="fill-current w-4 h-4" />
                        <Star className="fill-current w-4 h-4" />
                        <Star className="fill-current w-4 h-4" />
                        <Star className="fill-current w-4 h-4" />
                        <Star className="fill-current w-4 h-4" />
                        <span className="text-slate-500 font-medium ml-1">(128 avis)</span>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 leading-tight">
                        {product?.name || 'Nom du Produit'}
                    </h1>
                    {theme?.fomoEnabled !== false && (
                        <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 w-fit">
                            <Eye className="w-4 h-4 text-rose-500 animate-pulse" />
                            <span className="font-medium text-slate-900">{viewers} personnes</span> regardent ce produit.
                        </div>
                    )}
                </div>

                {/* Price */}
                <div className="pt-2 border-t border-slate-100">
                    <div className="flex items-end gap-3">
                        <span className="text-3xl font-black text-slate-900">
                            {parseFloat(product?.price || 0).toFixed(0)} MAD
                        </span>
                        {(product?.originalPrice || (parseFloat(product?.price || 0) * 1.4)) > (product?.price || 0) && (
                            <>
                                <span className="text-lg text-slate-400 line-through mb-1 font-medium">
                                    {(product?.originalPrice || (parseFloat(product?.price || 0) * 1.4)).toFixed(0)} MAD
                                </span>
                                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md mb-1.5">
                                    -30%
                                </span>
                            </>
                        )}
                    </div>
                </div>

                {/* Variants Selector */}
                <div className="space-y-3 pt-4 border-t border-slate-100">
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-slate-900">Options disponibles</span>
                        <span className="text-xs font-medium text-slate-500">{selectedVariant?.name}</span>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        {variants.map((v) => (
                            <button
                                key={v.id}
                                onClick={() => setSelectedVariant(v)}
                                className={`h-12 px-4 rounded-xl border-2 transition-all flex items-center justify-center gap-2 font-medium text-sm
                                    ${selectedVariant?.id === v.id ? 'shadow-md scale-105' : 'border-slate-200 text-slate-600 hover:border-slate-300'}
                                `}
                                style={{ borderColor: selectedVariant?.id === v.id ? primaryColor : undefined, color: selectedVariant?.id === v.id ? primaryColor : undefined }}
                            >
                                {v.color && (
                                    <span className="w-4 h-4 rounded-full border border-slate-200" style={{ backgroundColor: v.color }}></span>
                                )}
                                {v.size}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Quantity & CTA */}
                <div className="flex gap-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between border-2 border-slate-200 rounded-xl px-2 w-32 shrink-0">
                        <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-2 text-slate-500 hover:text-slate-900"><Minus size={18} /></button>
                        <span className="font-bold text-slate-900">{quantity}</span>
                        <button onClick={() => setQuantity(quantity + 1)} className="p-2 text-slate-500 hover:text-slate-900"><Plus size={18} /></button>
                    </div>
                    <button 
                        onClick={handleAddToCart}
                        className="flex-1 rounded-xl text-white font-bold text-lg shadow-xl shadow-current/20 active:scale-95 transition-all"
                        style={{ backgroundColor: primaryColor }}
                    >
                        Ajouter au panier
                    </button>
                </div>

                {/* Accordions */}
                <div className="pt-8 space-y-4">
                    {[
                        { id: 'description', title: 'Description du produit', icon: null, content: product?.description || 'Découvrez ce magnifique produit, idéal pour vos besoins quotidiens. Conçu avec des matériaux de haute qualité pour garantir une longévité maximale.' },
                        { id: 'shipping', title: 'Livraison & Retour (Gratuit)', icon: <Truck className="w-5 h-5 text-slate-400" />, content: 'Nous expédions votre commande dans les 24h. La livraison est 100% gratuite. Vous pouvez ouvrir et vérifier le colis avant de payer le livreur.' },
                        { id: 'guarantee', title: 'Garantie Satisfait ou Remboursé', icon: <ShieldCheck className="w-5 h-5 text-slate-400" />, content: 'Si le produit ne vous convient pas, nous vous le reprenons gratuitement sous 7 jours.' }
                    ].map((item) => (
                        <div key={item.id} className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                            <button 
                                onClick={() => setOpenAccordion(openAccordion === item.id ? null : item.id)}
                                className="w-full flex items-center justify-between p-4 text-left font-bold text-slate-900 hover:bg-slate-50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    {item.icon}
                                    {item.title}
                                </div>
                                {openAccordion === item.id ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                            </button>
                            <AnimatePresence>
                                {openAccordion === item.id && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="px-4 pb-4 text-slate-600 text-sm leading-relaxed"
                                    >
                                        <div className="pt-2 border-t border-slate-200/50">
                                            {item.content}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ))}
                </div>

                {/* Express Checkout Form Anchor */}
                <div ref={formRef} className="pt-12 pb-8">
                    <div className="bg-white border-2 rounded-2xl p-6 shadow-sm relative overflow-hidden" style={{ borderColor: `${primaryColor}30` }}>
                        <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: primaryColor }}></div>
                        <h2 className="text-xl font-black text-slate-900 mb-2">Commande Express (COD)</h2>
                        <p className="text-sm text-slate-500 mb-6">Remplissez vos coordonnées, vous ne paierez qu'à la livraison.</p>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Nom complet *</label>
                                <input 
                                    type="text" 
                                    value={clientForm.name}
                                    onChange={(e) => setClientForm(f => ({ ...f, name: e.target.value }))}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-2 focus:outline-none transition-all" 
                                    style={{ '--tw-ring-color': primaryColor }} 
                                    placeholder="Ex: Mohammed Ali" 
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Téléphone *</label>
                                <input 
                                    type="tel" 
                                    value={clientForm.phone}
                                    onChange={(e) => setClientForm(f => ({ ...f, phone: e.target.value }))}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-2 focus:outline-none transition-all" 
                                    style={{ '--tw-ring-color': primaryColor }} 
                                    placeholder="06 XX XX XX XX" 
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Ville</label>
                                {cities && cities.length > 0 ? (
                                    <select
                                        value={clientForm.city}
                                        onChange={(e) => setClientForm(f => ({ ...f, city: e.target.value }))}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-2 focus:outline-none transition-all"
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
                                        value={clientForm.city}
                                        onChange={(e) => setClientForm(f => ({ ...f, city: e.target.value }))}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-2 focus:outline-none transition-all" 
                                        style={{ '--tw-ring-color': primaryColor }} 
                                        placeholder="Ex: Casablanca" 
                                    />
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Adresse Complète</label>
                                <input 
                                    type="text" 
                                    value={clientForm.address}
                                    onChange={(e) => setClientForm(f => ({ ...f, address: e.target.value }))}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-2 focus:outline-none transition-all" 
                                    style={{ '--tw-ring-color': primaryColor }} 
                                    placeholder="Ex: Quartier Maarif, Rue..." 
                                />
                            </div>
                            
                            <button 
                                onClick={handleExpressCheckout}
                                disabled={isCheckingOut}
                                className="w-full mt-4 rounded-xl text-white font-black text-lg py-4 shadow-xl shadow-current/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:scale-100"
                                style={{ backgroundColor: primaryColor }}
                            >
                                {isCheckingOut ? (
                                    <span className="flex items-center gap-2">
                                        <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                        Validation...
                                    </span>
                                ) : (
                                    'Confirmer ma commande'
                                )}
                            </button>
                            <p className="text-xs text-center text-slate-400 font-medium pt-2 flex items-center justify-center gap-1">
                                <ShieldCheck size={14} /> Vos informations sont sécurisées.
                            </p>
                        </div>
                    </div>
                </div>

            </div>
            
            {/* Sticky Buy Button Mobile */}
            <div className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 p-4 md:hidden z-30 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
                <button 
                    onClick={scrollToForm}
                    className="w-full rounded-xl text-white font-bold text-lg py-4 shadow-xl shadow-current/20 active:scale-95 transition-all flex items-center justify-center"
                    style={{ backgroundColor: primaryColor }}
                >
                    Acheter maintenant
                </button>
            </div>
        </div>
    );
}
