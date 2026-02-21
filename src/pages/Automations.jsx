import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Workflow, Plus, Play, CheckCircle2, Clock, Zap,
    Filter, ArrowRight, MessageCircle, Mail, Smartphone,
    Tag, Trash2, Edit2, Package, RefreshCw, UserPlus,
    DollarSign, MapPin, X, Send, Truck, MoreVertical, Settings, Sparkles, Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { useAutomations } from '../hooks/useAutomations';
import { useTenant } from '../context/TenantContext'; // NEW
import { DEFAULT_TEMPLATES, DARIJA_TEMPLATES } from '../utils/whatsappTemplates'; // NEW
import { generateWhatsAppTemplate } from '../services/aiService'; // NEW

// --- DATA DEFINITIONS ---

const TRIGGERS = [
    { id: 'order_created', name: 'Nouvelle Commande', description: 'Se déclenche lors de la création d\'une commande.', icon: Package, color: 'text-blue-500', bg: 'bg-blue-50' },
    { id: 'order_updated', name: 'Changement de Statut', description: 'Quand le statut d\'une commande passe à une valeur spécifique.', icon: RefreshCw, color: 'text-orange-500', bg: 'bg-orange-50' },
    { id: 'schedule_time', name: 'À une heure précise', description: 'Exécuter tous les jours à une certaine heure (ex: 14h00).', icon: Clock, color: 'text-purple-500', bg: 'bg-purple-50' },
];

const CONDITIONS = [
    { id: 'status_equals', name: 'Si Statut = ...', description: 'Vérifie si la commande a un statut précis.', icon: Filter, color: 'text-indigo-500', bg: 'bg-indigo-50' },
    { id: 'total_greater', name: 'Si Total > ...', description: 'Vérifie si le montant dépasse un seuil.', icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-50' },
];

const ACTIONS = [
    { id: 'send_whatsapp', name: 'Envoyer WhatsApp', description: 'Envoie un message via WhatsApp au client.', icon: MessageCircle, color: 'text-green-600', bg: 'bg-green-100' },
    { id: 'create_delivery', name: 'Envoi Prestataire', description: 'Crée un colis automatiquement sur Sendit.', icon: Send, color: 'text-sky-500', bg: 'bg-sky-50' },
    { id: 'request_pickup', name: 'Demande de Ramassage', description: 'Demande le ramassage des colis prêts.', icon: Truck, color: 'text-yellow-600', bg: 'bg-yellow-100' },
];

// --- COMPONENTS ---

const FlowNode = ({ node, index, onRemove, onEdit }) => {
    if (!node) return null;
    const isTrigger = index === 0 && !node.type; // First node is always trigger if no type specified
    const typeLabel = node.type === 'trigger' || isTrigger ? 'DÉCLENCHEUR' : node.type === 'condition' ? 'CONDITION' : 'ACTION';

    const NodeIcon = node.icon || Zap;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className="relative group w-full max-w-lg mx-auto"
        >
            <div className={`flex items-start p-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow`}>
                {/* Node Icon */}
                <div className={`p-3 rounded-xl ${node.bg || 'bg-gray-50'} ${node.color || 'text-gray-500'} mr-4 flex-shrink-0`}>
                    <NodeIcon className="w-6 h-6" />
                </div>

                {/* Node Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">{node.name}</h3>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                            {typeLabel}
                        </span>
                    </div>
                    <p className="text-sm text-gray-500 truncate">{node.description}</p>

                    {/* Config Preview (Mock) */}
                    {node.configPreview && (
                        <div className="mt-2 text-xs font-medium text-indigo-600 bg-indigo-50 inline-block px-2 py-1 rounded">
                            {node.configPreview}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-4 flex flex-col items-center space-y-1">
                    <button onClick={() => onEdit(index)} className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-md hover:bg-indigo-50 transition-colors">
                        <Edit2 className="w-4 h-4" />
                    </button>
                    {!isTrigger && (
                        <button onClick={() => onRemove(index)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

const ConnectionLine = ({ onAdd, showAdd }) => (
    <div className="flex flex-col items-center justify-center py-2 w-full max-w-lg mx-auto relative group">
        <div className="w-[2px] h-8 bg-gradient-to-b from-gray-200 to-indigo-200" />

        {showAdd ? (
            <button
                onClick={onAdd}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-white border border-indigo-200 rounded-full flex items-center justify-center text-indigo-500 hover:bg-indigo-50 hover:scale-110 transition-all z-10 shadow-sm opacity-0 group-hover:opacity-100"
            >
                <Plus className="w-4 h-4" />
            </button>
        ) : (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full border border-indigo-300 bg-white" />
        )}

        <div className="w-[2px] h-8 bg-gradient-to-b from-indigo-200 to-gray-200" />
    </div>
);

// Node Selector Drawer
const NodeSelector = ({ isOpen, onClose, onSelect, availableTypes }) => {
    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
            <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-xl z-50 flex flex-col border-l border-gray-200"
            >
                <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
                    <h2 className="text-lg font-semibold text-gray-800">Ajouter une étape</h2>
                    <button onClick={onClose} className="p-1 text-gray-400 hover:bg-gray-100 rounded-md">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 overflow-y-auto flex-1 space-y-6">

                    {availableTypes.includes('trigger') && (
                        <div>
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Déclencheurs</h3>
                            <div className="space-y-2">
                                {TRIGGERS.map(item => (
                                    <button key={item.id} onClick={() => onSelect({ ...item, type: 'trigger' })} className="w-full text-left flex items-start p-3 hover:bg-gray-50 rounded-xl border border-transparent hover:border-gray-200 transition-all">
                                        <div className={`p-2 rounded-lg ${item.bg} ${item.color} mr-3`}>
                                            <item.icon className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="font-medium text-gray-900 text-sm">{item.name}</div>
                                            <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {availableTypes.includes('condition') && (
                        <div>
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Conditions</h3>
                            <div className="space-y-2">
                                {CONDITIONS.map(item => (
                                    <button key={item.id} onClick={() => onSelect({ ...item, type: 'condition' })} className="w-full text-left flex items-start p-3 hover:bg-gray-50 rounded-xl border border-transparent hover:border-gray-200 transition-all">
                                        <div className={`p-2 rounded-lg ${item.bg} ${item.color} mr-3`}>
                                            <item.icon className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="font-medium text-gray-900 text-sm">{item.name}</div>
                                            <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {availableTypes.includes('action') && (
                        <div>
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Actions</h3>
                            <div className="space-y-2">
                                {ACTIONS.map(item => (
                                    <button key={item.id} onClick={() => onSelect({ ...item, type: 'action' })} className="w-full text-left flex items-start p-3 hover:bg-gray-50 rounded-xl border border-transparent hover:border-gray-200 transition-all">
                                        <div className={`p-2 rounded-lg ${item.bg} ${item.color} mr-3`}>
                                            <item.icon className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="font-medium text-gray-900 text-sm">{item.name}</div>
                                            <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                </div>
            </motion.div>
        </>
    );
};


// Node Config Modal
const NodeConfigModal = ({ isOpen, onClose, node, onSave, store }) => {
    const [config, setConfig] = useState(node?.config || {});
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [showAiInput, setShowAiInput] = useState(false);

    if (!isOpen || !node) return null;

    const templates = store?.whatsappLanguage === 'darija' ? DARIJA_TEMPLATES : DEFAULT_TEMPLATES;
    const customTemplates = store?.whatsappTemplates || {};

    const handleTemplateChange = (e) => {
        const key = e.target.value;
        const msg = customTemplates[key] || templates[key] || '';
        setConfig({ ...config, templateKey: key, message: msg });
        setShowAiInput(false); // hide AI input if user selects a preset
    };

    const handleGenerateAI = async () => {
        if (!aiPrompt.trim()) return;
        setIsGenerating(true);
        try {
            const resultMsg = await generateWhatsAppTemplate(aiPrompt, store?.whatsappLanguage || 'fr');
            // AI might return response wrapped in quotes or ticks, usually aiService returns raw text.
            setConfig({ ...config, message: resultMsg.trim().replace(/^["']|["']$/g, ''), templateKey: '' });
            setShowAiInput(false);
            setAiPrompt('');
            toast.success("Message généré avec succès ! ✨");
        } catch (error) {
            toast.error("Échec de la génération. Veuillez réessayer.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSave = () => {
        let preview = '';
        if (node.id === 'status_equals') {
            preview = `Statut = ${config.status || 'Non défini'}`;
        } else if (node.id === 'total_greater') {
            preview = `Total > ${config.amount || 0} DH`;
        } else if (node.id === 'schedule_time') {
            preview = `${config.time || '00:00'} Tous les jours`;
        } else if (node.id === 'send_whatsapp') {
            const shortMsg = config.message ? config.message.substring(0, 20) + '...' : 'Message vide';
            preview = `WhatsApp: "${shortMsg}"`;
        }
        onSave(config, preview);
    };

    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden"
            >
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <Settings className="w-4 h-4 text-indigo-500" />
                        Configurer le nœud
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    <div className="mb-4">
                        <div className="text-sm font-medium text-gray-900">{node.name}</div>
                        <div className="text-xs text-gray-500">{node.description}</div>
                    </div>

                    {node.id === 'status_equals' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Statut cible</label>
                            <select
                                value={config.status || ''}
                                onChange={(e) => setConfig({ ...config, status: e.target.value })}
                                className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 max-h-48"
                            >
                                <option value="">Sélectionner un statut</option>
                                <option value="reçu">Reçu</option>
                                <option value="confirmation">Confirmation</option>
                                <option value="packing">Packing</option>
                                <option value="ramassage">Ramassage</option>
                                <option value="livraison">En Livraison</option>
                                <option value="reporté">Reporté</option>
                                <option value="livré">Livré</option>
                                <option value="retour">Retour</option>
                                <option value="annulé">Annulé</option>
                                <option value="pas de réponse">Pas de réponse</option>
                            </select>
                        </div>
                    )}

                    {node.id === 'total_greater' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Montant minimum (DH)</label>
                            <input
                                type="number"
                                value={config.amount || ''}
                                onChange={(e) => setConfig({ ...config, amount: Number(e.target.value) })}
                                className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="ex: 500"
                            />
                        </div>
                    )}

                    {node.id === 'schedule_time' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Heure d'exécution</label>
                            <input
                                type="time"
                                value={config.time || ''}
                                onChange={(e) => setConfig({ ...config, time: e.target.value })}
                                className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                    )}

                    {node.id === 'send_whatsapp' && (
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Modèles de paramètres (Pré-remplis)</label>
                                <select
                                    value={config.templateKey || ''}
                                    onChange={handleTemplateChange}
                                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                >
                                    <option value="" disabled>Sélectionner un modèle issu de vos paramètres...</option>
                                    <option value="reçu">Reçu</option>
                                    <option value="confirmation">Confirmation</option>
                                    <option value="packing">Packing</option>
                                    <option value="ramassage">Ramassage</option>
                                    <option value="livraison">En Livraison</option>
                                    <option value="reporté">Reporté</option>
                                    <option value="livré">Livré</option>
                                    <option value="retour">Retour</option>
                                    <option value="annulé">Annulé</option>
                                    <option value="pas de réponse">Pas de réponse</option>
                                </select>
                            </div>
                            <div className="flex items-center justify-between">
                                <label className="block text-sm font-medium text-gray-700">Message Complet</label>
                                <button
                                    onClick={() => setShowAiInput(!showAiInput)}
                                    className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-2 py-1 rounded-md transition-colors"
                                >
                                    <Sparkles className="w-3.5 h-3.5" />
                                    Générer par IA
                                </button>
                            </div>

                            <AnimatePresence>
                                {showAiInput && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100 flex flex-col gap-2 relative">
                                            <input
                                                type="text"
                                                value={aiPrompt}
                                                onChange={(e) => setAiPrompt(e.target.value)}
                                                placeholder="Ex: Rédige un message poli invitant le client à patienter..."
                                                className="w-full text-sm border-gray-200 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 pr-10"
                                                onKeyDown={(e) => e.key === 'Enter' && handleGenerateAI()}
                                            />
                                            <button
                                                onClick={handleGenerateAI}
                                                disabled={isGenerating || !aiPrompt.trim()}
                                                className="absolute right-4 top-4 text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                                            >
                                                {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div>
                                <textarea
                                    value={config.message || ''}
                                    onChange={(e) => setConfig({ ...config, message: e.target.value })}
                                    rows={5}
                                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                    placeholder="Tapez le message WhatsApp à envoyer."
                                />
                                <div className="text-xs text-gray-500 mt-2 space-y-1">
                                    <p className="font-medium text-gray-700">Variables dynamiques :</p>
                                    <ul className="list-disc pl-4 space-y-0.5 grid grid-cols-2 gap-x-4">
                                        <li><code>{'{name}'}</code> : Nom du client</li>
                                        <li><code>{'{product}'}</code> : Nom du produit</li>
                                        <li><code>{'{city}'}</code> : Ville du client</li>
                                        <li><code>{'{total}'}</code> : Montant total</li>
                                        <li><code>{'{payment_method}'}</code> : Méthode de paiement</li>
                                        <li><code>{'{store_name}'}</code> : Nom de la boutique</li>
                                        <li><code>{'{delivery_address}'}</code> : Adresse exacte</li>
                                        <li className="col-span-2"><code>{'{tracking}'}</code> : Lien de suivi Sendit (si expédié)</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Placeholder for nodes without specific config yet */}
                    {!['status_equals', 'total_greater', 'schedule_time', 'send_whatsapp'].includes(node.id) && (
                        <div className="text-sm text-gray-500 italic bg-gray-50 p-3 rounded-lg border border-gray-100">
                            Aucune configuration supplémentaire n'est requise pour cette étape.
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-gray-100 flex justify-end gap-2 bg-gray-50">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                        Annuler
                    </button>
                    <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors">
                        Sauvegarder
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

// --- MAIN PAGE ---

export default function Automations() {
    const [view, setView] = useState('list'); // 'list' | 'editor'
    const [isSelectorOpen, setIsSelectorOpen] = useState(false);
    const [selectorInsertIndex, setSelectorInsertIndex] = useState(null); // Where to insert the new node

    // Node configuration modal state
    const [editingNodeIndex, setEditingNodeIndex] = useState(null);

    // Use our new hook
    const { automations, loading, addAutomation, updateAutomation, toggleAutomationStatus, deleteAutomation } = useAutomations();
    const { store } = useTenant(); // NEW

    // State for the currently edited automation
    const [currentAuto, setCurrentAuto] = useState({
        name: 'Nouveau Scénario',
        nodes: []
    });

    const handleCreateNew = () => {
        setCurrentAuto({ name: 'Nouveau Scénario', nodes: [] });
        // Open selector immediately for the first node (Trigger)
        setSelectorInsertIndex(0);
        setIsSelectorOpen(true);
        setView('editor');
    };

    const handleEditAuto = (auto) => {
        // Deep copy the nodes so we don't mutate state directly while editing
        setCurrentAuto({
            ...auto,
            nodes: auto.nodes ? auto.nodes.map(n => ({ ...n })) : []
        });
        setView('editor');
    };

    const handleSelectNode = (nodeData) => {
        const updatedNodes = [...currentAuto.nodes];
        if (selectorInsertIndex !== null) {
            // Mock a config preview based on type for demo purposes
            let configPreview = '';
            if (nodeData.id === 'order_updated') configPreview = 'Statut = Expédiée';
            if (nodeData.id === 'schedule_time') configPreview = '14:00 Tous les jours';

            updatedNodes.splice(selectorInsertIndex, 0, { ...nodeData, configPreview });
        }
        setCurrentAuto({ ...currentAuto, nodes: updatedNodes });
        setIsSelectorOpen(false);
    };

    const handleRemoveNode = (index) => {
        const updatedNodes = currentAuto.nodes.filter((_, i) => i !== index);
        setCurrentAuto({ ...currentAuto, nodes: updatedNodes });
    };

    const handleSaveNodeConfig = (configData, previewText) => {
        if (editingNodeIndex === null) return;

        const updatedNodes = [...currentAuto.nodes];
        updatedNodes[editingNodeIndex] = {
            ...updatedNodes[editingNodeIndex],
            config: configData,
            configPreview: previewText
        };
        setCurrentAuto({ ...currentAuto, nodes: updatedNodes });
        setEditingNodeIndex(null);
    };

    const handleSave = async () => {
        if (currentAuto.nodes.length < 2) {
            toast.error('Un scénario doit avoir au moins un déclencheur et une action.');
            return;
        }

        try {
            const cleanNodes = currentAuto.nodes.map(node => {
                const { icon, ...rest } = node; // Remove React component `icon`
                return rest;
            });

            const payload = {
                name: currentAuto.name,
                nodes: cleanNodes,
                triggerType: currentAuto.nodes[0].id, // Store quick access fields
                actionType: currentAuto.nodes[currentAuto.nodes.length - 1].id
            };

            if (currentAuto.id) {
                await updateAutomation(currentAuto.id, payload);
            } else {
                await addAutomation(payload);
            }
            setView('list');
        } catch (error) {
            // error is handled in hook
        }
    };

    // Determine what types of nodes can be added at a specific index
    const getAvailableTypesForIndex = (index) => {
        if (index === 0) return ['trigger']; // First node must be trigger
        return ['condition', 'action']; // Subsequent nodes
    };

    return (
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Workflow className="w-6 h-6 text-indigo-600" />
                        Automations
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Créer des règles pour automatiser votre boutique (Ex: Sendit, WhatsApp).
                    </p>
                </div>

                {view === 'list' ? (
                    <button
                        onClick={handleCreateNew}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Nouveau Scénario
                    </button>
                ) : (
                    <button
                        onClick={() => setView('list')}
                        className="text-gray-600 hover:text-gray-900 px-4 py-2 bg-white rounded-lg border border-gray-200 shadow-sm"
                    >
                        Annuler
                    </button>
                )}
            </div>

            <AnimatePresence mode="wait">
                {view === 'list' && (
                    <motion.div
                        key="list"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-4"
                    >
                        {automations.map(auto => (
                            <div key={auto.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow flex items-center justify-between group cursor-pointer relative" onClick={() => handleEditAuto(auto)}>
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider bg-indigo-50 px-2 py-1 rounded">Éditer</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                                        <Zap className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900">{auto.name}</h3>
                                        <div className="flex items-center text-xs text-gray-500 mt-1 gap-2">
                                            <span className="flex items-center gap-1">
                                                <Package className="w-3 h-3" /> {TRIGGERS.find(t => t.id === auto.triggerType)?.name || 'Déclencheur'}
                                            </span>
                                            <ArrowRight className="w-3 h-3 text-gray-300" />
                                            <span className="flex items-center gap-1">
                                                <MessageCircle className="w-3 h-3" /> {ACTIONS.find(a => a.id === auto.actionType)?.name || 'Action'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="text-right hidden sm:block">
                                        <div className="text-xs text-gray-500 flex items-center justify-end gap-1">
                                            <Clock className="w-3 h-3" /> Dernier run: {auto.lastRun ? new Date(auto.lastRun.toDate()).toLocaleString() : 'Jamais'}
                                        </div>
                                    </div>
                                    <div className={`px-2.5 py-1 text-xs font-medium rounded-full cursor-pointer hover:opacity-80 transition-opacity ${auto.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`} onClick={(e) => { e.stopPropagation(); toggleAutomationStatus(auto.id, auto.status); }}>
                                        {auto.status === 'active' ? 'Actif' : 'Inactif'}
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); deleteAutomation(auto.id); }} className="text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {automations.length === 0 && (
                            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                                <Workflow className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                <h3 className="text-gray-500 font-medium">Aucune automatisation</h3>
                                <button onClick={handleCreateNew} className="mt-2 text-indigo-600 font-medium text-sm hover:underline">Créer la première</button>
                            </div>
                        )}
                    </motion.div>
                )}

                {view === 'editor' && (
                    <motion.div
                        key="editor"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="max-w-4xl mx-auto"
                    >
                        {/* Name Editor */}
                        <div className="mb-4">
                            <input
                                type="text"
                                value={currentAuto.name}
                                onChange={(e) => setCurrentAuto({ ...currentAuto, name: e.target.value })}
                                className="text-xl font-bold text-gray-900 bg-transparent border-none focus:ring-0 p-0 placeholder-gray-400 w-full"
                                placeholder="Nom du scénario (ex: Relance Panier)"
                            />
                        </div>

                        {/* Editor Canvas Container */}
                        <div className="bg-slate-50/50 rounded-2xl border border-dashed border-gray-200 p-8 min-h-[500px] flex flex-col items-center">

                            {/* Flow Starts Here */}
                            <div className="w-full flex-1 flex flex-col items-center">

                                <AnimatePresence>
                                    {currentAuto.nodes.map((node, index) => {
                                        // Re-attach real icon from definitions if missing (from loaded DB state)
                                        let fullNode = node;
                                        if (!fullNode.icon) {
                                            const sourceList = fullNode.type === 'trigger' ? TRIGGERS : fullNode.type === 'action' ? ACTIONS : CONDITIONS;
                                            const match = sourceList.find(n => n.id === node.id);
                                            if (match) fullNode = { ...fullNode, icon: match.icon };
                                        }

                                        return (
                                            <React.Fragment key={`${node.id}-${index}`}>
                                                <FlowNode
                                                    node={fullNode}
                                                    index={index}
                                                    onRemove={handleRemoveNode}
                                                    onEdit={() => setEditingNodeIndex(index)}
                                                />

                                                {/* Render Connection Line after each node */}
                                                <ConnectionLine
                                                    showAdd={true}
                                                    onAdd={() => {
                                                        setSelectorInsertIndex(index + 1);
                                                        setIsSelectorOpen(true);
                                                    }}
                                                />
                                            </React.Fragment>
                                        );
                                    })}
                                </AnimatePresence>

                                {/* Initial "Add Trigger" Button if empty */}
                                {currentAuto.nodes.length === 0 && (
                                    <motion.button
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        onClick={() => {
                                            setSelectorInsertIndex(0);
                                            setIsSelectorOpen(true);
                                        }}
                                        className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-2xl bg-white hover:border-indigo-400 hover:bg-indigo-50 transition-all group w-full max-w-lg"
                                    >
                                        <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                            <Plus className="w-6 h-6" />
                                        </div>
                                        <h3 className="font-semibold text-gray-900">Ajouter un Déclencheur</h3>
                                        <p className="text-sm text-gray-500 text-center mt-1">C'est ce qui va lancer l'automatisation (Ex: Nouvelle commande)</p>
                                    </motion.button>
                                )}

                                {/* Append Node Button (if not empty) */}
                                {currentAuto.nodes.length > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="mt-2"
                                    >
                                        <button
                                            onClick={() => {
                                                setSelectorInsertIndex(currentAuto.nodes.length);
                                                setIsSelectorOpen(true);
                                            }}
                                            className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 transition-all font-medium text-sm bg-white"
                                        >
                                            <Plus className="w-4 h-4" />
                                            Ajouter une étape
                                        </button>
                                    </motion.div>
                                )}

                            </div>
                        </div>

                        {/* Editor Footer / Actions */}
                        <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-6">
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setView('list')}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium text-sm"
                                >
                                    Annuler
                                </button>
                            </div>
                            <div className="flex gap-3">
                                <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm shadow-sm" disabled={currentAuto.nodes.length < 2}>
                                    <Play className="w-4 h-4" />
                                    Test Auto
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm shadow-sm"
                                    disabled={currentAuto.nodes.length < 2}
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                    Activer
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isSelectorOpen && (
                    <NodeSelector
                        isOpen={isSelectorOpen}
                        onClose={() => setIsSelectorOpen(false)}
                        onSelect={handleSelectNode}
                        availableTypes={getAvailableTypesForIndex(selectorInsertIndex)}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {editingNodeIndex !== null && (
                    <NodeConfigModal
                        isOpen={true}
                        onClose={() => setEditingNodeIndex(null)}
                        node={currentAuto.nodes[editingNodeIndex]}
                        onSave={handleSaveNodeConfig}
                        store={store}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
