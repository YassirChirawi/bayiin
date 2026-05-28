const fs = require('fs');
const path = require('path');
const file = path.join('src', 'pages', 'HybridStoreBuilder.jsx');
let content = fs.readFileSync(file, 'utf8');

const tabDesignAnchor = '{/* TAB DESIGN */}';
if (content.includes(tabDesignAnchor) && !content.includes('GLOBAL HEADER SPECIFIC')) {
    const customSettingsBlock = `
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
    `;
    content = content.replace(tabDesignAnchor, tabDesignAnchor + '\n' + customSettingsBlock);
    fs.writeFileSync(file, content);
    console.log("Successfully injected custom settings.");
} else {
    console.log("Anchor not found or already injected");
}
