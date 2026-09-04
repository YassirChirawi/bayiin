/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useMemo, useRef } from "react";
import { useStoreData } from "../hooks/useStoreData";
import { useTenant } from "./TenantContext";
import { useOrderActions } from "../hooks/useOrderActions";
import { generateOpeningBrief, generateLocalResponse } from "../services/localCopilot";
import { createRawWhatsAppLink } from "../utils/whatsappTemplates";
import { db } from "../lib/firebase";
import { collection, addDoc, serverTimestamp, query, orderBy, limit, onSnapshot, where, doc, updateDoc } from "firebase/firestore";
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
    const [thinkingState, setThinkingState] = useState(null);
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

    // LISTEN FOR PROACTIVE INSIGHTS (Phase 1)
    useEffect(() => {
        if (!store?.id) return;
        const q = query(
            collection(db, `stores/${store.id}/beya3_scheduled_insights`),
            where("isRead", "==", false)
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach(change => {
                if (change.type === "added") {
                    const data = change.doc.data();
                    const msg = {
                        id: change.doc.id,
                        role: 'assistant',
                        content: `🔔 **Alerte Proactive** :\n${data.content}`
                    };
                    setMessages(prev => {
                        if (prev.some(m => m.id === msg.id)) return prev;
                        return [...prev, msg];
                    });
                    if (!isOpen) {
                        toast("Nouveau message de Beya3", { icon: "💡" });
                        vibrate('soft');
                    }
                    updateDoc(doc(db, `stores/${store.id}/beya3_scheduled_insights`, change.doc.id), { isRead: true });
                }
            });
        });
        return () => unsubscribe();
    }, [store?.id, isOpen]);

    // LISTEN FOR ACTION DRAFTS (Phase 2)
    useEffect(() => {
        if (!store?.id) return;
        const q = query(
            collection(db, `stores/${store.id}/action_drafts`),
            where("status", "==", "pending_approval")
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const drafts = [];
            snapshot.forEach(docSnap => {
                const data = docSnap.data();
                drafts.push({
                    toolCallId: docSnap.id,
                    toolName: data.toolName,
                    toolArgs: data.toolArgs,
                    source: data.source
                });
            });
            // Update state with drafts from Firestore (includes both chat and background drafts)
            setPendingActions(drafts);
        });
        return () => unsubscribe();
    }, [store?.id]);

    // Approuve un DRAFT pour exécution par le backend
    const confirmAction = async (actionId, toolName, toolArgs) => {
        setPendingActions(prev => prev.filter(a => a.toolCallId !== actionId));
        toast.loading("Validation en cours...", { id: actionId });
        
        try {
            // PHASE 2: Autonomous Action Layer - Update Firestore draft status
            const draftRef = doc(db, `stores/${store?.id}/action_drafts`, actionId);
            await updateDoc(draftRef, {
                status: 'approved',
                approvedAt: serverTimestamp()
            });
            toast.success("Action approuvée ! Elle s'exécutera en arrière-plan.", { id: actionId });
        } catch (e) {
            toast.error("Échec de l'approbation.", { id: actionId });
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

    const cancelAction = async (actionId) => {
        setPendingActions(prev => prev.filter(a => a.toolCallId !== actionId));
        try {
            const draftRef = doc(db, `stores/${store?.id}/action_drafts`, actionId);
            await updateDoc(draftRef, {
                status: 'rejected',
                rejectedAt: serverTimestamp()
            });
        } catch (e) {}
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
        setThinkingState("J'analyse...");

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
                    onChunk: (event) => {
                        if (event.delta) {
                            currentText = event.delta;
                            setMessages(prev => prev.map(m => m.id === streamId ? { ...m, content: currentText } : m));
                            if (currentText.length > 5) setThinkingState(null); // Stop thinking indicator once text starts streaming
                        }
                        if (event.thinking) {
                            setThinkingState(event.thinking);
                        }
                        // Note: actionsDrafted sont maintenant récupérées par le listener onSnapshot
                    }
                });
            }
        } catch (error) {
            console.error("Copilot: appel distant impossible, repli local.", error);

            // REPLI REEL sur le moteur local, au lieu d'un message d'excuse.
            //
            // Avant, toute panne — fonction injoignable, cle Groq absente, reseau
            // coupe — affichait « Oups, j'ai eu un petit bug interne... Reessaie ! »,
            // et reessayer ne changeait rien. Le moteur local existait pourtant :
            // il connait les ventes, le stock et le contexte de la boutique, mais
            // n'etait atteignable que via la variable VITE_AI_MODE.
            //
            // Beya3 reste donc utile hors ligne et pendant une panne Groq. Le mode
            // degrade est ANNONCE : on ne fait pas passer une reponse heuristique
            // pour une reponse du modele.
            let fallbackText = null;
            try {
                fallbackText = generateLocalResponse(text, businessContext);
            } catch (localError) {
                console.error("Copilot: le moteur local a echoue aussi.", localError);
            }

            const degraded = fallbackText
                ? `_Mode hors ligne — je reponds avec vos donnees locales._\n\n${fallbackText}`
                : "Je n'arrive pas a vous repondre pour le moment. Verifiez votre connexion ; vos donnees, elles, ne risquent rien.";

            setMessages(prev => prev.map(m =>
                m.id === streamId ? { ...m, content: degraded, degraded: true } : m
            ));
        } finally {
            setLoading(false);
            setIsStreaming(false);
            setThinkingState(null);
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
        <CopilotContext.Provider value={{ isOpen, togglePanel, messages, sendMessage, loading, clearHistory, pendingActions, confirmAction, cancelAction, recentActions, undoLastAction, thinkingState }}>
            {children}
        </CopilotContext.Provider>
    );
};
