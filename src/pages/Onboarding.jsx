import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTenant } from "../context/TenantContext";
import Button from "../components/Button";
import Input from "../components/Input";
import { doc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Store } from "lucide-react";

export default function Onboarding() {
    const [storeName, setStoreName] = useState("");
    const [currency, setCurrency] = useState("USD");
    const [loading, setLoading] = useState(false);
    const { user } = useAuth();
    const { setStore } = useTenant();
    const navigate = useNavigate();

    const handleCreateStore = async (e) => {
        e.preventDefault();
        if (!user) return;

        try {
            setLoading(true);
            const storeId = storeName.toLowerCase().replace(/\s+/g, '-') + '-' + Math.random().toString(36).substr(2, 5);

            const storeData = {
                name: storeName,
                currency,
                ownerId: user.uid,
                createdAt: new Date().toISOString(),
                plan: 'free',
                subscriptionStatus: 'active'
            };

            // Create store document
            console.log("Attempting to create store document...", storeId);
            await setDoc(doc(db, "stores", storeId), storeData);
            console.log("Store document created successfully.");

            // Update user document with storeId
            console.log("Attempting to update user document...", user.uid);
            await setDoc(doc(db, "users", user.uid), {
                email: user.email,
                storeId,
                role: 'owner'
            }, { merge: true });
            console.log("User document updated successfully.");

            setStore({ id: storeId, ...storeData });
            console.log("Navigating to dashboard...");
            navigate("/dashboard");
        } catch (error) {
            console.error("Error creating store DETAILS:", error);
            alert("Failed to create store: " + error.code + " - " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg border border-gray-100">
                <div className="text-center">
                    <div className="mx-auto h-12 w-12 bg-indigo-100 rounded-full flex items-center justify-center">
                        <Store className="h-6 w-6 text-indigo-600" />
                    </div>
                    <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                        Setup your store
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Tell us a bit about your business
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleCreateStore}>
                    <div className="space-y-4">
                        <Input
                            label="Store Name"
                            required
                            value={storeName}
                            onChange={(e) => setStoreName(e.target.value)}
                            placeholder="My Awesome Store"
                        />

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Currency
                            </label>
                            <select
                                value={currency}
                                onChange={(e) => setCurrency(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="USD">USD ($)</option>
                                <option value="EUR">EUR (€)</option>
                                <option value="GBP">GBP (£)</option>
                                <option value="MAD">MAD (DH)</option>
                            </select>
                        </div>
                    </div>

                    <Button
                        type="submit"
                        className="w-full"
                        isLoading={loading}
                    >
                        Create Store
                    </Button>
                </form>
            </div>
        </div>
    );
}
