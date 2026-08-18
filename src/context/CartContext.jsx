import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export function CartProvider({ children }) {
    const [cartItems, setCartItems] = useState([]);
    const [isCartOpen, setIsCartOpen] = useState(false);

    // Charger le panier depuis le localStorage (optionnel pour la preview, mais utile)
    useEffect(() => {
        try {
            const saved = localStorage.getItem('bayiin_cart');
            if (saved) setCartItems(JSON.parse(saved));
        } catch (e) {
            console.error(e);
        }
    }, []);

    // Sauvegarder à chaque modification
    useEffect(() => {
        localStorage.setItem('bayiin_cart', JSON.stringify(cartItems));
    }, [cartItems]);

    const addToCart = (product, quantity = 1, variant = null) => {
        setCartItems(prev => {
            const existingIndex = prev.findIndex(item => item.id === product.id && JSON.stringify(item.variant) === JSON.stringify(variant));
            
            if (existingIndex > -1) {
                const newItems = [...prev];
                newItems[existingIndex].quantity += quantity;
                return newItems;
            }
            
            return [...prev, { ...product, quantity, variant, cartItemId: Date.now() }];
        });
        setIsCartOpen(true);
    };

    const removeFromCart = (cartItemId) => {
        setCartItems(prev => prev.filter(item => item.cartItemId !== cartItemId));
    };

    const updateQuantity = (cartItemId, newQuantity) => {
        if (newQuantity < 1) return removeFromCart(cartItemId);
        setCartItems(prev => prev.map(item => item.cartItemId === cartItemId ? { ...item, quantity: newQuantity } : item));
    };

    const clearCart = () => {
        setCartItems([]);
    };

    const toggleCart = () => setIsCartOpen(!isCartOpen);
    const openCart = () => setIsCartOpen(true);
    const closeCart = () => setIsCartOpen(false);

    const cartTotal = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
    const cartCount = cartItems.reduce((count, item) => count + item.quantity, 0);

    return (
        <CartContext.Provider value={{
            cartItems,
            addToCart,
            removeFromCart,
            updateQuantity,
            clearCart,
            isCartOpen,
            toggleCart,
            openCart,
            closeCart,
            cartTotal,
            cartCount
        }}>
            {children}
        </CartContext.Provider>
    );
}

export const useCart = () => useContext(CartContext);
