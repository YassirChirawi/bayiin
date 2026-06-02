import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Phone, Mail, MapPin, Send, MessageCircle } from 'lucide-react';
import MediaBackground from '../../../components/MediaBackground';
import { getAlignmentClass, getButtonStyle } from '../../../utils/styles';
import EditableText from '../../../components/EditableText';
import BlockText from '../../../components/BlockText';
import BlockButton from '../../../components/BlockButton';
import SectionWrapper from '../../../components/SectionWrapper';

export default function ContactFormClassic({ section, theme, contextData, onUpdate }) {
    const { title, subtitle, blocks = [], settings = {} } = section;
    const alignClass = getAlignmentClass(settings.alignment || 'center');
    const btnRadius = getButtonStyle(theme?.buttonStyle);
    const primary = theme?.primaryColor || '#6366f1';

    // Form fields config — editable via section.settings.fields
    const fields = settings.fields || [
        { id: 'name', label: 'Nom complet', type: 'text', placeholder: 'Votre nom', required: true },
        { id: 'phone', label: 'Téléphone', type: 'tel', placeholder: '06 XX XX XX XX', required: true },
        { id: 'message', label: 'Message', type: 'textarea', placeholder: 'Comment pouvons-nous vous aider ?', required: false },
    ];

    // Contact info from settings
    const phone = settings.phone || '';
    const email = settings.email || '';
    const address = settings.address || '';
    const whatsapp = settings.whatsapp || '';

    const [formData, setFormData] = useState({});
    const [submitted, setSubmitted] = useState(false);

    const handleChange = (id, val) => setFormData(prev => ({ ...prev, [id]: val }));

    const handleSubmit = (e) => {
        e.preventDefault();
        if (contextData?.isBuilder) return; // Don't submit in builder mode
        if (whatsapp) {
            const msg = fields.map(f => `*${f.label}*: ${formData[f.id] || ''}`).join('\n');
            window.open(`https://wa.me/${whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
        }
        setSubmitted(true);
    };

    // Extract blocks if they exist
    const headingBlock = blocks.find(b => b.type === 'Heading');
    const subtitleBlock = blocks.find(b => b.type === 'Subtitle');

    return (
        <SectionWrapper settings={settings} className={`relative overflow-hidden ${alignClass}`}>
            <MediaBackground settings={settings} />
            <div className="max-w-6xl mx-auto relative z-10 py-16 px-4">
                {/* Header */}
                <div className={`mb-16 flex flex-col gap-4 ${settings.alignment === 'center' ? 'text-center' : ''}`}>
                    {headingBlock ? (
                        <BlockText block={headingBlock} theme={theme} animProps={{ initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.5 } }} />
                    ) : (
                        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                            <EditableText
                                value={title || 'Contactez-nous'}
                                onChange={(val) => onUpdate?.({ title: val })}
                                as="h2"
                                className="text-4xl md:text-5xl font-black mb-4 drop-shadow-sm tracking-tight"
                                isReadOnly={!onUpdate}
                                style={{ color: settings.textColor || '#0f172a' }}
                            />
                        </motion.div>
                    )}
                    
                    {subtitleBlock ? (
                        <BlockText block={subtitleBlock} theme={theme} animProps={{ initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.5, delay: 0.1 } }} />
                    ) : (
                        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}>
                            <EditableText
                                value={subtitle || ''}
                                onChange={(val) => onUpdate?.({ subtitle: val })}
                                as="p"
                                className="text-xl opacity-80 max-w-2xl mx-auto drop-shadow-sm"
                                isReadOnly={!onUpdate}
                                placeholder="Ajouter un sous-titre..."
                                style={{ color: settings.textColor || '#475569' }}
                            />
                        </motion.div>
                    )}
                </div>

                <div className="grid md:grid-cols-5 gap-12 text-left">
                    {/* Left: Info */}
                    <motion.div 
                        initial={{ opacity: 0, x: -30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, margin: "-50px" }}
                        transition={{ duration: 0.6 }}
                        className="md:col-span-2 space-y-6"
                    >
                        <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-xl border border-slate-100/50 hover:shadow-2xl transition-shadow duration-300">
                            <h3 className="font-black text-2xl text-slate-900 mb-8">Nos coordonnées</h3>
                            <div className="space-y-6">
                                {phone && (
                                    <a href={`tel:${phone}`} className="flex items-center gap-5 group hover:text-indigo-600 transition-colors">
                                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-110 transition-transform duration-300" style={{ backgroundColor: `${primary}15` }}>
                                            <Phone size={24} style={{ color: primary }} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Téléphone</p>
                                            <p className="font-bold text-slate-800 text-lg group-hover:text-indigo-600 transition-colors">{phone}</p>
                                        </div>
                                    </a>
                                )}
                                {email && (
                                    <a href={`mailto:${email}`} className="flex items-center gap-5 group hover:text-indigo-600 transition-colors">
                                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-110 transition-transform duration-300" style={{ backgroundColor: `${primary}15` }}>
                                            <Mail size={24} style={{ color: primary }} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Email</p>
                                            <p className="font-bold text-slate-800 text-lg group-hover:text-indigo-600 transition-colors">{email}</p>
                                        </div>
                                    </a>
                                )}
                                {address && (
                                    <div className="flex items-start gap-5 group">
                                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-110 transition-transform duration-300" style={{ backgroundColor: `${primary}15` }}>
                                            <MapPin size={24} style={{ color: primary }} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Adresse</p>
                                            <p className="font-bold text-slate-800 text-lg leading-relaxed">{address}</p>
                                        </div>
                                    </div>
                                )}
                                {whatsapp && (
                                    <a
                                        href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-3 w-full mt-8 py-4 px-6 rounded-2xl bg-[#25D366] text-white font-bold hover:bg-[#1ebe57] transition-all duration-300 shadow-lg shadow-[#25D366]/30 hover:shadow-[#25D366]/50 hover:-translate-y-1"
                                    >
                                        <MessageCircle size={24} />
                                        WhatsApp Direct
                                    </a>
                                )}

                                {!phone && !email && !address && !whatsapp && (
                                    <p className="text-slate-400 text-sm italic">Configurez vos coordonnées dans le panneau d'édition.</p>
                                )}
                            </div>
                        </div>
                    </motion.div>

                    {/* Right: Form */}
                    <motion.div 
                        initial={{ opacity: 0, x: 30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, margin: "-50px" }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="md:col-span-3"
                    >
                        <div className="bg-white rounded-3xl p-8 shadow-2xl border border-slate-100 relative overflow-hidden">
                            {/* Decorative background element */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-bl-[100px] -z-0 opacity-50"></div>

                            {submitted ? (
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="flex flex-col items-center justify-center h-full min-h-[320px] text-center relative z-10"
                                >
                                    <div className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center mb-6">
                                        <Send size={40} className="text-emerald-600" />
                                    </div>
                                    <h3 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">Message envoyé !</h3>
                                    <p className="text-slate-500 text-lg">Nous reviendrons vers vous très bientôt.</p>
                                </motion.div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                                    {fields.map(field => (
                                        <div key={field.id} className="group">
                                            <label className="block text-sm font-bold text-slate-700 mb-2 group-focus-within:text-indigo-600 transition-colors">
                                                {field.label}
                                                {field.required && <span className="text-rose-500 ml-1">*</span>}
                                            </label>
                                            {field.type === 'textarea' ? (
                                                <textarea
                                                    rows={5}
                                                    placeholder={field.placeholder}
                                                    required={field.required}
                                                    value={formData[field.id] || ''}
                                                    onChange={e => handleChange(field.id, e.target.value)}
                                                    className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 outline-none resize-none transition-all"
                                                    style={{ '--tw-ring-color': primary }}
                                                />
                                            ) : (
                                                <input
                                                    type={field.type}
                                                    placeholder={field.placeholder}
                                                    required={field.required}
                                                    value={formData[field.id] || ''}
                                                    onChange={e => handleChange(field.id, e.target.value)}
                                                    className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 outline-none transition-all"
                                                    style={{ '--tw-ring-color': primary }}
                                                />
                                            )}
                                        </div>
                                    ))}
                                    <button
                                        type="submit"
                                        className={`w-full py-4 mt-4 font-bold text-white text-lg flex items-center justify-center gap-3 shadow-xl transition-all hover:-translate-y-1 hover:shadow-2xl active:scale-95 ${btnRadius}`}
                                        style={{ backgroundColor: primary, boxShadow: `0 10px 25px -5px ${primary}60` }}
                                    >
                                        <Send size={22} />
                                        <EditableText
                                            value={settings.submitText || 'Envoyer le message'}
                                            onChange={(val) => onUpdate?.({ settings: { ...settings, submitText: val } })}
                                            as="span"
                                            isReadOnly={!onUpdate}
                                        />
                                    </button>
                                </form>
                            )}
                        </div>
                    </motion.div>
                </div>
            </div>
        </SectionWrapper>
    );
}
