import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { createRawWhatsAppLink } from '../utils/whatsappTemplates';
import { ShoppingBag, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { vibrate } from '../utils/haptics';

// Storefront Components
import StoreBanner from '../components/storefront/StoreBanner';
import StoreHeader from '../components/storefront/StoreHeader';
import StoreFooter from '../components/storefront/StoreFooter';
import CartDrawer from '../components/storefront/CartDrawer';
import ProductPage from '../components/storefront/ProductPage';
import StorefrontCheckout from '../components/storefront/StorefrontCheckout';
import ContactPage from '../components/storefront/ContactPage';
import ThankYouPage from '../components/storefront/ThankYouPage';
import BlockRenderer from '../builder/renderer/BlockRenderer';

// Default Fallback Theme
const DEFAULT_THEME = {
    primaryColor: '#6366f1',
    typography: { heading: 'Inter', body: 'Inter' },
    headerLayout: 'center',
    buttonStyle: 'rounded',
    bannerEnabled: true,
    bannerText: 'Bienvenue sur notre boutique officielle',
    social: { facebook: '', instagram: '', whatsapp: '' }
};

export default function PublicCatalog() {
    const { storeId } = useParams();
    const navigate = useNavigate();
    
    // Core Data
    const [store, setStore] = useState(null);
    const [products, setProducts] = useState([]);
    const [storefrontData, setStorefrontData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // App State
    const [currentView, setCurrentView] = useState('home'); // 'home', 'product', 'contact', 'thankyou'
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [cart, setCart] = useState([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [lastOrder, setLastOrder] = useState(null);

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            try {
                // 1. Fetch Store
                const storeDoc = await getDoc(doc(db, "stores", storeId));
                if (!storeDoc.exists()) {
                    setError("Boutique introuvable");
                    setLoading(false);
                    return;
                }
                const storeData = { id: storeDoc.id, ...storeDoc.data() };
                setStore(storeData);

                // 2. Load storefront config or create fallback
                let config = storeData.storefront;
                if (!config || !config.pages) {
                    config = {
                        subdomain: '',
                        theme: DEFAULT_THEME,
                        pages: {
                            home: {
                                sections: [
                                    {
                                        id: 'default-hero',
                                        type: 'Hero',
                                        title: `Bienvenue chez ${storeData.name}`,
                                        subtitle: "Découvrez notre collection exclusive et profitez de la livraison à domicile.",
                                        settings: { alignment: 'center', textColor: '#ffffff', backgroundType: 'color', backgroundColor: DEFAULT_THEME.primaryColor }
                                    },
                                    {
                                        id: 'default-grid',
                                        type: 'ProductGrid',
                                        title: "Nos Produits",
                                        subtitle: "Découvrez nos meilleures ventes.",
                                        settings: { alignment: 'left', columns: 4 }
                                    }
                                ]
                            },
                            catalog: { sections: [] },
                            product: { sections: [] },
                            cart: { sections: [] },
                            checkout: { sections: [] },
                            portal: { sections: [] },
                            contact: { sections: [] }
                        }
                    };
                } else {
                    config.theme = { ...DEFAULT_THEME, ...config.theme };
                }
                setStorefrontData(config);

                // Inject Font
                if (config.theme?.typography?.heading) {
                    const fontName = config.theme.typography.heading;
                    const link = document.createElement('link');
                    link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, '+')}:wght@400;500;700;900&display=swap`;
                    link.rel = 'stylesheet';
                    document.head.appendChild(link);
                }

                // 3. Fetch Products
                const q = query(collection(db, "products"), where("storeId", "==", storeId));
                const querySnapshot = await getDocs(q);
                const productsData = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })).filter(p => !p.deleted);
                setProducts(productsData);

            } catch (err) {
                console.error("Erreur chargement:", err);
                setError("Impossible de charger la boutique");
            } finally {
                setLoading(false);
            }
        }
        if (storeId) fetchData();
    }, [storeId]);

    // Cart Logic
    const handleAddToCart = (product, quantity = 1, selectedVariant = null) => {
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id && item.selectedVariant?.id === selectedVariant?.id);
            if (existing) {
                return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item);
            }
            return [...prev, { ...product, quantity, selectedVariant }];
        });
        vibrate('soft');
        setIsCartOpen(true);
    };

    const handleExpressCheckout = async ({ product, clientForm }) => {
        if (!store?.phone) {
            alert("Le numéro de la boutique n'est pas configuré.");
            return;
        }

        setIsCheckingOut(true);
        try {
            const orderRefNum = `CMD-${Math.floor(1000 + Math.random() * 9000)}`;
            const cartTotal = parseFloat(product.price) * product.quantity;
            const cartCount = product.quantity;
            const items = [product];

            // Save Draft Order to Firestore
            await addDoc(collection(db, "orders"), {
                storeId: store.id,
                orderNumber: orderRefNum,
                status: 'pending_catalog',
                clientName: clientForm.name,
                clientPhone: clientForm.phone,
                clientCity: clientForm.city,
                clientAddress: clientForm.address,
                products: items.map(item => ({
                    id: item.id,
                    name: item.name,
                    quantity: item.quantity,
                    price: parseFloat(item.price),
                    photoUrl: item.photoUrl || null,
                    variant: item.selectedVariant ? item.selectedVariant.name : null
                })),
                articleName: items.map(i => `${i.quantity}x ${i.name}${i.selectedVariant ? ` (${i.selectedVariant.name})` : ''}`).join(', '),
                quantity: cartCount,
                price: cartTotal,
                createdAt: serverTimestamp(),
                date: new Date().toISOString().split('T')[0],
                source: 'public_catalog_express'
            });

            // Build WhatsApp Message
            const currency = store.currency || 'MAD';
            const itemsList = items.map(item => `- ${item.quantity}x ${item.name}${item.selectedVariant ? ` (${item.selectedVariant.name})` : ''} (${(parseFloat(item.price) * item.quantity).toFixed(2)} ${currency})`).join('\n');
            const totalLine = `*TOTAL: ${cartTotal.toFixed(2)} ${currency}*`;
            const clientInfo = `\n\n📋 *Client:* ${clientForm.name}\n📱 ${clientForm.phone}${clientForm.city ? `\n📍 ${clientForm.city}` : ''}${clientForm.address ? ` — ${clientForm.address}` : ''}`;

            const message = `Bonjour ${store.name}, je souhaite commander :\n\n${itemsList}\n\n${totalLine}${clientInfo}\nRef: ${orderRefNum}`;
            const url = createRawWhatsAppLink(store.phone, message);
            
            vibrate('success');
            window.open(url, '_blank');

            setLastOrder({ orderNumber: orderRefNum, price: cartTotal });
            setCurrentView('thankyou');
            window.scrollTo(0, 0);

        } catch (err) {
            console.error("Checkout Error:", err);
            alert("Erreur lors de la création de la commande. Veuillez réessayer.");
        } finally {
            setIsCheckingOut(false);
        }
    };

    const submitFullCheckout = async (checkoutData) => {
        setIsCheckingOut(true);
        try {
            const orderRefNum = `CMD-${Math.floor(1000 + Math.random() * 9000)}`;
            const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

            // Save Draft Order to Firestore
            await addDoc(collection(db, "orders"), {
                storeId: store.id,
                orderNumber: orderRefNum,
                status: 'pending_catalog',
                clientName: checkoutData.name,
                clientPhone: checkoutData.phone,
                clientCity: checkoutData.city,
                clientAddress: checkoutData.address,
                products: cart.map(item => ({
                    id: item.id,
                    name: item.name,
                    quantity: item.quantity,
                    price: parseFloat(item.price),
                    photoUrl: item.photoUrl || null,
                    variant: item.selectedVariant ? item.selectedVariant.name : null
                })),
                articleName: cart.map(i => `${i.quantity}x ${i.name}${i.selectedVariant ? ` (${i.selectedVariant.name})` : ''}`).join(', '),
                quantity: cartCount,
                price: checkoutData.netTotal,
                shippingFee: checkoutData.shippingFee,
                createdAt: serverTimestamp(),
                date: new Date().toISOString().split('T')[0],
                source: 'public_catalog_checkout'
            });

            // Build WhatsApp Message (Optional fallback/notification)
            const currency = store.currency || 'MAD';
            const itemsList = cart.map(item => `- ${item.quantity}x ${item.name}${item.selectedVariant ? ` (${item.selectedVariant.name})` : ''} (${(parseFloat(item.price) * item.quantity).toFixed(2)} ${currency})`).join('\n');
            const totalLine = `*TOTAL: ${checkoutData.netTotal.toFixed(2)} ${currency}*`;
            const clientInfo = `\n\n📋 *Client:* ${checkoutData.name}\n📱 ${checkoutData.phone}${checkoutData.city ? `\n📍 ${checkoutData.city}` : ''}${checkoutData.address ? ` — ${checkoutData.address}` : ''}`;

            const message = `Bonjour ${store.name}, je viens de valider ma commande sur le site :\n\n${itemsList}\n\n${totalLine}${clientInfo}\nRef: ${orderRefNum}`;
            
            // We can choose to open WhatsApp or just show Thank You page. 
            // In Morocco, WhatsApp is preferred, so we open it in background or let the user choose.
            // For headless ERP, we just show ThankYouPage directly, as the order is in the ERP.
            
            vibrate('success');
            
            setLastOrder({ orderNumber: orderRefNum, price: checkoutData.netTotal });
            setCart([]);
            setIsCartOpen(false);
            setCurrentView('thankyou');
            window.scrollTo(0, 0);

        } catch (err) {
            console.error("Checkout Error:", err);
            alert("Erreur lors de la création de la commande. Veuillez réessayer.");
        } finally {
            setIsCheckingOut(false);
        }
    };

    const handleCartCheckoutClick = () => {
        setIsCartOpen(false);
        setCurrentView('checkout');
        window.scrollTo(0, 0);
    };


    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-white">
            <div className="w-12 h-12 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin" />
        </div>
    );

    if (error || !storefrontData) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="text-center">
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Oops!</h1>
                <p className="text-slate-600">{error}</p>
            </div>
        </div>
    );

    const theme = storefrontData.theme;

    return (
        <div 
            className="min-h-screen bg-slate-50 flex flex-col relative"
            style={{ fontFamily: `"${theme.typography?.body || 'Inter'}", sans-serif` }}
        >
            {/* Banner */}
            <StoreBanner 
                text={theme.bannerText} 
                enabled={theme.bannerEnabled ?? !!theme.bannerText} 
                primaryColor={theme.primaryColor} 
            />

            {/* Header */}
            <StoreHeader 
                layout={theme.headerLayout} 
                storeName={store?.name} 
                primaryColor={theme.primaryColor} 
                logoUrl={store?.logoUrl}
                cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
                onCartClick={() => setIsCartOpen(true)}
                onNavClick={(view) => {
                    setCurrentView(view);
                    window.scrollTo(0, 0);
                }}
            />

            {/* Main Content Area */}
            <main className="flex-1">
                {currentView === 'home' && (
                    <div className="animate-in fade-in duration-500">
                        {(storefrontData.pages?.home?.sections || []).map(section => (
                            <BlockRenderer 
                                key={section.id} 
                                isReadOnly={true} 
                                section={section} 
                                theme={theme} 
                                contextData={{
                                    products,
                                    onProductClick: (p) => {
                                        setSelectedProduct(p);
                                        setCurrentView('product');
                                        window.scrollTo(0, 0);
                                    }
                                }}
                            />
                        ))}
                    </div>
                )}

                {currentView === 'catalog' && (
                    <div className="animate-in fade-in duration-500">
                        {(storefrontData.pages?.catalog?.sections || []).map(section => (
                            <BlockRenderer 
                                key={section.id} 
                                isReadOnly={true} 
                                section={section} 
                                theme={theme} 
                                contextData={{
                                    products,
                                    onProductClick: (p) => {
                                        setSelectedProduct(p);
                                        setCurrentView('product');
                                        window.scrollTo(0, 0);
                                    }
                                }}
                            />
                        ))}
                    </div>
                )}

                {currentView === 'product' && selectedProduct && (
                    <div className="animate-in slide-in-from-right-8 duration-300">
                        <ProductPage 
                            product={selectedProduct} 
                            theme={theme} 
                            cities={store?.senditCities || []}
                            isCheckingOut={isCheckingOut}
                            onAddToCart={(item) => handleAddToCart(item, item.quantity || 1, item.selectedVariant)}
                            onExpressCheckout={handleExpressCheckout}
                            onBack={() => {
                                setCurrentView('home');
                                window.scrollTo(0, 0);
                            }}
                        />
                        {/* Custom Sections for Product Page */}
                        <div className="mt-8">
                            {(storefrontData.pages?.product?.sections || []).map(section => (
                                <BlockRenderer 
                                    key={section.id} 
                                    isReadOnly={true} 
                                    section={section} 
                                    theme={theme} 
                                />
                            ))}
                        </div>
                    </div>
                )}

                {currentView === 'checkout' && (
                    <div className="animate-in slide-in-from-right-8 duration-300 mx-auto py-8 w-full">
                        {/* Custom Sections for Checkout before the form */}
                        {(storefrontData.pages?.checkout?.sections || []).map(section => (
                            <BlockRenderer 
                                key={section.id} 
                                isReadOnly={true} 
                                section={section} 
                                theme={theme} 
                            />
                        ))}
                        <StorefrontCheckout 
                            theme={theme}
                            cart={cart}
                            cities={store?.senditCities || []}
                            isCheckingOut={isCheckingOut}
                            onCheckout={submitFullCheckout}
                        />
                    </div>
                )}

                {currentView === 'contact' && (
                    <div className="animate-in fade-in duration-300">
                        <ContactPage theme={theme} store={store} />
                        {/* Custom Sections for Contact Page */}
                        <div className="mt-8">
                            {(storefrontData.pages?.contact?.sections || []).map(section => (
                                <BlockRenderer 
                                    key={section.id} 
                                    isReadOnly={true} 
                                    section={section} 
                                    theme={theme} 
                                />
                            ))}
                        </div>
                    </div>
                )}

                {currentView === 'thankyou' && lastOrder && (
                    <div className="animate-in zoom-in-95 duration-500">
                        <ThankYouPage 
                            order={lastOrder}
                            theme={theme}
                            onBackToCatalog={() => {
                                setCurrentView('home');
                                setLastOrder(null);
                            }}
                        />
                    </div>
                )}
            </main>

            {/* Footer */}
            <StoreFooter theme={theme} storeName={store?.name} />

            {/* Cart Drawer */}
            <CartDrawer 
                isOpen={isCartOpen}
                onClose={() => setIsCartOpen(false)}
                cart={cart}
                cities={store?.senditCities || []}
                onUpdateQuantity={(id, delta) => setCart(prev => prev.map(item => item.id === id ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item))}
                onRemove={(id) => setCart(prev => prev.filter(item => item.id !== id))}
                onCheckoutClick={handleCartCheckoutClick}
                isCheckingOut={isCheckingOut}
                theme={theme}
                upsellProduct={products.find(p => p.id !== selectedProduct?.id && parseInt(p.stock) > 0)} // Simple upsell logic
                onAddUpsell={(p) => handleAddToCart(p, 1)}
            />
            
            {/* Mobile Floating Cart Button */}
            <AnimatePresence>
                {cart.length > 0 && !isCartOpen && (
                    <motion.button
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        onClick={() => setIsCartOpen(true)}
                        className="fixed bottom-6 right-6 z-40 text-white p-4 rounded-full shadow-lg flex items-center justify-center md:hidden"
                        style={{ backgroundColor: theme.primaryColor }}
                    >
                        <ShoppingBag className="h-6 w-6" />
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
                            {cart.reduce((sum, item) => sum + item.quantity, 0)}
                        </span>
                    </motion.button>
                )}
            </AnimatePresence>
        </div>
    );
}
