import React from 'react';
import MediaBackground from '../../../components/MediaBackground';
import { getSectionStyle, getAlignmentClass } from '../../../utils/styles';

export default function FeaturesGlass({ section, theme }) {
    const { title, subtitle, content, items = [], settings = {} } = section;
    const alignClass = getAlignmentClass(settings.alignment);
    
    const displayItems = items.length > 0 ? items : [
        { title: "Livraison Express", content: "Partout au Maroc en 24h", emoji: "🚀" },
        { title: "Paiement Sécurisé", content: "Payez à la réception", emoji: "🤝" },
        { title: "Qualité Garantie", content: "Satisfait ou remboursé", emoji: "💎" }
    ];

    const isMedia = settings.backgroundType === 'image' || settings.backgroundType === 'video';
    const textColor = settings.textColor || '#0f172a';

    return (
        <div className={`px-6 ${alignClass} relative overflow-hidden`} style={getSectionStyle(section, theme)}>
            <MediaBackground settings={settings} />
            <div className="max-w-6xl mx-auto relative z-10">
                <h2 className="text-3xl md:text-5xl font-black mb-4 drop-shadow-sm">{title}</h2>
                <p className="text-xl opacity-80 mb-16 drop-shadow-sm">{subtitle}</p>
                {content && <p className="leading-relaxed max-w-3xl mx-auto mb-12 opacity-90">{content}</p>}
                
                <div className="grid md:grid-cols-3 gap-8">
                    {displayItems.map((item, i) => (
                        <div 
                            key={i} 
                            className={`p-10 rounded-3xl backdrop-blur-md shadow-xl hover:-translate-y-2 transition-transform duration-300 ${isMedia ? 'bg-white/10 border border-white/20' : 'bg-white border border-slate-100'}`} 
                            style={{ color: textColor }}
                        >
                            <div className={`w-20 h-20 mx-auto rounded-2xl mb-8 flex items-center justify-center shadow-inner text-4xl ${isMedia ? 'bg-white/20' : 'bg-slate-50'}`}>
                                {item.emoji || "⭐"}
                            </div>
                            <h3 className="font-black text-2xl mb-4">{item.title}</h3>
                            <p className="opacity-90 leading-relaxed text-lg">{item.content}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
