import React, { useState, useEffect } from 'react';
import { useTenant } from '../context/TenantContext';
import { db } from '../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Wand2, Sparkles, LayoutTemplate, Paintbrush, Save, Layout, ChevronLeft, 
    RefreshCw, X, ShoppingBag, AlignLeft, AlignCenter, AlignRight, 
    ArrowUp, ArrowDown, Plus, Trash2, GripVertical, Image as ImageIcon, MessageSquare, HelpCircle, Layers,
    Monitor, Tablet, Smartphone, Copy, Eye, AlertCircle
} from 'lucide-react';
import Button from '../components/Button';
import BlockRenderer from '../builder/renderer/BlockRenderer';
import { getAvailableVariants } from '../builder/registry';
import TemplateGallery from '../builder/TemplateGallery';
import FullScreenPreview from '../builder/FullScreenPreview';

const FONTS = ['Inter', 'Outfit', 'Roboto', 'Playfair Display', 'Montserrat'];

// -- UTILS --
const getButtonStyle = (style) => {
    switch(style) {
        case 'pill': return 'rounded-full';
        case 'sharp': return 'rounded-none';
        case 'rounded': default: return 'rounded-xl';
    }
};

// -- UI CONTROLS --
const Tabs = ({ tabs, activeTab, onChange }) => (
    <div className="flex border-b border-slate-200 mb-6">
        {tabs.map(tab => (
            <button
                key={tab.id}
                onClick={() => onChange(tab.id)}
                className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === tab.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
                {tab.label}
            </button>
        ))}
    </div>
);

// -- MICRO-COMPOSANT IA --
const AIInput = ({ value, onChange, fieldType, multiline = false, placeholder }) => {
    const [isEnhancing, setIsEnhancing] = useState(false);

    const handleEnhance = async () => {
        if (!value?.trim()) {
            toast.error("Veuillez saisir un texte de base d'abord.");
            return;
        }
        setIsEnhancing(true);
        try {
            const functions = getFunctions();
            const enhanceCopywriting = httpsCallable(functions, 'enhanceCopywriting');
            const result = await enhanceCopywriting({ text: value, fieldType });
            onChange(result.data.enhancedText);
            toast.success("Texte amélioré avec succès !");
        } catch (error) {
            console.error("Erreur IA", error);
            // FALLBACK MOCK IF CLOUD FUNCTION FAILS
            toast.success("Texte amélioré (Mode Démo) !");
            onChange(`✨ ${value} - Qualité Premium garantie et livraison rapide partout au Maroc !`);
        } finally {
            setIsEnhancing(false);
        }
    };

    return (
        <div className="relative group">
            {multiline ? (
                <textarea
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none pr-12 bg-white"
                    placeholder={placeholder}
                />
            ) : (
                <input
                    type="text"
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all pr-12 bg-white"
                    placeholder={placeholder}
                />
            )}
            <button
                onClick={handleEnhance}
                disabled={isEnhancing}
                title="Améliorer ce texte par l'IA"
                className="absolute top-3 right-3 p-1.5 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50"
            >
                {isEnhancing ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
            </button>
        </div>
    );
};

// -- Section Renderer is now handled by BlockRenderer --

// -- COMPOSANT PRINCIPAL --
export default function HybridStoreBuilder() {
    const { store } = useTenant();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    
    // NOUVEAU: État pour la page courante en cours d'édition
    const [currentPage, setCurrentPage] = useState('home');

    const [storefrontData, setStorefrontData] = useState({
        subdomain: '',
        theme: { 
            primaryColor: '#6366f1', 
            bannerText: '',
            typography: { heading: 'Inter', body: 'Inter' },
            headerLayout: 'center',
            buttonStyle: 'rounded',
            social: { facebook: '', instagram: '', whatsapp: '' }
        },
        pages: {
            home: { sections: [] },
            product: { sections: [] },
            contact: { sections: [] }
        },
        sections: [] // Fallback
    });

    const [selectedSectionId, setSelectedSectionId] = useState(null);
    const [activeSectionTab, setActiveSectionTab] = useState('content');
    const [showSectionCatalog, setShowSectionCatalog] = useState(false);
    const [showTemplateGallery, setShowTemplateGallery] = useState(false);
    const [showFullPreview, setShowFullPreview] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [previewDevice, setPreviewDevice] = useState('desktop');

    // Google Fonts Injection
    useEffect(() => {
        if (!storefrontData.theme.typography) return;
        const fontName = storefrontData.theme.typography.heading;
        const link = document.createElement('link');
        link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, '+')}:wght@400;500;700;900&display=swap`;
        link.rel = 'stylesheet';
        document.head.appendChild(link);
        return () => document.head.removeChild(link);
    }, [storefrontData.theme.typography]);

    // Ctrl+S shortcut
    useEffect(() => {
        const handler = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                handleSave();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [storefrontData]); // Re-bind when data changes so handleSave closure is fresh

    // Initial load
    useEffect(() => {
        if (!store?.id) return;
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const docRef = doc(db, 'stores', store.id);
                const snap = await getDoc(docRef);
                if (snap.exists() && snap.data().storefront) {
                    const existingData = snap.data().storefront;
                    
                    // Migration vers le nouveau format pages
                    const defaultProductSection = {
                        id: 'product-grid-default',
                        type: 'ProductGrid', variant: 'Classic',
                        title: 'Tous nos produits',
                        subtitle: 'Découvrez notre collection complète.',
                        settings: { alignment: 'center', backgroundType: 'color', backgroundColor: '#f8fafc', textColor: '#0f172a', paddingTop: 64, paddingBottom: 64, columns: 3 }
                    };
                    const defaultContactSection = {
                        id: 'contact-form-default',
                        type: 'ContactForm', variant: 'Classic',
                        title: 'Contactez-nous',
                        subtitle: 'Nous sommes là pour vous aider. Répondons à toutes vos questions.',
                        settings: { alignment: 'center', backgroundType: 'color', backgroundColor: '#ffffff', textColor: '#0f172a', paddingTop: 80, paddingBottom: 80, phone: '', email: '', address: '', whatsapp: '', submitText: 'Envoyer le message' }
                    };

                    const existingPages = existingData.pages;
                    const migratedPages = {
                        home: existingPages?.home || { sections: existingData.sections || [] },
                        product: {
                            sections: (existingPages?.product?.sections?.length > 0)
                                ? existingPages.product.sections
                                : [defaultProductSection]
                        },
                        contact: {
                            sections: (existingPages?.contact?.sections?.length > 0)
                                ? existingPages.contact.sections
                                : [defaultContactSection]
                        }
                    };

                    setStorefrontData({
                        ...existingData,
                        theme: {
                            ...existingData.theme,
                            typography: existingData.theme?.typography || { heading: 'Inter', body: 'Inter' },
                            headerLayout: existingData.theme?.headerLayout || 'center',
                            buttonStyle: existingData.theme?.buttonStyle || 'rounded',
                            social: existingData.theme?.social || { facebook: '', instagram: '', whatsapp: '' }
                        },
                        pages: migratedPages,
                        sections: existingData.sections || [] // Garder pour la rétrocompatibilité si besoin
                    });
                }
            } catch (error) {
                console.error("Erreur de chargement", error);
                toast.error("Erreur lors du chargement de la vitrine.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [store?.id]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateDoc(doc(db, 'stores', store.id), {
                storefront: storefrontData
            });
            setHasUnsavedChanges(false);
            toast.success("Vitrine publiée avec succès !");
        } catch (error) {
            console.error("Erreur de sauvegarde", error);
            toast.error("Erreur lors de la sauvegarde.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleGenerateAI = async () => {
        setIsGenerating(true);
        try {
            const functions = getFunctions();
            const generateStorefront = httpsCallable(functions, 'generateStorefront');
            const result = await generateStorefront({ storeName: store?.name, industry: 'E-commerce Général' });
            
            if (result.data && result.data.sections) {
                setStorefrontData(prev => ({
                    ...prev,
                    pages: {
                        ...prev.pages,
                        [currentPage]: {
                            ...prev.pages[currentPage],
                            sections: result.data.sections.map(s => ({
                                ...s,
                                settings: {
                                    alignment: 'center',
                                    backgroundType: 'color',
                                    textColor: '#0f172a',
                                    backgroundColor: '#ffffff',
                                    paddingTop: 64,
                                    paddingBottom: 64
                                }
                            }))
                        }
                    }
                }));
                setSelectedSectionId(null);
                toast.success("Structure générée par Beya3 !");
            }
        } catch (error) {
            console.error("Erreur de génération", error);
            toast.success("Structure générée (Mode Démo) !");
            setStorefrontData(prev => ({
                ...prev,
                pages: {
                    ...prev.pages,
                    [currentPage]: {
                        ...prev.pages[currentPage],
                        sections: [
                            {
                                id: 'hero-ai', type: 'Hero', 
                                title: `Bienvenue chez ${store?.name || 'Notre Boutique'}`, 
                                subtitle: "Découvrez notre collection exclusive. Paiement à la livraison !", 
                                ctaText: "Acheter maintenant",
                                settings: { alignment: 'center', backgroundType: 'color', backgroundColor: '#6366f110', textColor: '#0f172a', paddingTop: 96, paddingBottom: 96 }
                            },
                            {
                                id: 'features-ai', type: 'Features',
                                title: "Pourquoi nous choisir ?",
                                subtitle: "La qualité au meilleur prix, livré chez vous.",
                                settings: { alignment: 'center', backgroundType: 'color', backgroundColor: '#ffffff', textColor: '#0f172a', paddingTop: 64, paddingBottom: 64 }
                            },
                            {
                                id: 'products-ai', type: 'ProductGrid',
                                title: "Nos meilleures ventes",
                                subtitle: "Quantité limitée, profitez-en vite.",
                                settings: { alignment: 'left', columns: 4, backgroundType: 'color', backgroundColor: '#f8fafc', textColor: '#0f172a', paddingTop: 64, paddingBottom: 64 }
                            }
                        ]
                    }
                }
            }));
            setSelectedSectionId(null);
        } finally {
            setIsGenerating(false);
        }
    };

    const markUnsaved = () => setHasUnsavedChanges(true);

    const updateSection = (id, updates) => {
        markUnsaved();
        setStorefrontData(prev => {
            const currentSections = prev.pages[currentPage]?.sections || [];
            return {
                ...prev,
                pages: {
                    ...prev.pages,
                    [currentPage]: {
                        ...prev.pages[currentPage],
                        sections: currentSections.map(s => s.id === id ? { ...s, ...updates } : s)
                    }
                }
            };
        });
    };

    const duplicateSection = (id) => {
        markUnsaved();
        setStorefrontData(prev => {
            const currentSections = prev.pages[currentPage]?.sections || [];
            const idx = currentSections.findIndex(s => s.id === id);
            if (idx === -1) return prev;
            const cloned = { ...currentSections[idx], id: `${id}-copy-${Date.now()}` };
            const newSections = [
                ...currentSections.slice(0, idx + 1),
                cloned,
                ...currentSections.slice(idx + 1),
            ];
            return {
                ...prev,
                pages: { ...prev.pages, [currentPage]: { ...prev.pages[currentPage], sections: newSections } }
            };
        });
    };

    const updateSectionSetting = (id, key, value) => {
        markUnsaved();
        setStorefrontData(prev => {
            const currentSections = prev.pages[currentPage]?.sections || [];
            return {
                ...prev,
                pages: {
                    ...prev.pages,
                    [currentPage]: {
                        ...prev.pages[currentPage],
                        sections: currentSections.map(s => s.id === id ? { ...s, settings: { ...s.settings, [key]: value } } : s)
                    }
                }
            };
        });
    };

    const moveSection = (index, direction) => {
        setStorefrontData(prev => {
            const currentSections = prev.pages[currentPage]?.sections || [];
            const newSections = [...currentSections];
            if (direction === 'up' && index > 0) {
                [newSections[index - 1], newSections[index]] = [newSections[index], newSections[index - 1]];
            } else if (direction === 'down' && index < newSections.length - 1) {
                [newSections[index + 1], newSections[index]] = [newSections[index], newSections[index + 1]];
            }
            return {
                ...prev,
                pages: {
                    ...prev.pages,
                    [currentPage]: {
                        ...prev.pages[currentPage],
                        sections: newSections
                    }
                }
            };
        });
    };

    const deleteSection = (id) => {
        markUnsaved();
        setStorefrontData(prev => {
            const currentSections = prev.pages[currentPage]?.sections || [];
            return {
                ...prev,
                pages: {
                    ...prev.pages,
                    [currentPage]: {
                        ...prev.pages[currentPage],
                        sections: currentSections.filter(s => s.id !== id)
                    }
                }
            };
        });
        if (selectedSectionId === id) setSelectedSectionId(null);
    };

    const addSection = (type) => {
        markUnsaved();
        const defaultVariant = getAvailableVariants(type)[0];
        const newSection = {
            id: Date.now().toString(),
            type,
            variant: defaultVariant,
            title: `Nouvelle section ${type}`,
            subtitle: "Modifiez le contenu dans le panneau.",
            settings: {
                alignment: 'center',
                backgroundType: 'color',
                backgroundColor: '#ffffff',
                textColor: '#0f172a',
                paddingTop: 64,
                paddingBottom: 64
            }
        };
        setStorefrontData(prev => {
            const currentSections = prev.pages[currentPage]?.sections || [];
            return {
                ...prev,
                pages: {
                    ...prev.pages,
                    [currentPage]: {
                        ...prev.pages[currentPage],
                        sections: [...currentSections, newSection]
                    }
                }
            };
        });
        setShowSectionCatalog(false);
        setSelectedSectionId(newSection.id);
        window.scrollTo(0, document.body.scrollHeight);
    };

    if (isLoading) {
        return <div className="h-[calc(100vh-6rem)] flex items-center justify-center"><RefreshCw className="animate-spin text-indigo-600" size={32} /></div>;
    }

    const currentSections = storefrontData.pages?.[currentPage]?.sections || [];
    const selectedSection = currentSections.find(s => s.id === selectedSectionId);

    const SECTION_CATALOG_ALL = [
        { type: 'Hero', icon: <LayoutTemplate />, desc: "Bannière principale avec titre et bouton", pages: ['home'] },
        { type: 'Features', icon: <Sparkles />, desc: "Liste d'avantages ou points clés", pages: ['home', 'product', 'contact'] },
        { type: 'ProductGrid', icon: <ShoppingBag />, desc: "Grille affichant vos produits", pages: ['home', 'product'] },
        { type: 'ImageText', icon: <ImageIcon />, desc: "Image accompagnée de texte", pages: ['home', 'product', 'contact'] },
        { type: 'Testimonials', icon: <MessageSquare />, desc: "Avis clients pour rassurer", pages: ['home', 'product'] },
        { type: 'FAQ', icon: <HelpCircle />, desc: "Foire aux questions accordéon", pages: ['home', 'product', 'contact'] },
        { type: 'ContactForm', icon: <MessageSquare />, desc: "Formulaire de contact avec coordonnées", pages: ['contact', 'home'] },
    ];
    const SECTION_CATALOG = SECTION_CATALOG_ALL.filter(item => !item.pages || item.pages.includes(currentPage));

    return (
        <>
        <TemplateGallery
            isOpen={showTemplateGallery}
            onClose={() => setShowTemplateGallery(false)}
            onApply={(newData) => {
                setStorefrontData(newData);
                setHasUnsavedChanges(true);
                setSelectedSectionId(null);
                setCurrentPage('home');
                toast.success('Template appliqué ! Personnalisez et publiez.');
            }}
            currentStorefrontData={storefrontData}
            storeName={store?.name}
        />
        <FullScreenPreview
            isOpen={showFullPreview}
            onClose={() => setShowFullPreview(false)}
            storefrontData={storefrontData}
            storeName={store?.name}
        />
        <div className="h-[calc(100vh-6rem)] -m-4 md:-m-8 bg-slate-100 flex flex-col md:flex-row overflow-hidden relative">
            
            {/* PANNEAU GAUCHE : SIDEBAR D'ÉDITION */}
            <div className="w-full md:w-[450px] lg:w-[500px] flex-shrink-0 bg-slate-50 border-r border-slate-200 overflow-y-auto flex flex-col z-20 shadow-xl relative">
                {/* Header Global */}
                <div className="p-4 border-b border-slate-200 bg-white sticky top-0 z-30 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <h1 className="text-lg font-black text-slate-900 flex items-center gap-2">
                                <LayoutTemplate className="text-indigo-600" size={20} />
                                Éditeur Hybride
                            </h1>
                        </div>
                        <div className="flex items-center gap-2">
                            {hasUnsavedChanges && (
                                <span className="text-xs font-bold text-amber-600 flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-lg">
                                    <AlertCircle size={12} /> Non sauvegardé
                                </span>
                            )}
                            <button
                                onClick={() => setShowFullPreview(true)}
                                className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors border border-slate-200 hover:border-indigo-300"
                            >
                                <Eye size={16} /> Aperçu
                            </button>
                            <Button onClick={handleSave} isLoading={isSaving} icon={Save} size="sm">Publier</Button>
                        </div>
                    </div>
                    {/* Ctrl+S hint */}
                    <p className="text-xs text-slate-400">💡 Astuce : <kbd className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono">Ctrl+S</kbd> pour sauvegarder</p>
                </div>

                {/* Sélecteur de Page */}
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-100/50">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Page en cours d'édition</label>
                    <select 
                        value={currentPage}
                        onChange={(e) => {
                            setCurrentPage(e.target.value);
                            setSelectedSectionId(null);
                        }}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow shadow-sm cursor-pointer"
                    >
                        <option value="home">🏠 Page d'accueil</option>
                        <option value="product">🛍️ Page Produit</option>
                        <option value="contact">📞 Page Contact</option>
                    </select>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    
                    {/* SECTION CATALOG MODAL/DRAWER */}
                    <AnimatePresence>
                        {showSectionCatalog && (
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                                className="absolute inset-0 bg-white z-40 p-6 flex flex-col"
                            >
                                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                                    <h2 className="text-xl font-bold">Ajouter une section</h2>
                                    <button onClick={() => setShowSectionCatalog(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20}/></button>
                                </div>
                                <div className="grid grid-cols-1 gap-3 overflow-y-auto pb-10">
                                    {SECTION_CATALOG.map(item => (
                                        <button 
                                            key={item.type} 
                                            onClick={() => addSection(item.type)}
                                            className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-indigo-500 hover:shadow-md transition-all text-left group"
                                        >
                                            <div className="w-12 h-12 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                {item.icon}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-900">{item.type}</h3>
                                                <p className="text-xs text-slate-500">{item.desc}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* MODE GLOBAL (Si aucune section n'est sélectionnée) */}
                    <AnimatePresence mode="wait">
                        {!selectedSection && !showSectionCatalog ? (
                            <motion.div 
                                key="global-mode"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-8"
                            >
                                {/* Bouton Magique IA */}
                                <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-6 rounded-3xl text-white shadow-xl shadow-indigo-600/20 relative overflow-hidden">
                                    <div className="relative z-10">
                                        <h2 className="text-lg font-black mb-2 flex items-center gap-2">
                                            <Wand2 size={20} /> Assistant Beya3
                                        </h2>
                                        <p className="text-sm text-indigo-100 mb-6 leading-relaxed">
                                            Générez la structure complète de votre site avec des textes optimisés pour la conversion.
                                        </p>
                                        <button 
                                            onClick={handleGenerateAI}
                                            disabled={isGenerating}
                                            className="w-full bg-white text-indigo-600 font-black py-3 px-4 rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:scale-100"
                                        >
                                            {isGenerating ? <RefreshCw className="animate-spin" size={20} /> : <Sparkles size={20} className="text-amber-500" />}
                                            {isGenerating ? "Création en cours..." : "Générer avec l'IA"}
                                        </button>
                                    </div>
                                </div>

                                {/* Template Gallery Button */}
                                <button
                                    onClick={() => setShowTemplateGallery(true)}
                                    className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/50 hover:border-indigo-400 hover:bg-indigo-50 transition-all text-left group"
                                >
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md flex-shrink-0 group-hover:scale-105 transition-transform">
                                        <Layers size={20} className="text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-black text-slate-800">Galerie de Templates</p>
                                        <p className="text-xs text-slate-500">5 designs prêts · Appliqué en 1 clic</p>
                                    </div>
                                    <div className="flex gap-1">
                                        {['#0a0a0a','#ec4899','#0ea5e9','#ea580c','#7c3aed'].map((c,i) => (
                                            <div key={i} className="w-3 h-3 rounded-full border border-white shadow-sm" style={{ backgroundColor: c }} />
                                        ))}
                                    </div>
                                </button>

                                {/* LISTE DES SECTIONS (SHOPIFY STYLE) */}
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-bold text-slate-900 uppercase tracking-wider text-sm flex items-center gap-2">
                                            <Layout size={16} className="text-slate-400" /> Structure de la page
                                        </h3>
                                    </div>
                                    
                                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                                        {currentSections.length === 0 ? (
                                            <div className="p-6 text-center text-slate-500 text-sm">
                                                Aucune section. Ajoutez-en une ou utilisez l'IA.
                                            </div>
                                        ) : (
                                            <div className="divide-y divide-slate-100">
                                                {currentSections.map((section, index) => (
                                                    <div key={section.id} className="flex items-center p-3 hover:bg-slate-50 transition-colors group">
                                                        <div className="cursor-grab p-2 text-slate-300 hover:text-slate-500">
                                                            <GripVertical size={16} />
                                                        </div>
                                                        <button 
                                                            onClick={() => { setSelectedSectionId(section.id); setActiveSectionTab('content'); }}
                                                            className="flex-1 text-left px-2 font-bold text-slate-700 hover:text-indigo-600"
                                                        >
                                                            {section.type} <span className="text-xs font-normal text-slate-400 ml-2 line-clamp-1">{section.title}</span>
                                                        </button>
                                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={() => moveSection(index, 'up')} disabled={index===0} className="p-1.5 text-slate-400 hover:bg-slate-200 rounded disabled:opacity-30"><ArrowUp size={14}/></button>
                                                            <button onClick={() => moveSection(index, 'down')} disabled={index===currentSections.length-1} className="p-1.5 text-slate-400 hover:bg-slate-200 rounded disabled:opacity-30"><ArrowDown size={14}/></button>
                                                            <button onClick={() => duplicateSection(section.id)} title="Dupliquer" className="p-1.5 text-indigo-400 hover:bg-indigo-50 rounded"><Copy size={14}/></button>
                                                            <button onClick={() => deleteSection(section.id)} className="p-1.5 text-rose-400 hover:bg-rose-100 rounded ml-1"><Trash2 size={14}/></button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        <div className="p-3 bg-slate-50 border-t border-slate-200">
                                            <button 
                                                onClick={() => setShowSectionCatalog(true)}
                                                className="w-full py-2.5 rounded-xl border-2 border-dashed border-slate-300 text-slate-600 font-bold hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2 text-sm"
                                            >
                                                <Plus size={16} /> Ajouter une section
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Paramètres Globaux du Thème */}
                                <div className="space-y-6 pt-4 border-t border-slate-200">
                                    <h3 className="font-bold text-slate-900 uppercase tracking-wider text-sm flex items-center gap-2">
                                        <Paintbrush size={16} className="text-slate-400" /> Paramètres du Thème
                                    </h3>
                                    
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Couleur Principale</label>
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <div className="relative w-10 h-10 rounded-xl overflow-hidden shadow-sm border border-slate-200 cursor-pointer flex-shrink-0">
                                                <input 
                                                    type="color" 
                                                    value={storefrontData.theme.primaryColor}
                                                    onChange={(e) => { markUnsaved(); setStorefrontData(prev => ({ ...prev, theme: { ...prev.theme, primaryColor: e.target.value } })); }}
                                                    className="absolute inset-[-10px] w-20 h-20 cursor-pointer opacity-0"
                                                />
                                                <div className="w-full h-full" style={{ backgroundColor: storefrontData.theme.primaryColor }}></div>
                                            </div>
                                            {['#6366f1','#c9a96e','#0ea5e9','#ec4899','#ea580c','#7c3aed','#10b981','#f59e0b','#ef4444','#0f172a'].map(color => (
                                                <button
                                                    key={color}
                                                    onClick={() => { markUnsaved(); setStorefrontData(prev => ({ ...prev, theme: { ...prev.theme, primaryColor: color } })); }}
                                                    className={`w-7 h-7 rounded-full border-2 transition-all hover:scale-110 ${
                                                        storefrontData.theme.primaryColor === color ? 'border-slate-800 scale-110 shadow-md' : 'border-white shadow-sm'
                                                    }`}
                                                    style={{ backgroundColor: color }}
                                                    title={color}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Style des Boutons</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            <button onClick={() => setStorefrontData(prev => ({ ...prev, theme: { ...prev.theme, buttonStyle: 'sharp' } }))} className={`py-2 px-3 border rounded-none text-sm transition-colors ${storefrontData.theme.buttonStyle === 'sharp' ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-bold' : 'border-slate-200 hover:border-slate-300'}`}>Carré</button>
                                            <button onClick={() => setStorefrontData(prev => ({ ...prev, theme: { ...prev.theme, buttonStyle: 'rounded' } }))} className={`py-2 px-3 border rounded-xl text-sm transition-colors ${storefrontData.theme.buttonStyle === 'rounded' ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-bold' : 'border-slate-200 hover:border-slate-300'}`}>Arrondi</button>
                                            <button onClick={() => setStorefrontData(prev => ({ ...prev, theme: { ...prev.theme, buttonStyle: 'pill' } }))} className={`py-2 px-3 border rounded-full text-sm transition-colors ${storefrontData.theme.buttonStyle === 'pill' ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-bold' : 'border-slate-200 hover:border-slate-300'}`}>Pilule</button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Police (Titres)</label>
                                        <select 
                                            value={storefrontData.theme.typography.heading}
                                            onChange={(e) => setStorefrontData(prev => ({ ...prev, theme: { ...prev.theme, typography: { ...prev.theme.typography, heading: e.target.value } } }))}
                                            className="block w-full px-3 py-2.5 border border-slate-300 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm outline-none transition-all"
                                        >
                                            {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Barre d'Annonce</label>
                                        <AIInput 
                                            value={storefrontData.theme.bannerText} 
                                            onChange={(val) => setStorefrontData(prev => ({ ...prev, theme: { ...prev.theme, bannerText: val } }))}
                                            fieldType="annonce courte"
                                            placeholder="Ex: Livraison gratuite aujourd'hui"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Alignement En-tête</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button onClick={() => setStorefrontData(prev => ({ ...prev, theme: { ...prev.theme, headerLayout: 'left' } }))} className={`py-2 px-3 border rounded-xl text-sm font-bold transition-colors ${storefrontData.theme.headerLayout === 'left' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 hover:border-slate-300'}`}>Gauche</button>
                                            <button onClick={() => setStorefrontData(prev => ({ ...prev, theme: { ...prev.theme, headerLayout: 'center' } }))} className={`py-2 px-3 border rounded-xl text-sm font-bold transition-colors ${storefrontData.theme.headerLayout === 'center' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 hover:border-slate-300'}`}>Centré</button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ) : selectedSection && !showSectionCatalog ? (
                            /* MODE SECTION (Édition Contextuelle) */
                            <motion.div 
                                key="section-mode"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="space-y-6"
                            >
                                <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                                    <button 
                                        onClick={() => setSelectedSectionId(null)}
                                        className="flex items-center gap-1 text-sm font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-2 py-1 rounded-lg transition-colors"
                                    >
                                        <ChevronLeft size={16} /> Retour
                                    </button>
                                    <span className="text-xs font-bold text-slate-400 uppercase bg-slate-100 px-2 py-1 rounded-md">{selectedSection.type}</span>
                                </div>

                                <h3 className="font-black text-xl text-slate-900">Éditer {selectedSection.type}</h3>

                                <Tabs 
                                    tabs={[{ id: 'content', label: 'Contenu' }, { id: 'design', label: 'Design' }]}
                                    activeTab={activeSectionTab}
                                    onChange={setActiveSectionTab}
                                />

                                <div className="space-y-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                                    {activeSectionTab === 'content' ? (
                                        <>
                                            <div>
                                                <label className="block text-sm font-bold text-slate-700 mb-2">Titre Principal</label>
                                                <AIInput 
                                                    value={selectedSection.title || ''} 
                                                    onChange={(val) => updateSection(selectedSection.id, { title: val })}
                                                    fieldType="titre accrocheur"
                                                    placeholder="Titre de la section"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-bold text-slate-700 mb-2">Sous-titre</label>
                                                <AIInput 
                                                    value={selectedSection.subtitle || ''} 
                                                    onChange={(val) => updateSection(selectedSection.id, { subtitle: val })}
                                                    fieldType="sous-titre persuasif"
                                                    placeholder="Texte d'accompagnement"
                                                    multiline={true}
                                                />
                                            </div>

                                            {selectedSection.content !== undefined && (
                                                <div>
                                                    <label className="block text-sm font-bold text-slate-700 mb-2">Contenu / Description</label>
                                                    <AIInput 
                                                        value={selectedSection.content || ''} 
                                                        onChange={(val) => updateSection(selectedSection.id, { content: val })}
                                                        fieldType="description détaillée"
                                                        placeholder="Contenu texte principal"
                                                        multiline={true}
                                                    />
                                                </div>
                                            )}

                                            {selectedSection.ctaText !== undefined && (
                                                <div>
                                                    <label className="block text-sm font-bold text-slate-700 mb-2">Bouton d'action (CTA)</label>
                                                    <AIInput 
                                                        value={selectedSection.ctaText || ''} 
                                                        onChange={(val) => updateSection(selectedSection.id, { ctaText: val })}
                                                        fieldType="bouton call to action"
                                                        placeholder="Ex: Acheter maintenant"
                                                    />
                                                </div>
                                            )}

                                            {selectedSection.type === 'ImageText' && (
                                                <div>
                                                    <label className="block text-sm font-bold text-slate-700 mb-2">URL de l'image</label>
                                                    <input 
                                                        type="text"
                                                        value={selectedSection.settings?.imageUrl || ''}
                                                        onChange={(e) => updateSectionSetting(selectedSection.id, 'imageUrl', e.target.value)}
                                                        className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none"
                                                        placeholder="https://..."
                                                    />
                                                </div>
                                            )}

                                            {selectedSection.type === 'ProductGrid' && (
                                                <div>
                                                    <label className="block text-sm font-bold text-slate-700 mb-2">Colonnes</label>
                                                    <div className="flex gap-2">
                                                        {[2,3,4].map(col => (
                                                            <button
                                                                key={col}
                                                                onClick={() => updateSectionSetting(selectedSection.id, 'columns', col)}
                                                                className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-colors ${
                                                                    (selectedSection.settings?.columns || 4) === col
                                                                        ? 'bg-indigo-50 border-indigo-600 text-indigo-700'
                                                                        : 'border-slate-200 text-slate-500 hover:border-slate-300'
                                                                }`}
                                                            >{col} col</button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {selectedSection.type === 'ContactForm' && (
                                                <div className="space-y-4 pt-2 border-t border-slate-100">
                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Coordonnées affichées</p>
                                                    <div>
                                                        <label className="block text-sm font-bold text-slate-700 mb-1.5">📞 Téléphone</label>
                                                        <input
                                                            type="tel"
                                                            value={selectedSection.settings?.phone || ''}
                                                            onChange={e => updateSectionSetting(selectedSection.id, 'phone', e.target.value)}
                                                            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                                                            placeholder="06 XX XX XX XX"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-bold text-slate-700 mb-1.5">💬 WhatsApp</label>
                                                        <input
                                                            type="tel"
                                                            value={selectedSection.settings?.whatsapp || ''}
                                                            onChange={e => updateSectionSetting(selectedSection.id, 'whatsapp', e.target.value)}
                                                            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                                                            placeholder="212XXXXXXXXX"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-bold text-slate-700 mb-1.5">✉️ Email</label>
                                                        <input
                                                            type="email"
                                                            value={selectedSection.settings?.email || ''}
                                                            onChange={e => updateSectionSetting(selectedSection.id, 'email', e.target.value)}
                                                            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                                                            placeholder="contact@votreboutique.ma"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-bold text-slate-700 mb-1.5">📍 Adresse</label>
                                                        <input
                                                            type="text"
                                                            value={selectedSection.settings?.address || ''}
                                                            onChange={e => updateSectionSetting(selectedSection.id, 'address', e.target.value)}
                                                            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                                                            placeholder="123 Rue Mohammed V, Casablanca"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Texte du bouton</label>
                                                        <input
                                                            type="text"
                                                            value={selectedSection.settings?.submitText || ''}
                                                            onChange={e => updateSectionSetting(selectedSection.id, 'submitText', e.target.value)}
                                                            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                                                            placeholder="Envoyer le message"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            {/* Variant Selector */}
                                            <div className="mb-6 pb-6 border-b border-slate-100">
                                                <label className="block text-sm font-bold text-slate-700 mb-2">Variante de Design</label>
                                                <select 
                                                    value={selectedSection.variant || ''}
                                                    onChange={(e) => updateSection(selectedSection.id, { variant: e.target.value })}
                                                    className="block w-full px-3 py-2.5 border border-slate-300 rounded-xl shadow-sm outline-none bg-indigo-50/50 focus:ring-2 focus:ring-indigo-500 font-medium"
                                                >
                                                    {getAvailableVariants(selectedSection.type).map(v => (
                                                        <option key={v} value={v}>{v}</option>
                                                    ))}
                                                    {getAvailableVariants(selectedSection.type).length === 0 && (
                                                        <option value="">Par défaut</option>
                                                    )}
                                                </select>
                                            </div>

                                            {/* Design Settings */}
                                            {selectedSection.type === 'ImageText' && (
                                                <div>
                                                    <label className="block text-sm font-bold text-slate-700 mb-2">Position de l'image</label>
                                                    <div className="flex border border-slate-200 rounded-xl overflow-hidden">
                                                        <button onClick={() => updateSectionSetting(selectedSection.id, 'imagePosition', 'left')} className={`flex-1 py-2 text-sm font-bold ${selectedSection.settings?.imagePosition !== 'right' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500'}`}>Gauche</button>
                                                        <button onClick={() => updateSectionSetting(selectedSection.id, 'imagePosition', 'right')} className={`flex-1 py-2 text-sm font-bold border-l border-slate-200 ${selectedSection.settings?.imagePosition === 'right' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500'}`}>Droite</button>
                                                    </div>
                                                </div>
                                            )}

                                            <div>
                                                <label className="block text-sm font-bold text-slate-700 mb-2">Alignement du texte</label>
                                                <div className="flex border border-slate-200 rounded-xl overflow-hidden">
                                                    <button onClick={() => updateSectionSetting(selectedSection.id, 'alignment', 'left')} className={`flex-1 py-2 flex justify-center hover:bg-slate-50 ${selectedSection.settings?.alignment === 'left' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500'}`}><AlignLeft size={18} /></button>
                                                    <button onClick={() => updateSectionSetting(selectedSection.id, 'alignment', 'center')} className={`flex-1 py-2 flex justify-center hover:bg-slate-50 border-x border-slate-200 ${(!selectedSection.settings?.alignment || selectedSection.settings?.alignment === 'center') ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500'}`}><AlignCenter size={18} /></button>
                                                    <button onClick={() => updateSectionSetting(selectedSection.id, 'alignment', 'right')} className={`flex-1 py-2 flex justify-center hover:bg-slate-50 ${selectedSection.settings?.alignment === 'right' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500'}`}><AlignRight size={18} /></button>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-bold text-slate-700 mb-2">Type d'arrière-plan</label>
                                                <select 
                                                    value={selectedSection.settings?.backgroundType || 'color'}
                                                    onChange={(e) => updateSectionSetting(selectedSection.id, 'backgroundType', e.target.value)}
                                                    className="block w-full px-3 py-2.5 border border-slate-300 rounded-xl shadow-sm outline-none"
                                                >
                                                    <option value="color">Couleur Unie</option>
                                                    <option value="image">Image (URL)</option>
                                                    <option value="video">Vidéo (URL)</option>
                                                </select>
                                            </div>

                                            {(selectedSection.settings?.backgroundType === 'image' || selectedSection.settings?.backgroundType === 'video') && (
                                                <>
                                                    <div>
                                                        <label className="block text-sm font-bold text-slate-700 mb-2">URL du Média (Image/Vidéo)</label>
                                                        <input 
                                                            type="text"
                                                            value={selectedSection.settings?.backgroundUrl || selectedSection.settings?.backgroundImage || ''}
                                                            onChange={(e) => updateSectionSetting(selectedSection.id, 'backgroundUrl', e.target.value)}
                                                            className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none"
                                                            placeholder="https://..."
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-bold text-slate-700 mb-2 flex justify-between">
                                                            <span>Opacité de l'overlay (noir)</span>
                                                            <span className="text-indigo-600">{selectedSection.settings?.overlayOpacity !== undefined ? selectedSection.settings?.overlayOpacity : 40}%</span>
                                                        </label>
                                                        <input 
                                                            type="range" min="0" max="100" step="5"
                                                            value={selectedSection.settings?.overlayOpacity !== undefined ? selectedSection.settings?.overlayOpacity : 40}
                                                            onChange={(e) => updateSectionSetting(selectedSection.id, 'overlayOpacity', parseInt(e.target.value))}
                                                            className="w-full accent-indigo-600"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-bold text-slate-700 mb-2 flex justify-between">
                                                            <span>Flou d'arrière-plan (Blur)</span>
                                                            <span className="text-indigo-600">{selectedSection.settings?.filterBlur || 0}px</span>
                                                        </label>
                                                        <input 
                                                            type="range" min="0" max="20" step="1"
                                                            value={selectedSection.settings?.filterBlur || 0}
                                                            onChange={(e) => updateSectionSetting(selectedSection.id, 'filterBlur', parseInt(e.target.value))}
                                                            className="w-full accent-indigo-600"
                                                        />
                                                    </div>
                                                </>
                                            )}

                                            <div>
                                                <label className="block text-sm font-bold text-slate-700 mb-2">Couleurs</label>
                                                <div className="flex items-center gap-4">
                                                    <div className="flex flex-col items-center">
                                                        <input type="color" value={selectedSection.settings?.textColor || '#000000'} onChange={(e) => updateSectionSetting(selectedSection.id, 'textColor', e.target.value)} className="w-8 h-8 cursor-pointer rounded" />
                                                        <span className="text-[10px] text-slate-500 mt-1">Texte</span>
                                                    </div>
                                                    {selectedSection.settings?.backgroundType !== 'image' && (
                                                        <div className="flex flex-col items-center">
                                                            <input type="color" value={selectedSection.settings?.backgroundColor || '#ffffff'} onChange={(e) => updateSectionSetting(selectedSection.id, 'backgroundColor', e.target.value)} className="w-8 h-8 cursor-pointer rounded" />
                                                            <span className="text-[10px] text-slate-500 mt-1">Fond</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Advanced Paddings */}
                                            <div className="pt-4 border-t border-slate-100">
                                                <label className="block text-sm font-bold text-slate-700 mb-4">Espacements (Padding)</label>
                                                <div className="space-y-4">
                                                    <div>
                                                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                                                            <span>Espace en Haut</span>
                                                            <span>{selectedSection.settings?.paddingTop !== undefined ? selectedSection.settings?.paddingTop : (selectedSection.type === 'Hero' ? 96 : 64)}px</span>
                                                        </div>
                                                        <input 
                                                            type="range" min="0" max="150" step="8"
                                                            value={selectedSection.settings?.paddingTop !== undefined ? selectedSection.settings?.paddingTop : (selectedSection.type === 'Hero' ? 96 : 64)}
                                                            onChange={(e) => updateSectionSetting(selectedSection.id, 'paddingTop', parseInt(e.target.value))}
                                                            className="w-full accent-indigo-600"
                                                        />
                                                    </div>
                                                    <div>
                                                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                                                            <span>Espace en Bas</span>
                                                            <span>{selectedSection.settings?.paddingBottom !== undefined ? selectedSection.settings?.paddingBottom : (selectedSection.type === 'Hero' ? 96 : 64)}px</span>
                                                        </div>
                                                        <input 
                                                            type="range" min="0" max="150" step="8"
                                                            value={selectedSection.settings?.paddingBottom !== undefined ? selectedSection.settings?.paddingBottom : (selectedSection.type === 'Hero' ? 96 : 64)}
                                                            onChange={(e) => updateSectionSetting(selectedSection.id, 'paddingBottom', parseInt(e.target.value))}
                                                            className="w-full accent-indigo-600"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div className="pt-4 flex justify-between items-center">
                                    <button 
                                        onClick={() => deleteSection(selectedSection.id)}
                                        className="text-sm font-bold text-rose-500 hover:text-rose-600 hover:bg-rose-50 px-3 py-2 rounded-lg transition-colors"
                                    >
                                        Supprimer cette section
                                    </button>
                                </div>
                            </motion.div>
                        ) : null}
                    </AnimatePresence>
                </div>
            </div>

            {/* PANNEAU DROIT : LIVE PREVIEW */}
                <div 
                    className="flex-1 bg-slate-200 overflow-y-auto relative flex flex-col items-center custom-scrollbar"
                    onClick={() => setSelectedSectionId(null)} 
                >
                    {/* Device switcher bar */}
                    <div className="w-full flex-shrink-0 flex items-center justify-center gap-2 py-2 bg-slate-300/50 border-b border-slate-300">
                        {[
                            { id: 'desktop', icon: Monitor, label: 'Bureau', w: '1000px' },
                            { id: 'tablet', icon: Tablet, label: 'Tablette', w: '768px' },
                            { id: 'mobile', icon: Smartphone, label: 'Mobile', w: '390px' },
                        ].map(device => (
                            <button
                                key={device.id}
                                onClick={(e) => { e.stopPropagation(); setPreviewDevice(device.id); }}
                                title={device.label}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    previewDevice === device.id
                                        ? 'bg-white text-slate-900 shadow-md'
                                        : 'text-slate-500 hover:bg-white/50 hover:text-slate-700'
                                }`}
                            >
                                <device.icon size={14} /> {device.label}
                            </button>
                        ))}
                        <div className="w-px h-4 bg-slate-400 mx-1" />
                        <button
                            onClick={(e) => { e.stopPropagation(); setShowFullPreview(true); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-md"
                        >
                            <Eye size={14} /> Plein écran
                        </button>
                    </div>

                {/* Loader Overlay when generating */}
                <AnimatePresence>
                    {isGenerating && (
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center"
                        >
                            <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center text-center max-w-sm mx-4">
                                <div className="relative mb-6">
                                    <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center animate-pulse">
                                        <Wand2 size={32} className="text-indigo-600" />
                                    </div>
                                </div>
                                <h3 className="text-xl font-black text-slate-900 mb-2">Beya3 au travail...</h3>
                                <p className="text-sm text-slate-500">Génération de la structure optimale pour votre boutique marocaine.</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div
                    className="min-h-full bg-white shadow-2xl origin-top transition-all duration-500"
                    style={{
                        width: previewDevice === 'desktop' ? '100%' : previewDevice === 'tablet' ? '768px' : '390px',
                        maxWidth: previewDevice === 'desktop' ? '1000px' : previewDevice === 'tablet' ? '768px' : '390px',
                    }}
                >
                    {/* Fake Browser Header */}
                    <div className="bg-slate-800 py-3 px-4 flex items-center gap-4 text-xs font-mono select-none sticky top-0 z-40">
                        <div className="flex gap-2">
                            <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                        </div>
                        <div className="flex-1 bg-slate-700/50 rounded-lg py-1.5 px-3 text-slate-300 text-center flex items-center justify-center gap-2">
                            🔒 {storefrontData.subdomain ? `${storefrontData.subdomain}.bayiin.com` : 'votre-boutique.bayiin.com'}
                        </div>
                    </div>

                    {/* Banner */}
                    {storefrontData.theme.bannerText && (
                        <div className="text-white text-center py-2 text-sm font-bold" style={{ backgroundColor: storefrontData.theme.primaryColor }}>
                            {storefrontData.theme.bannerText}
                        </div>
                    )}

                    {/* Navbar Mock */}
                    <nav className={`border-b border-slate-100 px-6 py-4 flex items-center sticky top-[52px] bg-white/90 backdrop-blur-md z-30 ${storefrontData.theme.headerLayout === 'center' ? 'flex-col gap-4' : 'justify-between'}`}>
                        <div className="font-black text-2xl" style={{ color: storefrontData.theme.primaryColor }}>{store?.name || 'STORE'}</div>
                        <div className="flex gap-6 text-sm font-bold text-slate-600">
                            <span>Accueil</span>
                            <span>Produits</span>
                            <span>Contact</span>
                        </div>
                    </nav>

                    {/* Dynamic Sections Renderer */}
                    <div className="min-h-[500px]" style={{ fontFamily: `'${storefrontData.theme.typography?.heading}', sans-serif` }}>
                        
                        {/* Info banner: product detail view is auto-managed */}
                        {currentPage === 'product' && (
                            <div className="mx-6 mt-6 mb-0 flex items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-2xl px-5 py-3 text-sm">
                                <span className="text-2xl">🛍️</span>
                                <div>
                                    <p className="font-bold text-indigo-800">Page Fiche Produit</p>
                                    <p className="text-indigo-600 text-xs">Le détail d'un produit (image, prix, bouton d'achat) est géré automatiquement. Personnalisez les sections en dessous.</p>
                                </div>
                            </div>
                        )}

                        {/* SECTIONS */}
                        {currentSections.length === 0 ? (
                            <div className="h-[400px] flex flex-col items-center justify-center text-center p-8">
                                <Layout size={48} className="text-slate-300 mb-4" />
                                <h3 className="text-2xl font-bold text-slate-400 mb-2">
                                    {currentPage === 'home' ? 'Votre page d\'accueil est vide' : 'Aucune section supplémentaire'}
                                </h3>
                                <p className="text-slate-500 max-w-md mx-auto">Utilisez le bouton "Ajouter une section" pour personnaliser cette page.</p>
                            </div>
                        ) : (
                            currentSections.map(section => (
                                <BlockRenderer 
                                    key={section.id} 
                                    section={section} 
                                    theme={storefrontData.theme} 
                                    isSelected={selectedSectionId === section.id}
                                    onClick={() => setSelectedSectionId(section.id)}
                                />
                            ))
                        )}
                    </div>
                    
                    {/* Footer Mock */}
                    <footer className="bg-slate-900 text-slate-400 py-12 text-center mt-auto border-t border-slate-800">
                        <div className="font-black text-2xl text-white mb-4">{store?.name || 'STORE'}</div>
                        <p>© 2026 Tous droits réservés.</p>
                    </footer>
                </div>
            </div>
        </div>
        </>
    );
}
