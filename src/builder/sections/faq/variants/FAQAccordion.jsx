import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, ChevronDown } from 'lucide-react';
import { getAlignmentClass } from '../../../utils/styles';
import EditableText from '../../../components/EditableText';
import BlockText from '../../../components/BlockText';
import SectionWrapper from '../../../components/SectionWrapper';
import MediaBackground from '../../../components/MediaBackground';

export default function FAQAccordion({ section, theme, onUpdate }) {
    const { title, subtitle, items = [], blocks = [], settings = {} } = section;
    const alignClass = getAlignmentClass(settings.alignment || 'center');
    
    // Merge blocks and legacy items
    const faqBlocks = blocks.filter(b => b.type === 'FAQItem').map(b => ({
        title: b.settings.question,
        content: b.settings.answer
    }));

    const rawItems = faqBlocks.length > 0 ? faqBlocks : items;

    const displayItems = rawItems.length > 0 ? rawItems : [
        { title: "Quels sont les délais de livraison ?", content: "Nous livrons partout au Maroc en 24 à 48 heures ouvrables." },
        { title: "Comment se passe le paiement ?", content: "Vous payez uniquement à la réception de votre commande (Cash on Delivery). C'est simple, rapide et 100% sécurisé." },
        { title: "Puis-je retourner ou échanger un produit ?", content: "Absolument. Si le produit ne vous convient pas, vous disposez de 7 jours pour demander un échange ou un remboursement." }
    ];

    const isMedia = settings.backgroundType === 'image' || settings.backgroundType === 'video';
    const textColor = settings.textColor || '#0f172a';

    const [openIndex, setOpenIndex] = useState(0);

    const updateItem = (index, field, value) => {
        const newItems = [...displayItems];
        newItems[index] = { ...newItems[index], [field]: value };
        onUpdate?.({ items: newItems });
    };

    // Extract Heading and Subtitle from blocks if they exist
    const headingBlock = blocks.find(b => b.type === 'Heading');
    const subtitleBlock = blocks.find(b => b.type === 'Subtitle');

    return (
        <SectionWrapper settings={settings} className={`relative overflow-hidden ${alignClass}`}>
            <MediaBackground settings={settings} />
            <div className="max-w-4xl mx-auto relative z-10 py-12 px-6">
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
                                style={{ color: textColor }}
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
                                className="text-xl opacity-70 max-w-2xl mx-auto drop-shadow-sm"
                                isReadOnly={!onUpdate}
                                style={{ color: textColor }}
                            />
                        </motion.div>
                    )}
                </div>

                <div className="space-y-4 text-left">
                    {displayItems.map((item, i) => {
                        const isOpen = openIndex === i;
                        return (
                            <motion.div 
                                key={i} 
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.4, delay: i * 0.1 }}
                                className={`rounded-3xl backdrop-blur-xl overflow-hidden transition-all duration-300 ${isMedia ? 'bg-white/10 border border-white/20' : 'bg-white border border-slate-100'} ${isOpen ? 'shadow-xl ring-2 ring-indigo-50/50' : 'shadow-sm hover:shadow-md hover:border-indigo-100'}`} 
                                style={{ color: textColor }}
                            >
                                <button 
                                    onClick={() => setOpenIndex(isOpen ? -1 : i)}
                                    className="w-full p-6 md:p-8 flex items-center justify-between gap-4 text-left focus:outline-none"
                                >
                                    <div className="font-bold text-xl md:text-2xl flex items-center gap-4 flex-1">
                                        <div className={`p-2 rounded-xl transition-colors duration-300 ${isOpen ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600'}`} style={isOpen ? { backgroundColor: theme.primaryColor } : { color: theme.primaryColor }}>
                                            <HelpCircle size={24} />
                                        </div>
                                        <EditableText
                                            value={item.title}
                                            onChange={(val) => updateItem(i, 'title', val)}
                                            as="h3"
                                            isReadOnly={!onUpdate}
                                            className="leading-tight"
                                        />
                                    </div>
                                    <div className={`transform transition-transform duration-300 text-slate-400 ${isOpen ? 'rotate-180 text-indigo-600' : ''}`}>
                                        <ChevronDown size={28} />
                                    </div>
                                </button>
                                
                                <AnimatePresence>
                                    {isOpen && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3 }}
                                            className="px-6 md:px-8 pb-8 pt-0"
                                        >
                                            <div className="pl-[3.25rem]">
                                                <EditableText
                                                    value={item.content}
                                                    onChange={(val) => updateItem(i, 'content', val)}
                                                    as="p"
                                                    className="text-lg opacity-80 leading-relaxed block"
                                                    isReadOnly={!onUpdate}
                                                />
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </SectionWrapper>
    );
}
