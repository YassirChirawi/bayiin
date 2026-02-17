import { createContext, useContext, useState, useEffect } from "react";
import { generateCopilotResponse, initializeAI } from "../services/aiService";
import { useStoreData } from "../hooks/useStoreData";
import { useTenant } from "./TenantContext";
import { useOrderActions } from "../hooks/useOrderActions"; // NEW
import toast from "react-hot-toast";

const CopilotContext = createContext();

export const useCopilot = () => useContext(CopilotContext);

export const CopilotProvider = ({ children }) => {
    const { store } = useTenant();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        {
            id: 'welcome',
            role: 'assistant',
            content: "Salam ! C'est Beya3, ton assistant Head of Growth 🚀. On analyse tes ventes ou on lance une pub aujourd'hui ? 🔥"
        }
    ]);
    const [loading, setLoading] = useState(false);

    // Fetch products for context (limit to 20 for token efficiency)
    const { data: products } = useStoreData("products");

    // Initialize AI with key from store settings or env
    // In a real app, this should be reactive to settings changes
    useEffect(() => {
        // 1. Try Store Settings (User defined)
        let apiKey = store?.geminiApiKey;

        // 2. Fallback to Env (Dev/Global)
        if (!apiKey) {
            apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        }

        if (apiKey) {
            initializeAI(apiKey);
        } else {
            console.warn("Gemini API Key missing. Copilot will be limited.");
        }
    }, [store?.geminiApiKey]); // Re-run when store updates

    const { createOrder } = useOrderActions(); // Hook for actions

    const processAction = async (actionBlock) => {
        try {
            const action = JSON.parse(actionBlock);
            if (action.action === "CREATE_ORDER") {
                // Formatting Note based on context/provider (Simple logic for now)
                let note = action.data.note || "";

                const orderData = {
                    ...action.data,
                    storeId: store?.id,
                    status: 'reçu',
                    date: new Date().toISOString().split('T')[0],
                    quantity: parseInt(action.data.quantity) || 1,
                    price: parseFloat(action.data.price) || 0,
                    shippingCost: 0,
                    paymentMethod: 'cod',
                    note: note
                };

                await createOrder(orderData);
                return "✅ Commande créée avec succès !";
            }
        } catch (e) {
            console.error("Failed to execute AI action", e);
            return "❌ Erreur lors de la création de la commande.";
        }
        return null;
    };

    const togglePanel = () => setIsOpen(prev => !prev);

    const sendMessage = async (text) => {
        if (!text.trim()) return;

        // Add User Message
        const userMsg = { id: Date.now(), role: 'user', content: text };
        setMessages(prev => [...prev, userMsg]);
        setLoading(true);

        try {
            // Call AI Service
            const productContext = products ? products.map(p => ({ name: p.name, price: p.price })) : [];
            const rawResponse = await generateCopilotResponse(text, messages, productContext);

            // DETECT JSON ACTION
            const jsonMatch = rawResponse.match(/```json([\s\S]*?)```/);
            let displayContent = rawResponse;
            let actionFeedback = null;

            if (jsonMatch) {
                const jsonStr = jsonMatch[1];
                displayContent = rawResponse.replace(jsonMatch[0], "").trim(); // Hide JSON
                actionFeedback = await processAction(jsonStr);
            }

            const aiMsg = {
                id: Date.now() + 1,
                role: 'assistant',
                content: displayContent + (actionFeedback ? `\n\n*${actionFeedback}*` : "")
            };
            setMessages(prev => [...prev, aiMsg]);
        } catch (error) {
            console.error("Copilot Error:", error);
            toast.error("Oups, je suis un peu fatiguée... Réessaie plus tard ! 😴");
        } finally {
            setLoading(false);
        }
    };

    const clearHistory = () => {
        setMessages([{
            id: 'welcome',
            role: 'assistant',
            content: "On repart à zéro ! Qu'est-ce qu'on fait de beau aujourd'hui ? ✨"
        }]);
    };

    return (
        <CopilotContext.Provider value={{ isOpen, togglePanel, messages, sendMessage, loading, clearHistory }}>
            {children}
        </CopilotContext.Provider>
    );
};
