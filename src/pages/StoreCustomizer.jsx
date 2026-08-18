import React, { useState, useEffect } from 'react';
import { useTenant } from '../context/TenantContext';
import { doc, updateDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db, storage } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Paintbrush, LayoutTemplate, Type, Save, Link as LinkIcon, RefreshCw, Image as ImageIcon, Video, Upload, X, ShoppingBag, ChevronDown, ChevronUp, MessageSquare, Link } from 'lucide-react';
import StorefrontPreview from '../components/storefront/StorefrontPreview';
import Button from '../components/Button';

export default function StoreCustomizer() {
    const { store } = useTenant();
    
    // Default Configuration
    const defaultConfig = {
        subdomain: '',
        primaryColor: '#4f46e5',
        bannerText: 'Livraison gratuite partout au Maroc ! 🇲🇦',
        bannerEnabled: true,
        headerLayout: 'centered',
        heroTitle: 'Découvrez notre nouvelle collection',
        heroSubtitle: 'Des produits de qualité, livrés chez vous en 24h avec paiement à la livraison.',
        facebookPixelId: '',
        typography: { heading: 'Outfit', body: 'Outfit' },
        logoUrl: '',
        faviconUrl: '',
        backgroundType: 'color', // 'color' | 'image' | 'video'
        backgroundMediaUrl: '',
        animationStyle: 'fade', // 'none' | 'fade' | 'slide'
        featuredProductIds: [],
        fomoEnabled: true,
        contactEmail: '',
        contactPhone: '',
        contactAddress: '',
        footerText: '© 2026 Tous droits réservés.',
        socialLinks: { facebook: '', instagram: '', whatsapp: '' }
    };

    const [config, setConfig] = useState(defaultConfig);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [storeProducts, setStoreProducts] = useState([]);
    const [isUploading, setIsUploading] = useState({ logo: false, favicon: false, background: false });
    const [openSection, setOpenSection] = useState('general');

    const handleSocialChange = (network, value) => {
        setConfig(prev => ({
            ...prev,
            socialLinks: { ...(prev.socialLinks || {}), [network]: value }
        }));
        setHasChanges(true);
    };

    useEffect(() => {
        const fetchStorefrontConfig = async () => {
            if (!store?.id) return;
            try {
                // Fetch Storefront Config
                const docRef = doc(db, 'stores', store.id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists() && docSnap.data().storefront) {
                    setConfig({ ...defaultConfig, ...docSnap.data().storefront });
                }

                // Fetch Products
                const q = query(collection(db, "products"), where("storeId", "==", store.id));
                const querySnapshot = await getDocs(q);
                const productsData = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => !p.deleted);
                setStoreProducts(productsData);
                
            } catch (error) {
                console.error("Error fetching storefront data:", error);
                toast.error("Erreur de chargement des données.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchStorefrontConfig();
    }, [store?.id]);

    const handleFileUpload = async (file, type) => {
        if (!store?.id || !file) return;
        setIsUploading(prev => ({ ...prev, [type]: true }));
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${type}_${Date.now()}.${fileExt}`;
            const storageRef = ref(storage, `stores/${store.id}/storefront/${fileName}`);
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);
            
            if (type === 'logo') handleChange('logoUrl', url);
            else if (type === 'favicon') handleChange('faviconUrl', url);
            else if (type === 'background') handleChange('backgroundMediaUrl', url);
            
            toast.success("Fichier uploadé avec succès !");
        } catch (error) {
            console.error("Error uploading file:", error);
            toast.error("Erreur lors de l'upload.");
        } finally {
            setIsUploading(prev => ({ ...prev, [type]: false }));
        }
    };

    const handleChange = (field, value) => {
        setConfig(prev => ({ ...prev, [field]: value }));
        setHasChanges(true);
    };

    const handleSave = async () => {
        if (!store?.id) return;
        setIsSaving(true);
        try {
            await updateDoc(doc(db, 'stores', store.id), {
                storefront: config
            });
            setHasChanges(false);
            toast.success("Design sauvegardé avec succès !");
        } catch (error) {
            console.error("Error saving storefront config:", error);
            toast.error("Erreur lors de la sauvegarde.");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-6rem)]">
                <RefreshCw className="animate-spin text-indigo-500" size={32} />
            </div>
        );
    }

    // Pre-defined color palettes
    const presetColors = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#14b8a6', '#0f172a'];

    const Section = ({ id, title, icon: Icon, children }) => (
        <div className="border-b border-slate-100 last:border-0 bg-white">
            <button 
                onClick={() => setOpenSection(openSection === id ? null : id)}
                className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors"
            >
                <div className="flex items-center gap-3 text-slate-900 font-bold text-sm uppercase tracking-wider">
                    <div className="p-1.5 bg-slate-100 rounded-lg text-slate-500">
                        <Icon size={16} />
                    </div>
                    {title}
                </div>
                {openSection === id ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
            </button>
            <AnimatePresence>
                {openSection === id && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden bg-slate-50/30"
                    >
                        <div className="p-5 pt-0 space-y-6">
                            {children}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );

    return (
        <div className="h-[calc(100vh-6rem)] -m-4 md:-m-8 bg-slate-50 flex flex-col md:flex-row overflow-hidden">
            {/* Left Panel: Settings */}
            <div className="w-full md:w-[450px] lg:w-[500px] flex-shrink-0 bg-white border-r border-slate-200 overflow-y-auto flex flex-col z-10 shadow-xl">
                <div className="p-6 border-b border-slate-100 bg-white sticky top-0 z-20 flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
                            <Paintbrush className="text-indigo-600" size={24} />
                            StoreBuilder
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">Personnalisation complète Shopify-like.</p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {/* SECTION: GENERAL */}
                    <Section id="general" title="Paramètres Généraux" icon={Paintbrush}>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Sous-domaine</label>
                            <div className="flex shadow-sm rounded-xl overflow-hidden border border-slate-300 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-all">
                                <span className="inline-flex items-center px-4 bg-slate-50 text-slate-500 text-sm border-r border-slate-300 font-mono">
                                    https://
                                </span>
                                <input
                                    type="text"
                                    value={config.subdomain}
                                    onChange={(e) => handleChange('subdomain', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                    className="flex-1 block w-full min-w-0 px-3 py-2.5 sm:text-sm border-none focus:ring-0 outline-none font-mono"
                                    placeholder="ma-boutique"
                                />
                                <span className="inline-flex items-center px-4 bg-slate-50 text-slate-500 text-sm border-l border-slate-300 font-mono">
                                    .bayiin.com
                                </span>
                            </div>
                            <p className="mt-1.5 text-xs text-slate-500">Uniquement des lettres minuscules, chiffres et tirets.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Couleur Primaire</label>
                            <div className="flex items-center gap-4">
                                <div className="relative w-12 h-12 rounded-xl overflow-hidden shadow-sm border border-slate-200 cursor-pointer group shrink-0">
                                    <input 
                                        type="color" 
                                        value={config.primaryColor}
                                        onChange={(e) => handleChange('primaryColor', e.target.value)}
                                        className="absolute inset-[-10px] w-20 h-20 cursor-pointer opacity-0"
                                    />
                                    <div className="w-full h-full" style={{ backgroundColor: config.primaryColor }}></div>
                                </div>
                                <div className="flex flex-wrap gap-2 flex-1">
                                    {presetColors.map(color => (
                                        <button
                                            key={color}
                                            onClick={() => handleChange('primaryColor', color)}
                                            className={`w-8 h-8 rounded-full border-2 transition-all ${config.primaryColor === color ? 'border-slate-900 scale-110 shadow-md' : 'border-transparent hover:scale-110'}`}
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Police des Titres</label>
                                <select 
                                    value={config.typography?.heading || 'Outfit'} 
                                    onChange={(e) => handleChange('typography', { ...config.typography, heading: e.target.value })}
                                    className="block w-full px-3 py-2.5 border border-slate-300 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-700"
                                >
                                    <option value="Outfit">Outfit</option>
                                    <option value="Inter">Inter</option>
                                    <option value="Poppins">Poppins</option>
                                    <option value="Montserrat">Montserrat</option>
                                    <option value="Cairo">Cairo (Arabic)</option>
                                    <option value="Tajawal">Tajawal (Arabic)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Police du Texte</label>
                                <select 
                                    value={config.typography?.body || 'Outfit'} 
                                    onChange={(e) => handleChange('typography', { ...config.typography, body: e.target.value })}
                                    className="block w-full px-3 py-2.5 border border-slate-300 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-700"
                                >
                                    <option value="Outfit">Outfit</option>
                                    <option value="Inter">Inter</option>
                                    <option value="Poppins">Poppins</option>
                                    <option value="Montserrat">Montserrat</option>
                                    <option value="Cairo">Cairo (Arabic)</option>
                                    <option value="Tajawal">Tajawal (Arabic)</option>
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="border border-slate-200 rounded-xl p-4 flex flex-col items-center text-center relative overflow-hidden bg-white">
                                {config.logoUrl ? (
                                    <>
                                        <img src={config.logoUrl} alt="Logo" className="h-12 object-contain mb-2" />
                                        <button onClick={() => handleChange('logoUrl', '')} className="absolute top-2 right-2 p-1 bg-white rounded-full shadow hover:bg-slate-50"><X size={14}/></button>
                                    </>
                                ) : (
                                    <>
                                        <ImageIcon className="w-8 h-8 text-slate-300 mb-2" />
                                        <span className="text-xs font-medium text-slate-500">Logo principal</span>
                                    </>
                                )}
                                <label className="mt-3 bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer hover:bg-indigo-100 transition-colors inline-block w-full text-center">
                                    {isUploading.logo ? <RefreshCw className="animate-spin w-4 h-4 mx-auto" /> : 'Uploader'}
                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e.target.files[0], 'logo')} disabled={isUploading.logo} />
                                </label>
                            </div>
                            <div className="border border-slate-200 rounded-xl p-4 flex flex-col items-center text-center relative overflow-hidden bg-white">
                                {config.faviconUrl ? (
                                    <>
                                        <img src={config.faviconUrl} alt="Favicon" className="w-8 h-8 object-contain mb-2" />
                                        <button onClick={() => handleChange('faviconUrl', '')} className="absolute top-2 right-2 p-1 bg-white rounded-full shadow hover:bg-slate-50"><X size={14}/></button>
                                    </>
                                ) : (
                                    <>
                                        <LayoutTemplate className="w-8 h-8 text-slate-300 mb-2" />
                                        <span className="text-xs font-medium text-slate-500">Favicon (Onglet)</span>
                                    </>
                                )}
                                <label className="mt-3 bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer hover:bg-indigo-100 transition-colors inline-block w-full text-center">
                                    {isUploading.favicon ? <RefreshCw className="animate-spin w-4 h-4 mx-auto" /> : 'Uploader'}
                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e.target.files[0], 'favicon')} disabled={isUploading.favicon} />
                                </label>
                            </div>
                        </div>
                    </Section>

                    {/* SECTION: EN-TETE */}
                    <Section id="header" title="En-tête & Annonce" icon={LayoutTemplate}>
                        <div className="flex items-center justify-between mb-4">
                            <label className="text-sm font-bold text-slate-700">Barre d'annonce (Haut)</label>
                            <button 
                                onClick={() => handleChange('bannerEnabled', !config.bannerEnabled)}
                                className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 ${config.bannerEnabled ? 'bg-indigo-600' : 'bg-slate-200'}`}
                            >
                                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${config.bannerEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                        </div>
                        <AnimatePresence>
                            {config.bannerEnabled && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden"
                                >
                                    <input
                                        type="text"
                                        value={config.bannerText}
                                        onChange={(e) => handleChange('bannerText', e.target.value)}
                                        className="block w-full px-3 py-2.5 border border-slate-300 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm outline-none transition-all"
                                        placeholder="Ex: Livraison gratuite aujourd'hui !"
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => handleChange('headerLayout', 'left-aligned')}
                                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${config.headerLayout === 'left-aligned' ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 hover:border-slate-300 bg-white'}`}
                            >
                                <div className="w-full h-8 bg-slate-100 rounded mb-2 flex items-center px-2">
                                    <div className="w-4 h-4 rounded-full bg-slate-300"></div>
                                    <div className="w-8 h-2 rounded bg-slate-300 ml-auto"></div>
                                </div>
                                <span className="text-xs font-bold text-slate-700">Aligné à gauche</span>
                            </button>
                            <button
                                onClick={() => handleChange('headerLayout', 'centered')}
                                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${config.headerLayout === 'centered' ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 hover:border-slate-300 bg-white'}`}
                            >
                                <div className="w-full h-8 bg-slate-100 rounded mb-2 flex items-center justify-center relative">
                                    <div className="w-4 h-4 rounded-full bg-slate-300"></div>
                                    <div className="w-8 h-2 rounded bg-slate-300 absolute right-2"></div>
                                </div>
                                <span className="text-xs font-bold text-slate-700">Centré</span>
                            </button>
                        </div>
                    </Section>

                    {/* SECTION: HERO / ACCUEIL */}
                    <Section id="hero" title="Accueil (Section Héro)" icon={ImageIcon}>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Titre Principal</label>
                            <input
                                type="text"
                                value={config.heroTitle}
                                onChange={(e) => handleChange('heroTitle', e.target.value)}
                                className="block w-full px-3 py-2.5 border border-slate-300 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm outline-none transition-all"
                                placeholder="Titre percutant"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Sous-titre / Description</label>
                            <textarea
                                value={config.heroSubtitle}
                                onChange={(e) => handleChange('heroSubtitle', e.target.value)}
                                rows={3}
                                className="block w-full px-3 py-2.5 border border-slate-300 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm outline-none transition-all resize-none"
                                placeholder="Texte d'accompagnement orienté conversion..."
                            />
                        </div>

                        <div className="space-y-3 pt-4 border-t border-slate-100">
                            <label className="block text-sm font-medium text-slate-700">Type de fond</label>
                            <div className="flex gap-2">
                                {['color', 'image', 'video'].map(type => (
                                    <button 
                                        key={type}
                                        onClick={() => handleChange('backgroundType', type)}
                                        className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg border-2 transition-all capitalize ${config.backgroundType === type ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600 hover:border-slate-300 bg-white'}`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>

                            {config.backgroundType === 'image' && (
                                <div className="border border-slate-200 rounded-xl p-4 text-center bg-white">
                                    <label className="inline-flex items-center justify-center gap-2 bg-indigo-50 text-indigo-600 px-4 py-3 rounded-lg text-sm font-bold cursor-pointer hover:bg-indigo-100 transition-colors w-full">
                                        {isUploading.background ? <RefreshCw className="animate-spin w-4 h-4" /> : <Upload size={16} />}
                                        {isUploading.background ? 'Upload en cours...' : 'Uploader une image'}
                                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e.target.files[0], 'background')} disabled={isUploading.background} />
                                    </label>
                                    {config.backgroundMediaUrl && <p className="text-xs text-emerald-600 mt-2 font-medium break-all">Image chargée.</p>}
                                </div>
                            )}

                            {config.backgroundType === 'video' && (
                                <div className="space-y-2">
                                    <input
                                        type="url"
                                        value={config.backgroundMediaUrl}
                                        onChange={(e) => handleChange('backgroundMediaUrl', e.target.value)}
                                        placeholder="Lien vidéo direct (.mp4)"
                                        className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                    <label className="flex items-center justify-center gap-2 bg-indigo-50 text-indigo-600 px-4 py-2 rounded-lg text-xs font-bold cursor-pointer hover:bg-indigo-100 transition-colors">
                                        {isUploading.background ? <RefreshCw className="animate-spin w-4 h-4" /> : 'Ou uploader (max 10Mo)'}
                                        <input type="file" className="hidden" accept="video/*" onChange={(e) => handleFileUpload(e.target.files[0], 'background')} disabled={isUploading.background} />
                                    </label>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Style d'animation</label>
                            <select 
                                value={config.animationStyle} 
                                onChange={(e) => handleChange('animationStyle', e.target.value)}
                                className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-700"
                            >
                                <option value="none">Aucune</option>
                                <option value="fade">Fondu (Fade In)</option>
                                <option value="slide">Glissement (Slide Up)</option>
                                <option value="spring">Rebond (Spring)</option>
                            </select>
                        </div>
                        
                        <div className="space-y-2 pt-4 border-t border-slate-100">
                            <label className="block text-sm font-medium text-slate-700">Produits en Vedette</label>
                            {storeProducts.length === 0 ? (
                                <p className="text-xs text-slate-500 italic">Aucun produit dans le catalogue.</p>
                            ) : (
                                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto bg-white custom-scrollbar">
                                    {storeProducts.map(p => {
                                        const isSelected = config.featuredProductIds?.includes(p.id);
                                        return (
                                            <label key={p.id} className="flex items-center gap-3 p-3 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors">
                                                <input 
                                                    type="checkbox" 
                                                    checked={isSelected || false}
                                                    onChange={(e) => {
                                                        const currentIds = config.featuredProductIds || [];
                                                        const newIds = e.target.checked ? [...currentIds, p.id] : currentIds.filter(id => id !== p.id);
                                                        handleChange('featuredProductIds', newIds);
                                                    }}
                                                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                                                />
                                                {p.photoUrl ? (
                                                    <img src={p.photoUrl} alt="" className="w-10 h-10 rounded-lg object-cover bg-slate-100 border border-slate-200" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center">
                                                        <ShoppingBag size={16} className="text-slate-300" />
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-slate-900 truncate">{p.name}</p>
                                                    <p className="text-xs text-indigo-600 font-bold">{p.price} DH</p>
                                                </div>
                                            </label>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </Section>

                    {/* SECTION: PAGE PRODUIT */}
                    <Section id="product" title="Page Produit" icon={ShoppingBag}>
                        <div className="flex items-center justify-between">
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Compteur de Vues (FOMO)</label>
                                <p className="text-xs text-slate-500">Affiche "X personnes regardent cet article"</p>
                            </div>
                            <button 
                                onClick={() => handleChange('fomoEnabled', !config.fomoEnabled)}
                                className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 ${config.fomoEnabled ? 'bg-indigo-600' : 'bg-slate-200'}`}
                            >
                                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${config.fomoEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                        </div>
                    </Section>

                    {/* SECTION: PIED DE PAGE */}
                    <Section id="footer" title="Pied de Page (Footer)" icon={LayoutTemplate}>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Texte du Copyright</label>
                            <input
                                type="text"
                                value={config.footerText}
                                onChange={(e) => handleChange('footerText', e.target.value)}
                                className="block w-full px-3 py-2.5 border border-slate-300 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm outline-none transition-all"
                            />
                        </div>
                        <div className="space-y-3 pt-4 border-t border-slate-100">
                            <label className="block text-sm font-medium text-slate-700">Réseaux Sociaux</label>
                            <div className="flex items-center shadow-sm rounded-xl overflow-hidden border border-slate-300 focus-within:ring-2 focus-within:ring-indigo-500 transition-all bg-white">
                                <span className="px-3 text-slate-400 border-r border-slate-200 w-24 text-xs font-bold">Facebook</span>
                                <input type="url" value={config.socialLinks?.facebook || ''} onChange={(e) => handleSocialChange('facebook', e.target.value)} className="flex-1 px-3 py-2 text-sm border-none focus:ring-0 outline-none" placeholder="https://facebook.com/..." />
                            </div>
                            <div className="flex items-center shadow-sm rounded-xl overflow-hidden border border-slate-300 focus-within:ring-2 focus-within:ring-indigo-500 transition-all bg-white">
                                <span className="px-3 text-slate-400 border-r border-slate-200 w-24 text-xs font-bold">Instagram</span>
                                <input type="url" value={config.socialLinks?.instagram || ''} onChange={(e) => handleSocialChange('instagram', e.target.value)} className="flex-1 px-3 py-2 text-sm border-none focus:ring-0 outline-none" placeholder="https://instagram.com/..." />
                            </div>
                            <div className="flex items-center shadow-sm rounded-xl overflow-hidden border border-slate-300 focus-within:ring-2 focus-within:ring-indigo-500 transition-all bg-white">
                                <span className="px-3 text-slate-400 border-r border-slate-200 w-24 text-xs font-bold">WhatsApp</span>
                                <input type="tel" value={config.socialLinks?.whatsapp || ''} onChange={(e) => handleSocialChange('whatsapp', e.target.value)} className="flex-1 px-3 py-2 text-sm border-none focus:ring-0 outline-none" placeholder="+212..." />
                            </div>
                        </div>
                    </Section>

                    {/* SECTION: PAGE CONTACT */}
                    <Section id="contact" title="Page Contact" icon={MessageSquare}>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email de Support</label>
                                <input type="email" value={config.contactEmail} onChange={(e) => handleChange('contactEmail', e.target.value)} className="block w-full px-3 py-2.5 border border-slate-300 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 sm:text-sm outline-none" placeholder="contact@maboutique.com" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Téléphone</label>
                                <input type="tel" value={config.contactPhone} onChange={(e) => handleChange('contactPhone', e.target.value)} className="block w-full px-3 py-2.5 border border-slate-300 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 sm:text-sm outline-none" placeholder="+212 6 00 00 00 00" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Adresse Physique (Optionnel)</label>
                                <textarea value={config.contactAddress} onChange={(e) => handleChange('contactAddress', e.target.value)} rows={2} className="block w-full px-3 py-2.5 border border-slate-300 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 sm:text-sm outline-none resize-none" placeholder="123 Rue de la Boutique, Casablanca" />
                            </div>
                            <p className="text-xs text-slate-500 italic mt-2">Les messages envoyés depuis le formulaire seront stockés dans votre espace de Tickets Support.</p>
                        </div>
                    </Section>
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-slate-200 bg-white sticky bottom-0 z-20">
                    <Button 
                        onClick={handleSave} 
                        isLoading={isSaving} 
                        disabled={!hasChanges}
                        className="w-full py-3 text-sm font-bold"
                        icon={Save}
                    >
                        {hasChanges ? "Sauvegarder les modifications" : "Aucune modification"}
                    </Button>
                </div>
            </div>

            {/* Right Panel: Live Preview */}
            <div className="flex-1 bg-slate-100 p-4 md:p-8 flex items-center justify-center overflow-hidden relative">
                {/* Background Pattern */}
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay"></div>
                
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1, duration: 0.4, type: "spring" }}
                    className="w-full max-w-[1200px] h-full max-h-[850px] relative z-10 flex flex-col"
                >
                    <div className="bg-slate-800 text-slate-400 py-2 px-4 rounded-t-2xl flex items-center gap-2 text-xs font-mono select-none">
                        <div className="flex gap-1.5 mr-4">
                            <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                        </div>
                        <span className="flex-1 text-center opacity-50 flex items-center justify-center gap-1">
                            🔒 {config.subdomain ? `${config.subdomain}.bayiin.com` : 'votre-boutique.bayiin.com'}
                        </span>
                    </div>
                    <div className="flex-1 overflow-hidden rounded-b-2xl shadow-2xl relative">
                        <StorefrontPreview config={config} storeName={store?.name} products={storeProducts} storeId={store?.id} />
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
