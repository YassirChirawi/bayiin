import React from 'react';
import { getSectionStyle } from '../../../utils/styles';
import EditableText from '../../../components/EditableText';
import DynamicIcon from '../../../components/DynamicIcon';
import { MapPin, Phone, Mail, Facebook, Instagram, Twitter, MessageCircle } from 'lucide-react';

export default function FooterGlobal({ section, theme, onUpdate }) {
    const { settings = {}, items = [], title, content } = section;
    
    const storeName = title || 'Ma Boutique';
    const storeDescription = content || 'Votre boutique de confiance. Retrouvez nos meilleurs produits et offres exclusives.';
    
    // `onUpdate` n'est fourni que dans l'éditeur. Sur la vitrine publique on
    // n'affiche que ce que le marchand a réellement renseigné : un placeholder
    // ('123 Avenue Mohammed V', '+212 6 00 00 00 00') envoie ses clients dans le mur.
    const isEditor = Boolean(onUpdate);
    const address = settings.address || (isEditor ? '123 Avenue Mohammed V, Casablanca' : null);
    const phone = settings.phone || (isEditor ? '+212 6 00 00 00 00' : null);
    const email = settings.email || (isEditor ? 'contact@maboutique.com' : null);
    
    // Social Links from Settings
    const socials = [
        { id: 'facebook', icon: <Facebook size={20} />, url: settings.socialFacebook, color: '#1877F2' },
        { id: 'instagram', icon: <Instagram size={20} />, url: settings.socialInstagram, color: '#E4405F' },
        { id: 'whatsapp', icon: <MessageCircle size={20} />, url: settings.socialWhatsapp, color: '#25D366' },
        { id: 'twitter', icon: <Twitter size={20} />, url: settings.socialTwitter, color: '#1DA1F2' }
    ].filter(s => s.url); // Only show configured ones, though in preview we might want placeholders
    
    // If no socials configured and we are in preview/editor, show placeholders
    const displaySocials = socials.length > 0 ? socials : [
        { id: 'facebook', icon: <Facebook size={20} />, url: '#', color: '#1877F2' },
        { id: 'instagram', icon: <Instagram size={20} />, url: '#', color: '#E4405F' },
        { id: 'whatsapp', icon: <MessageCircle size={20} />, url: '#', color: '#25D366' },
    ];

    const navLinks = items.length > 0 ? items : [
        { id: 'f-1', title: "Accueil", link: { url: "/" } },
        { id: 'f-2', title: "Nos Produits", link: { url: "/products" } },
        { id: 'f-3', title: "Contact", link: { url: "/contact" } },
        { id: 'f-4', title: "Politique de retour", link: { url: "/returns" } },
    ];

    return (
        <footer className="pt-16 pb-8 relative z-30 border-t border-slate-100" style={{ ...getSectionStyle(section, theme), backgroundColor: section.settings?.backgroundColor || '#f8fafc', color: section.settings?.textColor || '#334155' }}>
            <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
                
                {/* Colonne 1 : À propos */}
                <div className="space-y-4">
                    <h3 className="font-black text-2xl" style={{ color: theme.primaryColor }}>
                        <EditableText value={storeName} onChange={(val) => onUpdate?.({ title: val })} isReadOnly={!onUpdate} />
                    </h3>
                    <p className="text-sm opacity-80 leading-relaxed">
                        <EditableText value={storeDescription} onChange={(val) => onUpdate?.({ content: val })} isReadOnly={!onUpdate} multiline />
                    </p>
                    <div className="flex items-center gap-3 pt-2">
                        {displaySocials.map(social => (
                            <a 
                                key={social.id} 
                                href={onUpdate ? '#' : social.url} 
                                target="_blank" 
                                rel="noreferrer"
                                className="w-10 h-10 rounded-full flex items-center justify-center text-white transition-transform hover:scale-110 shadow-sm"
                                style={{ backgroundColor: social.color }}
                                onClick={(e) => { if(onUpdate) e.preventDefault(); }}
                            >
                                {social.icon}
                            </a>
                        ))}
                    </div>
                </div>

                {/* Colonne 2 : Liens Rapides */}
                <div className="space-y-4">
                    <h4 className="font-bold text-lg mb-4">Liens Rapides</h4>
                    <ul className="space-y-3 text-sm opacity-90 font-medium">
                        {navLinks.filter(i => i.isVisible !== false).map(link => (
                            <li key={link.id}>
                                <a href={onUpdate ? '#' : (link.link?.url || '#')} className="hover:underline hover:opacity-100 transition-all" onClick={(e) => { if(onUpdate) e.preventDefault(); }}>
                                    {link.title}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Colonne 3 : Contact & Infos */}
                <div className="space-y-4">
                    <h4 className="font-bold text-lg mb-4">Contactez-nous</h4>
                    <ul className="space-y-4 text-sm opacity-90">
                        {address && (
                            <li className="flex items-start gap-3">
                                <MapPin size={18} className="mt-0.5 flex-shrink-0" style={{ color: theme.primaryColor }} />
                                <span>{address}</span>
                            </li>
                        )}
                        {phone && (
                            <li className="flex items-center gap-3">
                                <Phone size={18} className="flex-shrink-0" style={{ color: theme.primaryColor }} />
                                <span>{phone}</span>
                            </li>
                        )}
                        {email && (
                            <li className="flex items-center gap-3">
                                <Mail size={18} className="flex-shrink-0" style={{ color: theme.primaryColor }} />
                                <span>{email}</span>
                            </li>
                        )}
                    </ul>
                </div>
            </div>

            {/* Copyright */}
            <div className="max-w-6xl mx-auto px-6 pt-8 border-t border-black/5 text-center text-xs opacity-60 font-medium">
                <p>&copy; {new Date().getFullYear()} {storeName}. Tous droits réservés.</p>
                <p className="mt-1">
                    Propulsé par <span className="font-bold text-indigo-600">BayIIn</span>
                </p>
            </div>
        </footer>
    );
}
