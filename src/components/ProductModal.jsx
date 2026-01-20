import { useState, useEffect } from "react";
import { X, Save, Upload } from "lucide-react";
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
        sizes: "",
        description: "",
        photoUrl: ""
    });
    const { store } = useTenant();
    const [loading, setLoading] = useState(false);
    const { uploadImage, uploading, error: uploadError } = useImageUpload();

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || !store?.id) return;

        const url = await uploadImage(file, `products/${store.id}`);
        if (url) {
            setFormData(prev => ({ ...prev, photoUrl: url }));
        }
    };

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
                photoUrl: product.photoUrl || ""
            });
        } else {
            setFormData({
                name: "",
                category: "",
                price: "",
                costPrice: "",
                stock: "",
                sizes: "",
                description: "",
                photoUrl: ""
            });
        }
    }, [product, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const productData = {
                ...formData,
                price: parseFloat(formData.price),
                costPrice: parseFloat(formData.costPrice) || 0,
                stock: parseInt(formData.stock),
                sizes: formData.sizes.split(",").map(s => s.trim()).filter(Boolean),
                updatedAt: new Date().toISOString()
            };
            await onSave(productData);
            onClose();
        } catch (error) {
            console.error("Error saving product:", error);
            alert("Failed to save product");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-900">
                        {product ? "Edit Product" : "New Product"}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
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
                                    label="Price (DH)"
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
                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label="Stock Qty"
                                    type="number"
                                    required
                                    min="0"
                                    value={formData.stock}
                                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                                />
                            </div>

                            <Input
                                label="Category"
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                placeholder="e.g. Clothing"
                            />

                            <Input
                                label="Sizes (comma separated)"
                                value={formData.sizes}
                                onChange={(e) => setFormData({ ...formData, sizes: e.target.value })}
                                placeholder="S, M, L, XL"
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
                                        {uploadError && <p className="text-xs text-red-600 mt-1">{uploadError}</p>}
                                        <p className="text-xs text-gray-500 mt-1">Or use a URL (optional)</p>
                                    </div>
                                </div>
                            </div>


                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Description
                                </label>
                                <textarea
                                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                                    rows={4}
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Product details..."
                                />
                            </div>
                        </div>
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
