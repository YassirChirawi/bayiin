import React from 'react';
import { Facebook, Instagram, MessageCircle } from 'lucide-react';

export default function StoreFooter({ theme, storeName }) {
    const { socialLinks = {}, footerText, primaryColor, logoUrl } = theme;

    return (
        <footer className="bg-white border-t border-slate-100 py-12 px-6 mt-12">
            <div className="max-w-7xl mx-auto flex flex-col items-center text-center">
                {logoUrl ? (
                    <img src={logoUrl} alt={storeName} className="h-10 object-contain mb-6 grayscale hover:grayscale-0 transition-all opacity-80" />
                ) : (
                    <h2 className="text-2xl font-black mb-6" style={{ color: primaryColor || '#4f46e5' }}>
                        {storeName || 'Ma Boutique'}
                    </h2>
                )}

                <div className="flex items-center gap-6 mb-8">
                    {socialLinks.facebook && (
                        <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-slate-900 transition-colors">
                            <Facebook size={24} />
                        </a>
                    )}
                    {socialLinks.instagram && (
                        <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-slate-900 transition-colors">
                            <Instagram size={24} />
                        </a>
                    )}
                    {socialLinks.whatsapp && (
                        <a href={socialLinks.whatsapp} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-emerald-500 transition-colors">
                            <MessageCircle size={24} />
                        </a>
                    )}
                </div>

                <p className="text-sm text-slate-500">
                    {footerText || '© 2026 Tous droits réservés.'}
                </p>
                <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
                    <span>Propulsé par</span>
                    <span className="font-bold">BayIIn</span>
                </div>
            </div>
        </footer>
    );
}
