import React, { useState } from 'react';
import EditableText from '../../../components/EditableText';
import { ChevronDown, ShoppingBag } from 'lucide-react';

export default function HeaderTransparent({ section, theme, onUpdate }) {
    const { settings = {}, items = [], title } = section;
    const [openDropdown, setOpenDropdown] = useState(null);
    
    const navLinks = items.length > 0 ? items : [
        { id: 'nav-1', title: "Accueil", link: { enabled: true, url: "/" } },
        { id: 'nav-2', title: "Boutique", link: { enabled: true, url: "/products" } },
        { id: 'nav-3', title: "Contact", link: { enabled: true, url: "/contact" } }
    ];

    const storeName = title || 'Ma Boutique';
    
    // Pour un header transparent sur fond sombre (ex: vidéo full screen), on utilise du blanc par défaut.
    const textColor = settings.textColor || '#ffffff';

    return (
        <header className="absolute top-0 left-0 right-0 z-50 px-6 py-6 transition-all duration-300">
            <div className="container mx-auto">
                {/* Navbar container */}
                <div className="flex items-center justify-between">
                    
                    {/* Logo */}
                    <div className="font-black text-3xl tracking-tight drop-shadow-md" style={{ color: textColor }}>
                        <EditableText
                            value={storeName}
                            onChange={(val) => onUpdate?.({ title: val })}
                            as="span"
                            className="cursor-text"
                            isReadOnly={!onUpdate}
                        />
                    </div>
                    
                    {/* Navigation Centrale */}
                    <nav className="hidden md:flex items-center gap-8 font-bold drop-shadow-md" style={{ color: textColor }}>
                        {navLinks.filter(i => i.isVisible !== false).map((link, idx) => (
                            <div 
                                key={link.id || idx}
                                className="relative group"
                                onMouseEnter={() => setOpenDropdown(link.id)}
                                onMouseLeave={() => setOpenDropdown(null)}
                            >
                                <a 
                                    href={onUpdate ? '#' : (link.link?.url || '#')}
                                    className="flex items-center gap-1 hover:opacity-75 transition-opacity py-2"
                                    onClick={(e) => { if(onUpdate) e.preventDefault(); }}
                                >
                                    {link.title}
                                    {link.sublinks && link.sublinks.length > 0 && <ChevronDown size={16} />}
                                </a>

                                {/* Dropdown Menu (on white bg so text is visible) */}
                                {link.sublinks && link.sublinks.length > 0 && (
                                    <div className={`absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 py-2 transition-all duration-300 ${openDropdown === link.id ? 'opacity-100 translate-y-0 visible' : 'opacity-0 -translate-y-4 invisible'}`}>
                                        {link.sublinks.filter(sub => sub.isVisible !== false).map((sub, sIdx) => (
                                            <a 
                                                key={sub.id || sIdx}
                                                href={onUpdate ? '#' : (sub.link?.url || '#')}
                                                className="block px-6 py-3 text-sm font-bold text-slate-800 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
                                                onClick={(e) => { if(onUpdate) e.preventDefault(); }}
                                            >
                                                {sub.title}
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </nav>
                    
                    {/* Icons & CTA */}
                    <div className="flex items-center gap-4 drop-shadow-md" style={{ color: textColor }}>
                        <button className="p-2 hover:opacity-75 transition-opacity">
                            <ShoppingBag size={24} />
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
}
