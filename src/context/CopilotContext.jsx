/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useMemo, useRef } from "react";
import { useStoreData } from "../hooks/useStoreData";
import { useTenant } from "./TenantContext";
import { useOrderActions } from "../hooks/useOrderActions";
import { generateOpeningBrief, generateLocalResponse } from "../services/localCopilot";
import { createRawWhatsAppLink } from "../utils/whatsappTemplates";
import { db } from "../lib/firebase";
import { collection, addDoc, serverTimestamp, query, orderBy, limit } from "firebase/firestore";
import toast from "react-hot-toast";
import { vibrate } from "../utils/haptics";
import { queueOrder, getPendingCount } from "../services/offlineQueue";

const CopilotContext = createContext();
export const useCopilot = () => useContext(CopilotContext);

export const CopilotProvider = ({ children }) => {
    const { store } = useTenant();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState(() => {
        try {
            const saved = localStorage.getItem(`copilot_history_${store?.id}`);
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    });
    const [loading, setLoading] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [pendingSyncCount, setPendingSyncCount] = useState(0);
    const [pendingActions, setPendingActions] = useState([]);
    const [recentActions, setRecentActions] = useState([]); // Actions confirmed, still rollback-eligible
    const [conversationId, setConversationId] = useState(crypto.randomUUID());
    const lastActionTime = useRef(0);

    // PERSISTENCE & OFFLINE LISTENERS
    useEffect(() => {
        if (store?.id) {
            try {
                localStorage.setItem(`copilot_history_${store.id}`, JSON.stringify(messages.slice(-50)));
            } catch (e) {}
        }
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        const interval = setInterval(async () => {
            const count = await getPendingCount();
            setPendingSyncCount(count);
        }, 5000);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearInterval(interval);
        };
    }, [messages, store?.id]);

    const productConstraints = useMemo(() => [orderBy("createdAt", "desc"), limit(20)], []);
    const orderConstraints = useMemo(() => [orderBy("createdAt", "desc"), limit(50)], []);
    const { data: products = [] } = useStoreData("products", productConstraints);
    const { data: orders = [] } = useStoreData("orders", orderConstraints);
    const { data: customers = [] } = useStoreData("customers");
    
    const currentMonth = new Date().toISOString().substring(0, 7);
    const monthlyOrders = orders.filter(o => o.date?.startsWith(currentMonth));
    const totalRevenue = monthlyOrders.reduce((acc, o) => acc + (o.status === 'livré' ? (parseFloat(o.price) || 0) : 0), 0);
    const totalProfit = monthlyOrders.reduce((acc, o) => acc + (o.status === 'livré' ? (parseFloat(o.profit) || 0) : 0), 0);
    const totalReturns = monthlyOrders.filter(o => o.status === 'retour').length;

    const { createOrder, updateOrderStatus, sendToOlivraison, sendToSendit } = useOrderActions();

    const businessContext = useMemo(() => ({
        store: store ? { name: store.name, plan: store.plan, currency: "DH" } : null,
        stats: { totalRevenue, totalProfit, totalOrders: monthlyOrders.length, totalReturns },
        clientCount: customers.length,
        isOnline,
        pendingSyncCount
    }), [store, totalRevenue, totalProfit, monthlyOrders.length, totalReturns, customers.length, isOnline, pendingSyncCount]);

    useEffect(() => {
        if (!store?.id) return;
        let hasSavedHistory = false;
        try {
            const saved = localStorage.getItem(`copilot_history_${store.id}`);
            if (saved && JSON.parse(saved).length > 0) hasSavedHistory = true;
        } catch (e) {}

        if (hasSavedHistory) return;

        if (orders.length > 0 || products.length > 0) {
            const brief = generateOpeningBrief(businessContext);
            if (brief) {
                setMessages([{ id: 'brief-' + Date.now(), role: 'assistant', content: brief }]);
            }
        }
    }, [orders.length, products.length, store?.id, businessContext]);

    // Exécute réellement une action DRAFT une fois confirmée par l'utilisateur
    const confirmAction = async (actionId, toolName, toolArgs) => {
        setPendingActions(prev => prev.filter(a => a.toolCallId !== actionId));
        toast.loading("Exécution en cours...", { id: actionId });
        
        try {
            switch (toolName) {
                case "draft_expense":
                    await addDoc(collection(db, "expenses"), {
                        ...toolArgs,
                        storeId: store?.id,
                        date: new Date().toISOString().split('T')[0],
                        createdAt: serverTimestamp()
                    });
                    toast.success("Dépense enregistrée !", { id: actionId });
                    break;
                case "bulk_update_orders":
                    for (const orderId of toolArgs.orderIds) {
                        await updateOrderStatus(orderId, toolArgs.newStatus);
                    }
                    toast.success(`Statut mis à jour pour ${toolArgs.orderIds.length} commandes.`, { id: actionId });
                    break;
                case "send_whatsapp_campaign":
                    toast.success("Campagne préparée (Simulation)", { id: actionId });
                    break;
                default:
                    toast.error("Action inconnue.", { id: actionId });
            }
        } catch (e) {
            toast.error("Échec de l'exécution.", { id: actionId });
        }

        // Track for rollback
        setRecentActions(prev => [...prev, {
            id: actionId,
            toolName,
            toolArgs,
            confirmedAt: Date.now(),
            rollbackDeadline: Date.now() + 60 * 60 * 1000 // 1 hour
        }]);
    };

    const cancelAction = (actionId) => {
        setPendingActions(prev => prev.filter(a => a.toolCallId !== actionId));
        toast("Action annulée.", { icon: "❌" });
    };

    // Expire old rollback-eligible actions
    useEffect(() => {
        const interval = setInterval(() => {
            setRecentActions(prev => prev.filter(a => Date.now() < a.rollbackDeadline));
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    const undoLastAction = async (actionId) => {
        toast.loading("Annulation en cours...", { id: 'undo' });
        try {
            // The actual rollback happens server-side via the copilot tool
            // For now we remove it from the UI and send a message to Beya3
            setRecentActions(prev => prev.filter(a => a.id !== actionId));
            await sendMessage(`Annule la dernière action (ID: ${actionId})`);
            toast.success("Action annulée !", { id: 'undo' });
        } catch (e) {
            toast.error("Échec de l'annulation.", { id: 'undo' });
        }
    };

    const togglePanel = () => {
        vibrate('soft');
        setIsOpen(prev => !prev);
    };

    const sendMessage = async (text) => {
        if (!text.trim()) return;
        vibrate('soft');

        const userMsg = { id: Date.now(), role: 'user', content: text };
        setMessages(prev => [...prev, userMsg]);
        setLoading(true);
        setIsStreaming(true);

        const streamId = Date.now() + 1;
        setMessages(prev => [...prev, { id: streamId, role: 'assistant', content: "" }]);

        try {
            let fullResponse = "";
            let currentText = "";

            if (import.meta.env.VITE_AI_MODE === 'local') {
                fullResponse = generateLocalResponse(text, businessContext);
                const words = fullResponse.split(" ");
                for (let i = 0; i < words.length; i++) {
                    currentText += (i === 0 ? "" : " ") + words[i];
                    setMessages(prev => prev.map(m => m.id === streamId ? { ...m, content: currentText } : m));
                    await new Promise(resolve => setTimeout(resolve, 20 + Math.random() * 40));
                }
            } else {
                const chatHistory = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));
                const { generateCopilotResponse } = await import("../services/aiService");
                
                await generateCopilotResponse({
                    messages: chatHistory,
                    businessContext,
                    storeName: store?.name,
                    storeId: store?.id,
                    conversationId: conversationId,
                    onChunk: (chunk, actions) => {
                        if (chunk) {
                            currentText = chunk;
                            setMessages(prev => prev.map(m => m.id === streamId ? { ...m, content: currentText } : m));
                        }
                        if (actions && actions.length > 0) {
                            setPendingActions(prev => [...prev, ...actions]);
                        }
                    }
                });
            }
        } catch (error) {
            console.error("Copilot Local Error:", error);
            setMessages(prev => prev.map(m => 
                m.id === streamId ? { ...m, content: "Oups, j'ai eu un petit bug interne... Réessaie ! 😅" } : m
            ));
        } finally {
            setLoading(false);
            setIsStreaming(false);
        }
    };

    const clearHistory = () => {
        try { localStorage.removeItem(`copilot_history_${store?.id}`); } catch (e) {}
        setConversationId(crypto.randomUUID());
        const brief = generateOpeningBrief(businessContext);
        setMessages([{
            id: 'brief-' + Date.now(),
            role: 'assistant',
            content: brief || "On repart à zéro ! Qu'est-ce qu'on fait aujourd'hui ? ✨"
        }]);
    };

    return (
        <CopilotContext.Provider value={{ isOpen, togglePanel, messages, sendMessage, loading, clearHistory, pendingActions, confirmAction, cancelAction, recentActions, undoLastAction }}>
            {children}
        </CopilotContext.Provider>
    );
};
