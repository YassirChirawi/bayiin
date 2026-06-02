import React from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, ShoppingCart } from 'lucide-react';
import { getAlignmentClass } from '../../../utils/styles';
import EditableText from '../../../components/EditableText';
import BlockText from '../../../components/BlockText';
import BlockButton from '../../../components/BlockButton';
import SectionWrapper from '../../../components/SectionWrapper';
import { useCart } from '../../../../contexts/CartContext';

export default function ProductGridClassic({ section, theme, contextData, onUpdate }) {
    const { title, subtitle, ctaText, blocks = [], settings = {} } = section;
    const alignClass = getAlignmentClass(settings.alignment || 'center');
    const columns = settings.columns || 4;
    
    const { addToCart, openCartDrawer } = useCart();

    const handleAddToCart = (e, product) => {
        e.stopPropagation(); // Prevent product click if clicking "Commander"
        addToCart({
            id: product.id || 'demo-product-' + Math.random().toString(36).substr(2, 9),
            name: product.name || 'Produit Premium',
            price: product.price || 299,
            quantity: 1,
            image: product.photoUrl || 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=200&q=80'
        });
        openCartDrawer();
    };

    // Extract Heading, Subtitle, Button from blocks if they exist
    const headingBlock = blocks.find(b => b.type === 'Heading');
    const subtitleBlock = blocks.find(b => b.type === 'Subtitle');
    const buttonBlock = blocks.find(b => b.type === 'Button');

    const products = contextData?.products && contextData.products.length > 0 ? contextData.products : [1, 2, 3, 4];

    return (
        <SectionWrapper settings={settings} className={`relative overflow-hidden`}>
            <div className={`max-w-7xl mx-auto px-6 relative z-10 py-12 ${alignClass}`}>
                <div className="mb-16 flex flex-col gap-4">
                    {headingBlock ? (
                        <BlockText block={headingBlock} theme={theme} animProps={{ initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.5 } }} />
                    ) : (
                        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                            <EditableText
                                value={title}
                                onChange={(val) => onUpdate?.({ title: val })}
                                as="h2"
                                className="text-4xl md:text-5xl font-black mb-4 drop-shadow-sm tracking-tight"
                                isReadOnly={!onUpdate}
                            />
                        </motion.div>
                    )}

                    {subtitleBlock ? (
                        <BlockText block={subtitleBlock} theme={theme} animProps={{ initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.5, delay: 0.1 } }} />
                    ) : (
                        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}>
                            <EditableText
                                value={subtitle}
                                onChange={(val) => onUpdate?.({ subtitle: val })}
                                as="p"
                                className="text-xl opacity-80 drop-shadow-sm max-w-2xl"
                                isReadOnly={!onUpdate}
                            />
                        </motion.div>
                    )}
                </div>

                <div className={`grid grid-cols-2 md:grid-cols-${columns} gap-6 md:gap-8`}>
                    {products.map((p, idx) => {
                        const isPlaceholder = typeof p === 'number';
                        const product = isPlaceholder ? { id: idx, name: `Produit Premium ${p}`, price: 299 } : p;
                        return (
                            <motion.div 
                                key={product.id} 
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-50px" }}
                                transition={{ duration: 0.5, delay: idx * 0.1 }}
                                onClick={() => contextData?.onProductClick && !isPlaceholder ? contextData.onProductClick(product) : null}
                                className={`bg-white rounded-3xl overflow-hidden shadow-md hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group flex flex-col h-full border border-slate-100 ${contextData?.onProductClick && !isPlaceholder ? 'cursor-pointer' : ''}`}
                            >
                                <div className="aspect-[4/5] bg-slate-50 flex items-center justify-center relative overflow-hidden">
                                    {product.photoUrl ? (
                                        <img src={product.photoUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                    ) : (
                                        <ShoppingBag size={48} className="text-slate-300 group-hover:scale-110 transition-transform duration-500" />
                                    )}
                                    
                                    {/* Action on hover */}
                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                        <button 
                                            onClick={(e) => handleAddToCart(e, product)}
                                            className="bg-white text-slate-900 font-bold px-6 py-3 rounded-full shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0"
                                        >
                                            <ShoppingCart size={18} />
                                            Ajouter au Panier
                                        </button>
                                    </div>
                                </div>
                                <div className="p-6 text-left flex-1 flex flex-col justify-between">
                                    <div>
                                        <h3 className="font-bold text-slate-900 mb-2 text-lg line-clamp-2 leading-snug">{product.name}</h3>
                                    </div>
                                    <div className="mt-6 flex flex-col gap-4">
                                        <p className="font-black text-2xl tracking-tight" style={{ color: theme.primaryColor }}>{parseFloat(product.price).toFixed(0)} MAD</p>
                                        <button 
                                            onClick={(e) => handleAddToCart(e, product)}
                                            className="w-full py-4 rounded-xl font-bold bg-slate-900 text-white hover:bg-slate-800 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg"
                                        >
                                            <ShoppingBag size={18} />
                                            Commander
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                <div className="mt-16 flex justify-center w-full">
                    {buttonBlock ? (
                        <BlockButton block={buttonBlock} theme={theme} animProps={{ initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.5, delay: 0.2 } }} />
                    ) : (
                        ctaText && (
                            <motion.button 
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.2 }}
                                className="px-10 py-5 rounded-2xl text-white font-bold text-lg hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.2)] transition-all shadow-xl" 
                                style={{ backgroundColor: theme.primaryColor }}
                            >
                                <EditableText
                                    value={ctaText}
                                    onChange={(val) => onUpdate?.({ ctaText: val })}
                                    as="span"
                                    isReadOnly={!onUpdate}
                                />
                            </motion.button>
                        )
                    )}
                </div>
            </div>
        </SectionWrapper>
    );
}
