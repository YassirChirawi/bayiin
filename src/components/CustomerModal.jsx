import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { X, Save } from "lucide-react";
import Button from "./Button";
import Input from "./Input";

export default function CustomerModal({ isOpen, onClose, onSave, customer = null }) {
    const [formData, setFormData] = useState({
        name: "",
        phone: "",
        address: "",
        city: "", // Explicit city field
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (customer) {
            setFormData({
                name: customer.name || "",
                phone: customer.phone || "",
                address: customer.address || "",
                city: customer.city || "",
            });
        } else {
            setFormData({
                name: "",
                phone: "",
                address: "",
                city: "",
            });
        }
    }, [customer, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSave({
                ...formData,
                updatedAt: new Date().toISOString()
            });
            onClose();
        } catch (error) {
            console.error("Error saving customer:", error);
            toast.error("Failed to save customer");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-900">
                        {customer ? "Edit Customer" : "New Customer"}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <Input
                        label="Full Name"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. John Doe"
                    />

                    <Input
                        label="Phone Number"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="e.g. 06..."
                    />

                    <Input
                        label="City"
                        required
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        placeholder="e.g. Casablanca"
                    />

                    <Input
                        label="Address"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="Street address..."
                    />

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <Button type="button" variant="secondary" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" isLoading={loading} icon={Save}>
                            Save Customer
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
