import { useState } from "react";
import { useLanguage } from "../context/LanguageContext";
import { generateCopilotResponse } from "../services/aiService";
import { useStoreData } from "../hooks/useStoreData";
import { MessageSquare, RefreshCw, Copy, Check } from "lucide-react";
import Button from "../components/Button";
import toast from "react-hot-toast";

export default function SupportAI() {
    const { t } = useLanguage();
    const [customerMessage, setCustomerMessage] = useState("");
    const [response, setResponse] = useState("");
    const [loading, setLoading] = useState(false);
    const { data: products } = useStoreData("products");

    const generateResponse = async () => {
        if (!customerMessage) return;
        setLoading(true);
        try {
            // Pass products for context
            const productContext = products ? products.map(p => ({ name: p.name, price: p.price })) : [];
            const aiRes = await generateCopilotResponse(customerMessage, [], productContext);
            setResponse(aiRes);
        } catch (error) {
            console.error(error);
            toast.error("Erreur lors de la génération");
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(response);
        toast.success("Copié !");
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <MessageSquare className="text-rose-500" />
                Assistant Service Client (Beya3)
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Input */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Message du Client</label>
                    <textarea
                        className="w-full h-40 p-3 border border-gray-300 rounded-md focus:ring-rose-500 focus:border-rose-500"
                        placeholder="Ex: 'Je n'ai pas encore reçu ma commande, c'est normal ?'"
                        value={customerMessage}
                        onChange={(e) => setCustomerMessage(e.target.value)}
                    />
                    <div className="mt-4 flex justify-end">
                        <Button
                            onClick={generateResponse}
                            isLoading={loading}
                            icon={RefreshCw}
                            className="bg-rose-500 hover:bg-rose-600 text-white"
                        >
                            Générer la réponse
                        </Button>
                    </div>
                </div>

                {/* Output */}
                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 relative">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Réponse Suggérée (Beya3)</label>
                    {response ? (
                        <div className="bg-white p-4 rounded-md border border-gray-200 min-h-[160px] whitespace-pre-wrap text-sm text-gray-800">
                            {response}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-40 text-gray-400 text-sm italic border-2 border-dashed border-gray-300 rounded-md">
                            La réponse apparaîtra ici...
                        </div>
                    )}

                    {response && (
                        <button
                            onClick={copyToClipboard}
                            className="absolute top-6 right-6 p-2 text-gray-400 hover:text-indigo-600 bg-white rounded-md shadow-sm border border-gray-200"
                            title="Copier"
                        >
                            <Copy className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
