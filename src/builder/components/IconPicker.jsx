import React, { useState, useEffect } from 'react';
import { Search, ChevronDown, ChevronUp, X, Upload, Star, Clock } from 'lucide-react';
import DynamicIcon from './DynamicIcon';
import { LUCIDE_ICON_CATEGORIES, EMOJI_CATEGORIES } from './iconData';
import { storage } from '../../lib/firebase';
import { ref, uploadBytes, getDownloadURL, listAll } from 'firebase/storage';
import { useTenant } from '../../context/TenantContext';

export default function IconPicker({ value, onChange }) {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('lucide'); // 'lucide' | 'emoji' | 'custom'
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategory, setActiveCategory] = useState(null);
    const { tenant } = useTenant();
    
    const storeId = tenant?.id || 'default-store';

    // Récents
    const [recentIcons, setRecentIcons] = useState(() => {
        const saved = localStorage.getItem('bayiin_recent_icons');
        return saved ? JSON.parse(saved) : [];
    });

    // Custom Uploads
    const [customIcons, setCustomIcons] = useState([]);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        if (isOpen && activeTab === 'custom') {
            fetchCustomIcons();
        }
    }, [isOpen, activeTab]);

    const fetchCustomIcons = async () => {
        try {
            const listRef = ref(storage, `stores/${storeId}/icons`);
            const res = await listAll(listRef);
            const urls = await Promise.all(res.items.map(itemRef => getDownloadURL(itemRef)));
            setCustomIcons(urls);
        } catch (error) {
            console.error("Error fetching custom icons:", error);
        }
    };

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Limite 100KB
        if (file.size > 100 * 1024) {
            alert("Le fichier est trop volumineux (max 100KB).");
            return;
        }

        setIsUploading(true);
        try {
            const ext = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
            const fileRef = ref(storage, `stores/${storeId}/icons/${fileName}`);
            await uploadBytes(fileRef, file);
            const url = await getDownloadURL(fileRef);
            setCustomIcons([...customIcons, url]);
            handleSelectIcon({ type: 'custom', value: url });
        } catch (error) {
            console.error("Error uploading file:", error);
            alert("Erreur lors de l'upload");
        } finally {
            setIsUploading(false);
        }
    };

    const addToRecents = (iconObj) => {
        const newRecents = [iconObj, ...recentIcons.filter(i => i.value !== iconObj.value)].slice(0, 5);
        setRecentIcons(newRecents);
        localStorage.setItem('bayiin_recent_icons', JSON.stringify(newRecents));
    };

    const handleSelectIcon = (iconObj) => {
        const updatedValue = { ...value, ...iconObj, type: iconObj.type };
        onChange(updatedValue);
        addToRecents(iconObj);
    };

    const updateStyle = (key, val) => {
        onChange({ ...value, [key]: val });
    };

    const updateBackground = (key, val) => {
        const currentBg = value?.background || { enabled: false, shape: 'circle', padding: 12, color: '#f1f5f9' };
        onChange({ ...value, background: { ...currentBg, [key]: val } });
    };

    const getFilteredIcons = (categories) => {
        let allIcons = [];
        if (activeCategory) {
            allIcons = categories[activeCategory] || [];
        } else {
            Object.values(categories).forEach(arr => allIcons = [...allIcons, ...arr]);
            allIcons = [...new Set(allIcons)];
        }

        if (!searchTerm) return allIcons;
        return allIcons.filter(name => name.toLowerCase().includes(searchTerm.toLowerCase()));
    };

    const renderLucideTab = () => {
        const icons = getFilteredIcons(LUCIDE_ICON_CATEGORIES);
        return (
            <div className="flex-1 flex flex-col min-h-0">
                <div className="flex overflow-x-auto gap-2 pb-2 mb-2 custom-scrollbar">
                    <button 
                        className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${!activeCategory ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}
                        onClick={() => setActiveCategory(null)}
                    >
                        Tous
                    </button>
                    {Object.keys(LUCIDE_ICON_CATEGORIES).map(cat => (
                        <button 
                            key={cat}
                            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${activeCategory === cat ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                            onClick={() => setActiveCategory(cat)}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
                <div className="grid grid-cols-8 gap-2 overflow-y-auto min-h-0 flex-1 custom-scrollbar p-1">
                    {icons.map(name => (
                        <button
                            key={name}
                            title={name}
                            onClick={() => handleSelectIcon({ type: 'lucide', value: name })}
                            className={`p-2 rounded-lg flex items-center justify-center transition-all hover:bg-slate-100 ${value?.value === name ? 'bg-indigo-50 ring-2 ring-indigo-500 text-indigo-600' : 'text-slate-600'}`}
                        >
                            <DynamicIcon icon={{ type: 'lucide', value: name }} size={24} />
                        </button>
                    ))}
                </div>
            </div>
        );
    };

    const renderEmojiTab = () => {
        const emojis = getFilteredIcons(EMOJI_CATEGORIES);
        return (
            <div className="flex-1 flex flex-col min-h-0">
                <div className="flex overflow-x-auto gap-2 pb-2 mb-2 custom-scrollbar">
                    <button 
                        className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${!activeCategory ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}
                        onClick={() => setActiveCategory(null)}
                    >
                        Tous
                    </button>
                    {Object.keys(EMOJI_CATEGORIES).map(cat => (
                        <button 
                            key={cat}
                            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${activeCategory === cat ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                            onClick={() => setActiveCategory(cat)}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
                <div className="grid grid-cols-10 gap-2 overflow-y-auto min-h-0 flex-1 custom-scrollbar p-1">
                    {emojis.map(emoji => (
                        <button
                            key={emoji}
                            title={emoji}
                            onClick={() => handleSelectIcon({ type: 'emoji', value: emoji })}
                            className={`text-2xl p-1 rounded-lg flex items-center justify-center transition-transform hover:scale-125 ${value?.value === emoji ? 'bg-indigo-50 ring-2 ring-indigo-500' : 'hover:bg-slate-100'}`}
                        >
                            {emoji}
                        </button>
                    ))}
                </div>
            </div>
        );
    };

    const renderCustomTab = () => {
        return (
            <div className="flex-1 flex flex-col min-h-0">
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center bg-slate-50 mb-4 hover:border-indigo-400 hover:bg-indigo-50 transition-colors relative">
                    <input 
                        type="file" 
                        accept="image/svg+xml,image/png,image/webp" 
                        onChange={handleUpload}
                        disabled={isUploading}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                    />
                    <Upload size={24} className="text-indigo-500 mb-2" />
                    <span className="text-sm font-medium text-slate-700">{isUploading ? 'Upload en cours...' : 'Cliquez pour uploader'}</span>
                    <span className="text-xs text-slate-500 mt-1">SVG, PNG, WEBP (Max 100KB)</span>
                </div>
                <div className="grid grid-cols-5 gap-3 overflow-y-auto flex-1 custom-scrollbar">
                    {customIcons.map(url => (
                        <button
                            key={url}
                            onClick={() => handleSelectIcon({ type: 'custom', value: url })}
                            className={`aspect-square rounded-lg border flex items-center justify-center overflow-hidden transition-all ${value?.value === url ? 'border-indigo-500 ring-2 ring-indigo-500' : 'border-slate-200 hover:border-slate-300'}`}
                        >
                            <img src={url} alt="custom" className="w-8 h-8 object-contain" />
                        </button>
                    ))}
                    {customIcons.length === 0 && !isUploading && (
                        <div className="col-span-5 text-center text-sm text-slate-400 py-4">
                            Aucune icône uploadée pour le moment.
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-3 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <DynamicIcon icon={value} size={24} />
                    <span className="text-sm font-medium text-slate-700 truncate max-w-[120px]">
                        {value?.value || 'Sélectionner...'}
                    </span>
                </div>
                {isOpen ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm" onClick={() => setIsOpen(false)}>
                    <div 
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex overflow-hidden flex-col md:flex-row"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Main Left Panel */}
                        <div className="flex-1 flex flex-col border-r border-slate-200">
                            {/* Header / Tabs */}
                            <div className="p-4 border-b border-slate-100">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-bold text-slate-800">Sélecteur d'icônes</h3>
                                    <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">
                                        <X size={20} />
                                    </button>
                                </div>
                                <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                                    <button onClick={() => { setActiveTab('lucide'); setActiveCategory(null); }} className={`flex-1 text-sm font-medium py-1.5 rounded-md transition-colors ${activeTab === 'lucide' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>Lucide (300+)</button>
                                    <button onClick={() => { setActiveTab('emoji'); setActiveCategory(null); }} className={`flex-1 text-sm font-medium py-1.5 rounded-md transition-colors ${activeTab === 'emoji' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>Emojis</button>
                                    <button onClick={() => setActiveTab('custom')} className={`flex-1 text-sm font-medium py-1.5 rounded-md transition-colors ${activeTab === 'custom' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>Upload</button>
                                </div>
                            </div>
                            
                            {/* Search (if not custom tab) */}
                            {activeTab !== 'custom' && (
                                <div className="px-4 py-3 border-b border-slate-100 relative">
                                    <Search size={16} className="absolute left-7 top-5 text-slate-400" />
                                    <input 
                                        type="text" 
                                        placeholder="Chercher une icône..." 
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                            )}

                            {/* Content */}
                            <div className="flex-1 overflow-hidden flex flex-col p-4 bg-white">
                                {activeTab === 'lucide' && renderLucideTab()}
                                {activeTab === 'emoji' && renderEmojiTab()}
                                {activeTab === 'custom' && renderCustomTab()}
                            </div>
                        </div>

                        {/* Right Preview Panel */}
                        <div className="w-80 bg-slate-50 flex flex-col">
                            <div className="p-6 border-b border-slate-200 flex flex-col items-center justify-center min-h-[200px] bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px]">
                                <DynamicIcon icon={value} size={value?.size || 48} />
                            </div>
                            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6">
                                {/* Recents */}
                                {recentIcons.length > 0 && (
                                    <div>
                                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1"><Clock size={12}/> Récents</div>
                                        <div className="flex gap-2">
                                            {recentIcons.map((ri, i) => (
                                                <button key={i} onClick={() => handleSelectIcon(ri)} className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:border-indigo-400 transition-colors">
                                                    <DynamicIcon icon={ri} size={20} />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Taille de l'icône ({value?.size || 24}px)</label>
                                    <input 
                                        type="range" min="16" max="64" step="4" 
                                        value={value?.size || 24} 
                                        onChange={(e) => updateStyle('size', parseInt(e.target.value))}
                                        className="w-full accent-indigo-600" 
                                    />
                                    <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                                        <span>16px</span><span>64px</span>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Couleur</label>
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="color" 
                                            value={value?.color && value.color.startsWith('#') ? value.color : '#000000'} 
                                            onChange={(e) => updateStyle('color', e.target.value)}
                                            className="w-8 h-8 rounded cursor-pointer"
                                        />
                                        <div className="flex gap-1 flex-1">
                                            <button onClick={() => updateStyle('color', 'primary')} className="flex-1 py-1 text-xs border border-slate-200 rounded hover:bg-slate-100">Primary</button>
                                            <button onClick={() => updateStyle('color', 'secondary')} className="flex-1 py-1 text-xs border border-slate-200 rounded hover:bg-slate-100">Secondary</button>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                                        Arrière-plan
                                        <input 
                                            type="checkbox" 
                                            checked={value?.background?.enabled || false}
                                            onChange={(e) => updateBackground('enabled', e.target.checked)}
                                            className="accent-indigo-600"
                                        />
                                    </label>
                                    {value?.background?.enabled && (
                                        <div className="space-y-3 mt-3 p-3 bg-white border border-slate-200 rounded-xl">
                                            <div className="flex gap-2">
                                                <button onClick={() => updateBackground('shape', 'circle')} className={`flex-1 py-1 text-xs border rounded ${value?.background?.shape === 'circle' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'hover:bg-slate-50'}`}>Cercle</button>
                                                <button onClick={() => updateBackground('shape', 'rounded')} className={`flex-1 py-1 text-xs border rounded ${value?.background?.shape === 'rounded' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'hover:bg-slate-50'}`}>Arrondi</button>
                                                <button onClick={() => updateBackground('shape', 'square')} className={`flex-1 py-1 text-xs border rounded ${value?.background?.shape === 'square' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'hover:bg-slate-50'}`}>Carré</button>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    type="color" 
                                                    value={value?.background?.color || '#f1f5f9'}
                                                    onChange={(e) => updateBackground('color', e.target.value)}
                                                    className="w-6 h-6 rounded cursor-pointer"
                                                />
                                                <span className="text-xs text-slate-500">Couleur de fond</span>
                                            </div>
                                            <div>
                                                <div className="flex justify-between text-xs text-slate-500 mb-1">
                                                    <span>Marge interne</span>
                                                    <span>{value?.background?.padding || 12}px</span>
                                                </div>
                                                <input 
                                                    type="range" min="4" max="32" step="2"
                                                    value={value?.background?.padding || 12}
                                                    onChange={(e) => updateBackground('padding', parseInt(e.target.value))}
                                                    className="w-full accent-indigo-600"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="p-4 bg-white border-t border-slate-200">
                                <button onClick={() => setIsOpen(false)} className="w-full py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors">
                                    Valider l'icône
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
