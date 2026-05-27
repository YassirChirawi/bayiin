import React from 'react';
import { ShoppingBag } from 'lucide-react';
import MediaBackground from '../../../components/MediaBackground';
import { getSectionStyle, getAlignmentClass, getButtonStyle } from '../../../utils/styles';

export default function ProductGridClassic({ section, theme, contextData }) {
    const { title, subtitle, ctaText, settings = {} } = section;
    const alignClass = getAlignmentClass(settings.alignment);
    const columns = settings.columns || 4;
    const btnClass = `px-8 py-4 text-white font-bold text-lg hover:scale-105 transition-transform ${getButtonStyle(theme.buttonStyle)}`;

    return (
        <div className={`px-6 ${alignClass} relative overflow-hidden`} style={getSectionStyle(section, theme)}>
            <MediaBackground settings={settings} />
            <div className="max-w-7xl mx-auto relative z-10">
                <div className="mb-16">
                    <h2 className="text-3xl md:text-5xl font-black mb-4 drop-shadow-sm">{title}</h2>
                    <p className="text-xl opacity-80 drop-shadow-sm">{subtitle}</p>
                </div>
                <div className={`grid grid-cols-2 md:grid-cols-${columns} gap-4 md:gap-8`}>
                    {(contextData?.products && contextData.products.length > 0 ? contextData.products : [1, 2, 3, 4]).map((p, idx) => {
                        const isPlaceholder = typeof p === 'number';
                        const product = isPlaceholder ? { id: idx, name: `Produit Premium ${p}`, price: 299 } : p;
                        return (
                            <div 
                                key={product.id} 
                                onClick={() => contextData?.onProductClick && !isPlaceholder ? contextData.onProductClick(product) : null}
                                className={`bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all group flex flex-col h-full ${contextData?.onProductClick && !isPlaceholder ? 'cursor-pointer' : ''}`}
                            >
                                <div className="aspect-[4/5] bg-slate-100 flex items-center justify-center relative overflow-hidden">
                                    {product.photoUrl ? (
                                        <img src={product.photoUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    ) : (
                                        <ShoppingBag size={48} className="text-slate-300 group-hover:scale-110 transition-transform duration-500" />
                                    )}
                                    <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                </div>
                                <div className="p-6 text-left flex-1 flex flex-col justify-between">
                                    <div>
                                        <h3 className="font-bold text-slate-900 mb-2 text-lg line-clamp-2">{product.name}</h3>
                                    </div>
                                    <div className="mt-4">
                                        <p className="font-black text-2xl mb-4" style={{ color: theme.primaryColor }}>{parseFloat(product.price).toFixed(0)} MAD</p>
                                        <button className="w-full py-3 rounded-xl font-bold bg-slate-900 text-white hover:bg-black transition-colors">Commander</button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
                {ctaText && (
                    <div className="text-center mt-16">
                        <button className={`${btnClass} shadow-xl`} style={{ backgroundColor: theme.primaryColor }}>
                            {ctaText}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
