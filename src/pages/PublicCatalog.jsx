import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { createRawWhatsAppLink } from "../utils/whatsappTemplates";
import { Package, Search, Filter, ShoppingBag, MapPin, ShoppingCart, X, Plus, Minus, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function PublicCatalog() {
    const { storeId } = useParams();
    const [store, setStore] = useState(null);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Cart State
    const [cart, setCart] = useState([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isCheckingOut, setIsCheckingOut] = useState(false);

    // Filters
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            try {
                // 1. Fetch Store Branding
                const storeDoc = await getDoc(doc(db, "stores", storeId));
                if (!storeDoc.exists()) {
                    setError("Store not found");
                    setLoading(false);
                    return;
                }
                setStore({ id: storeDoc.id, ...storeDoc.data() });

                // 2. Fetch Products
                const q = query(collection(db, "products"), where("storeId", "==", storeId));
                const querySnapshot = await getDocs(q);
                const productsData = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })).filter(p => !p.deleted); // Exclude deleted

                setProducts(productsData);
            } catch (err) {
                console.error("Error fetching catalog:", err);
                setError("Failed to load catalog");
            } finally {
                setLoading(false);
            }
        }
        if (storeId) {
            fetchData();
        }
    }, [storeId]);

    // Cart Logic
    const addToCart = (product) => {
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...prev, { ...product, quantity: 1 }];
        });
        setIsCartOpen(true);
    };

    const removeFromCart = (id) => {
        setCart(prev => prev.filter(item => item.id !== id));
    };

    const updateQuantity = (id, delta) => {
        setCart(prev => prev.map(item => {
            if (item.id === id) {
                const newQty = Math.max(1, item.quantity + delta);
                return { ...item, quantity: newQty };
            }
            return item;
        }));
    };

    const cartTotal = cart.reduce((acc, item) => acc + (parseFloat(item.price) * item.quantity), 0);
    const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

    const handleCheckout = async () => {
        if (!store?.phone) {
            alert("Store phone number is not configured.");
            return;
        }

        setIsCheckingOut(true);
        try {
            // 1. Generate Order Ref
            const orderRefNum = `CMD-${Math.floor(1000 + Math.random() * 9000)}`;

            // 2. Save Draft Order to Firestore
            await addDoc(collection(db, "orders"), {
                storeId: store.id,
                orderNumber: orderRefNum,
                status: 'pending_catalog', // Special status for drafts
                products: cart.map(item => ({
                    id: item.id,
                    name: item.name,
                    quantity: item.quantity,
                    price: parseFloat(item.price),
                    photoUrl: item.photoUrl || null
                })),
                // Flattened strings for search/display if needed
                articleName: cart.map(i => `${i.quantity}x ${i.name}`).join(', '),
                quantity: cartCount,
                price: cartTotal, // Total Value
                createdAt: serverTimestamp(),
                date: new Date().toISOString().split('T')[0], // For filtering
                source: 'public_catalog'
            });


            // 3. Build WhatsApp Message
            // We use a temporary order object structure that matches what getWhatsappMessage expects
            const tempOrderForMsg = {
                clientName: "Client", // Catalog user is usually anonymous/generic initially
                clientCity: "",
                articleName: cart.map(i => `${i.quantity}x ${i.name}`).join(', '),
                orderNumber: orderRefNum,
                price: cartTotal, // Pass total as price for single line summary if needed, but we rely on ticket text
                shippingCost: 0,
                quantity: 1 // Bundled
            };

            // Hack: We want the Ticket text to be the list of items. 
            // The getWhatsappMessage function builds a ticket based on price/quantity. 
            // We might just want to construct a custom message here using getWhatsappLink directly for better control of the list.

            const currency = store.currency || 'MAD';
            const itemsList = cart.map(item => `- ${item.quantity}x ${item.name} (${(parseFloat(item.price) * item.quantity).toFixed(2)} ${currency})`).join('\n');
            const totalLine = `*TOTAL: ${cartTotal.toFixed(2)} ${currency}*`;

            let message = "";
            if (store.whatsappLanguage === 'darija') {
                message = `Salam ${store.name}, bghit ncommandi hadchi:\n\n${itemsList}\n\n${totalLine}\nRef: ${orderRefNum}`;
            } else {
                message = `Bonjour ${store.name}, je souhaite commander :\n\n${itemsList}\n\n${totalLine}\nRef: ${orderRefNum}`;
            }

            const url = createRawWhatsAppLink(store.phone, message);
            window.open(url, '_blank');

            // 4. Clear Cart
            setCart([]);
            setIsCartOpen(false);

        } catch (err) {
            console.error("Checkout Error:", err);
            alert("Failed to create order. Please try again.");
        } finally {
            setIsCheckingOut(false);
        }
    };

    // Derived Data for Filters
    const categories = useMemo(() => {
        const cats = new Set(products.map(p => p.category).filter(Boolean));
        return ["All", ...Array.from(cats)];
    }, [products]);

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === "All" || p.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
    );

    if (error) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Oops!</h1>
                <p className="text-gray-600">{error}</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 font-['Outfit'] pb-24">
            {/* Header / Store Branding */}
            <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full overflow-hidden bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                            {store.logoUrl ? (
                                <img src={store.logoUrl} alt={store.name} className="h-full w-full object-cover" />
                            ) : (
                                <ShoppingBag className="h-6 w-6 text-indigo-600" />
                            )}
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">{store.name}</h1>
                            {store.city && (
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                    <MapPin className="h-3 w-3" />
                                    {store.city}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Cart Trigger (Desktop) */}
                    <button
                        onClick={() => setIsCartOpen(true)}
                        className="relative p-2 text-gray-600 hover:text-indigo-600 transition-colors"
                    >
                        <ShoppingBag className="h-6 w-6" />
                        {cartCount > 0 && (
                            <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                {cartCount}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex flex-col lg:flex-row gap-8">

                    {/* Sidebar Filters */}
                    <div className="w-full lg:w-64 flex-shrink-0 space-y-6">
                        {/* Search */}
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search products..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 rounded-xl border-gray-200 focus:border-indigo-500 focus:ring-indigo-500 shadow-sm"
                            />
                            <Search className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                        </div>

                        {/* Categories */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <Filter className="h-4 w-4" /> Categories
                            </h3>
                            <div className="space-y-2">
                                {categories.map(cat => (
                                    <label key={cat} className="flex items-center gap-3 cursor-pointer group">
                                        <div className={`
                                            w-4 h-4 rounded-full border flex items-center justify-center transition-colors
                                            ${selectedCategory === cat ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300 group-hover:border-indigo-400'}
                                        `}>
                                            {selectedCategory === cat && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                        </div>
                                        <span onClick={() => setSelectedCategory(cat)} className={`text-sm ${selectedCategory === cat ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                                            {cat}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Product Grid */}
                    <div className="flex-1">
                        <div className="flex justify-between items-center mb-6">
                            <p className="text-gray-500 text-sm">
                                Showing <span className="font-semibold text-gray-900">{filteredProducts.length}</span> products
                            </p>
                        </div>

                        {filteredProducts.length === 0 ? (
                            <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 border-dashed">
                                <Package className="mx-auto h-12 w-12 text-gray-300" />
                                <h3 className="mt-2 text-sm font-medium text-gray-900">No products found</h3>
                                <p className="mt-1 text-sm text-gray-500">Try adjusting your search or filters.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredProducts.map((product) => (
                                    <motion.div
                                        key={product.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group"
                                    >
                                        <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
                                            {product.photoUrl ? (
                                                <img
                                                    src={product.photoUrl}
                                                    alt={product.name}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                />
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-gray-300">
                                                    <Package className="h-12 w-12" />
                                                </div>
                                            )}
                                        </div>

                                        <div className="p-4">
                                            <div className="flex justify-between items-start mb-1">
                                                <h3 className="font-bold text-gray-900 line-clamp-2 text-lg">{product.name}</h3>
                                                <p className="font-bold text-indigo-600 whitespace-nowrap ml-2">
                                                    {parseFloat(product.price).toFixed(0)} <span className="text-sm">DH</span>
                                                </p>
                                            </div>

                                            <div className="flex items-center justify-between mt-4">
                                                {/* Stock Indicator */}
                                                {(parseInt(product.stock) || 0) > 0 ? (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
                                                        In Stock
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700">
                                                        Out of Stock
                                                    </span>
                                                )}

                                                <button
                                                    onClick={() => addToCart(product)}
                                                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm shadow-indigo-200"
                                                >
                                                    <ShoppingCart className="h-4 w-4" />
                                                    Add to Cart
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Floating Cart Button (Mobile) */}
            <AnimatePresence>
                {cartCount > 0 && !isCartOpen && (
                    <motion.button
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        onClick={() => setIsCartOpen(true)}
                        className="fixed bottom-6 right-6 z-40 bg-indigo-600 text-white p-4 rounded-full shadow-lg shadow-indigo-400/50 md:hidden flex items-center justify-center"
                    >
                        <ShoppingBag className="h-6 w-6" />
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
                            {cartCount}
                        </span>
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Cart Drawer */}
            <AnimatePresence>
                {isCartOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsCartOpen(false)}
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
                        />
                        <motion.div
                            initial={{ x: "100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-white shadow-2xl flex flex-col"
                        >
                            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                    <ShoppingCart className="h-5 w-5" /> Your Cart
                                </h2>
                                <button onClick={() => setIsCartOpen(false)} className="text-gray-400 hover:text-gray-500">
                                    <X className="h-6 w-6" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                {cart.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                        <ShoppingBag className="h-16 w-16 mb-4 opacity-50" />
                                        <p>Your cart is empty.</p>
                                        <button
                                            onClick={() => setIsCartOpen(false)}
                                            className="mt-4 text-indigo-600 font-medium hover:underline"
                                        >
                                            Start Shopping
                                        </button>
                                    </div>
                                ) : (
                                    cart.map(item => (
                                        <div key={item.id} className="flex transition-colors bg-white border border-gray-100 rounded-xl p-3 shadow-sm hover:border-indigo-100">
                                            <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                                                {item.photoUrl ? (
                                                    <img src={item.photoUrl} alt={item.name} className="h-full w-full object-cover" />
                                                ) : (
                                                    <div className="h-full w-full flex items-center justify-center text-gray-400">
                                                        <Package className="h-8 w-8" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="ml-4 flex flex-1 flex-col justify-between">
                                                <div>
                                                    <div className="flex justify-between text-base font-medium text-gray-900">
                                                        <h3 className="line-clamp-2 text-sm">{item.name}</h3>
                                                        <p className="ml-4 tabular-nums">{(parseFloat(item.price) * item.quantity).toFixed(0)}</p>
                                                    </div>
                                                    <p className="mt-1 text-sm text-gray-500 tabular-nums">{parseFloat(item.price)} DH</p>
                                                </div>

                                                <div className="flex items-center justify-between text-sm">
                                                    <div className="flex items-center border border-gray-200 rounded-lg">
                                                        <button
                                                            onClick={() => updateQuantity(item.id, -1)}
                                                            className="p-1 hover:bg-gray-100 text-gray-500"
                                                        >
                                                            <Minus className="h-3 w-3" />
                                                        </button>
                                                        <span className="w-8 text-center font-medium tabular-nums">{item.quantity}</span>
                                                        <button
                                                            onClick={() => updateQuantity(item.id, 1)}
                                                            className="p-1 hover:bg-gray-100 text-gray-500"
                                                        >
                                                            <Plus className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeFromCart(item.id)}
                                                        className="font-medium text-red-500 hover:text-red-600 flex items-center gap-1"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {cart.length > 0 && (
                                <div className="border-t border-gray-200 p-6 bg-gray-50">
                                    <div className="flex justify-between text-base font-bold text-gray-900 mb-4">
                                        <p>Total</p>
                                        <p>{cartTotal.toFixed(2)} DH</p>
                                    </div>
                                    <button
                                        onClick={handleCheckout}
                                        disabled={isCheckingOut}
                                        className="w-full flex items-center justify-center rounded-xl border border-transparent bg-green-500 px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                                    >
                                        {isCheckingOut ? (
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                                        ) : (
                                            <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" className="h-5 w-5 mr-2 filter brightness-0 invert" alt="" />
                                        )}
                                        {isCheckingOut ? "Processing..." : "Order via WhatsApp"}
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
