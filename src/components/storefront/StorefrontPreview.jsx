import React, { useState } from 'react';
import StoreBanner from './StoreBanner';
import StoreHeader from './StoreHeader';
import StoreHero from './StoreHero';
import ProductPage from './ProductPage';
import CartDrawer from './CartDrawer';
import ThankYouPage from './ThankYouPage';
import StoreFooter from './StoreFooter';
import ContactPage from './ContactPage';

export default function StorefrontPreview({ config, storeName, products = [], storeId }) {
    const [currentView, setCurrentView] = useState('home'); // 'home', 'product', 'thankyou', 'contact'
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [cart, setCart] = useState([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    // Render featured products if selected, otherwise fallback to mock
    const featuredProducts = (config.featuredProductIds?.length > 0)
        ? products.filter(p => config.featuredProductIds.includes(p.id))
        : [];

    return (
        <div 
            className="w-full h-full bg-white flex flex-col rounded-[2rem] border-[8px] border-slate-100 overflow-hidden shadow-2xl relative"
            style={{ fontFamily: `"${config.fontFamily || 'Inter'}", sans-serif` }}
        >
            <link href={`https://fonts.googleapis.com/css2?family=${(config.fontFamily || 'Inter').replace(' ', '+')}:wght@400;500;700;900&display=swap`} rel="stylesheet" />
            
            <StoreBanner 
                text={config.bannerText} 
                enabled={config.bannerEnabled} 
                primaryColor={config.primaryColor} 
            />
            <StoreHeader 
                layout={config.headerLayout} 
                storeName={storeName} 
                primaryColor={config.primaryColor} 
                logoUrl={config.logoUrl}
                cartCount={cart.length}
                onCartClick={(e) => {
                    e.stopPropagation();
                    setIsCartOpen(true);
                }}
                onNavClick={(view) => setCurrentView(view)}
            />
            <div className="flex-1 overflow-y-auto bg-white custom-scrollbar">
                {currentView === 'home' && (
                    <>
                        <StoreHero 
                            title={config.heroTitle} 
                            subtitle={config.heroSubtitle} 
                            primaryColor={config.primaryColor} 
                            backgroundType={config.backgroundType}
                            backgroundMediaUrl={config.backgroundMediaUrl}
                            animationStyle={config.animationStyle}
                        />
                
                <div className="max-w-7xl mx-auto px-6 py-16">
                    <h2 className="text-2xl font-bold text-gray-900 mb-8">Nos Meilleurs Ventes</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {featuredProducts.length > 0 ? (
                            featuredProducts.map(p => (
                                <div 
                                    key={p.id} 
                                    className="group cursor-pointer" 
                                    onClick={() => {
                                        setSelectedProduct(p);
                                        setCurrentView('product');
                                    }}
                                >
                                    <div className="w-full aspect-[4/5] bg-gray-100 rounded-2xl mb-4 overflow-hidden relative border border-slate-200">
                                        {p.photoUrl ? (
                                            <img src={p.photoUrl} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                        ) : (
                                            <div className="absolute inset-0 bg-gray-200 animate-pulse opacity-50" />
                                        )}
                                    </div>
                                    <div className="text-sm font-bold text-slate-900 truncate mb-1 group-hover:text-indigo-600 transition-colors">{p.name}</div>
                                    <div className="text-sm font-bold" style={{ color: config.primaryColor }}>{p.price} MAD</div>
                                </div>
                            ))
                        ) : (
                            [1, 2, 3, 4].map(i => (
                                <div key={i} className="group">
                                    <div className="w-full aspect-[4/5] bg-gray-100 rounded-2xl mb-4 overflow-hidden relative">
                                        <div className="absolute inset-0 bg-gray-200 animate-pulse opacity-50" />
                                    </div>
                                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                                    <div className="h-4 bg-gray-200 rounded w-1/4" />
                                </div>
                            ))
                        )}
                    </div>
                </div>
                </>
                )}

                {currentView === 'product' && selectedProduct && (
                    <ProductPage 
                        product={selectedProduct} 
                        theme={config} 
                        onAddToCart={(item) => {
                            setCart(prev => {
                                const existing = prev.find(p => p.id === item.id && p.selectedVariant?.id === item.selectedVariant?.id);
                                if (existing) return prev.map(p => p.id === item.id ? { ...p, quantity: p.quantity + item.quantity } : p);
                                return [...prev, item];
                            });
                            setIsCartOpen(true);
                        }}
                    />
                )}

                {currentView === 'contact' && (
                    <ContactPage theme={config} storeId={storeId} />
                )}

                {currentView === 'thankyou' && (
                    <ThankYouPage 
                        order={{ price: cart.reduce((a, b) => a + (parseFloat(b.price) || 0) * b.quantity, 0) || 500, orderNumber: 'CMD-' + Math.floor(1000 + Math.random() * 9000) }}
                        theme={config}
                        onBackToCatalog={() => setCurrentView('home')}
                    />
                )}

                <StoreFooter theme={config} storeName={storeName} />
            </div>

            <CartDrawer 
                isOpen={isCartOpen}
                onClose={() => setIsCartOpen(false)}
                cart={cart}
                onUpdateQuantity={(id, delta) => {
                    setCart(prev => prev.map(item => item.id === id ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item));
                }}
                onRemove={(id) => setCart(prev => prev.filter(item => item.id !== id))}
                onCheckoutClick={() => {
                    setCurrentView('thankyou');
                    setCart([]);
                }}
                theme={config}
            />
            {/* Fake browser URL bar overlay for effect (optional) */}
            <div className="absolute top-0 left-0 w-full h-0 shadow-[0_0_50px_rgba(0,0,0,0.05)] pointer-events-none"></div>
        </div>
    );
}
