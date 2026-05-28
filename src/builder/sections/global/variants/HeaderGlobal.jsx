import React, { useState } from 'react';
import { getSectionStyle } from '../../../utils/styles';
import EditableText from '../../../components/EditableText';
import { ChevronDown } from 'lucide-react';

export default function HeaderGlobal({ section, theme, onUpdate }) {
    const { settings = {}, items = [], title } = section;
    const [openDropdown, setOpenDropdown] = useState(null);
    
    // Support nested links: items could have `sublinks` array
    const navLinks = items.length > 0 ? items : [
        { id: 'nav-1', title: "Accueil", link: { enabled: true, url: "/" } },
        { id: 'nav-2', title: "Produits", link: { enabled: true, url: "/products" } },
        { id: 'nav-3', title: "Contact", link: { enabled: true, url: "/contact" } }
    ];

    const storeName = title || 'Ma Boutique';
    const layoutClass = theme?.headerLayout === 'center' ? 'flex-col gap-4 justify-center' : 'justify-between';

    return (
        <header className={`px-6 py-4 flex items-center relative z-40 shadow-sm border-b border-slate-100 ${layoutClass}`} style={{ ...getSectionStyle(section, theme), backgroundColor: section.settings?.backgroundType === 'image' ? 'transparent' : (section.settings?.backgroundColor || '#ffffff') }}>
            {/* Background Image Layer */}
            {section.settings?.backgroundType === 'image' && section.settings?.backgroundImage && (
                <div 
                    className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
                    style={{ 
                        backgroundImage: `url(${section.settings.backgroundImage})`,
                        opacity: section.settings.backgroundOpacity || 1 
                    }}
                >
                    {section.settings.backgroundOverlay && (
                        <div className="absolute inset-0" style={{ backgroundColor: section.settings.backgroundOverlay }}></div>
                    )}
                </div>
            )}

            {/* Inner Content Container */}
            <div className="relative z-10 w-full flex items-center justify-between">
                {/* Logo / Nom de la boutique */}
                <div className="font-black text-2xl flex-shrink-0" style={{ color: theme.primaryColor }}>
                    <EditableText
                        value={storeName}
                        onChange={(val) => onUpdate?.({ title: val })}
                        as="span"
                        className="cursor-text"
                        isReadOnly={!onUpdate}
                    />
                </div>
                
                {/* Menu Navigation */}
                <nav className="flex items-center gap-6 text-sm font-bold" style={{ color: section.settings?.textColor || '#475569' }}>
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
                                {link.sublinks && link.sublinks.length > 0 && <ChevronDown size={14} />}
                            </a>

                            {/* Dropdown Menu */}
                            {link.sublinks && link.sublinks.length > 0 && (
                                <div className={`absolute top-full left-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-slate-100 py-2 transition-all duration-200 ${openDropdown === link.id ? 'opacity-100 translate-y-0 visible' : 'opacity-0 -translate-y-2 invisible'}`}>
                                    {link.sublinks.filter(sub => sub.isVisible !== false).map((sub, sIdx) => (
                                        <a 
                                            key={sub.id || sIdx}
                                            href={onUpdate ? '#' : (sub.link?.url || '#')}
                                            className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors"
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
                
                {/* CTA Optionnel (Ex: Contact) */}
                {settings.showCta !== false && (
                    <div className="hidden md:flex items-center gap-3 flex-shrink-0">
                        <button 
                            className="px-4 py-2 text-sm font-bold text-white rounded-lg transition-transform hover:scale-105 shadow-sm"
                            style={{ backgroundColor: theme.primaryColor, borderRadius: theme.buttonStyle === 'pill' ? '9999px' : theme.buttonStyle === 'sharp' ? '0px' : '0.5rem' }}
                        >
                            {settings.ctaText || 'Acheter'}
                        </button>
                    </div>
                )}
            </div>
        </header>
    );
}
