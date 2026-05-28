import React from 'react';
import { Menu, ShoppingCart, User } from 'lucide-react';

export default function StoreHeader({ layout, storeName, primaryColor, logoUrl, cartCount = 0, onCartClick, onNavClick }) {
    const isCentered = layout === 'centered';
    const firstLetter = storeName ? storeName.charAt(0).toUpperCase() : 'B';

    return (
        <header className="bg-white border-b border-gray-100 py-4 px-6 md:px-12 sticky top-0 z-40">
            <div className={`max-w-7xl mx-auto flex items-center justify-between`}>
                {/* Mobile Menu */}
                <button className="md:hidden text-gray-600 hover:text-gray-900 transition-colors">
                    <Menu size={24} />
                </button>

                {/* Navigation Desktop */}
                {!isCentered && (
                    <nav className="hidden md:flex items-center gap-8 flex-1 ml-12">
                        <button onClick={() => onNavClick?.('home')} className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors">Accueil</button>
                        <button onClick={() => onNavClick?.('products')} className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors">Produits</button>
                        <button onClick={() => onNavClick?.('contact')} className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors">Contact</button>
                    </nav>
                )}

                {/* Logo */}
                <div className={`font-black text-2xl tracking-tight flex-1 md:flex-none flex items-center ${isCentered ? 'justify-center' : 'justify-start'}`}>
                    {logoUrl ? (
                        <img src={logoUrl} alt={storeName} className="h-8 md:h-10 object-contain" />
                    ) : (
                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavClick?.('home')}>
                            <div 
                                className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xl shadow-md"
                                style={{ backgroundColor: primaryColor || '#4f46e5' }}
                            >
                                {firstLetter}
                            </div>
                            <span className="text-gray-900 text-xl md:text-2xl">{storeName || 'Ma Boutique'}</span>
                        </div>
                    )}
                </div>

                {/* Centered Navigation */}
                {isCentered && (
                    <nav className="hidden md:flex items-center gap-8 justify-center absolute left-1/2 -translate-x-1/2">
                        <button onClick={() => onNavClick?.('home')} className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors">Accueil</button>
                        <button onClick={() => onNavClick?.('products')} className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors">Produits</button>
                        <button onClick={() => onNavClick?.('contact')} className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors">Contact</button>
                    </nav>
                )}

                {/* Icons */}
                <div className="flex items-center gap-4 justify-end flex-1 md:flex-none">
                    <button className="text-gray-600 hover:text-gray-900 transition-colors hidden sm:block">
                        <User size={20} />
                    </button>
                    <button onClick={onCartClick} className="text-gray-600 hover:text-gray-900 transition-colors relative">
                        <ShoppingCart size={20} />
                        {cartCount > 0 && (
                            <span 
                                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                                style={{ backgroundColor: primaryColor || '#4f46e5' }}
                            >
                                {cartCount}
                            </span>
                        )}
                    </button>
                </div>
            </div>
        </header>
    );
}
