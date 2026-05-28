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
        <div className="h-[calc(100vh-6rem)] -m-4 md:-m-8 bg-slate-200 overflow-hidden relative flex flex-col">
            
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
                        {/* Sélecteur de Page */}
                        <div className="p-4 border-b border-slate-200 bg-slate-50">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Page active</label>
                            <select 
                                value={currentPage}
                                onChange={(e) => {
                                    setCurrentPage(e.target.value);
                                    setSelectedSectionId(null);
                                }}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm cursor-pointer text-sm"
                            >
                                <option value="home">🏠 Page d'accueil</option>
                                <option value="product">🛍️ Page Produit</option>
                                <option value="contact">📞 Page Contact</option>
                            </select>
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
                                        value={storefrontData.theme.typography.heading}
                                        onChange={(e) => setStorefrontData(prev => ({ ...prev, theme: { ...prev.theme, typography: { ...prev.theme.typography, heading: e.target.value } } }))}
                                        className="block w-full px-2 py-1.5 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 sm:text-xs outline-none"
                                    >
                                        {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                                    </select>
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

                        <div style={{ fontFamily: `'${storefrontData.theme.typography?.heading}', sans-serif` }}>
                            {/* GLOBAL HEADER */}
                            <BlockRenderer 
                                section={globalHeader}
                                theme={storefrontData.theme}
                                isSelected={selectedSectionId === 'global-header'}
                                onClick={() => { setSelectedSectionId('global-header'); setSelectedSectionType('global'); }}
                                onUpdate={(updates) => updateSection('global-header', updates)}
                            />

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
                            <div className="min-h-[400px]">
                                {currentSections.length === 0 ? (
                                    <div className="h-[300px] flex flex-col items-center justify-center text-center p-8">
                                        <Layout size={48} className="text-slate-300 mb-4" />
                                        <h3 className="text-xl font-bold text-slate-400 mb-2">
                                            {currentPage === 'home' ? 'Votre page d\'accueil est vide' : 'Aucune section supplémentaire'}
                                        </h3>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setShowSectionCatalog(true); }}
                                            className="mt-4 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg font-bold hover:bg-indigo-100 transition-colors"
                                        >
                                            + Ajouter une section
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
                                        ) : (
                                            /* TAB DESIGN */
                                            <>
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

                                                {/* Couleurs */}
                                                <div className="pb-4 border-b border-slate-100">
                                                    <label className="block text-sm font-bold text-slate-700 mb-3">Couleurs de la section</label>
                                                    <div className="flex gap-4">
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
        </>
    );
}
