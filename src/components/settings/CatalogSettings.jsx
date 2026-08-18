import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { Trash2, Plus, Save } from "lucide-react";
import Button from "../Button";
import { toast } from "react-hot-toast";
import { vibrate } from "../../utils/haptics";

export default function CatalogSettings({ store, setStore, t }) {
    const [settings, setSettings] = useState(store?.settings || {
        skuRegex: '',
        lineProfiles: {},
        complementaryRules: {}
    });
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateDoc(doc(db, "stores", store.id), { settings });
            setStore(prev => ({ ...prev, settings }));
            vibrate('success');
            toast.success(t('msg_catalog_saved') || "Configurations du catalogue enregistrées !");
        } catch (e) {
            vibrate('error');
            console.error(e);
            toast.error(t('err_save_failed') || "Erreur de sauvegarde");
        } finally {
            setSaving(false);
        }
    };

    const addProfile = () => {
        const code = prompt(t('prompt_line_code') || "Code de la gamme (ex: DSV, SER, ...) :");
        if (!code) return;
        const name = prompt(t('prompt_line_name', { code }) || `Nom de la gamme pour ${code} (ex: Soin Visage, Sérums, ...) :`);
        if (!name) return;
        setSettings(prev => ({
            ...prev,
            lineProfiles: { ...prev.lineProfiles, [code.toUpperCase()]: name }
        }));
    };

    const removeProfile = (code) => {
        const newProfiles = { ...settings.lineProfiles };
        delete newProfiles[code];
        setSettings(prev => ({ ...prev, lineProfiles: newProfiles }));
    };

    const addRule = (lineCode) => {
        const targetCode = prompt(t('prompt_suggest_code', { lineCode }) || `Quel code de gamme suggérer avec ${lineCode} ?`);
        if (!targetCode) return;
        const currentRules = settings.complementaryRules?.[lineCode] || [];
        if (currentRules.includes(targetCode.toUpperCase())) return;
        
        setSettings(prev => ({
            ...prev,
            complementaryRules: {
                ...(prev.complementaryRules || {}),
                [lineCode]: [...currentRules, targetCode.toUpperCase()]
            }
        }));
    };

    const removeRule = (lineCode, targetCode) => {
        const currentRules = settings.complementaryRules?.[lineCode] || [];
        setSettings(prev => ({
            ...prev,
            complementaryRules: {
                ...prev.complementaryRules,
                [lineCode]: currentRules.filter(c => c !== targetCode)
            }
        }));
    };

    return (
        <div className="space-y-6">
            <div className="glass-panel rounded-2xl overflow-hidden">
                <div className="px-6 py-6 sm:p-8 space-y-8">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3 mb-5 uppercase tracking-wider">{t('section_sku_validation') || 'SKU & Validation'}</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">{t('label_sku_regex') || 'Regex de validation SKU'}</label>
                                <input
                                    type="text"
                                    value={settings.skuRegex || ''}
                                    onChange={e => setSettings(prev => ({ ...prev, skuRegex: e.target.value }))}
                                    placeholder={t('placeholder_sku_regex') || "Ex: ^[A-Z]{3,4}\\d{3}$"}
                                    className="mt-2 block w-full border-gray-200 rounded-xl shadow-sm p-3 text-sm font-mono focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white/50"
                                />
                                <p className="mt-2 text-xs text-gray-500">{t('help_sku_regex') || "Laissez vide pour autoriser n'importe quel SKU."}</p>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3 mb-5 uppercase tracking-wider">{t('section_line_profiles') || 'Gammage & Profils'}</h3>
                        <p className="text-sm text-gray-500 mb-5">{t('help_line_profiles') || "Associez les préfixes de vos SKU à des noms de gammes pour personnaliser l'Advisor."}</p>
                        <div className="space-y-2">
                            {Object.entries(settings.lineProfiles || {}).map(([code, name]) => (
                                <div key={code} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg border border-gray-100">
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">{code}</span>
                                        <span className="text-sm text-gray-700">{name}</span>
                                    </div>
                                    <button onClick={() => removeProfile(code)} className="text-rose-400 hover:text-rose-600 p-1"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            ))}
                            <button onClick={addProfile} className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 text-xs font-semibold py-2">
                                <Plus className="w-3.5 h-3.5" /> {t('label_add_line') || 'Ajouter une gamme'}
                            </button>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3 mb-5 uppercase tracking-wider">{t('section_cross_selling') || 'Règles de Recommandation'}</h3>
                        <p className="text-sm text-gray-500 mb-5">{t('ai_config_help')}</p>
                        <div className="space-y-4">
                            {Object.keys(settings.lineProfiles || {}).map(lineCode => (
                                <div key={lineCode} className="border border-gray-100 rounded-xl p-3 bg-gray-50/50">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs font-bold text-gray-600 uppercase">{t('label_if_buying')} {settings.lineProfiles[lineCode]} ({lineCode})</span>
                                        <button onClick={() => addRule(lineCode)} className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded hover:bg-indigo-100 font-bold tracking-tight uppercase">{t('btn_suggest_range') || 'Suggérer gamme +'}</button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {(settings.complementaryRules?.[lineCode] || []).map(target => (
                                            <div key={target} className="flex items-center gap-1.5 px-2 py-1 bg-white border border-indigo-100 rounded text-xs text-indigo-700">
                                                <span className="font-mono font-bold">{target}</span>
                                                <button onClick={() => removeRule(lineCode, target)} className="text-gray-300 hover:text-rose-500">×</button>
                                            </div>
                                        ))}
                                        {!(settings.complementaryRules?.[lineCode]?.length) && <span className="text-[10px] text-gray-400 italic">{t('msg_no_rules') || 'Aucune règle définie'}</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end pt-6 border-t border-gray-100 mt-4">
                        <Button onClick={handleSave} isLoading={saving} icon={Save}>{t('btn_save_config') || 'Enregistrer les configurations'}</Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
