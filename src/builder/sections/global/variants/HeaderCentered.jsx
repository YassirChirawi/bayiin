import React, { useState } from 'react';
import { getSectionStyle } from '../../../utils/styles';
import EditableText from '../../../components/EditableText';
import { ChevronDown, Search, User, ShoppingBag } from 'lucide-react';

export default function HeaderCentered({ section, theme, onUpdate }) {
    const { settings = {}, items = [], title } = section;
    const [openDropdown, setOpenDropdown] = useState(null);
    
    const navLinks = items.length > 0 ? items : [
        { id: 'nav-1', title: "Accueil", link: { enabled: true, url: "/" } },
        { id: 'nav-2', title: "Nouveautés", link: { enabled: true, url: "/new" } },
        { id: 'nav-3', title: "Boutique", link: { enabled: true, url: "/products" } },
        { id: 'nav-4', title: "À propos", link: { enabled: true, url: "/about" } }
    ];

    const storeName = title || 'Ma Boutique';
    
    // Split links into two halves for left and right
    const halfIndex = Math.ceil(navLinks.length / 2);
    const leftLinks = navLinks.slice(0, halfIndex);
    const rightLinks = navLinks.slice(halfIndex);

    const textColor = settings.textColor || '#0f172a';

    const renderNavLinks = (links) => (
        <nav className="flex items-center gap-8 text-sm font-bold tracking-widest uppercase" style={{ color: textColor }}>
            {links.filter(i => i.isVisible !== false).map((link, idx) => (
                <div 
                    key={link.id || idx}
                    className="relative group"
                    onMouseEnter={() => setOpenDropdown(link.id)}
                    onMouseLeave={() => setOpenDropdown(null)}
                >
                    <a 
                        href={onUpdate ? '#' : (link.link?.url || '#')}
                        className="flex items-center gap-1 hover:text-indigo-600 transition-colors py-2"
                        onClick={(e) => { if(onUpdate) e.preventDefault(); }}
                    >
                        {link.title}
                        {link.sublinks && link.sublinks.length > 0 && <ChevronDown size={14} />}
                    </a>

                    {link.sublinks && link.sublinks.length > 0 && (
                        <div className={`absolute top-full left-1/2 -translate-x-1/2 mt-4 w-48 bg-white rounded-none shadow-xl border-t-2 border-indigo-600 py-2 transition-all duration-200 z-50 ${openDropdown === link.id ? 'opacity-100 translate-y-0 visible' : 'opacity-0 -translate-y-2 invisible'}`}>
                            {link.sublinks.filter(sub => sub.isVisible !== false).map((sub, sIdx) => (
                                <a 
                                    key={sub.id || sIdx}
                                    href={onUpdate ? '#' : (sub.link?.url || '#')}
                                    className="block px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors"
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
    );

    return (
        <header className="relative z-40 bg-white border-b border-slate-100" style={{ ...getSectionStyle(section, theme), backgroundColor: settings.backgroundColor || '#ffffff' }}>
            {/* Top Bar Optional */}
            {settings.showAnnouncement !== false && (
                <div className="bg-slate-900 text-white text-xs font-bold tracking-widest text-center py-2 px-4 uppercase" style={{ backgroundColor: theme.primaryColor }}>
                    Livraison gratuite à partir de 500 DH d'achats
                </div>
            )}

            <div className="container mx-auto px-6">
                <div className="flex items-center justify-between py-6">
                    
                    {/* Icons Left (Search) */}
                    <div className="w-1/4 flex justify-start">
                        <button className="p-2 hover:text-indigo-600 transition-colors" style={{ color: textColor }}>
                            <Search size={22} />
                        </button>
                    </div>
                    
                    {/* Logo Center */}
                    <div className="w-2/4 flex justify-center">
                        <div className="font-black text-3xl tracking-[0.2em] uppercase text-center" style={{ color: textColor }}>
                            <EditableText
                                value={storeName}
                                onChange={(val) => onUpdate?.({ title: val })}
                                as="span"
                                className="cursor-text"
                                isReadOnly={!onUpdate}
                            />
                        </div>
                    </div>
                    
                    {/* Icons Right (Account, Cart) */}
                    <div className="w-1/4 flex justify-end gap-4">
                        <button className="p-2 hover:text-indigo-600 transition-colors hidden md:block" style={{ color: textColor }}>
                            <User size={22} />
                        </button>
                        <button className="p-2 hover:text-indigo-600 transition-colors relative" style={{ color: textColor }}>
                            <ShoppingBag size={22} />
                            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500"></span>
                        </button>
                    </div>
                </div>

                {/* Navigation Below (Centered) */}
                <div className="hidden md:flex justify-center py-4 border-t border-slate-100">
                    <nav className="flex items-center gap-12 text-sm font-bold tracking-widest uppercase" style={{ color: textColor }}>
                        {navLinks.filter(i => i.isVisible !== false).map((link, idx) => (
                            <div 
                                key={link.id || idx}
                                className="relative group"
                                onMouseEnter={() => setOpenDropdown(link.id)}
                                onMouseLeave={() => setOpenDropdown(null)}
                            >
                                <a 
                                    href={onUpdate ? '#' : (link.link?.url || '#')}
                                    className="flex items-center gap-1 hover:text-indigo-600 transition-colors py-2"
                                    onClick={(e) => { if(onUpdate) e.preventDefault(); }}
                                >
                                    {link.title}
                                    {link.sublinks && link.sublinks.length > 0 && <ChevronDown size={14} />}
                                </a>

                                {link.sublinks && link.sublinks.length > 0 && (
                                    <div className={`absolute top-full left-1/2 -translate-x-1/2 mt-0 w-48 bg-white shadow-xl border border-slate-100 py-2 transition-all duration-200 z-50 ${openDropdown === link.id ? 'opacity-100 translate-y-0 visible' : 'opacity-0 -translate-y-2 invisible'}`}>
                                        {link.sublinks.filter(sub => sub.isVisible !== false).map((sub, sIdx) => (
                                            <a 
                                                key={sub.id || sIdx}
                                                href={onUpdate ? '#' : (sub.link?.url || '#')}
                                                className="block px-4 py-3 text-xs tracking-wider text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors"
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
                </div>
            </div>
        </header>
    );
}
