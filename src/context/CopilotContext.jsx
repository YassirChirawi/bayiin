import { createContext, useContext, useState, useEffect, useMemo } from "react";
import { generateCopilotResponse } from "../services/aiService";
import { useStoreData } from "../hooks/useStoreData";
import { useTenant } from "./TenantContext";
import { useOrderActions } from "../hooks/useOrderActions";
import { extractActionFromResponse } from "../utils/actionParser";
import { createRawWhatsAppLink } from "../utils/whatsappTemplates";
import { db } from "../lib/firebase";
import { collection, addDoc, serverTimestamp, query, where, limit, orderBy } from "firebase/firestore";
import toast from "react-hot-toast";

const CopilotContext = createContext();

export const useCopilot = () => useContext(CopilotContext);

export const CopilotProvider = ({ children }) => {
    const { store } = useTenant();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState(() => {
        const saved = localStorage.getItem(`copilot_history_${store?.id}`);
        return saved ? JSON.parse(saved) : [
            {
                id: 'welcome',
                role: 'assistant',
                content: "Salam ! C'est Beya3, ton assistant Head of Growth 🚀. On analyse tes ventes ou on lance une pub aujourd'hui ? 🔥"
            }
        ];
    });
    const [loading, setLoading] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);

    // PERSISTENCE
    useEffect(() => {
        if (store?.id) {
            localStorage.setItem(`copilot_history_${store.id}`, JSON.stringify(messages.slice(-50)));
        }
    }, [messages, store?.id]);

    // ENRICHED CONTEXT
    const productConstraints = useMemo(() => [orderBy("createdAt", "desc"), limit(20)], []);
    const orderConstraints = useMemo(() => [orderBy("createdAt", "desc"), limit(50)], []);

    const { data: products = [] } = useStoreData("products", productConstraints);
    const { data: orders = [] } = useStoreData("orders", orderConstraints);
    const { data: customers = [] } = useStoreData("customers");
    
    // Monthly finances summary (simplified logic for the context)
    const currentMonth = new Date().toISOString().substring(0, 7);
    const monthlyOrders = orders.filter(o => o.date?.startsWith(currentMonth));
    const totalRevenue = monthlyOrders.reduce((acc, o) => acc + (o.status === 'livré' ? (parseFloat(o.price) || 0) : 0), 0);
    const totalProfit = monthlyOrders.reduce((acc, o) => acc + (o.status === 'livré' ? (parseFloat(o.profit) || 0) : 0), 0);
    const totalReturns = monthlyOrders.filter(o => o.status === 'retour').length;

    const businessContext = {
        products: products.map(p => ({ name: p.name, price: p.price, cost: p.costPrice, stock: p.stock })),
        orders: orders.map(o => ({ id: o.id, status: o.status, price: o.price, date: o.date, productName: o.articleName })),
        stats: { 
            totalRevenue, 
            totalProfit, 
            totalOrders: monthlyOrders.length,
            totalReturns 
        },
        clientCount: customers.length
    };

    const { createOrder, updateOrderStatus } = useOrderActions();

    const processAction = async (action) => {
        if (!action) return null;
        
        try {
            switch (action.action) {
                case "CREATE_ORDER":
                    const orderData = {
                        ...action.data,
                        storeId: store?.id,
                        status: 'reçu',
                        date: new Date().toISOString().split('T')[0],
                        quantity: parseInt(action.data.quantity) || 1,
                        price: parseFloat(action.data.price) || 0,
                        shippingCost: 0,
                        paymentMethod: 'cod',
                        note: action.data.note || ""
                    };
                    await createOrder(orderData);
                    return "✅ Commande créée avec succès !";

                case "UPDATE_ORDER_STATUS":
                    await updateOrderStatus(action.data.orderId, action.data.newStatus);
                    return `✅ Statut de la commande mis à jour vers "${action.data.newStatus}".`;

                case "CREATE_EXPENSE":
                    await addDoc(collection(db, "expenses"), {
                        ...action.data,
                        storeId: store?.id,
                        date: new Date().toISOString().split('T')[0],
                        createdAt: serverTimestamp()
                    });
                    return `✅ Dépense de ${action.data.amount} DH enregistrée (${action.data.label}).`;

                case "SEND_WHATSAPP":
                    const message = action.data.message || "Bonjour !";
                    const url = createRawWhatsAppLink(action.data.phone, message);
                    window.open(url, '_blank');
                    return "📱 Lien WhatsApp généré et ouvert !";

                case "GET_ANALYTICS":
                    return `📊 J'analyse les données pour la métrique "${action.data.metric}"... (Simulé)`;

                default:
                    console.warn("Action non supportée:", action.action);
                    return null;
            }
        } catch (e) {
            console.error("AI Action Error:", e);
            return `❌ Erreur lors de l'exécution de l'action ${action.action}.`;
        }
    };

    const togglePanel = () => setIsOpen(prev => !prev);

    const sendMessage = async (text) => {
        if (!text.trim()) return;

        const userMsg = { id: Date.now(), role: 'user', content: text };
        const updatedHistory = [...messages, userMsg];
        setMessages(prev => [...prev, userMsg]);
        setLoading(true);
        setIsStreaming(true);

        // Placeholder for streaming message
        const streamId = Date.now() + 1;
        setMessages(prev => [...prev, { id: streamId, role: 'assistant', content: "..." }]);

        try {
            const finalResponse = await generateCopilotResponse(
                updatedHistory, 
                businessContext,
                store?.name,
                (chunk) => {
                    setMessages(prev => prev.map(m => 
                        m.id === streamId ? { ...m, content: chunk } : m
                    ));
                }
            );

            // DETECT ACTION
            const action = extractActionFromResponse(finalResponse);
            let actionFeedback = null;
            let displayContent = finalResponse;

            if (action) {
                // Remove JSON from display if it's there
                displayContent = finalResponse.replace(/```json[\s\S]*?```/g, "").trim();
                actionFeedback = await processAction(action);
            }

            setMessages(prev => prev.map(m => 
                m.id === streamId ? { 
                    ...m, 
                    content: displayContent + (actionFeedback ? `\n\n*${actionFeedback}*` : "") 
                } : m
            ));

        } catch (error) {
            console.error("Copilot Error:", error);
            toast.error("Oups, je suis un peu fatiguée... Réessaie plus tard ! 😴");
            setMessages(prev => prev.filter(m => m.id !== streamId));
        } finally {
            setLoading(false);
            setIsStreaming(false);
        }
    };

    const clearHistory = () => {
        const welcome = {
            id: 'welcome',
            role: 'assistant',
            content: "On repart à zéro ! Qu'est-ce qu'on fait de beau aujourd'hui ? ✨"
        };
        setMessages([welcome]);
        localStorage.removeItem(`copilot_history_${store?.id}`);
    };

    return (
        <CopilotContext.Provider value={{ isOpen, togglePanel, messages, sendMessage, loading, clearHistory }}>
            {children}
        </CopilotContext.Provider>
    );
};
