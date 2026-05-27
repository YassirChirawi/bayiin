import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send } from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'react-hot-toast';

export default function ContactPage({ theme, store }) {
    const primaryColor = theme.primaryColor || '#4f46e5';
    
    // Prioritize store info, fallback to theme info
    const contactEmail = store?.email || theme?.contactEmail || '';
    const contactPhone = store?.phone || theme?.contactPhone || '';
    const contactAddress = store?.address || theme?.contactAddress || '';
    const storeId = store?.id;
    
    const [formData, setFormData] = useState({ name: '', email: '', message: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!storeId) {
            // Preview mode fallback
            setIsSubmitted(true);
            return;
        }

        setIsSubmitting(true);
        try {
            await addDoc(collection(db, `stores/${storeId}/tickets`), {
                ...formData,
                status: 'new', // new, in_progress, closed
                source: 'storefront_contact',
                createdAt: serverTimestamp(),
                needsAIResponse: true // Flag to trigger Beya3 later
            });
            setIsSubmitted(true);
            toast.success("Votre message a bien été envoyé !");
        } catch (error) {
            console.error("Erreur lors de l'envoi du message", error);
            toast.error("Erreur lors de l'envoi du message.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto px-6 py-16">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-black text-slate-900 mb-4">Contactez-nous</h1>
                <p className="text-slate-600 text-lg">Nous sommes là pour vous aider. N'hésitez pas à nous envoyer un message.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-12">
                {/* Contact Info */}
                <div className="space-y-8 bg-slate-50 p-8 rounded-3xl h-fit">
                    <h2 className="text-2xl font-bold text-slate-900 mb-6">Nos Coordonnées</h2>
                    
                    {contactEmail && (
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}>
                                <Mail size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900">Email</h3>
                                <a href={`mailto:${contactEmail}`} className="text-slate-600 hover:text-slate-900 transition-colors">{contactEmail}</a>
                            </div>
                        </div>
                    )}
                    
                    {contactPhone && (
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}>
                                <Phone size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900">Téléphone</h3>
                                <a href={`tel:${contactPhone}`} className="text-slate-600 hover:text-slate-900 transition-colors">{contactPhone}</a>
                            </div>
                        </div>
                    )}
                    
                    {contactAddress && (
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}>
                                <MapPin size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900">Adresse</h3>
                                <p className="text-slate-600 whitespace-pre-line leading-relaxed">{contactAddress}</p>
                            </div>
                        </div>
                    )}
                    
                    {(!contactEmail && !contactPhone && !contactAddress) && (
                        <p className="text-slate-500 italic">Coordonnées non renseignées.</p>
                    )}
                </div>

                {/* Form */}
                <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
                    {isSubmitted ? (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-12">
                            <div className="w-20 h-20 rounded-full flex items-center justify-center text-white mb-4" style={{ backgroundColor: primaryColor }}>
                                <Send size={32} />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900">Message envoyé !</h3>
                            <p className="text-slate-600">Nous vous répondrons dans les plus brefs délais.</p>
                            <button 
                                onClick={() => { setIsSubmitted(false); setFormData({ name: '', email: '', message: '' }); }}
                                className="mt-6 text-sm font-bold hover:underline"
                                style={{ color: primaryColor }}
                            >
                                Envoyer un autre message
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-900 mb-2">Votre Nom</label>
                                <input 
                                    type="text" 
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-900 outline-none transition-all bg-slate-50 focus:bg-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-900 mb-2">Votre Email</label>
                                <input 
                                    type="email" 
                                    required
                                    value={formData.email}
                                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-900 outline-none transition-all bg-slate-50 focus:bg-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-900 mb-2">Message</label>
                                <textarea 
                                    required
                                    rows={4}
                                    value={formData.message}
                                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-900 outline-none transition-all resize-none bg-slate-50 focus:bg-white"
                                />
                            </div>
                            <button 
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-4 rounded-xl text-white font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
                                style={{ backgroundColor: primaryColor }}
                            >
                                {isSubmitting ? 'Envoi...' : 'Envoyer le message'}
                                <Send size={20} />
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
