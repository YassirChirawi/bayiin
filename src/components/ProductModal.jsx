import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { X, Save, Upload, Plus, Trash2, RefreshCw } from "lucide-react";
import Button from "./Button";
import Input from "./Input";
import { useImageUpload } from "../hooks/useImageUpload";
import { useTenant } from "../context/TenantContext";
import { useLanguage } from "../context/LanguageContext"; // NEW
import { validateSKU, suggestSKU } from "../lib/skuService"; // NEW
import { useStoreData } from "../hooks/useStoreData"; // NEW — for SKU suggestions

export default function ProductModal({ isOpen, onClose, onSave, product = null, allProducts = [] }) {
    const [formData, setFormData] = useState({
        name: "",
        category: "",
        price: "",
        costPrice: "",
        stock: "",
        sizes: "", // Legacy field, kept for simple products
        description: "",
        photoUrl: "",
        isVariable: false,
        isBundle: false, // Épique 3
        costCurrency: "MAD",
        supplier_ref: "",
        sku: "",
        min_stock_alert: 5,
        warehouseStocks: {} // { warehouseId: quantity }
    });

    // Variants State
    const [attributes, setAttributes] = useState([]); // [{ name: 'Size', options: ['S', 'M'] }]
    const [variants, setVariants] = useState([]); // [{ id: '..', attributes: {Size: 'S'}, price, stock }]

    // Batches State
    const [batches, setBatches] = useState([]); // [{ batchNumber: '', expiryDate: '', quantity: 0 }]

    // Bundle State (Épique 3)
    const [bundleItems, setBundleItems] = useState([]); // [{ productId: '...', name: '...', qty: 1 }]
    const [searchBundleComponent, setSearchBundleComponent] = useState("");
    const [showBundleDropdown, setShowBundleDropdown] = useState(false);

    const { store } = useTenant();
    const { t } = useLanguage(); // NEW
    const [variantStockEditing, setVariantStockEditing] = useState(null); // { idx, name }
    const { data: warehouses } = useStoreData("warehouses"); // Épique 5
    const [loading, setLoading] = useState(false);
    const { uploadImage, uploading, error: uploadError } = useImageUpload();

    // Reset or Load Data
    useEffect(() => {
        if (product) {
            setFormData({
                name: product.name || "",
                category: product.category || "",
                price: product.price || "",
                costPrice: product.costPrice || "",
                stock: product.stock || "",
                sizes: product.sizes ? product.sizes.join(", ") : "",
                description: product.description || "",
                photoUrl: product.photoUrl || "",
                isVariable: product.isVariable || false,
                isBundle: product.isBundle || false,
                costCurrency: product.costCurrency || "MAD",
                supplier_ref: product.supplier_ref || "",
                sku: product.sku || "",
                min_stock_alert: product.min_stock_alert ?? 5,
                warehouseStocks: product.warehouseStocks || {}
            });
            setAttributes(product.attributes || []);
            setVariants(product.variants || []);
            setBatches(product.inventoryBatches || []);
            setBundleItems(product.bundleItems || []);
        } else {
            setFormData({
                name: "",
                category: "",
                price: "",
                costPrice: "",
                stock: "",
                sizes: "",
                description: "",
                photoUrl: "",
                isVariable: false,
                isBundle: false,
                costCurrency: "MAD",
                supplier_ref: "",
                sku: "",
                min_stock_alert: 5,
                warehouseStocks: {}
            });
            setAttributes([]);
            setVariants([]);
            setBatches([]);
            setBundleItems([]);
            setSearchBundleComponent("");
        }
    }, [product, isOpen]);

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || !store?.id) return;

        const url = await uploadImage(file, `products/${store.id}`);
        if (url) {
            setFormData(prev => ({ ...prev, photoUrl: url }));
        }
    };

    // --- Batch Logic ---
    const addBatch = () => setBatches([...batches, { batchNumber: "", expiryDate: "", quantity: 0 }]);
    const updateBatch = (index, field, value) => {
        const newBatches = [...batches];
        newBatches[index][field] = value;
        setBatches(newBatches);
    };
    const removeBatch = (index) => setBatches(batches.filter((_, i) => i !== index));

    // --- Variant Logic ---

    const addAttribute = () => {
        setAttributes([...attributes, { name: "", options: [] }]);
    };

    const updateAttributeName = (index, name) => {
        const newAttrs = [...attributes];
        newAttrs[index].name = name;
        setAttributes(newAttrs);
    };

    const updateAttributeOptions = (index, optionsStr) => {
        const newAttrs = [...attributes];
        newAttrs[index].options = optionsStr.split(",").map(s => s.trim()).filter(Boolean);
        setAttributes(newAttrs);
    };

    const removeAttribute = (index) => {
        const newAttrs = attributes.filter((_, i) => i !== index);
        setAttributes(newAttrs);
    };

    const generateVariants = () => {
        if (attributes.length === 0) return;

        // Cartesian product of options
        const cartesian = (a) => a.reduce((a, b) => a.flatMap(d => b.map(e => [d, e].flat())), [[]]);

        const optionsOnly = attributes.map(a => a.options);
        const combinations = cartesian(optionsOnly);

        const newVariants = combinations.map((combo, idx) => {
            // combo is ['S', 'Red'] for example
            const variantAttrs = {};
            attributes.forEach((attr, i) => {
                variantAttrs[attr.name] = combo[i];
            });

            return {
                id: `v_${Date.now()}_${idx}`,
                name: combo.join(" / "),
                attributes: variantAttrs,
                price: formData.price || 0,
                stock: 0
            };
        });

        setVariants(newVariants);
    };

    const updateVariant = (idx, field, value) => {
        const newVariants = [...variants];
        newVariants[idx] = { ...newVariants[idx], [field]: value };
        // If updating stock manually, maybe clear warehouse breakdown? 
        // Or better: keep them in sync if we really want, but for variants let's treat them separately for now.
        setVariants(newVariants);
    };

    const updateVariantWarehouseStock = (variantIdx, warehouseId, value) => {
        const newVariants = [...variants];
        const v = { ...newVariants[variantIdx] };
        const stocks = { ...(v.warehouseStocks || {}) };
        stocks[warehouseId] = value === '' ? '' : parseInt(value) || 0;
        v.warehouseStocks = stocks;
        
        // Update total stock for this variant
        v.stock = Object.values(stocks).reduce((a, b) => a + (parseInt(b) || 0), 0);
        newVariants[variantIdx] = v;
        setVariants(newVariants);
    };

    // --- Bundle Logic (Épique 3) ---
    const addBundleItem = (prod) => {
        if (!bundleItems.find(i => i.productId === prod.id)) {
            setBundleItems([...bundleItems, { productId: prod.id, name: prod.name, stock: prod.stock, qty: 1 }]);
        }
        setSearchBundleComponent("");
        setShowBundleDropdown(false);
    };

    const updateBundleItemQty = (index, qty) => {
        const newItems = [...bundleItems];
        newItems[index].qty = Math.max(1, parseInt(qty) || 1);
        setBundleItems(newItems);
    };

    const removeBundleItem = (index) => {
        setBundleItems(bundleItems.filter((_, i) => i !== index));
    };

    // --- Submit ---

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            let finalStock = parseInt(formData.stock) || 0;

            // If variable, calculate total stock from variants
            if (formData.isVariable) {
                finalStock = variants.reduce((sum, v) => sum + (parseInt(v.stock) || 0), 0);
            } else if (formData.isBundle) {
                // Bundle stock visually computed as Math.floor(min(componentStock / requiredQty))
                if (bundleItems.length > 0) {
                    const maxPacks = bundleItems.map(item => {
                        const comp = allProducts.find(p => p.id === item.productId);
                        const compStock = comp ? (parseInt(comp.stock) || 0) : 0;
                        return Math.floor(compStock / (item.qty || 1));
                    });
                    finalStock = Math.min(...maxPacks);
                } else {
                    finalStock = 0;
                }
            } else if (batches.length > 0) {
                // If batches exist, total stock is sum of batch quantities
                finalStock = batches.reduce((sum, b) => sum + (parseInt(b.quantity) || 0), 0);
            }

            let finalCostPrice = parseFloat(formData.costPrice) || 0;
            if (formData.costCurrency === 'EUR') {
                finalCostPrice = finalCostPrice * 10.7; // Standard conversion rate
            }

            const productData = {
                ...formData,
                price: parseFloat(formData.price),
                costPrice: finalCostPrice,
                originalCostPrice: parseFloat(formData.costPrice) || 0,
                costCurrency: formData.costCurrency || "MAD",
                stock: finalStock,
                sizes: formData.sizes.split(",").map(s => s.trim()).filter(Boolean), // Keep for legacy compatibility
                isVariable: formData.isVariable,
                isBundle: formData.isBundle,
                attributes: formData.isVariable ? attributes : [],
                variants: formData.isVariable ? variants : [],
                inventoryBatches: batches,
                bundleItems: formData.isBundle ? bundleItems : [],
                updatedAt: new Date().toISOString()
            };

            await onSave(productData);
            onClose();
        } catch (error) {
            console.error("Error saving product:", error);
            toast.error(t('err_save_product'));
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl my-8 flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10 rounded-t-xl">
                    <h2 className="text-xl font-bold text-gray-900">
                        {product ? t('modal_title_edit_product') : t('modal_title_new_product')}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-8 overflow-y-auto flex-1">

                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <Input
                                label={t('label_product_name')}
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder={t('placeholder_product_name')}
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label={t('label_base_price')}
                                    type="number"
                                    required
                                    min="0"
                                    step="0.01"
                                    value={formData.price}
                                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                />
                                <div className="flex gap-2 items-end">
                                    <div className="flex-1">
                                        <Input
                                            label={t('label_cost_price') || "Coût d'achat"}
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={formData.costPrice}
                                            onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                                            placeholder={t('placeholder_optional')}
                                        />
                                    </div>
                                    <select
                                        value={formData.costCurrency}
                                        onChange={(e) => setFormData({ ...formData, costCurrency: e.target.value })}
                                        className="mb-1 block w-20 shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border bg-gray-50 focus:ring-indigo-500 focus:border-indigo-500"
                                    >
                                        <option value="MAD">MAD</option>
                                        <option value="EUR">EUR</option>
                                    </select>
                                </div>
                            </div>
                            <Input
                                label={t('label_category')}
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                placeholder={t('placeholder_category')}
                            />
                            {/* SKU Field with live validation */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    SKU (Référence unique)
                                    <span className="ml-1 text-xs font-normal text-gray-400">(ex: DSVP001)</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.sku}
                                    onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                                    placeholder="DREN001"
                                    className={`block w-full font-mono text-sm border rounded-md px-3 py-2 focus:outline-none focus:ring-1 ${!formData.sku ? 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
                                        : validateSKU(formData.sku, store?.settings).valid ? 'border-emerald-400 bg-emerald-50 focus:ring-emerald-400'
                                            : 'border-rose-400 bg-rose-50 focus:ring-rose-400'
                                        }`}
                                />
                                {formData.sku && (() => {
                                    const v = validateSKU(formData.sku, store?.settings);
                                    return v.valid
                                        ? <p className="mt-1 text-xs text-emerald-600 font-medium">✓ Ligne : {v.lineName} · N° {v.number}</p>
                                        : <p className="mt-1 text-xs text-rose-600">{v.error}</p>;
                                })()}
                            </div>
                            <Input
                                label="Référence fournisseur (Odoo)"
                                value={formData.supplier_ref}
                                onChange={(e) => setFormData({ ...formData, supplier_ref: e.target.value })}
                                placeholder="ex: PROD-0042"
                            />
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {t('label_product_image')}
                                </label>
                                <div className="mt-1 flex items-center gap-4">
                                    <div className="aspect-video w-32 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                                        {formData.photoUrl ? (
                                            <img
                                                src={formData.photoUrl}
                                                alt={t('msg_preview')}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-gray-400">
                                                <Upload className="h-6 w-6" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                            disabled={uploading}
                                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                                        />
                                        {uploading && <p className="text-xs text-indigo-600 mt-1">{t('msg_uploading')}</p>}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{t('label_description')}</label>
                                <textarea
                                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                                    rows={3}
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder={t('placeholder_product_details')}
                                />
                            </div>
                        </div>
                    </div>

                    <hr className="border-gray-100" />

                    {/* Stock & Variants Type Toggle */}
                    <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <h3 className="text-lg font-medium text-gray-900">{t('title_inventory')}</h3>
                            <div className="flex bg-gray-100 p-1 rounded-lg overflow-x-auto w-full sm:w-auto">
                                <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, isVariable: false, isBundle: false }))}
                                    className={`px-3 py-1.5 min-w-max text-xs font-semibold rounded-md transition-colors ${!formData.isVariable && !formData.isBundle ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
                                >
                                    Stock Simple
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, isVariable: true, isBundle: false }))}
                                    className={`px-3 py-1.5 min-w-max text-xs font-semibold rounded-md transition-colors ${formData.isVariable && !formData.isBundle ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}
                                >
                                    Stock Variable (Attributs)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, isVariable: false, isBundle: true }))}
                                    className={`px-3 py-1.5 min-w-max text-xs font-semibold rounded-md transition-colors ${formData.isBundle ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500'}`}
                                >
                                    <Package className="w-3 h-3 inline mr-1" /> Pack / Bundle
                                </button>
                            </div>
                        </div>

                        {formData.isBundle ? (
                            // --- BUNDLE UI (Épique 3) ---
                            <div className="bg-purple-50 p-5 rounded-xl border border-purple-100 space-y-4">
                                <div className="text-sm text-purple-800 font-medium">
                                    <p>Assemblez des produits existants pour créer ce Pack.</p>
                                    <p className="text-xs mt-1 text-purple-600">Le stock de ce Pack sera automatiquement calculé selon les stocks disponibles de ses composants.</p>
                                </div>
                                
                                {/* Component Search */}
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        placeholder="Rechercher un composant à ajouter (nom ou SKU)..."
                                        value={searchBundleComponent}
                                        onChange={e => {
                                            setSearchBundleComponent(e.target.value);
                                            setShowBundleDropdown(e.target.value.length > 0);
                                        }}
                                        onFocus={() => { if(searchBundleComponent.length > 0) setShowBundleDropdown(true); }}
                                        className="w-full border border-purple-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white"
                                    />
                                    {showBundleDropdown && (
                                        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-100 shadow-lg rounded-lg max-h-48 overflow-y-auto">
                                            {allProducts.filter(p => !p.isBundle && (p.name.toLowerCase().includes(searchBundleComponent.toLowerCase()) || p.sku?.toLowerCase().includes(searchBundleComponent.toLowerCase()))).map(prod => (
                                                <button 
                                                    key={prod.id} 
                                                    type="button"
                                                    onClick={() => addBundleItem(prod)}
                                                    className="w-full text-left px-4 py-2 text-sm hover:bg-purple-50 flex justify-between items-center"
                                                >
                                                    <span className="font-medium text-gray-800">{prod.name} <span className="text-gray-400 text-xs ml-1">{prod.sku}</span></span>
                                                    <span className="text-xs font-semibold text-gray-500">Stock: {prod.stock}</span>
                                                </button>
                                            ))}
                                            {allProducts.filter(p => !p.isBundle).length === 0 && (
                                                <div className="px-4 py-3 text-sm text-gray-500 italic text-center">Aucun produit simple disponible.</div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Included Items List */}
                                <div className="space-y-2">
                                    <h4 className="text-xs font-bold text-purple-900 uppercase tracking-wider">Composants du Pack</h4>
                                    {bundleItems.length === 0 ? (
                                        <div className="text-center py-6 bg-white rounded-lg border border-dashed border-purple-200">
                                            <p className="text-xs text-gray-400">Ce pack est vide. Recherchez un produit ci-dessus.</p>
                                        </div>
                                    ) : (
                                        <div className="bg-white rounded-lg border border-purple-100 divide-y divide-purple-50">
                                            {bundleItems.map((item, idx) => (
                                                <div key={item.productId} className="flex items-center justify-between p-3">
                                                    <div className="flex-1">
                                                        <p className="text-sm font-semibold text-gray-800">{item.name}</p>
                                                        <p className="text-[10px] text-gray-400">Stock actuel : {item.stock}</p>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <div className="flex items-center gap-2">
                                                            <label className="text-xs font-medium text-gray-500">Qté incluse :</label>
                                                            <input 
                                                                type="number" min="1" value={item.qty} 
                                                                onChange={e => updateBundleItemQty(idx, e.target.value)}
                                                                className="w-16 border border-gray-200 rounded p-1 text-sm text-center"
                                                            />
                                                        </div>
                                                        <button type="button" onClick={() => removeBundleItem(idx)} className="text-red-400 hover:text-red-600 p-1">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : !formData.isVariable ? (
                            // Simple Stock UI
                            <>
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <Input
                                        label={t('label_total_stock')}
                                        type="number"
                                        required={!formData.isVariable}
                                        min="0"
                                        value={formData.stock}
                                        onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                                        disabled={batches.length > 0 || (warehouses && warehouses.length > 0)}
                                    />
                                    {warehouses && warehouses.length > 0 && (
                                        <div className="sm:col-span-3 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 mt-2">
                                            <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                <Truck className="w-3.5 h-3.5" />
                                                Répartition par Dépôt
                                            </h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {warehouses.map(wh => (
                                                    <div key={wh.id} className="flex flex-col">
                                                        <label className="text-[10px] font-bold text-gray-500 mb-1 truncate">{wh.name}</label>
                                                        <input 
                                                            type="number" min="0"
                                                            value={formData.warehouseStocks?.[wh.id] || ""}
                                                            placeholder="0"
                                                            onChange={e => {
                                                                const val = parseInt(e.target.value) || 0;
                                                                const newWStocks = { ...formData.warehouseStocks, [wh.id]: val };
                                                                const total = Object.values(newWStocks).reduce((a, b) => a + b, 0);
                                                                setFormData({ ...formData, warehouseStocks: newWStocks, stock: total });
                                                            }}
                                                            className="w-full p-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                            <p className="text-[10px] text-indigo-600 mt-3 italic font-medium">
                                                * Le stock total est automatiquement mis à jour selon la répartition.
                                            </p>
                                        </div>
                                    )}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Alerte seuil min
                                            <span className="ml-1 text-xs font-normal text-amber-500">⚠️</span>
                                        </label>
                                        <input
                                            type="number" min="0"
                                            value={formData.min_stock_alert}
                                            onChange={e => setFormData({ ...formData, min_stock_alert: parseInt(e.target.value) || 0 })}
                                            className="block w-full text-sm border border-amber-200 bg-amber-50 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-400"
                                        />
                                        <p className="text-xs text-gray-400 mt-0.5">Alerte Dashboard si stock &lt; {formData.min_stock_alert}</p>
                                    </div>
                                    <Input
                                        label={t('label_sizes_optional')}
                                        value={formData.sizes}
                                        onChange={(e) => setFormData({ ...formData, sizes: e.target.value })}
                                        placeholder={t('placeholder_sizes')}
                                    />
                                </div>

                                <div className="mt-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="text-sm font-medium text-gray-700">{t('label_inventory_batches') || "Traçabilité des Lots (FEFO)"}</h4>
                                        <Button type="button" variant="secondary" size="sm" onClick={addBatch} icon={Plus}>
                                            {t('btn_add_batch') || "Ajouter Lot"}
                                        </Button>
                                    </div>
                                    {batches.length > 0 ? (
                                        <div className="space-y-3">
                                            {batches.map((batch, idx) => (
                                                <div key={idx} className="flex gap-2 items-center bg-white p-2 border border-gray-100 rounded-lg shadow-sm">
                                                    <div className="flex-1">
                                                        <input
                                                            type="text"
                                                            placeholder={t('placeholder_batch_num') || "Numéro Lot"}
                                                            className="block w-full sm:text-sm border-gray-300 rounded-md p-1.5 border"
                                                            value={batch.batchNumber}
                                                            onChange={(e) => updateBatch(idx, 'batchNumber', e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="flex-1">
                                                        <input
                                                            type="date"
                                                            className="block w-full sm:text-sm border-gray-300 rounded-md p-1.5 border"
                                                            value={batch.expiryDate}
                                                            onChange={(e) => updateBatch(idx, 'expiryDate', e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="w-24">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            placeholder="Qté"
                                                            className="block w-full sm:text-sm border-gray-300 rounded-md p-1.5 border"
                                                            value={batch.quantity}
                                                            onChange={(e) => updateBatch(idx, 'quantity', e.target.value)}
                                                        />
                                                    </div>
                                                    <button type="button" onClick={() => removeBatch(idx)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-md">
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            ))}
                                            <p className="text-xs text-indigo-600 font-medium mt-2">
                                                {t('msg_stock_auto_calc') || "Le stock total est calculé automatiquement à partir des lots."}
                                            </p>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-500 italic">{t('msg_no_batches') || "Aucun lot configuré. Gestion classique du stock."}</p>
                                    )}
                                </div>
                            </>
                        ) : (
                            // Advanced Variants UI
                            <div className="space-y-6">
                                {/* 1. Attribute Builder */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="block text-sm font-medium text-gray-700">{t('title_attributes_options')}</label>
                                    </div>
                                    {attributes.map((attr, idx) => (
                                        <div key={idx} className="flex gap-2 items-start">
                                            <div className="w-1/3">
                                                <input
                                                    type="text"
                                                    placeholder={t('placeholder_option_name')}
                                                    value={attr.name}
                                                    onChange={(e) => updateAttributeName(idx, e.target.value)}
                                                    className="block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border"
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <input
                                                    type="text"
                                                    placeholder={t('placeholder_option_values')}
                                                    value={attr.options.join(", ")}
                                                    onChange={(e) => updateAttributeOptions(idx, e.target.value)}
                                                    className="block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeAttribute(idx)}
                                                className="p-2 text-red-500 hover:bg-red-50 rounded-md"
                                            >
                                                <Trash2 className="h-5 w-5" />
                                            </button>
                                        </div>
                                    ))}
                                    <div className="flex gap-2">
                                        <Button type="button" variant="secondary" onClick={addAttribute} icon={Plus} size="sm">
                                            {t('btn_add_option')}
                                        </Button>
                                        {attributes.length > 0 && (
                                            <Button type="button" onClick={generateVariants} icon={RefreshCw} size="sm" className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border-indigo-200">
                                                {t('btn_generate_variants')}
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {/* 2. Variants Table */}
                                {variants.length > 0 && (
                                    <div className="border rounded-lg overflow-hidden">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('table_th_variant')}</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('table_th_price_dh')}</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('table_th_stock')}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {variants.map((variant, idx) => (
                                                    <tr key={variant.id}>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                            {variant.name}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                step="0.01"
                                                                value={variant.price}
                                                                onChange={(e) => updateVariant(idx, 'price', e.target.value)}
                                                                className="block w-24 sm:text-sm border-gray-300 rounded-md p-1 border"
                                                            />
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    value={variant.stock}
                                                                    onChange={(e) => updateVariant(idx, 'stock', e.target.value)}
                                                                    className={`block w-20 sm:text-sm border rounded-md p-1 ${parseInt(variant.stock) === 0 ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                                                                />
                                                                {warehouses && warehouses.length > 0 && (
                                                                    <button 
                                                                        type="button"
                                                                        onClick={() => setVariantStockEditing({ idx, name: variant.name })}
                                                                        className="p-1 text-indigo-600 hover:bg-indigo-50 rounded border border-indigo-200"
                                                                        title="Répartition par dépôt"
                                                                    >
                                                                        <Truck className="h-4 w-4" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {/* Variant Warehouse Stock Modal */}
                                {variantStockEditing !== null && (
                                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                                            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                                    <Truck className="h-5 w-5 text-indigo-500" />
                                                    Stock par Dépôt : {variantStockEditing.name}
                                                </h3>
                                                <button onClick={() => setVariantStockEditing(null)} className="text-gray-400 hover:text-gray-500">
                                                    <X className="h-5 w-5" />
                                                </button>
                                            </div>
                                            <div className="p-6 space-y-4">
                                                {warehouses.map(wh => (
                                                    <div key={wh.id} className="flex items-center justify-between gap-4 p-2 hover:bg-gray-50 rounded-lg transition-colors">
                                                        <div className="flex items-center gap-2 overflow-hidden">
                                                            <div className={`p-1.5 rounded-md ${wh.isDefault ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-400'}`}>
                                                                <Truck className="h-3.5 w-3.5" />
                                                            </div>
                                                            <span className="text-sm font-medium text-gray-700 truncate">{wh.name}</span>
                                                        </div>
                                                        <input 
                                                            type="number" min="0" placeholder="0"
                                                            value={variants[variantStockEditing.idx].warehouseStocks?.[wh.id] ?? ""}
                                                            onChange={e => updateVariantWarehouseStock(variantStockEditing.idx, wh.id, e.target.value)}
                                                            className="w-20 p-1.5 border border-gray-200 rounded text-sm text-right focus:border-indigo-500 outline-none"
                                                        />
                                                    </div>
                                                ))}
                                                <div className="pt-4 border-t flex justify-between items-center">
                                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Calculé</span>
                                                    <span className="text-lg font-black text-indigo-600 font-mono">
                                                        {Object.values(variants[variantStockEditing.idx].warehouseStocks || {}).reduce((a, b) => a + (parseInt(b) || 0), 0)}
                                                    </span>
                                                </div>
                                                <Button onClick={() => setVariantStockEditing(null)} className="w-full mt-2">Valider la répartition</Button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <Button type="button" variant="secondary" onClick={onClose}>
                            {t('cancel')}
                        </Button>
                        <Button type="submit" isLoading={loading} icon={Save}>
                            {t('btn_save_product')}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
