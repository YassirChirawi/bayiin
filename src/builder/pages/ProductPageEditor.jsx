import React, { useState } from 'react';
import { ShoppingBag, ChevronRight, Share2, Heart, Plus, Minus } from 'lucide-react';

export default function ProductPageEditor({ theme, settings = {} }) {
    // Mock Product Data for Editor Preview
    const mockProduct = {
        title: "Pack Cosmétique Argan Premium",
        price: 299,
        compareAtPrice: 450,
        description: "Huile d'argan 100% bio pressée à froid. Idéale pour la peau et les cheveux.",
        images: [
            "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=600&q=80",
            "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=600&q=80"
        ],
        variants: [
            { id: 'v1', attributes: { "Taille": "50ml" }, price: 199, stockCount: 15 },
            { id: 'v2', attributes: { "Taille": "100ml" }, price: 299, stockCount: 5 },
            { id: 'v3', attributes: { "Taille": "200ml" }, price: 499, stockCount: 0 } // Rupture
        ],
        min_stock_alert: 10
    };

    const [activeImage, setActiveImage] = useState(mockProduct.images[0]);
    const [selectedVariant, setSelectedVariant] = useState(mockProduct.variants[1]);
    const [quantity, setQuantity] = useState(1);

    const isOutOfStock = selectedVariant.stockCount === 0;
    const showStockAlert = selectedVariant.stockCount > 0 && selectedVariant.stockCount <= mockProduct.min_stock_alert;

    return (
        <div className="max-w-6xl mx-auto p-6 bg-white rounded-2xl shadow-sm border border-slate-100 my-8">
            {/* Fil d'ariane */}
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-8">
                <span>Accueil</span>
                <ChevronRight size={14} />
                <span>Cosmétiques</span>
                <ChevronRight size={14} />
                <span className="text-slate-800">{mockProduct.title}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                
                {/* Galerie Médias */}
                <div className="flex gap-4">
                    {/* Vignettes (layout: left) */}
                    <div className="flex flex-col gap-3 w-20 flex-shrink-0">
                        {mockProduct.images.map((img, idx) => (
                            <div 
                                key={idx}
                                onClick={() => setActiveImage(img)}
                                className={`aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${activeImage === img ? 'border-indigo-600 shadow-md' : 'border-transparent hover:border-slate-300'}`}
                            >
                                <img src={img} alt="Thumbnail" className="w-full h-full object-cover" />
                            </div>
                        ))}
                    </div>
                    {/* Image principale */}
                    <div className="flex-1 bg-slate-50 rounded-2xl overflow-hidden relative aspect-[4/5]">
                        <img src={activeImage} alt="Main" className="w-full h-full object-cover" />
                        {mockProduct.compareAtPrice > mockProduct.price && (
                            <div className="absolute top-4 left-4 bg-rose-500 text-white text-xs font-black px-3 py-1.5 rounded-full shadow-sm">
                                Promo !
                            </div>
                        )}
                        <button className="absolute top-4 right-4 p-2 bg-white/80 backdrop-blur-sm rounded-full text-slate-600 hover:text-rose-500 transition-colors">
                            <Heart size={20} />
                        </button>
                    </div>
                </div>

                {/* Bloc Infos Majeures */}
                <div className="flex flex-col">
                    <div className="flex items-start justify-between mb-2">
                        <h1 className="text-3xl font-black text-slate-900 leading-tight">{mockProduct.title}</h1>
                        <button className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"><Share2 size={20}/></button>
                    </div>
                    
                    <div className="flex items-baseline gap-3 mb-6">
                        <span className="text-2xl font-black" style={{ color: theme.primaryColor }}>
                            {selectedVariant.price} MAD
                        </span>
                        {mockProduct.compareAtPrice > selectedVariant.price && (
                            <span className="text-lg font-bold text-slate-400 line-through">
                                {mockProduct.compareAtPrice} MAD
                            </span>
                        )}
                    </div>

                    {/* Sélecteur de Variantes */}
                    <div className="mb-6 space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Taille / Capacité</label>
                            <div className="flex flex-wrap gap-2">
                                {mockProduct.variants.map(v => {
                                    const outOfStock = v.stockCount === 0;
                                    return (
                                        <button
                                            key={v.id}
                                            disabled={outOfStock && settings.hideOutOfStock}
                                            onClick={() => setSelectedVariant(v)}
                                            className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                                                selectedVariant.id === v.id 
                                                ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                                                : outOfStock 
                                                    ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed opacity-60 line-through' 
                                                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                                            }`}
                                        >
                                            {v.attributes["Taille"]}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Indicateur de Stock Dynamique (FOMO) */}
                    {showStockAlert && (
                        <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                            <span className="text-sm font-bold text-amber-800">Plus que {selectedVariant.stockCount} articles en stock !</span>
                        </div>
                    )}

                    {/* Actions d'Achat */}
                    <div className="flex flex-col gap-3 mb-8">
                        <div className="flex gap-3">
                            {/* Quantity */}
                            <div className="flex items-center bg-slate-100 rounded-xl px-2 border border-slate-200">
                                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-2 text-slate-500 hover:text-indigo-600"><Minus size={16}/></button>
                                <span className="w-8 text-center font-bold text-sm text-slate-800">{quantity}</span>
                                <button onClick={() => setQuantity(quantity + 1)} className="p-2 text-slate-500 hover:text-indigo-600"><Plus size={16}/></button>
                            </div>
                            
                            {/* Add to Cart */}
                            <button 
                                disabled={isOutOfStock}
                                className={`flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-black transition-all ${
                                    isOutOfStock 
                                    ? 'bg-slate-200 text-slate-500 cursor-not-allowed' 
                                    : 'bg-white border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 shadow-sm'
                                }`}
                                style={!isOutOfStock ? { borderColor: theme.primaryColor, color: theme.primaryColor } : {}}
                            >
                                <ShoppingBag size={20} />
                                {isOutOfStock ? 'Rupture de stock' : 'Ajouter au panier'}
                            </button>
                        </div>
                        
                        {/* Express Buy Now */}
                        {!isOutOfStock && (
                            <button 
                                className="w-full py-4 rounded-xl font-black text-white transition-transform hover:scale-[1.02] shadow-lg shadow-indigo-600/20"
                                style={{ backgroundColor: theme.primaryColor }}
                            >
                                Acheter maintenant (Express Checkout)
                            </button>
                        )}
                    </div>

                    {/* Description (Tabs) */}
                    <div className="border-t border-slate-200 pt-6">
                        <h3 className="font-bold text-lg mb-3">Description</h3>
                        <p className="text-slate-600 text-sm leading-relaxed">{mockProduct.description}</p>
                    </div>

                </div>
            </div>
        </div>
    );
}
