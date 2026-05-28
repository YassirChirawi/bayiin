import React, { useState } from 'react';
import { ShieldCheck, Truck, Lock, MapPin, CreditCard } from 'lucide-react';

export default function StorefrontCheckout({ theme, cart, cities, onCheckout, isCheckingOut }) {
    // If no cities from ERP, provide a fallback for testing
    const defaultCities = [
        { id: 1, name: "Casablanca", deliveryFee: 20 },
        { id: 2, name: "Rabat", deliveryFee: 35 },
        { id: 3, name: "Marrakech", deliveryFee: 40 },
        { id: 4, name: "Tanger", deliveryFee: 45 }
    ];

    const availableCities = cities && cities.length > 0 ? cities : defaultCities;

    const [clientForm, setClientForm] = useState({
        firstName: '',
        lastName: '',
        phone: '',
        city: availableCities[0].name,
        address: ''
    });

    const [bumpAccepted, setBumpAccepted] = useState(false);
    // Mock bump offer
    const bumpOffer = {
        name: "Livraison Express VIP (Prioritaire)",
        price: 29.00,
        description: "Traitement prioritaire de votre commande pour une expédition le jour même."
    };

    const selectedCityObj = availableCities.find(c => c.name === clientForm.city) || availableCities[0];
    
    let cartSubtotal = cart.reduce((acc, item) => acc + (parseFloat(item.price) * item.quantity), 0);
    if (bumpAccepted) {
        cartSubtotal += bumpOffer.price;
    }
    const shippingFee = selectedCityObj ? (selectedCityObj.deliveryFee || selectedCityObj.fee || 0) : 0;
    
    // In a real scenario, discount would be fetched from ERP or promo code
    const discount = 0; 
    
    const netTotal = cartSubtotal - discount + shippingFee;

    const handleSubmit = () => {
        if (!clientForm.firstName || !clientForm.lastName || !clientForm.phone || !clientForm.address) {
            alert("Veuillez remplir tous les champs obligatoires.");
            return;
        }
        
        onCheckout({
            name: `${clientForm.firstName} ${clientForm.lastName}`,
            phone: clientForm.phone,
            city: clientForm.city,
            address: clientForm.address,
            shippingFee,
            netTotal
        });
    };

    if (cart.length === 0) {
        return (
            <div className="max-w-4xl mx-auto p-6 my-8 text-center">
                <h1 className="text-2xl font-bold mb-4">Votre panier est vide</h1>
                <p className="text-slate-500">Ajoutez des produits pour procéder au paiement.</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-6 my-4 md:my-8 animate-in fade-in">
            <h1 className="text-2xl md:text-3xl font-black text-center mb-8">Paiement Sécurisé</h1>
            
            <div className="flex flex-col lg:flex-row gap-8">
                
                {/* Formulaire Client (Gauche) */}
                <div className="flex-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <MapPin className="text-indigo-600" /> Informations de Livraison
                    </h2>
                    
                    <div className="space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Prénom *</label>
                                <input 
                                    type="text" 
                                    value={clientForm.firstName}
                                    onChange={e => setClientForm({...clientForm, firstName: e.target.value})}
                                    placeholder="Ahmed" 
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:outline-none transition-shadow"
                                    style={{ '--tw-ring-color': theme.primaryColor }}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Nom *</label>
                                <input 
                                    type="text" 
                                    value={clientForm.lastName}
                                    onChange={e => setClientForm({...clientForm, lastName: e.target.value})}
                                    placeholder="Benali" 
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:outline-none transition-shadow"
                                    style={{ '--tw-ring-color': theme.primaryColor }}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Téléphone *</label>
                            <div className="flex">
                                <span className="inline-flex items-center px-4 rounded-l-xl border border-r-0 border-slate-200 bg-slate-50 text-slate-500 font-bold">
                                    +212
                               </span>
                                <input 
                                    type="tel" 
                                    value={clientForm.phone}
                                    onChange={e => setClientForm({...clientForm, phone: e.target.value})}
                                    placeholder="6 00 00 00 00" 
                                    className="w-full px-4 py-3 rounded-r-xl border border-slate-200 focus:ring-2 focus:outline-none transition-shadow"
                                    style={{ '--tw-ring-color': theme.primaryColor }}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Ville de livraison *</label>
                            <select 
                                value={clientForm.city}
                                onChange={e => setClientForm({...clientForm, city: e.target.value})}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:outline-none bg-white font-medium transition-shadow"
                                style={{ '--tw-ring-color': theme.primaryColor }}
                            >
                                {availableCities.map(city => (
                                    <option key={city.id} value={city.name}>{city.name}</option>
                                ))}
                            </select>
                            <p className="text-xs text-slate-500 mt-1">Frais de livraison calculés selon votre ville.</p>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Adresse complète *</label>
                            <textarea 
                                rows="3" 
                                value={clientForm.address}
                                onChange={e => setClientForm({...clientForm, address: e.target.value})}
                                placeholder="Numéro, rue, quartier..." 
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:outline-none resize-none transition-shadow"
                                style={{ '--tw-ring-color': theme.primaryColor }}
                            ></textarea>
                        </div>
                    </div>

                    <h2 className="text-xl font-bold mt-10 mb-6 flex items-center gap-2">
                        <CreditCard className="text-indigo-600" /> Mode de Paiement
                    </h2>
                    
                    <div className="p-4 border-2 rounded-xl flex items-center gap-4 bg-slate-50" style={{ borderColor: theme.primaryColor }}>
                        <input type="radio" checked readOnly className="w-5 h-5 accent-indigo-600" style={{ accentColor: theme.primaryColor }} />
                        <div>
                            <p className="font-bold text-slate-900">Paiement à la livraison (COD)</p>
                            <p className="text-sm text-slate-600">Payez en espèces lorsque vous recevez votre commande.</p>
                        </div>
                    </div>
                </div>

                {/* Résumé de Commande (Droite) */}
                <div className="lg:w-[380px] flex flex-col gap-6">
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                        <h3 className="font-bold text-lg mb-6">Résumé de la commande</h3>
                        
                        <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto pr-2">
                            {cart.map((item, index) => (
                                <div key={`${item.id}-${index}`} className="flex gap-4">
                                    <div className="w-16 h-16 bg-white rounded-lg border border-slate-200 flex-shrink-0 relative">
                                        <img src={item.images?.[0] || item.photoUrl || 'https://via.placeholder.com/200?text=Produit'} alt={item.name} className="w-full h-full object-cover rounded-lg" />
                                        <span className="absolute -top-2 -right-2 w-5 h-5 bg-slate-700 text-white text-xs font-bold flex items-center justify-center rounded-full">
                                            {item.quantity}
                                        </span>
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-bold text-sm leading-tight text-slate-900">{item.name}</p>
                                        {item.selectedVariant && (
                                            <p className="text-xs text-slate-500 mt-0.5">{item.selectedVariant.name}</p>
                                        )}
                                        <p className="font-bold text-sm mt-1 text-slate-700">{parseFloat(item.price).toFixed(2)} MAD</p>
                                    </div>
                                </div>
                            ))}
                            
                            {/* Bump Offer in Cart */}
                            {bumpAccepted && (
                                <div className="flex gap-4">
                                    <div className="w-16 h-16 bg-amber-50 rounded-lg border border-amber-200 flex-shrink-0 flex items-center justify-center text-amber-500">
                                        <ShieldCheck size={24} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-bold text-sm leading-tight text-slate-900">{bumpOffer.name}</p>
                                        <p className="font-bold text-sm mt-1 text-slate-700">{bumpOffer.price.toFixed(2)} MAD</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-3 pt-6 border-t border-slate-200 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-600">Sous-total</span>
                                <span className="font-bold">{cartSubtotal.toFixed(2)} MAD</span>
                            </div>
                            {discount > 0 && (
                                <div className="flex justify-between text-emerald-600">
                                    <span>Remise</span>
                                    <span className="font-bold">-{discount.toFixed(2)} MAD</span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="text-slate-600">Frais de livraison ({selectedCityObj.name})</span>
                                <span className="font-bold">{shippingFee.toFixed(2)} MAD</span>
                            </div>
                        </div>

                        <div className="flex justify-between items-center pt-6 mt-6 border-t border-slate-200">
                            <span className="font-black text-lg text-slate-900">TOTAL</span>
                            <span className="font-black text-2xl" style={{ color: theme.primaryColor }}>{netTotal.toFixed(2)} MAD</span>
                        </div>
                        
                        {/* ORDER BUMP SECTION */}
                        {theme?.orderBump !== false && (
                            <div className="mt-6 border-2 border-dashed border-amber-300 bg-amber-50 rounded-xl p-4 cursor-pointer transition-colors hover:bg-amber-100" onClick={() => setBumpAccepted(!bumpAccepted)}>
                                <div className="flex items-start gap-3">
                                    <div className="pt-1">
                                        <input 
                                            type="checkbox" 
                                            checked={bumpAccepted}
                                            onChange={(e) => setBumpAccepted(e.target.checked)}
                                            className="w-5 h-5 accent-amber-600 cursor-pointer"
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900 text-sm">
                                            Oui, je veux ajouter : {bumpOffer.name} (+{bumpOffer.price} MAD)
                                        </p>
                                        <p className="text-xs text-slate-600 mt-1">
                                            {bumpOffer.description}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <button 
                            onClick={handleSubmit}
                            disabled={isCheckingOut}
                            className="w-full mt-8 py-4 rounded-xl font-black text-white transition-all shadow-lg flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 disabled:opacity-70 disabled:scale-100"
                            style={{ backgroundColor: theme.primaryColor }}
                        >
                            {isCheckingOut ? (
                                <span className="flex items-center gap-2">
                                    <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                    Validation en cours...
                                </span>
                            ) : (
                                <>Confirmer la commande <ShieldCheck size={20} /></>
                            )}
                        </button>
                    </div>

                    {/* Réassurance */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col items-center text-center gap-2 p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                            <Truck className="text-slate-400" size={24} />
                            <p className="text-xs font-bold text-slate-600">Livraison Rapide</p>
                        </div>
                        <div className="flex flex-col items-center text-center gap-2 p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                            <Lock className="text-slate-400" size={24} />
                            <p className="text-xs font-bold text-slate-600">Paiement à la livraison</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
