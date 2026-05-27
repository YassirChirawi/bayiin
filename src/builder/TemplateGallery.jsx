import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, ChevronRight, Sparkles, Star, Layout } from 'lucide-react';
import { TEMPLATES, applyTemplate } from './templates';

const CATEGORY_COLORS = {
    Mode: { bg: '#0a0a0a', accent: '#c9a96e', light: '#f5f0e8' },
    Tech: { bg: '#0f172a', accent: '#0ea5e9', light: '#f0f9ff' },
    Beauté: { bg: '#be185d', accent: '#f9a8d4', light: '#fdf2f8' },
    Food: { bg: '#431407', accent: '#ea580c', light: '#fff7ed' },
    Généraliste: { bg: '#7c3aed', accent: '#06b6d4', light: '#f5f3ff' },
};

function TemplateCard({ template, onSelect, isSelected }) {
    const colors = CATEGORY_COLORS[template.category] || CATEGORY_COLORS['Généraliste'];

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            whileHover={{ y: -4 }}
            transition={{ duration: 0.3 }}
            onClick={() => onSelect(template)}
            className={`relative cursor-pointer rounded-3xl overflow-hidden border-2 transition-all duration-300 shadow-lg hover:shadow-2xl group ${
                isSelected
                    ? 'border-indigo-500 shadow-indigo-200'
                    : 'border-transparent hover:border-slate-200'
            }`}
        >
            {/* Preview Header — mini vitrine */}
            <div
                className="h-48 relative overflow-hidden flex flex-col"
                style={{ background: template.gradient }}
            >
                {/* Fake browser dots */}
                <div className="flex gap-1.5 p-3 pb-0">
                    <div className="w-2.5 h-2.5 rounded-full bg-white/30" />
                    <div className="w-2.5 h-2.5 rounded-full bg-white/30" />
                    <div className="w-2.5 h-2.5 rounded-full bg-white/30" />
                </div>

                {/* Mini storefront preview */}
                <div className="flex-1 px-4 pt-2 pb-4 flex flex-col justify-between">
                    {/* Fake nav */}
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-16 h-2.5 rounded-full bg-white/50" />
                        <div className="flex gap-2">
                            <div className="w-8 h-1.5 rounded-full bg-white/30" />
                            <div className="w-8 h-1.5 rounded-full bg-white/30" />
                            <div className="w-8 h-1.5 rounded-full bg-white/30" />
                        </div>
                    </div>

                    {/* Fake hero */}
                    <div className="mb-3">
                        <div className="w-3/4 h-3 rounded-full bg-white/70 mb-1.5" />
                        <div className="w-1/2 h-2 rounded-full bg-white/40 mb-3" />
                        <div className="w-20 h-5 rounded-lg bg-white/80 flex items-center justify-center">
                            <div className="w-12 h-1.5 rounded-full bg-slate-400/80" />
                        </div>
                    </div>

                    {/* Fake product grid */}
                    <div className="grid grid-cols-3 gap-1.5">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="rounded-lg bg-white/20 h-10 backdrop-blur-sm" />
                        ))}
                    </div>
                </div>

                {/* Selected overlay */}
                <AnimatePresence>
                    {isSelected && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-indigo-600/20 flex items-center justify-center"
                        >
                            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-xl">
                                <Check size={24} className="text-indigo-600" />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Emoji badge */}
                <div className="absolute top-3 right-3 w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-lg">
                    {template.emoji}
                </div>
            </div>

            {/* Card Body */}
            <div className="bg-white p-5">
                {/* Header row */}
                <div className="flex items-start justify-between mb-2">
                    <div>
                        <h3 className="font-black text-lg text-slate-900 leading-none tracking-tight">
                            {template.name}
                        </h3>
                        <p className="text-xs font-bold text-slate-400 mt-0.5">{template.tagline}</p>
                    </div>
                    <span
                        className="text-xs font-black px-2.5 py-1 rounded-full"
                        style={{ backgroundColor: colors.light, color: colors.bg }}
                    >
                        {template.category}
                    </span>
                </div>

                {/* Color palette */}
                <div className="flex gap-1.5 mb-3">
                    {template.palette.map((color, i) => (
                        <div
                            key={i}
                            className="w-5 h-5 rounded-full border-2 border-white shadow-sm"
                            style={{ backgroundColor: color }}
                        />
                    ))}
                </div>

                {/* Features */}
                <div className="space-y-1 mb-4">
                    {template.features.map((f, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-slate-600">
                            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: colors.bg }} />
                            {f}
                        </div>
                    ))}
                </div>

                {/* Sections count */}
                <div className="flex items-center gap-3 text-xs text-slate-400 pt-3 border-t border-slate-100">
                    <span className="flex items-center gap-1">
                        <Layout size={12} />
                        {template.pages.home.sections.length} sections accueil
                    </span>
                    <span>·</span>
                    <span>{template.pages.product.sections.length + template.pages.contact.sections.length} autres pages</span>
                </div>
            </div>
        </motion.div>
    );
}

export default function TemplateGallery({ isOpen, onClose, onApply, currentStorefrontData, storeName }) {
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [isApplying, setIsApplying] = useState(false);
    const [filterCategory, setFilterCategory] = useState('Tous');

    const categories = ['Tous', ...new Set(TEMPLATES.map(t => t.category))];
    const filtered = filterCategory === 'Tous'
        ? TEMPLATES
        : TEMPLATES.filter(t => t.category === filterCategory);

    const handleApply = async () => {
        if (!selectedTemplate) return;
        setIsApplying(true);
        await new Promise(r => setTimeout(r, 600)); // smooth transition
        const newData = applyTemplate(selectedTemplate, currentStorefrontData, storeName);
        onApply(newData);
        setIsApplying(false);
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-end md:items-center justify-center p-0 md:p-6"
                    onClick={(e) => e.target === e.currentTarget && onClose()}
                >
                    <motion.div
                        initial={{ opacity: 0, y: 60, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 40, scale: 0.97 }}
                        transition={{ type: 'spring', damping: 30, stiffness: 400 }}
                        className="bg-slate-50 rounded-t-3xl md:rounded-3xl w-full md:max-w-5xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl"
                    >
                        {/* Header */}
                        <div className="bg-white px-6 pt-6 pb-4 border-b border-slate-100 flex-shrink-0">
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
                                        <Sparkles size={20} className="text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-slate-900">Galerie de Templates</h2>
                                        <p className="text-sm text-slate-500">5 templates prêts à personnaliser</p>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                                >
                                    <X size={20} className="text-slate-500" />
                                </button>
                            </div>

                            {/* Category Filters */}
                            <div className="flex gap-2 mt-4 overflow-x-auto pb-1 scrollbar-none">
                                {categories.map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setFilterCategory(cat)}
                                        className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all flex-shrink-0 ${
                                            filterCategory === cat
                                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Grid */}
                        <div className="flex-1 overflow-y-auto p-6">
                            <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                <AnimatePresence>
                                    {filtered.map(template => (
                                        <TemplateCard
                                            key={template.id}
                                            template={template}
                                            isSelected={selectedTemplate?.id === template.id}
                                            onSelect={setSelectedTemplate}
                                        />
                                    ))}
                                </AnimatePresence>
                            </motion.div>
                        </div>

                        {/* Footer CTA */}
                        <div className="bg-white border-t border-slate-100 px-6 py-4 flex-shrink-0">
                            <AnimatePresence mode="wait">
                                {selectedTemplate ? (
                                    <motion.div
                                        key="selected"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="flex items-center justify-between gap-4"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">{selectedTemplate.emoji}</span>
                                            <div>
                                                <p className="font-black text-slate-900">
                                                    Template <span className="text-indigo-600">{selectedTemplate.name}</span> sélectionné
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    ⚠️ Votre contenu actuel sera remplacé
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => setSelectedTemplate(null)}
                                                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
                                            >
                                                Annuler
                                            </button>
                                            <button
                                                onClick={handleApply}
                                                disabled={isApplying}
                                                className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-black text-sm flex items-center gap-2 hover:bg-indigo-700 transition-all hover:shadow-lg hover:shadow-indigo-600/30 active:scale-95 disabled:opacity-60"
                                            >
                                                {isApplying ? (
                                                    <>
                                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                        Application...
                                                    </>
                                                ) : (
                                                    <>
                                                        Appliquer le Template
                                                        <ChevronRight size={16} />
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.p
                                        key="hint"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="text-center text-sm text-slate-400 font-medium"
                                    >
                                        Cliquez sur un template pour le sélectionner
                                    </motion.p>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
