import React from 'react';
import { HelpCircle } from 'lucide-react';
import MediaBackground from '../../../components/MediaBackground';
import { getSectionStyle, getAlignmentClass } from '../../../utils/styles';

export default function FAQAccordion({ section, theme }) {
    const { title, subtitle, items = [], settings = {} } = section;
    const alignClass = getAlignmentClass(settings.alignment);
    
    const displayItems = items.length > 0 ? items : [
        { title: "Quels sont les délais de livraison ?", content: "Nous livrons partout au Maroc en 24 à 48 heures ouvrables." },
        { title: "Comment se passe le paiement ?", content: "Vous payez uniquement à la réception de votre commande (Cash on Delivery)." }
    ];

    const isMedia = settings.backgroundType === 'image' || settings.backgroundType === 'video';
    const textColor = settings.textColor || '#0f172a';

    return (
        <div className={`px-6 ${alignClass} relative overflow-hidden`} style={getSectionStyle(section, theme)}>
            <MediaBackground settings={settings} />
            <div className="max-w-3xl mx-auto relative z-10">
                <h2 className="text-3xl md:text-5xl font-black mb-4 drop-shadow-sm">{title}</h2>
                <p className="text-xl opacity-80 mb-12 drop-shadow-sm">{subtitle}</p>
                <div className="space-y-6 text-left">
                    {displayItems.map((item, i) => (
                        <div key={i} className={`p-8 rounded-3xl backdrop-blur-md shadow-lg ${isMedia ? 'bg-white/10 border border-white/20' : 'bg-white border border-slate-100'}`} style={{ color: textColor }}>
                            <h3 className="font-black text-2xl mb-4 flex items-center gap-3">
                                <HelpCircle className="text-indigo-500" /> {item.title}
                            </h3>
                            <p className="text-lg opacity-80 leading-relaxed ml-9">{item.content}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
