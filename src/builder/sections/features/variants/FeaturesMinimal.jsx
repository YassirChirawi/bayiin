import React from 'react';
import MediaBackground from '../../../components/MediaBackground';
import { getSectionStyle, getAlignmentClass } from '../../../utils/styles';

export default function FeaturesMinimal({ section, theme }) {
    const { title, subtitle, content, items = [], settings = {} } = section;
    const alignClass = getAlignmentClass(settings.alignment);
    
    const displayItems = items.length > 0 ? items : [
        { title: "Rapide", content: "Partout au Maroc", emoji: "🚀" },
        { title: "Sécurisé", content: "Payez à la livraison", emoji: "🤝" },
        { title: "Garanti", content: "Satisfait ou remboursé", emoji: "💎" }
    ];

    return (
        <div className={`px-6 ${alignClass} relative overflow-hidden`} style={getSectionStyle(section, theme)}>
            <MediaBackground settings={settings} />
            <div className="max-w-6xl mx-auto relative z-10">
                <div className="mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight drop-shadow-sm">{title}</h2>
                    <p className="text-lg opacity-70 max-w-2xl mx-auto drop-shadow-sm">{subtitle}</p>
                </div>
                
                <div className="flex flex-col md:flex-row gap-12 justify-center items-start border-t border-slate-200/20 pt-16">
                    {displayItems.map((item, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center text-center">
                            <div className="text-4xl mb-6 opacity-90">{item.emoji || "✨"}</div>
                            <h3 className="font-bold text-xl mb-3 tracking-wide">{item.title}</h3>
                            <p className="opacity-70 leading-relaxed text-sm max-w-[250px]">{item.content}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
