import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Monitor, Tablet, Smartphone, ChevronLeft } from 'lucide-react';
import BlockRenderer from './renderer/BlockRenderer';

const FIXED_PAGES = [
    { id: 'home', label: 'Accueil' },
    { id: 'product', label: 'Produits' },
    { id: 'contact', label: 'Contact' },
];

const DEVICES = [
    { id: 'desktop', icon: Monitor, label: 'Bureau' },
    { id: 'tablet', icon: Tablet, label: 'Tablette' },
    { id: 'mobile', icon: Smartphone, label: 'Mobile' },
];

const DEVICE_WIDTHS = {
    desktop: '100%',
    tablet: '768px',
    mobile: '390px',
};

export default function FullScreenPreview({ isOpen, onClose, storefrontData, storeName }) {
    const [activePage, setActivePage] = useState('home');
    const [activeDevice, setActiveDevice] = useState('desktop');

    useEffect(() => {
        if (isOpen) setActivePage('home');
    }, [isOpen]);

    const theme = storefrontData?.theme || {};
    const primary = theme.primaryColor || '#6366f1';

    // Build dynamic page list from storefrontData.pages
    const allPages = React.useMemo(() => {
        const pages = storefrontData?.pages || {};
        const fixed = FIXED_PAGES.filter(p => pages[p.id]);
        const custom = Object.entries(pages)
            .filter(([id]) => !['home', 'product', 'contact'].includes(id))
            .map(([id, data]) => ({ id, label: data.label || id }));
        return [...fixed, ...custom];
    }, [storefrontData?.pages]);

    const sections = storefrontData?.pages?.[activePage]?.sections || [];

    // contextData passed to sections so interactive elements work
    const contextData = {
        isReadOnly: true,
        navigateTo: (page) => setActivePage(page),
        onProductClick: () => setActivePage('product'),
        onCtaClick: () => setActivePage('product'),
        onContactClick: () => setActivePage('contact'),
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[200] bg-slate-900 flex flex-col"
                    style={{ fontFamily: `'${theme.typography?.heading || 'Inter'}', sans-serif` }}
                >
                    {/* ── TOP BAR ── */}
                    <div className="flex-shrink-0 bg-slate-800 border-b border-slate-700 px-3 py-2 flex items-center gap-3 flex-wrap">
                        {/* Back */}
                        <button
                            onClick={onClose}
                            className="flex items-center gap-1.5 text-slate-300 hover:text-white text-sm font-bold bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
                        >
                            <ChevronLeft size={15} /> Éditeur
                        </button>

                        {/* URL bar */}
                        <div className="flex-1 min-w-0 bg-slate-700/60 rounded-lg py-1.5 px-3 text-slate-300 text-xs font-mono flex items-center justify-center gap-1 truncate">
                            🔒 {storefrontData?.subdomain ? `${storefrontData.subdomain}.bayiin.com` : 'votre-boutique.bayiin.com'}
                            {activePage !== 'home' && <span className="text-slate-500 ml-1">/{activePage}</span>}
                        </div>

                        {/* Device switcher */}
                        <div className="flex items-center gap-1 bg-slate-700/60 rounded-xl p-1 flex-shrink-0">
                            {DEVICES.map(device => (
                                <button
                                    key={device.id}
                                    onClick={() => setActiveDevice(device.id)}
                                    title={device.label}
                                    className={`p-1.5 rounded-lg transition-all ${
                                        activeDevice === device.id
                                            ? 'bg-white text-slate-900 shadow'
                                            : 'text-slate-400 hover:text-white hover:bg-slate-600'
                                    }`}
                                >
                                    <device.icon size={16} />
                                </button>
                            ))}
                        </div>

                        {/* Page tabs */}
                        <div className="flex items-center gap-1 bg-slate-700/60 rounded-xl p-1 flex-shrink-0 max-w-full overflow-x-auto">
                            {allPages.map(page => (
                                <button
                                    key={page.id}
                                    onClick={() => setActivePage(page.id)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                                        activePage === page.id
                                            ? 'bg-indigo-600 text-white shadow'
                                            : 'text-slate-400 hover:text-white hover:bg-slate-600'
                                    }`}
                                >
                                    {page.id === 'home' ? '🏠 ' : page.id === 'product' ? '🛍️ ' : page.id === 'contact' ? '📞 ' : '📄 '}
                                    {page.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ── CANVAS ── */}
                    <div className="flex-1 overflow-auto bg-slate-700 flex justify-center items-start py-6 px-4">
                        <motion.div
                            key={activeDevice}
                            initial={{ opacity: 0, scale: 0.97 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.2 }}
                            className="bg-white shadow-2xl overflow-hidden rounded-b-2xl"
                            style={{
                                width: DEVICE_WIDTHS[activeDevice],
                                maxWidth: DEVICE_WIDTHS[activeDevice],
                                minHeight: '100%',
                                transition: 'width 0.35s cubic-bezier(0.4,0,0.2,1), max-width 0.35s cubic-bezier(0.4,0,0.2,1)',
                            }}
                        >
                            {/* Device top frame */}
                            {activeDevice !== 'desktop' && (
                                <div className="bg-slate-900 rounded-t-2xl py-2.5 flex items-center justify-center">
                                    <div className="w-20 h-1.5 bg-slate-600 rounded-full" />
                                </div>
                            )}

                            {/* Banner */}
                            {theme.bannerText && (
                                <div
                                    className="text-white text-center py-2 text-sm font-bold"
                                    style={{ backgroundColor: primary }}
                                >
                                    {theme.bannerText}
                                </div>
                            )}

                            {/* Nav — clickable */}
                            <nav
                                className={`border-b border-slate-100 px-4 py-3 flex items-center bg-white/95 backdrop-blur-md sticky top-0 z-30 ${
                                    theme.headerLayout === 'center' ? 'flex-col gap-3' : 'justify-between'
                                }`}
                            >
                                <button
                                    onClick={() => setActivePage('home')}
                                    className="font-black text-xl hover:opacity-80 transition-opacity"
                                    style={{ color: primary }}
                                >
                                    {storeName || 'STORE'}
                                </button>
                                <div className={`flex gap-4 text-sm font-bold text-slate-600 flex-wrap ${activeDevice === 'mobile' ? 'gap-2 text-xs' : ''}`}>
                                    {allPages.map(p => (
                                        <button
                                            key={p.id}
                                            onClick={() => setActivePage(p.id)}
                                            className="hover:opacity-80 transition-all"
                                            style={activePage === p.id ? { color: primary, fontWeight: '900' } : {}}
                                        >
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                            </nav>

                            {/* Sections — interactive with contextData */}
                            <div>
                                {sections.length === 0 ? (
                                    <div className="py-32 text-center text-slate-400">
                                        <p className="text-5xl mb-4">📄</p>
                                        <p className="font-bold text-xl">Page vide</p>
                                        <p className="text-sm mt-2 max-w-xs mx-auto">Revenez dans l'éditeur pour ajouter des sections.</p>
                                    </div>
                                ) : (
                                    sections.map(section => (
                                        <BlockRenderer
                                            key={section.id}
                                            section={section}
                                            theme={theme}
                                            isReadOnly={true}
                                            contextData={contextData}
                                        />
                                    ))
                                )}
                            </div>

                            {/* Footer */}
                            <footer className="bg-slate-900 text-slate-400 py-10 text-center">
                                <div className="font-black text-xl text-white mb-3">{storeName || 'STORE'}</div>
                                <div className="flex justify-center gap-6 text-sm mb-4">
                                    {allPages.map(p => (
                                        <button key={p.id} onClick={() => setActivePage(p.id)} className="hover:text-white transition-colors">
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-xs">© 2026 Tous droits réservés — Propulsé par Bayiin</p>
                            </footer>
                        </motion.div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
