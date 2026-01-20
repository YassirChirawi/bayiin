import { useState, useEffect } from "react";
import { X, Save, Upload } from "lucide-react";
import Button from "./Button";
import Input from "./Input";

export default function ProductModal({ isOpen, onClose, onSave, product = null }) {
    const [formData, setFormData] = useState({
        name: "",
        category: "",
        price: "",
        stock: "",
        sizes: "",
        description: "",
        photoUrl: ""
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (product) {
            setFormData({
                name: product.name || "",
                category: product.category || "",
                price: product.price || "",
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
                                    Product Image URL
                                </label>
                                <div className="mt-1 flex rounded-md shadow-sm">
                                    <input
                                        type="url"
                                        className="flex-1 block w-full min-w-0 rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                                        placeholder="https://example.com/image.jpg"
                                        value={formData.photoUrl}
                                        onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
                                    />
                                </div>
                                {formData.photoUrl && (
                                    <div className="mt-2 aspect-video w-full rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                                        <img
                                            src={formData.photoUrl}
                                            alt="Preview"
                                            className="w-full h-full object-cover"
                                            onError={(e) => e.target.src = 'https://via.placeholder.com/300?text=No+Image'}
                                        />
                                    </div>
                                )}
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
