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
    Monitor, Tablet, Smartphone, Copy, Eye, AlertCircle, ShieldCheck, Clock,
    Undo2, Redo2, Code, TrendingUp, ListOrdered
} from 'lucide-react';
import Button from '../components/Button';
import { useHistory } from '../builder/hooks/useHistory';
import { useNavigate } from 'react-router-dom';
import BlockRenderer from '../builder/renderer/BlockRenderer';
import ProductPageEditor from '../builder/pages/ProductPageEditor';
import CheckoutEditor from '../builder/pages/CheckoutEditor';
import { getAvailableVariants } from '../builder/registry';
import TemplateGallery from '../builder/TemplateGallery';
import FullScreenPreview from '../builder/FullScreenPreview';
import StoreOnboarding from '../builder/components/StoreOnboarding';
import CartDrawer from '../components/storefront/CartDrawer';

import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SortableSectionItem from '../builder/components/SortableSectionItem';
import ResponsiveControl from '../builder/components/ResponsiveControl';
import ItemsManager from '../builder/components/ItemsManager';
import SectionBlocksManager from '../builder/components/SectionBlocksManager';

const FONTS = ['Inter', 'Outfit', 'Poppins', 'Montserrat', 'Cairo', 'Tajawal', 'Roboto', 'Playfair Display'];

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
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    
    // NOUVEAU: État pour la page courante en cours d'édition
    const [currentPage, setCurrentPage] = useState('home');

    // NOUVEAU: Verrouillage "Coming Soon"
    const [promoCode, setPromoCode] = useState('');
    const [isUnlocked, setIsUnlocked] = useState(false);

    const handleUnlock = () => {
        if (promoCode === 'EYAOUCHENE') {
            setIsUnlocked(true);
            toast.success("Accès déverrouillé !");
        } else {
            toast.error("Code invalide.");
        }
    };

    const { state: storefrontData, set: setStorefrontData, reset: resetStorefrontData, undo, redo, canUndo, canRedo } = useHistory({
        subdomain: '',
        theme: { 
            primaryColor: '#6366f1', 
            bannerText: '',
            typography: { heading: 'Inter', body: 'Inter' },
            headerLayout: 'center',
            buttonStyle: 'rounded',
            social: { facebook: '', instagram: '', whatsapp: '' },
            rtl: false, // For Arabic support
            pixels: { facebook: '', tiktok: '', snapchat: '' }
        },
        global: {
            header: { id: 'global-header', type: 'HeaderGlobal', title: 'Ma Boutique', settings: { showCta: true, ctaText: 'Acheter' } },
            footer: { id: 'global-footer', type: 'FooterGlobal', title: 'Ma Boutique', subtitle: 'Votre partenaire de confiance.', settings: { showWatermark: true } }
        },
        pages: {
            home: { sections: [] },
            catalog: { sections: [] },
            product: { sections: [] },
            cart: { sections: [] },
            checkout: { sections: [] },
            portal: { sections: [] },
            contact: { sections: [] }
        },
        sections: [] // Fallback
    });

    const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
    const [selectedSectionId, setSelectedSectionId] = useState(null);
    const [selectedSectionType, setSelectedSectionType] = useState('page'); // 'page' ou 'global'
    const [activeSectionTab, setActiveSectionTab] = useState('content');
    const [showSectionCatalog, setShowSectionCatalog] = useState(false);
    const [showTemplateGallery, setShowTemplateGallery] = useState(false);
    const [showFullPreview, setShowFullPreview] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [previewDevice, setPreviewDevice] = useState('desktop');
    const [forceShowBuilder, setForceShowBuilder] = useState(false);

    // Google Fonts Injection
    useEffect(() => {
        if (!storefrontData.theme.typography) return;
        const headingFont = storefrontData.theme.typography.heading || 'Inter';
        const bodyFont = storefrontData.theme.typography.body || 'Inter';
        
        const link = document.createElement('link');
        const fonts = Array.from(new Set([headingFont, bodyFont])).map(f => `family=${f.replace(/ /g, '+')}:wght@400;500;700;900`).join('&');
        link.href = `https://fonts.googleapis.com/css2?${fonts}&display=swap`;
        link.rel = 'stylesheet';
        document.head.appendChild(link);
        return () => document.head.removeChild(link);
    }, [storefrontData.theme.typography]);

    // Keyboard shortcuts (Save, Undo, Redo)
    useEffect(() => {
        const handler = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                e.preventDefault();
                handleSave();
            }
            if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                if (canUndo) undo();
            }
            if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
                e.preventDefault();
                if (canRedo) redo();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [storefrontData, canUndo, canRedo, undo, redo]); // Re-bind when data changes so handleSave closure is fresh

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
                        catalog: existingPages?.catalog || { sections: [] },
                        product: {
                            sections: (existingPages?.product?.sections?.length > 0)
                                ? existingPages.product.sections
                                : [defaultProductSection]
                        },
                        cart: existingPages?.cart || { sections: [] },
                        checkout: existingPages?.checkout || { sections: [] },
                        portal: existingPages?.portal || { sections: [] },
                        contact: {
                            sections: (existingPages?.contact?.sections?.length > 0)
                                ? existingPages.contact.sections
                                : [defaultContactSection]
                        }
                    };

                    resetStorefrontData({
                        ...existingData,
                        theme: {
                            ...existingData.theme,
                            typography: existingData.theme?.typography || { heading: 'Inter', body: 'Inter' },
                            headerLayout: existingData.theme?.headerLayout || 'center',
                            buttonStyle: existingData.theme?.buttonStyle || 'rounded',
                            social: existingData.theme?.social || { facebook: '', instagram: '', whatsapp: '' }
                        },
                        global: existingData.global || {
                            header: { id: 'global-header', type: 'HeaderGlobal', title: store.name || 'Ma Boutique', settings: { showCta: true, ctaText: 'Acheter' } },
                            footer: { id: 'global-footer', type: 'FooterGlobal', title: store.name || 'Ma Boutique', subtitle: 'Votre partenaire de confiance.', settings: { showWatermark: true } }
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
            // Redirection / Ouverture de la vitrine live dans un nouvel onglet
            setTimeout(() => {
                window.open(`/s/${store.id}`, '_blank');
            }, 1000);
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
            if (id === 'global-header' || id === 'global-footer') {
                const globalKey = id === 'global-header' ? 'header' : 'footer';
                return { ...prev, global: { ...prev.global, [globalKey]: { ...prev.global[globalKey], ...updates } } };
            }
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
            if (id === 'global-header' || id === 'global-footer') {
                const globalKey = id === 'global-header' ? 'header' : 'footer';
                return { ...prev, global: { ...prev.global, [globalKey]: { ...prev.global[globalKey], settings: { ...(prev.global[globalKey].settings || {}), [key]: value } } } };
            }
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

    const updateSectionInline = (id, updates) => {
        updateSection(id, updates);
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

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event) => {
        const { active, over } = event;
        
        if (over && active.id !== over.id) {
            setStorefrontData((prev) => {
                const currentSections = prev.pages[currentPage]?.sections || [];
                const oldIndex = currentSections.findIndex((s) => s.id === active.id);
                const newIndex = currentSections.findIndex((s) => s.id === over.id);
                
                return {
                    ...prev,
                    pages: {
                        ...prev.pages,
                        [currentPage]: {
                            ...prev.pages[currentPage],
                            sections: arrayMove(currentSections, oldIndex, newIndex)
                        }
                    }
                };
            });
        }
    };

    if (isLoading) {
        return <div className="h-screen flex items-center justify-center"><RefreshCw className="animate-spin text-indigo-600" size={32} /></div>;
    }

    const globalHeader = storefrontData.global?.header || { id: 'global-header', type: 'HeaderGlobal', settings: {} };
    const globalFooter = storefrontData.global?.footer || { id: 'global-footer', type: 'FooterGlobal', settings: {} };
    const currentSections = storefrontData.pages?.[currentPage]?.sections || [];
    
    const selectedSection = selectedSectionType === 'global' 
        ? (selectedSectionId === 'global-header' ? globalHeader : globalFooter)
        : currentSections.find(s => s.id === selectedSectionId);

    const SECTION_CATALOG_ALL = [
        { type: 'Hero', icon: <LayoutTemplate />, desc: "Bannière principale avec titre et bouton", pages: ['home'] },
        { type: 'Features', icon: <Sparkles />, desc: "Liste d'avantages ou points clés", pages: ['home', 'product', 'contact'] },
        { type: 'ProductGrid', icon: <ShoppingBag />, desc: "Grille affichant vos produits", pages: ['home', 'product'] },
        { type: 'ImageText', icon: <ImageIcon />, desc: "Image accompagnée de texte", pages: ['home', 'product', 'contact'] },
        { type: 'Testimonials', icon: <MessageSquare />, desc: "Avis clients pour rassurer", pages: ['home', 'product'] },
        { type: 'FAQ', icon: <HelpCircle />, desc: "Foire aux questions accordéon", pages: ['home', 'product', 'contact'] },
        { type: 'ContactForm', icon: <MessageSquare />, desc: "Formulaire de contact avec coordonnées", pages: ['contact', 'home'] },
        { type: 'CODReassurance', icon: <ShieldCheck />, desc: "Réassurance Cash on Delivery", pages: ['home', 'product', 'contact'] },
        { type: 'CountdownTimer', icon: <Clock />, desc: "Compte à rebours d'urgence", pages: ['home', 'product'] },
        { type: 'TrustBadges', icon: <ShieldCheck />, desc: "Icônes de confiance (paiement, livraison)", pages: ['home', 'product', 'contact'] },
        { type: 'StatsCounter', icon: <Sparkles />, desc: "Compteurs de statistiques animés", pages: ['home', 'product', 'contact'] },
        { type: 'ProcessSteps', icon: <Layers />, desc: "Étapes / Comment ça marche", pages: ['home', 'product', 'contact'] },
        { type: 'CustomHTML', icon: <Code />, desc: "Code brut (Avancé)", pages: ['home', 'product', 'contact'] },
        { type: 'ImageText', icon: <Layers />, desc: "Texte & Image côte à côte", pages: ['home', 'product', 'contact'] }
    ];
    const SECTION_CATALOG = SECTION_CATALOG_ALL.filter(item => !item.pages || item.pages.includes(currentPage));

    if (!isUnlocked) {
        return (
            <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-100 p-6 relative overflow-hidden">
                <div className="absolute inset-0 grayscale opacity-30 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #cbd5e1 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full relative z-10 text-center border border-slate-200">
                    <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 transform -rotate-6">
                        <Sparkles size={32} />
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 mb-2">Bientôt Disponible</h1>
                    <p className="text-slate-500 mb-8 font-medium">Le créateur de vitrine de nouvelle génération arrive très prochainement. Restez à l'écoute !</p>
                    
                    <button 
                        onClick={() => navigate('/storefront-preview')}
                        className="w-full bg-indigo-600 text-white font-bold py-3.5 px-6 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20 mb-8"
                    >
                        Retourner à l'aperçu
                    </button>

                    <div className="flex justify-center opacity-10 hover:opacity-100 transition-opacity mt-4">
                        <input 
                            type="password"
                            value={promoCode}
                            onChange={(e) => setPromoCode(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                            className="bg-transparent border-none text-[8px] text-slate-400 focus:outline-none w-16 text-center"
                            autoComplete="off"
                            spellCheck="false"
                        />
                    </div>
                </div>
            </div>
        );
    }

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
        
        {storefrontData.pages?.home?.sections?.length === 0 && !forceShowBuilder ? (
            <StoreOnboarding 
                onGenerateAI={handleGenerateAI}
                onOpenTemplates={() => setShowTemplateGallery(true)}
                onStartFromScratch={() => setForceShowBuilder(true)}
                isGenerating={isGenerating}
            />
        ) : (
        <div className="h-screen w-screen bg-slate-200 overflow-hidden relative flex flex-col">
            
            {/* TOP BAR */}
            <div className="flex-shrink-0 h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between z-40 shadow-sm relative">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setIsLeftPanelOpen(!isLeftPanelOpen)}
                        className={`p-2 rounded-lg transition-colors ${isLeftPanelOpen ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                        <AlignLeft size={20} />
                    </button>
                    <div className="h-6 w-px bg-slate-200 mx-1"></div>
                    <button onClick={() => navigate('/dashboard')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors"><ChevronLeft size={16} /> Quitter</button>
                    <div className="h-6 w-px bg-slate-200 mx-1"></div>
                    <div className="flex items-center bg-slate-100 p-1 rounded-lg">
                        <button onClick={() => setPreviewDevice('desktop')} className={`p-1.5 rounded-md transition-colors ${previewDevice === 'desktop' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>
                            <Monitor size={16} />
                        </button>
                        <button onClick={() => setPreviewDevice('tablet')} className={`p-1.5 rounded-md transition-colors ${previewDevice === 'tablet' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>
                            <Tablet size={16} />
                        </button>
                        <button onClick={() => setPreviewDevice('mobile')} className={`p-1.5 rounded-md transition-colors ${previewDevice === 'mobile' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>
                            <Smartphone size={16} />
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 border-r border-slate-200 pr-4">
                        <button onClick={undo} disabled={!canUndo} className={`p-2 rounded-lg transition-colors ${canUndo ? 'text-slate-700 hover:bg-slate-100' : 'text-slate-300 cursor-not-allowed'}`} title="Annuler (Ctrl+Z)">
                            <Undo2 size={18} />
                        </button>
                        <button onClick={redo} disabled={!canRedo} className={`p-2 rounded-lg transition-colors ${canRedo ? 'text-slate-700 hover:bg-slate-100' : 'text-slate-300 cursor-not-allowed'}`} title="Rétablir (Ctrl+Shift+Z)">
                            <Redo2 size={18} />
                        </button>
                    </div>
                    {hasUnsavedChanges && (
                        <span className="text-xs font-bold text-amber-600 flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-lg">
                            <AlertCircle size={12} /> Non sauvegardé
                        </span>
                    )}
                    <button
                        onClick={() => setShowFullPreview(true)}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors border border-slate-200"
                    >
                        <Eye size={16} /> Aperçu
                    </button>
                    <Button onClick={handleSave} isLoading={isSaving} icon={Save} size="sm">Publier</Button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden relative">
                {/* LEFT PANEL : STRUCTURE & GLOBALS (Collapsible via w-width transition) */}
                <div 
                    className={`flex-shrink-0 bg-white border-r border-slate-200 overflow-y-auto flex flex-col z-30 shadow-xl transition-all duration-300 ease-in-out h-full absolute left-0 top-0 md:relative`}
                    style={{ width: isLeftPanelOpen ? '320px' : '0px', opacity: isLeftPanelOpen ? 1 : 0 }}
                >
                    <div className="w-[320px]">
                        {/* Sélecteur de Page (Liste interactive) */}
                        <div className="p-4 border-b border-slate-200 bg-slate-50">
                            <div className="flex items-center justify-between mb-3">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Pages de la boutique</label>
                            </div>
                            <div className="space-y-1">
                                {[
                                    { id: 'home', label: "🏠 Accueil (Home)", core: true },
                                    { id: 'catalog', label: "📚 Catalogue", core: false },
                                    { id: 'product', label: "🛍️ Page Produit", core: true },
                                    { id: 'cart', label: "🛒 Panier", core: true },
                                    { id: 'checkout', label: "💳 Paiement", core: true },
                                    { id: 'portal', label: "👤 Espace Client", core: false },
                                    { id: 'contact', label: "📞 Page Contact", core: false }
                                ].filter(p => p.core || (storefrontData.pages?.[p.id]?.sections?.length > 0) || currentPage === p.id).map(page => (
                                    <button
                                        key={page.id}
                                        onClick={() => {
                                            setCurrentPage(page.id);
                                            setSelectedSectionId(null);
                                        }}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-bold transition-colors flex items-center justify-between group ${
                                            currentPage === page.id 
                                            ? 'bg-indigo-100 text-indigo-700 shadow-sm' 
                                            : 'text-slate-600 hover:bg-slate-100'
                                        }`}
                                    >
                                        <span>{page.label}</span>
                                        {currentPage === page.id && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>}
                                    </button>
                                ))}
                                
                                {/* Dropdown "Ajouter une page" pour les pages optionnelles non actives */}
                                {['catalog', 'portal', 'contact'].some(id => !storefrontData.pages?.[id]?.sections?.length && currentPage !== id) && (
                                    <div className="pt-2 mt-2 border-t border-slate-200">
                                        <select 
                                            className="w-full text-xs font-bold text-slate-500 bg-transparent border-none outline-none cursor-pointer hover:text-indigo-600"
                                            value=""
                                            onChange={(e) => {
                                                if (e.target.value) {
                                                    setCurrentPage(e.target.value);
                                                    setSelectedSectionId(null);
                                                }
                                            }}
                                        >
                                            <option value="" disabled>+ Ajouter une page</option>
                                            {!storefrontData.pages?.catalog?.sections?.length && currentPage !== 'catalog' && <option value="catalog">📚 Catalogue</option>}
                                            {!storefrontData.pages?.portal?.sections?.length && currentPage !== 'portal' && <option value="portal">👤 Espace Client</option>}
                                            {!storefrontData.pages?.contact?.sections?.length && currentPage !== 'contact' && <option value="contact">📞 Page Contact</option>}
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-6">
                            
                            {/* Bouton Magique IA */}
                            <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-4 rounded-2xl text-white shadow-lg relative overflow-hidden group cursor-pointer hover:shadow-indigo-500/25 transition-all">
                                <div className="relative z-10 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Wand2 size={18} /> <span className="font-bold text-sm">Assistant Beya3</span>
                                    </div>
                                    <button 
                                        onClick={handleGenerateAI}
                                        disabled={isGenerating}
                                        className="bg-white text-indigo-600 text-xs font-black py-1.5 px-3 rounded-lg shadow hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                                    >
                                        {isGenerating ? <RefreshCw className="animate-spin" size={14} /> : "Générer"}
                                    </button>
                                </div>
                            </div>

                            {/* STRUCTURE */}
                            <div>
                                <h3 className="font-bold text-slate-900 uppercase tracking-wider text-xs mb-3 flex items-center gap-2">
                                    <Layout size={14} className="text-slate-400" /> Structure Globale
                                </h3>
                                
                                <div className="space-y-1 mb-4">
                                    <div 
                                        onClick={() => { setSelectedSectionId('global-header'); setSelectedSectionType('global'); }}
                                        className={`px-3 py-2.5 rounded-lg border flex items-center gap-3 cursor-pointer transition-colors ${selectedSectionId === 'global-header' ? 'border-indigo-500 bg-indigo-50' : 'border-transparent hover:bg-slate-50'}`}
                                    >
                                        <div className="w-6 h-6 rounded bg-emerald-100 text-emerald-600 flex items-center justify-center"><AlignLeft size={14}/></div>
                                        <span className="text-sm font-bold text-slate-700 flex-1">En-tête (Header)</span>
                                    </div>
                                </div>

                                <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden shadow-sm mb-4">
                                    {currentSections.length === 0 ? (
                                        <div className="p-4 text-center text-slate-500 text-xs">
                                            Aucune section. Ajoutez-en une.
                                        </div>
                                    ) : (
                                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                            <SortableContext items={currentSections.map(s => s.id)} strategy={verticalListSortingStrategy}>
                                                <div className="divide-y divide-slate-100 flex flex-col">
                                                    {currentSections.map((section, index) => (
                                                        <SortableSectionItem
                                                            key={section.id}
                                                            section={section}
                                                            index={index}
                                                            isFirst={index === 0}
                                                            isLast={index === currentSections.length - 1}
                                                            isSelected={selectedSectionId === section.id}
                                                            onSelect={() => { setSelectedSectionId(section.id); setSelectedSectionType('page'); setActiveSectionTab('content'); }}
                                                            onMoveUp={() => moveSection(index, 'up')}
                                                            onMoveDown={() => moveSection(index, 'down')}
                                                            onDuplicate={() => duplicateSection(section.id)}
                                                            onDelete={() => deleteSection(section.id)}
                                                        />
                                                    ))}
                                                </div>
                                            </SortableContext>
                                        </DndContext>
                                    )}
                                    <div className="p-2 border-t border-slate-200 bg-white">
                                        <button 
                                            onClick={() => setShowSectionCatalog(true)}
                                            className="w-full py-2 rounded-lg border border-dashed border-slate-300 text-slate-600 font-bold hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2 text-xs"
                                        >
                                            <Plus size={14} /> Ajouter Section
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <div 
                                        onClick={() => { setSelectedSectionId('global-footer'); setSelectedSectionType('global'); }}
                                        className={`px-3 py-2.5 rounded-lg border flex items-center gap-3 cursor-pointer transition-colors ${selectedSectionId === 'global-footer' ? 'border-indigo-500 bg-indigo-50' : 'border-transparent hover:bg-slate-50'}`}
                                    >
                                        <div className="w-6 h-6 rounded bg-emerald-100 text-emerald-600 flex items-center justify-center"><AlignLeft size={14} className="rotate-180"/></div>
                                        <span className="text-sm font-bold text-slate-700 flex-1">Pied de page (Footer)</span>
                                    </div>
                                </div>
                            </div>

                            {/* Paramètres Globaux du Thème */}
                            <div className="space-y-4 pt-4 border-t border-slate-200">
                                <h3 className="font-bold text-slate-900 uppercase tracking-wider text-xs flex items-center gap-2">
                                    <Paintbrush size={14} className="text-slate-400" /> Thème Global
                                </h3>
                                
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-2">Couleur Principale</label>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <div className="relative w-8 h-8 rounded-lg overflow-hidden shadow-sm border border-slate-200 cursor-pointer flex-shrink-0">
                                            <input 
                                                type="color" 
                                                value={storefrontData.theme.primaryColor}
                                                onChange={(e) => { markUnsaved(); setStorefrontData(prev => ({ ...prev, theme: { ...prev.theme, primaryColor: e.target.value } })); }}
                                                className="absolute inset-[-10px] w-16 h-16 cursor-pointer opacity-0"
                                            />
                                            <div className="w-full h-full" style={{ backgroundColor: storefrontData.theme.primaryColor }}></div>
                                        </div>
                                        {['#6366f1','#c9a96e','#0ea5e9','#ec4899','#ea580c','#10b981','#0f172a'].map(color => (
                                            <button
                                                key={color}
                                                onClick={() => { markUnsaved(); setStorefrontData(prev => ({ ...prev, theme: { ...prev.theme, primaryColor: color } })); }}
                                                className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-110 ${
                                                    storefrontData.theme.primaryColor === color ? 'border-slate-800 scale-110 shadow-md' : 'border-white shadow-sm'
                                                }`}
                                                style={{ backgroundColor: color }}
                                                title={color}
                                            />
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-2">Boutons</label>
                                    <div className="grid grid-cols-3 gap-1">
                                        <button onClick={() => setStorefrontData(prev => ({ ...prev, theme: { ...prev.theme, buttonStyle: 'sharp' } }))} className={`py-1.5 px-2 border rounded-none text-xs transition-colors ${storefrontData.theme.buttonStyle === 'sharp' ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-bold' : 'border-slate-200 hover:border-slate-300'}`}>Carré</button>
                                        <button onClick={() => setStorefrontData(prev => ({ ...prev, theme: { ...prev.theme, buttonStyle: 'rounded' } }))} className={`py-1.5 px-2 border rounded-md text-xs transition-colors ${storefrontData.theme.buttonStyle === 'rounded' ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-bold' : 'border-slate-200 hover:border-slate-300'}`}>Arrondi</button>
                                        <button onClick={() => setStorefrontData(prev => ({ ...prev, theme: { ...prev.theme, buttonStyle: 'pill' } }))} className={`py-1.5 px-2 border rounded-full text-xs transition-colors ${storefrontData.theme.buttonStyle === 'pill' ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-bold' : 'border-slate-200 hover:border-slate-300'}`}>Pilule</button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-2">Police</label>
                                    <select 
                                        value={storefrontData.theme.typography?.heading || 'Inter'}
                                        onChange={(e) => setStorefrontData(prev => ({ ...prev, theme: { ...prev.theme, typography: { ...prev.theme.typography, heading: e.target.value } } }))}
                                        className="block w-full px-2 py-1.5 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 sm:text-xs outline-none"
                                    >
                                        {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                                    </select>
                                </div>

                                <div className="pt-2 border-t border-slate-100 relative opacity-60">
                                    <div className="absolute top-0 right-0 bg-slate-800 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest mt-2">PRO (Bientôt)</div>
                                    <label className="block text-xs font-bold text-slate-700 mb-3">Conversion & FOMO</label>
                                    
                                    <label className="flex items-center gap-3 cursor-not-allowed mb-2">
                                        <div className="relative">
                                            <input type="checkbox" className="sr-only peer" disabled />
                                            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                                        </div>
                                        <span className="text-xs font-medium text-slate-500">Preuve Sociale (Notifications de ventes)</span>
                                    </label>

                                    <label className="flex items-center gap-3 cursor-not-allowed mb-2">
                                        <div className="relative">
                                            <input type="checkbox" className="sr-only peer" disabled />
                                            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                                        </div>
                                        <span className="text-xs font-medium text-slate-500">Bouton Acheter Fixe (Mobile)</span>
                                    </label>

                                    <label className="flex items-center gap-3 cursor-not-allowed">
                                        <div className="relative">
                                            <input type="checkbox" className="sr-only peer" disabled />
                                            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                                        </div>
                                        <span className="text-xs font-medium text-slate-500">Compteur de Visiteurs en ligne</span>
                                    </label>
                                </div>
                                <div className="pt-2 border-t border-slate-100 relative opacity-60">
                                    <div className="absolute top-0 right-0 bg-slate-800 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest mt-2">PRO (Bientôt)</div>
                                    <label className="block text-xs font-bold text-slate-700 mb-3">Localisation</label>
                                    <label className="flex items-center gap-3 cursor-not-allowed">
                                        <div className="relative">
                                            <input type="checkbox" className="sr-only peer" disabled />
                                            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                                        </div>
                                        <span className="text-xs font-medium text-slate-500">Activer le mode RTL (Arabe)</span>
                                    </label>
                                </div>

                                <div className="pt-2 border-t border-slate-100 relative opacity-60 pointer-events-none">
                                    <div className="absolute top-0 right-0 bg-slate-800 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest mt-2">PRO (Bientôt)</div>
                                    <label className="block text-xs font-bold text-slate-700 mb-3">Tracking & Pixels</label>
                                    <div className="space-y-3">
                                        <div>
                                            <span className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Meta (Facebook) Pixel ID</span>
                                            <input type="text" placeholder="Ex: 123456789" className="w-full px-2 py-1.5 border border-slate-300 rounded shadow-sm text-xs bg-slate-50 text-slate-400" disabled />
                                        </div>
                                        <div>
                                            <span className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">TikTok Pixel ID</span>
                                            <input type="text" placeholder="Ex: CBX1234..." className="w-full px-2 py-1.5 border border-slate-300 rounded shadow-sm text-xs bg-slate-50 text-slate-400" disabled />
                                        </div>
                                        <div>
                                            <span className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Snapchat Pixel ID</span>
                                            <input type="text" placeholder="Ex: e234-..." className="w-full px-2 py-1.5 border border-slate-300 rounded shadow-sm text-xs bg-slate-50 text-slate-400" disabled />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* CENTER PANEL : VISUALIZER */}
                <div 
                    className="flex-1 overflow-y-auto relative flex flex-col items-center custom-scrollbar pb-20"
                    onClick={() => setSelectedSectionId(null)} 
                >
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
                        className={`min-h-full bg-white shadow-2xl origin-top transition-all duration-500 preview-${previewDevice} mt-6 mb-12`}
                        style={{
                            width: previewDevice === 'desktop' ? '100%' : previewDevice === 'tablet' ? '768px' : '390px',
                            maxWidth: previewDevice === 'desktop' ? '1200px' : previewDevice === 'tablet' ? '768px' : '390px',
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

                        <div 
                            style={{ fontFamily: `'${storefrontData.theme.typography?.heading}', sans-serif` }}
                            dir={storefrontData.theme.rtl ? 'rtl' : 'ltr'}
                            className={storefrontData.theme.rtl ? 'text-right' : 'text-left'}
                        >
                            {/* GLOBAL HEADER */}
                            <BlockRenderer 
                                section={globalHeader}
                                theme={storefrontData.theme}
                                isSelected={selectedSectionId === 'global-header'}
                                onClick={() => { setSelectedSectionId('global-header'); setSelectedSectionType('global'); }}
                                onUpdate={(updates) => updateSection('global-header', updates)}
                            />

                            {/* Info banners for dynamically managed pages */}
                            {currentPage === 'catalog' && (
                                <div className="mx-6 mt-6 mb-0 flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-3 text-sm">
                                    <span className="text-2xl">📚</span>
                                    <div>
                                        <p className="font-bold text-emerald-800">Page Catalogue (Collection)</p>
                                        <p className="text-emerald-600 text-xs">La grille de vos produits et les filtres sont gérés automatiquement. Personnalisez les sections en dessous.</p>
                                    </div>
                                </div>
                            )}
                            
                            {currentPage === 'product' && (
                                <ProductPageEditor theme={storefrontData.theme} settings={storefrontData.pages?.product?.settings || {}} />
                            )}

                            {currentPage === 'cart' && (
                                <div className="mx-6 mt-6 mb-0 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 text-sm">
                                    <span className="text-2xl">🛒</span>
                                    <div>
                                        <p className="font-bold text-amber-800">Page Panier</p>
                                        <p className="text-amber-600 text-xs">L'affichage des articles et du total est géré automatiquement. Personnalisez les sections en dessous.</p>
                                    </div>
                                </div>
                            )}

                            {currentPage === 'checkout' && (
                                <CheckoutEditor theme={storefrontData.theme} settings={storefrontData.pages?.checkout?.settings || {}} />
                            )}

                            {currentPage === 'portal' && (
                                <div className="mx-6 mt-6 mb-0 flex items-center gap-3 bg-purple-50 border border-purple-200 rounded-2xl px-5 py-3 text-sm">
                                    <span className="text-2xl">👤</span>
                                    <div>
                                        <p className="font-bold text-purple-800">Espace Client (Portal)</p>
                                        <p className="text-purple-600 text-xs">L'authentification et l'historique des commandes sont gérés automatiquement. Personnalisez les sections en dessous.</p>
                                    </div>
                                </div>
                            )}

                            {/* SECTIONS */}
                            <div className="min-h-[400px]">
                                {currentSections.length === 0 ? (
                                    <div className="h-[400px] flex flex-col items-center justify-center text-center p-8 bg-slate-50/50 m-4 rounded-3xl border-2 border-dashed border-slate-200">
                                        <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-6">
                                            <Layout size={32} className="text-indigo-400" />
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-800 mb-2">
                                            {currentPage === 'home' ? 'Construisons votre page d\'accueil' : 'Cette page est vide'}
                                        </h3>
                                        {currentPage === 'home' && (
                                            <div className="text-sm text-slate-500 max-w-sm mb-6 bg-white p-4 rounded-xl shadow-sm text-left">
                                                <p className="font-bold text-slate-700 mb-2 flex items-center gap-2"><Sparkles size={14} className="text-amber-500"/> Conseil de structure :</p>
                                                <ol className="space-y-2 list-decimal list-inside text-slate-600">
                                                    <li>Ajoutez une <strong>Bannière (Hero)</strong> pour accrocher.</li>
                                                    <li>Ajoutez vos <strong>Avantages</strong> (livraison, etc).</li>
                                                    <li>Affichez une <strong>Grille de Produits</strong>.</li>
                                                </ol>
                                            </div>
                                        )}
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setShowSectionCatalog(true); }}
                                            className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center gap-2"
                                        >
                                            <Plus size={18} /> Ajouter ma première section
                                        </button>
                                    </div>
                                ) : (
                                    currentSections.map(section => (
                                        <BlockRenderer 
                                            key={section.id} 
                                            section={section} 
                                            theme={storefrontData.theme} 
                                            isSelected={selectedSectionId === section.id}
                                            onClick={() => { setSelectedSectionId(section.id); setSelectedSectionType('page'); }}
                                            onUpdate={(updates) => updateSectionInline(section.id, updates)}
                                        />
                                    ))
                                )}
                            </div>
                            
                            {/* GLOBAL FOOTER */}
                            <BlockRenderer 
                                section={globalFooter}
                                theme={storefrontData.theme}
                                isSelected={selectedSectionId === 'global-footer'}
                                onClick={() => { setSelectedSectionId('global-footer'); setSelectedSectionType('global'); }}
                                onUpdate={(updates) => updateSection('global-footer', updates)}
                            />
                            
                            <CartDrawer theme={storefrontData.theme} />
                        </div>
                    </div>
                </div>

                {/* RIGHT PANEL : PROPERTIES (Visible only when section selected) */}
                <div 
                    className={`flex-shrink-0 bg-slate-50 border-l border-slate-200 overflow-y-auto flex flex-col z-30 shadow-xl transition-all duration-300 ease-in-out h-full absolute right-0 top-0 md:relative`}
                    style={{ width: selectedSection ? '360px' : '0px', opacity: selectedSection ? 1 : 0 }}
                >
                    <div className="w-[360px]">
                        <AnimatePresence mode="wait">
                            {selectedSection && (
                                <motion.div 
                                    key={selectedSection.id}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="p-5 space-y-6"
                                >
                                    <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md uppercase tracking-wider">{selectedSection.type}</span>
                                        </div>
                                        <button 
                                            onClick={() => setSelectedSectionId(null)}
                                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>

                                    <Tabs 
                                        tabs={[{ id: 'content', label: 'Contenu' }, { id: 'design', label: 'Design' }]}
                                        activeTab={activeSectionTab}
                                        onChange={setActiveSectionTab}
                                    />

                                    <div className="space-y-5">
                                        {activeSectionTab === 'content' ? (
                                            selectedSection.variant === 'Blocks' ? (
                                                <SectionBlocksManager 
                                                    section={selectedSection} 
                                                    onChange={(newBlocks) => updateSection(selectedSection.id, { blocks: newBlocks })} 
                                                />
                                            ) : (
                                            <>
                                                {selectedSection.title !== undefined && (
                                                    <div>
                                                        <label className="block text-sm font-bold text-slate-700 mb-1">Titre Principal</label>
                                                        <AIInput 
                                                            value={selectedSection.title || ''} 
                                                            onChange={(val) => updateSection(selectedSection.id, { title: val })}
                                                            fieldType="titre accrocheur"
                                                            placeholder="Titre"
                                                        />
                                                    </div>
                                                )}

                                                {selectedSection.subtitle !== undefined && (
                                                    <div>
                                                        <label className="block text-sm font-bold text-slate-700 mb-1">Sous-titre</label>
                                                        <AIInput 
                                                            value={selectedSection.subtitle || ''} 
                                                            onChange={(val) => updateSection(selectedSection.id, { subtitle: val })}
                                                            fieldType="sous-titre persuasif"
                                                            placeholder="Texte d'accompagnement"
                                                            multiline={true}
                                                        />
                                                    </div>
                                                )}

                                                {selectedSection.content !== undefined && (
                                                    <div>
                                                        <label className="block text-sm font-bold text-slate-700 mb-1">Contenu / Description</label>
                                                        <AIInput 
                                                            value={selectedSection.content || ''} 
                                                            onChange={(val) => updateSection(selectedSection.id, { content: val })}
                                                            fieldType="description détaillée"
                                                            placeholder="Contenu texte"
                                                            multiline={true}
                                                        />
                                                    </div>
                                                )}

                                                {selectedSection.ctaText !== undefined && (
                                                    <div>
                                                        <label className="block text-sm font-bold text-slate-700 mb-1">Bouton d'action (CTA)</label>
                                                        <AIInput 
                                                            value={selectedSection.ctaText || ''} 
                                                            onChange={(val) => updateSection(selectedSection.id, { ctaText: val })}
                                                            fieldType="bouton call to action"
                                                            placeholder="Acheter"
                                                        />
                                                    </div>
                                                )}

                                                {selectedSection.settings?.showCta !== undefined && (
                                                    <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200">
                                                        <span className="text-sm font-bold text-slate-700">Afficher le bouton CTA</span>
                                                        <input 
                                                            type="checkbox" 
                                                            checked={selectedSection.settings.showCta} 
                                                            onChange={(e) => updateSectionSetting(selectedSection.id, 'showCta', e.target.checked)}
                                                            className="w-4 h-4 text-indigo-600 rounded"
                                                        />
                                                    </div>
                                                )}

                                                <ItemsManager 
                                                    section={selectedSection}
                                                    onChange={(newItems) => updateSection(selectedSection.id, { items: newItems })}
                                                />
                                            </>
                                            )
                                        ) : (
                                            /* TAB DESIGN */
                                            <>
                                            {/* GLOBAL HEADER SPECIFIC */}
                                            {selectedSection.id === 'global-header' && (
                                                <div className="pb-4 border-b border-slate-100 space-y-3">
                                                    <h4 className="text-sm font-bold text-slate-700">Arrière-plan</h4>
                                                    <select 
                                                        value={selectedSection.settings?.backgroundType || 'color'}
                                                        onChange={(e) => updateSectionSetting(selectedSection.id, 'backgroundType', e.target.value)}
                                                        className="w-full p-2 border rounded-lg text-sm outline-none"
                                                    >
                                                        <option value="color">Couleur unie</option>
                                                        <option value="image">Image de fond</option>
                                                    </select>
                                                    {selectedSection.settings?.backgroundType === 'image' && (
                                                        <>
                                                            <input 
                                                                type="text" 
                                                                placeholder="URL de l'image (ex: https://...)" 
                                                                value={selectedSection.settings?.backgroundImage || ''}
                                                                onChange={(e) => updateSectionSetting(selectedSection.id, 'backgroundImage', e.target.value)}
                                                                className="w-full p-2 border rounded-lg text-sm"
                                                            />
                                                            <div className="flex items-center justify-between text-xs">
                                                                <span>Opacité:</span>
                                                                <input 
                                                                    type="range" min="0" max="1" step="0.1" 
                                                                    value={selectedSection.settings?.backgroundOpacity || 1}
                                                                    onChange={(e) => updateSectionSetting(selectedSection.id, 'backgroundOpacity', parseFloat(e.target.value))}
                                                                />
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            )}

                                            {/* GLOBAL FOOTER SPECIFIC */}
                                            {selectedSection.id === 'global-footer' && (
                                                <div className="pb-4 border-b border-slate-100 space-y-3">
                                                    <h4 className="text-sm font-bold text-slate-700">Coordonnées</h4>
                                                    <input type="text" placeholder="Adresse (ex: 123 Rue...)" value={selectedSection.settings?.address || ''} onChange={(e) => updateSectionSetting(selectedSection.id, 'address', e.target.value)} className="w-full p-2 border rounded-lg text-sm" />
                                                    <input type="text" placeholder="Téléphone (ex: +212 6...)" value={selectedSection.settings?.phone || ''} onChange={(e) => updateSectionSetting(selectedSection.id, 'phone', e.target.value)} className="w-full p-2 border rounded-lg text-sm" />
                                                    <input type="email" placeholder="Email de contact" value={selectedSection.settings?.email || ''} onChange={(e) => updateSectionSetting(selectedSection.id, 'email', e.target.value)} className="w-full p-2 border rounded-lg text-sm" />
                                                    
                                                    <h4 className="text-sm font-bold text-slate-700 mt-4">Réseaux Sociaux (URLs)</h4>
                                                    <input type="text" placeholder="Facebook URL" value={selectedSection.settings?.socialFacebook || ''} onChange={(e) => updateSectionSetting(selectedSection.id, 'socialFacebook', e.target.value)} className="w-full p-2 border rounded-lg text-sm" />
                                                    <input type="text" placeholder="Instagram URL" value={selectedSection.settings?.socialInstagram || ''} onChange={(e) => updateSectionSetting(selectedSection.id, 'socialInstagram', e.target.value)} className="w-full p-2 border rounded-lg text-sm" />
                                                    <input type="text" placeholder="WhatsApp URL ou Numéro" value={selectedSection.settings?.socialWhatsapp || ''} onChange={(e) => updateSectionSetting(selectedSection.id, 'socialWhatsapp', e.target.value)} className="w-full p-2 border rounded-lg text-sm" />
                                                    <input type="text" placeholder="Twitter URL" value={selectedSection.settings?.socialTwitter || ''} onChange={(e) => updateSectionSetting(selectedSection.id, 'socialTwitter', e.target.value)} className="w-full p-2 border rounded-lg text-sm" />
                                                </div>
                                            )}
                                                {/* Variants */}
                                                {getAvailableVariants(selectedSection.type).length > 1 && (
                                                    <div className="pb-4 border-b border-slate-100">
                                                        <label className="block text-sm font-bold text-slate-700 mb-2">Style (Variante)</label>
                                                        <div className="flex gap-2 flex-wrap">
                                                            {getAvailableVariants(selectedSection.type).map(v => (
                                                                <button
                                                                    key={v}
                                                                    onClick={() => updateSection(selectedSection.id, { variant: v })}
                                                                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${selectedSection.variant === v ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
                                                                >
                                                                    {v}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Alignment */}
                                                {selectedSection.settings?.alignment && (
                                                    <div className="pb-4 border-b border-slate-100">
                                                        <label className="block text-sm font-bold text-slate-700 mb-2">Alignement du texte</label>
                                                        <div className="flex bg-white rounded-lg border border-slate-200 p-1">
                                                            <button onClick={() => updateSectionSetting(selectedSection.id, 'alignment', 'left')} className={`flex-1 flex justify-center py-1.5 rounded-md ${selectedSection.settings?.alignment === 'left' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}><AlignLeft size={16} /></button>
                                                            <button onClick={() => updateSectionSetting(selectedSection.id, 'alignment', 'center')} className={`flex-1 flex justify-center py-1.5 rounded-md ${selectedSection.settings?.alignment === 'center' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}><AlignCenter size={16} /></button>
                                                            <button onClick={() => updateSectionSetting(selectedSection.id, 'alignment', 'right')} className={`flex-1 flex justify-center py-1.5 rounded-md ${selectedSection.settings?.alignment === 'right' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}><AlignRight size={16} /></button>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Couleurs & Fond Avancé */}
                                                <div className="pb-4 border-b border-slate-100">
                                                    <label className="block text-sm font-bold text-slate-700 mb-3">Fond & Couleurs</label>
                                                    <div className="flex gap-4 mb-4">
                                                        <div className="flex flex-col items-center">
                                                            <input type="color" value={selectedSection.settings?.textColor || '#000000'} onChange={(e) => updateSectionSetting(selectedSection.id, 'textColor', e.target.value)} className="w-8 h-8 cursor-pointer rounded" />
                                                            <span className="text-[10px] text-slate-500 mt-1">Texte</span>
                                                        </div>
                                                        <div className="flex flex-col items-center">
                                                            <input type="color" value={selectedSection.settings?.backgroundColor || '#ffffff'} onChange={(e) => updateSectionSetting(selectedSection.id, 'backgroundColor', e.target.value)} className="w-8 h-8 cursor-pointer rounded" />
                                                            <span className="text-[10px] text-slate-500 mt-1">Fond 1</span>
                                                        </div>
                                                        {selectedSection.settings?.backgroundGradient && selectedSection.settings.backgroundGradient !== 'none' && (
                                                            <div className="flex flex-col items-center">
                                                                <input type="color" value={selectedSection.settings?.gradientColor2 || '#f8fafc'} onChange={(e) => updateSectionSetting(selectedSection.id, 'gradientColor2', e.target.value)} className="w-8 h-8 cursor-pointer rounded" />
                                                                <span className="text-[10px] text-slate-500 mt-1">Fond 2</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    <select 
                                                        value={selectedSection.settings?.backgroundGradient || 'none'} 
                                                        onChange={(e) => updateSectionSetting(selectedSection.id, 'backgroundGradient', e.target.value)}
                                                        className="w-full p-2 border border-slate-200 rounded-lg text-sm outline-none"
                                                    >
                                                        <option value="none">Uni (Pas de dégradé)</option>
                                                        <option value="linear-to-b">Dégradé Vertical</option>
                                                        <option value="linear-to-r">Dégradé Horizontal</option>
                                                        <option value="linear-to-br">Dégradé Diagonal</option>
                                                        <option value="radial">Dégradé Radial</option>
                                                    </select>
                                                </div>

                                                {/* Style de Boîte (Box Style) */}
                                                <div className="pb-4 border-b border-slate-100">
                                                    <label className="block text-sm font-bold text-slate-700 mb-3">Style du conteneur</label>
                                                    <div className="grid grid-cols-2 gap-2 mb-3">
                                                        <button onClick={() => updateSectionSetting(selectedSection.id, 'boxStyle', 'none')} className={`py-1.5 text-xs font-bold rounded-lg border ${!selectedSection.settings?.boxStyle || selectedSection.settings.boxStyle === 'none' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600'}`}>Pleine largeur</button>
                                                        <button onClick={() => updateSectionSetting(selectedSection.id, 'boxStyle', 'boxed')} className={`py-1.5 text-xs font-bold rounded-lg border ${selectedSection.settings?.boxStyle === 'boxed' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600'}`}>Encart (Boxed)</button>
                                                    </div>
                                                    {selectedSection.settings?.boxStyle === 'boxed' && (
                                                        <div className="space-y-3">
                                                            <div>
                                                                <span className="text-xs text-slate-500 block mb-1">Arrondi (Radius)</span>
                                                                <select value={selectedSection.settings?.borderRadius || 'none'} onChange={(e) => updateSectionSetting(selectedSection.id, 'borderRadius', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-xs outline-none">
                                                                    <option value="none">Carré</option>
                                                                    <option value="rounded">Léger (rounded)</option>
                                                                    <option value="rounded-lg">Moyen (rounded-lg)</option>
                                                                    <option value="pill">Maximum (pill)</option>
                                                                </select>
                                                            </div>
                                                            <div>
                                                                <span className="text-xs text-slate-500 block mb-1">Ombre (Shadow)</span>
                                                                <select value={selectedSection.settings?.shadow || 'none'} onChange={(e) => updateSectionSetting(selectedSection.id, 'shadow', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-xs outline-none">
                                                                    <option value="none">Aucune</option>
                                                                    <option value="sm">Discrète (sm)</option>
                                                                    <option value="md">Moyenne (md)</option>
                                                                    <option value="lg">Prononcée (lg)</option>
                                                                    <option value="glow">Glow (Lueur)</option>
                                                                </select>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Séparateurs (Dividers) */}
                                                <div className="pb-4 border-b border-slate-100">
                                                    <label className="block text-sm font-bold text-slate-700 mb-3">Formes de séparation</label>
                                                    <div className="space-y-3">
                                                        <div>
                                                            <span className="text-xs text-slate-500 block mb-1">Haut de section</span>
                                                            <div className="flex gap-2">
                                                                <select value={selectedSection.settings?.dividerTop || 'none'} onChange={(e) => updateSectionSetting(selectedSection.id, 'dividerTop', e.target.value)} className="flex-1 p-2 border border-slate-200 rounded-lg text-xs outline-none">
                                                                    <option value="none">Droit</option>
                                                                    <option value="wave">Vague</option>
                                                                    <option value="slant">Diagonale</option>
                                                                </select>
                                                                {selectedSection.settings?.dividerTop && selectedSection.settings.dividerTop !== 'none' && (
                                                                    <input type="color" value={selectedSection.settings?.dividerTopColor || '#ffffff'} onChange={(e) => updateSectionSetting(selectedSection.id, 'dividerTopColor', e.target.value)} className="w-8 h-8 rounded shrink-0 cursor-pointer p-0 border-0" />
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <span className="text-xs text-slate-500 block mb-1">Bas de section</span>
                                                            <div className="flex gap-2">
                                                                <select value={selectedSection.settings?.dividerBottom || 'none'} onChange={(e) => updateSectionSetting(selectedSection.id, 'dividerBottom', e.target.value)} className="flex-1 p-2 border border-slate-200 rounded-lg text-xs outline-none">
                                                                    <option value="none">Droit</option>
                                                                    <option value="wave">Vague</option>
                                                                    <option value="slant">Diagonale</option>
                                                                </select>
                                                                {selectedSection.settings?.dividerBottom && selectedSection.settings.dividerBottom !== 'none' && (
                                                                    <input type="color" value={selectedSection.settings?.dividerBottomColor || '#ffffff'} onChange={(e) => updateSectionSetting(selectedSection.id, 'dividerBottomColor', e.target.value)} className="w-8 h-8 rounded shrink-0 cursor-pointer p-0 border-0" />
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Paddings */}
                                                <div className="pt-2">
                                                    <h3 className="block text-sm font-bold text-slate-700 mb-4">Espacements (Padding)</h3>
                                                    <ResponsiveControl
                                                        label="Espace en Haut"
                                                        value={selectedSection.settings?.paddingTop}
                                                        defaultValues={{ desktop: 64, tablet: 48, mobile: 32 }}
                                                        onChange={(val) => updateSectionSetting(selectedSection.id, 'paddingTop', val)}
                                                    />
                                                    <ResponsiveControl
                                                        label="Espace en Bas"
                                                        value={selectedSection.settings?.paddingBottom}
                                                        defaultValues={{ desktop: 64, tablet: 48, mobile: 32 }}
                                                        onChange={(val) => updateSectionSetting(selectedSection.id, 'paddingBottom', val)}
                                                    />
                                                </div>

                                                {/* Animation d'entrée */}
                                                <div className="pt-4 border-t border-slate-100">
                                                    <label className="block text-sm font-bold text-slate-700 mb-2">Animation d'entrée (Framer Motion)</label>
                                                    <select
                                                        value={selectedSection.settings?.entryAnimation || 'none'}
                                                        onChange={(e) => updateSectionSetting(selectedSection.id, 'entryAnimation', e.target.value)}
                                                        className="w-full p-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                                    >
                                                        <option value="none">Aucune</option>
                                                        <option value="fade">Fondu (Fade In)</option>
                                                        <option value="slide-up">Glissement (Slide Up)</option>
                                                        <option value="scale-up">Zoom (Scale Up)</option>
                                                        <option value="stagger">En cascade (Stagger)</option>
                                                    </select>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {/* Action Delete */}
                                    {selectedSectionType === 'page' && (
                                        <div className="pt-6 mt-6 border-t border-slate-200">
                                            <button 
                                                onClick={() => deleteSection(selectedSection.id)}
                                                className="w-full flex items-center justify-center gap-2 text-sm font-bold text-rose-500 hover:text-rose-600 hover:bg-rose-50 px-3 py-2.5 rounded-xl border border-rose-200 transition-colors"
                                            >
                                                <Trash2 size={16} /> Supprimer la section
                                            </button>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* SECTION CATALOG MODAL */}
            <AnimatePresence>
                {showSectionCatalog && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                        className="absolute inset-0 bg-white/95 backdrop-blur-sm z-50 p-6 flex flex-col md:px-20 lg:px-40"
                    >
                        <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200">
                            <h2 className="text-2xl font-black text-slate-900">Ajouter une section</h2>
                            <button onClick={() => setShowSectionCatalog(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={24}/></button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto pb-10">
                            {SECTION_CATALOG.map(item => (
                                <button 
                                    key={item.type} 
                                    onClick={() => addSection(item.type)}
                                    className="flex items-start gap-4 p-5 rounded-2xl bg-white border border-slate-200 hover:border-indigo-500 hover:shadow-xl hover:-translate-y-1 transition-all text-left group"
                                >
                                    <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors flex-shrink-0">
                                        {item.icon}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 mb-1">{item.type}</h3>
                                        <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
        )}
        </>
    );
}
