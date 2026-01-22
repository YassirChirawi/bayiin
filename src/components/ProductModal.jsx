import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { X, Save, Upload, Plus, Trash2, RefreshCw } from "lucide-react";
import Button from "./Button";
import Input from "./Input";
import { useImageUpload } from "../hooks/useImageUpload";
import { useTenant } from "../context/TenantContext";

export default function ProductModal({ isOpen, onClose, onSave, product = null }) {
    const [formData, setFormData] = useState({
        name: "",
        category: "",
        price: "",
        costPrice: "",
        stock: "",
        sizes: "", // Legacy field, kept for simple products
        description: "",
        photoUrl: "",
        isVariable: false
    });

    // Variants State
    const [attributes, setAttributes] = useState([]); // [{ name: 'Size', options: ['S', 'M'] }]
    const [variants, setVariants] = useState([]); // [{ id: '..', attributes: {Size: 'S'}, price, stock }]

    const { store } = useTenant();
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
                isVariable: product.isVariable || false
            });
            setAttributes(product.attributes || []);
            setVariants(product.variants || []);
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
                isVariable: false
            });
            setAttributes([]);
            setVariants([]);
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

    const updateVariant = (index, field, value) => {
        const newVariants = [...variants];
        newVariants[index][field] = value;
        setVariants(newVariants);
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
            }

            const productData = {
                ...formData,
                price: parseFloat(formData.price),
                costPrice: parseFloat(formData.costPrice) || 0,
                stock: finalStock,
                sizes: formData.sizes.split(",").map(s => s.trim()).filter(Boolean), // Keep for legacy compatibility
                isVariable: formData.isVariable,
                attributes: formData.isVariable ? attributes : [],
                variants: formData.isVariable ? variants : [],
                updatedAt: new Date().toISOString()
            };

            await onSave(productData);
            onClose();
        } catch (error) {
            console.error("Error saving product:", error);
            toast.error("Failed to save product");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl my-8 flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10 rounded-t-xl">
                    <h2 className="text-xl font-bold text-gray-900">
                        {product ? "Edit Product" : "New Product"}
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
                                label="Product Name"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. Classic T-Shirt"
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label="Base Price (DH)"
                                    type="number"
                                    required
                                    min="0"
                                    step="0.01"
                                    value={formData.price}
                                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                />
                                <Input
                                    label="Cost Price (DH)"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={formData.costPrice}
                                    onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                                    placeholder="Optional"
                                />
                            </div>
                            <Input
                                label="Category"
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                placeholder="e.g. Clothing"
                            />
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Product Image
                                </label>
                                <div className="mt-1 flex items-center gap-4">
                                    <div className="aspect-video w-32 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                                        {formData.photoUrl ? (
                                            <img
                                                src={formData.photoUrl}
                                                alt="Preview"
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
                                        {uploading && <p className="text-xs text-indigo-600 mt-1">Uploading...</p>}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea
                                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                                    rows={3}
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Product details..."
                                />
                            </div>
                        </div>
                    </div>

                    <hr className="border-gray-100" />

                    {/* Stock & Variants Type Toggle */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-medium text-gray-900">Inventory</h3>
                            <div className="flex bg-gray-100 p-1 rounded-lg">
                                <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, isVariable: false }))}
                                    className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${!formData.isVariable ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
                                >
                                    Simple Product
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, isVariable: true }))}
                                    className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${formData.isVariable ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}
                                >
                                    Product with Variants
                                </button>
                            </div>
                        </div>

                        {!formData.isVariable ? (
                            // Simple Stock UI
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Input
                                    label="Total Stock"
                                    type="number"
                                    required={!formData.isVariable}
                                    min="0"
                                    value={formData.stock}
                                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                                />
                                <Input
                                    label="Sizes (Optional, Display only)"
                                    value={formData.sizes}
                                    onChange={(e) => setFormData({ ...formData, sizes: e.target.value })}
                                    placeholder="S, M, L..."
                                />
                            </div>
                        ) : (
                            // Advanced Variants UI
                            <div className="space-y-6">
                                {/* 1. Attribute Builder */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="block text-sm font-medium text-gray-700">Attributes & Options</label>
                                    </div>
                                    {attributes.map((attr, idx) => (
                                        <div key={idx} className="flex gap-2 items-start">
                                            <div className="w-1/3">
                                                <input
                                                    type="text"
                                                    placeholder="Option Name (e.g. Color)"
                                                    value={attr.name}
                                                    onChange={(e) => updateAttributeName(idx, e.target.value)}
                                                    className="block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border"
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <input
                                                    type="text"
                                                    placeholder="Values (e.g. Red, Blue, Green)"
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
                                            Add Option
                                        </Button>
                                        {attributes.length > 0 && (
                                            <Button type="button" onClick={generateVariants} icon={RefreshCw} size="sm" className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border-indigo-200">
                                                Generate Variants
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
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Variant</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price (DH)</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
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
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                value={variant.stock}
                                                                onChange={(e) => updateVariant(idx, 'stock', e.target.value)}
                                                                className={`block w-24 sm:text-sm border rounded-md p-1 ${parseInt(variant.stock) === 0 ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                                                            />
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <Button type="button" variant="secondary" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" isLoading={loading} icon={Save}>
                            Save Product
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
