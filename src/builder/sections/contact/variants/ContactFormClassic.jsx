import React, { useState } from 'react';
import { Phone, Mail, MapPin, Send, MessageCircle } from 'lucide-react';
import MediaBackground from '../../../components/MediaBackground';
import { getSectionStyle, getAlignmentClass, getButtonStyle } from '../../../utils/styles';

export default function ContactFormClassic({ section, theme, contextData }) {
    const { title, subtitle, settings = {} } = section;
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

    return (
        <div className={`px-4 ${alignClass} relative overflow-hidden`} style={getSectionStyle(section, theme)}>
            <MediaBackground settings={settings} />
            <div className="max-w-6xl mx-auto relative z-10">
                {/* Header */}
                <div className={`mb-14 ${settings.alignment === 'center' ? 'text-center' : ''}`}>
                    <h2 className="text-3xl md:text-5xl font-black mb-4 drop-shadow-sm">{title || 'Contactez-nous'}</h2>
                    {subtitle && <p className="text-xl opacity-80 max-w-2xl mx-auto">{subtitle}</p>}
                </div>

                <div className="grid md:grid-cols-5 gap-10 text-left">
                    {/* Left: Info */}
                    <div className="md:col-span-2 space-y-6">
                        <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-lg border border-slate-100">
                            <h3 className="font-black text-xl text-slate-900 mb-6">Nos coordonnées</h3>
                            <div className="space-y-5">
                                {phone && (
                                    <a href={`tel:${phone}`} className="flex items-center gap-4 group hover:text-indigo-600 transition-colors">
                                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm" style={{ backgroundColor: `${primary}20` }}>
                                            <Phone size={20} style={{ color: primary }} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Téléphone</p>
                                            <p className="font-bold text-slate-800 group-hover:text-indigo-600">{phone}</p>
                                        </div>
                                    </a>
                                )}
                                {email && (
                                    <a href={`mailto:${email}`} className="flex items-center gap-4 group hover:text-indigo-600 transition-colors">
                                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm" style={{ backgroundColor: `${primary}20` }}>
                                            <Mail size={20} style={{ color: primary }} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Email</p>
                                            <p className="font-bold text-slate-800 group-hover:text-indigo-600">{email}</p>
                                        </div>
                                    </a>
                                )}
                                {address && (
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm" style={{ backgroundColor: `${primary}20` }}>
                                            <MapPin size={20} style={{ color: primary }} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Adresse</p>
                                            <p className="font-bold text-slate-800">{address}</p>
                                        </div>
                                    </div>
                                )}
                                {whatsapp && (
                                    <a
                                        href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-3 w-full mt-4 py-3 px-5 rounded-2xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/30"
                                    >
                                        <MessageCircle size={20} />
                                        WhatsApp Direct
                                    </a>
                                )}

                                {!phone && !email && !address && !whatsapp && (
                                    <p className="text-slate-400 text-sm italic">Configurez vos coordonnées dans le panneau d'édition.</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right: Form */}
                    <div className="md:col-span-3">
                        <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100">
                            {submitted ? (
                                <div className="flex flex-col items-center justify-center h-64 text-center">
                                    <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                                        <Send size={32} className="text-emerald-600" />
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-900 mb-2">Message envoyé !</h3>
                                    <p className="text-slate-500">Nous reviendrons vers vous très bientôt.</p>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-5">
                                    {fields.map(field => (
                                        <div key={field.id}>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                                {field.label}
                                                {field.required && <span className="text-rose-500 ml-1">*</span>}
                                            </label>
                                            {field.type === 'textarea' ? (
                                                <textarea
                                                    rows={4}
                                                    placeholder={field.placeholder}
                                                    required={field.required}
                                                    value={formData[field.id] || ''}
                                                    onChange={e => handleChange(field.id, e.target.value)}
                                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 outline-none resize-none transition-all"
                                                    style={{ '--tw-ring-color': primary }}
                                                />
                                            ) : (
                                                <input
                                                    type={field.type}
                                                    placeholder={field.placeholder}
                                                    required={field.required}
                                                    value={formData[field.id] || ''}
                                                    onChange={e => handleChange(field.id, e.target.value)}
                                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 outline-none transition-all"
                                                />
                                            )}
                                        </div>
                                    ))}
                                    <button
                                        type="submit"
                                        className={`w-full py-4 font-black text-white text-lg flex items-center justify-center gap-2 shadow-lg transition-all hover:scale-[1.02] active:scale-95 ${btnRadius}`}
                                        style={{ backgroundColor: primary, boxShadow: `0 8px 24px ${primary}40` }}
                                    >
                                        <Send size={20} />
                                        {settings.submitText || 'Envoyer le message'}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
