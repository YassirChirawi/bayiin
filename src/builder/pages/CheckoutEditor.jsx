import React, { useState } from 'react';
import { ShieldCheck, Truck, Lock, MapPin, CreditCard } from 'lucide-react';
import { useCart } from '../../context/CartContext';

export default function CheckoutEditor({ theme, settings = {} }) {
    const { cartItems, cartTotal } = useCart();
    
    // Mock Data based on the ERP structure
    const erpLogisticsCities = [
        { id: 1, name: "Casablanca", fee: 20 },
        { id: 2, name: "Rabat", fee: 35 },
        { id: 3, name: "Marrakech", fee: 40 },
        { id: 4, name: "Tanger", fee: 45 }
    ];

    const [selectedCity, setSelectedCity] = useState(erpLogisticsCities[0]);
    const cartSubtotal = cartTotal > 0 ? cartTotal : 0;
    const discount = 0; // Promo ERP "VIP"
    
    const shippingFee = selectedCity ? selectedCity.fee : 0;
    const netTotal = cartSubtotal - discount + shippingFee;

    return (
        <div className="max-w-4xl mx-auto p-6 my-8">
            <h1 className="text-3xl font-black text-center mb-8">Paiement Sécurisé</h1>
            
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
                                <input type="text" placeholder="Ahmed" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Nom *</label>
                                <input type="text" placeholder="Benali" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Téléphone *</label>
                            <div className="flex">
                                <span className="inline-flex items-center px-4 rounded-l-xl border border-r-0 border-slate-200 bg-slate-50 text-slate-500 font-bold">
                                    +212
                               </span>
                                <input type="tel" placeholder="6 00 00 00 00" className="w-full px-4 py-3 rounded-r-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Ville de livraison *</label>
                            <select 
                                value={selectedCity.id}
                                onChange={(e) => setSelectedCity(erpLogisticsCities.find(c => c.id === parseInt(e.target.value)))}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-medium"
                            >
                                {erpLogisticsCities.map(city => (
                                    <option key={city.id} value={city.id}>{city.name}</option>
                                ))}
                            </select>
                            <p className="text-xs text-slate-500 mt-1">Liste synchronisée dynamiquement depuis l'ERP (Cathedis/Sendit)</p>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Adresse complète *</label>
                            <textarea rows="3" placeholder="Numéro, rue, quartier..." className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"></textarea>
                        </div>
                    </div>

                    <h2 className="text-xl font-bold mt-10 mb-6 flex items-center gap-2">
                        <CreditCard className="text-indigo-600" /> Mode de Paiement
                    </h2>
                    
                    <div className="p-4 border-2 border-indigo-600 bg-indigo-50 rounded-xl flex items-center gap-4">
                        <input type="radio" checked readOnly className="w-5 h-5 text-indigo-600" />
                        <div>
                            <p className="font-bold text-indigo-900">Paiement à la livraison (COD)</p>
                            <p className="text-sm text-indigo-700">Payez en espèces lorsque vous recevez votre commande.</p>
                        </div>
                    </div>
                </div>

                {/* Résumé de Commande (Droite) */}
                <div className="lg:w-[380px] flex flex-col gap-6">
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                        <h3 className="font-bold text-lg mb-6">Résumé de la commande</h3>
                        
                        <div className="space-y-4 mb-6">
                            {cartItems.length > 0 ? (
                                cartItems.map((item, index) => (
                                    <div key={index} className="flex gap-4">
                                        <div className="w-16 h-16 bg-white rounded-lg border border-slate-200 flex-shrink-0 relative">
                                            <img src={item.image || "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=200&q=80"} alt={item.name} className="w-full h-full object-cover rounded-lg" />
                                            <span className="absolute -top-2 -right-2 w-5 h-5 bg-slate-500 text-white text-xs font-bold flex items-center justify-center rounded-full">{item.quantity}</span>
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm">{item.name}</p>
                                            {item.variant && <p className="text-xs text-slate-500 mt-0.5">{item.variant}</p>}
                                            <p className="font-bold text-sm mt-1">{item.price} MAD</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-slate-500 text-center py-4">Votre panier est vide.</p>
                            )}
                        </div>

                        <div className="space-y-3 pt-6 border-t border-slate-200 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-600">Sous-total</span>
                                <span className="font-bold">{cartSubtotal} MAD</span>
                            </div>
                            <div className="flex justify-between text-emerald-600">
                                <span>Remise ERP (VIP)</span>
                                <span className="font-bold">-{discount} MAD</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-600">Frais de livraison ({selectedCity.name})</span>
                                <span className="font-bold">{shippingFee} MAD</span>
                            </div>
                        </div>

                        <div className="flex justify-between items-center pt-6 mt-6 border-t border-slate-200">
                            <span className="font-black text-lg">TOTAL</span>
                            <span className="font-black text-2xl" style={{ color: theme.primaryColor }}>{netTotal} MAD</span>
                        </div>
                        
                        <button 
                            className="w-full mt-8 py-4 rounded-xl font-black text-white transition-transform hover:scale-[1.02] shadow-lg flex items-center justify-center gap-2"
                            style={{ backgroundColor: theme.primaryColor }}
                        >
                            Confirmer la commande <ShieldCheck size={20} />
                        </button>
                    </div>

                    {/* Réassurance */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col items-center text-center gap-2 p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                            <Truck className="text-slate-400" size={24} />
                            <p className="text-xs font-bold text-slate-600">Livraison Express</p>
                        </div>
                        <div className="flex flex-col items-center text-center gap-2 p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                            <Lock className="text-slate-400" size={24} />
                            <p className="text-xs font-bold text-slate-600">Données Sécurisées</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
