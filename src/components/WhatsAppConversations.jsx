/**
 * WhatsAppConversations — Dashboard component for managing WhatsApp conversations
 *
 * Displays active WhatsApp conversations managed by Beya3 bot with:
 * - Masked phone numbers
 * - Conversation status badges
 * - Last message preview
 * - Human handoff indicators
 * - Mini-chat for manual responses
 */

import { useState, useMemo } from "react";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useTenant } from "../context/TenantContext";
import { useLanguage } from "../context/LanguageContext";
import { MessageCircle, User, Clock, AlertTriangle, CheckCircle, X, Send, Phone, ChevronDown, ChevronUp } from "lucide-react";
import { useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";

// Status configuration
const STATUS_CONFIG = {
    awaiting_confirmation: { label: "En attente", color: "bg-yellow-100 text-yellow-800 border-yellow-200", dot: "bg-yellow-400", icon: "🟡" },
    confirmed: { label: "Confirmé", color: "bg-green-100 text-green-800 border-green-200", dot: "bg-green-400", icon: "🟢" },
    refused: { label: "Refusé", color: "bg-red-100 text-red-800 border-red-200", dot: "bg-red-400", icon: "🔴" },
    rescheduled: { label: "Reporté", color: "bg-blue-100 text-blue-800 border-blue-200", dot: "bg-blue-400", icon: "📅" },
    question: { label: "Question", color: "bg-indigo-100 text-indigo-800 border-indigo-200", dot: "bg-indigo-400", icon: "🔵" },
    closed: { label: "Fermé", color: "bg-gray-100 text-gray-600 border-gray-200", dot: "bg-gray-400", icon: "⚪" }
};

/**
 * Mask a phone number for privacy: 212XXXXX78
 */
function maskPhone(phone) {
    if (!phone || phone.length < 6) return phone || "—";
    return phone.slice(0, 3) + "XXXXX" + phone.slice(-2);
}

/**
 * Format relative time (e.g., "il y a 5 min")
 */
function timeAgo(timestamp) {
    if (!timestamp) return "—";
    try {
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return formatDistanceToNow(date, { addSuffix: true, locale: fr });
    } catch {
        return "—";
    }
}

export default function WhatsAppConversations() {
    const { store } = useTenant();
    const { t } = useLanguage();
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedChat, setExpandedChat] = useState(null);
    const [replyText, setReplyText] = useState("");
    const [sending, setSending] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);

    // Real-time listener for WhatsApp conversations
    useEffect(() => {
        if (!store?.id) return;

        const convRef = collection(db, "stores", store.id, "whatsapp_conversations");
        const q = query(convRef, orderBy("lastMessageAt", "desc"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const convs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setConversations(convs);
            setLoading(false);
        }, (error) => {
            console.error("[WhatsApp] Conversations listener error:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [store?.id]);

    // Sort: handoff first, then by lastMessageAt
    const sortedConversations = useMemo(() => {
        return [...conversations]
            .filter(c => c.state !== "closed")
            .sort((a, b) => {
                // Handoff requests always on top
                if (a.handoffRequested && !b.handoffRequested) return -1;
                if (!a.handoffRequested && b.handoffRequested) return 1;
                // Then by last message time
                const timeA = a.lastMessageAt?.toDate?.() || new Date(0);
                const timeB = b.lastMessageAt?.toDate?.() || new Date(0);
                return timeB - timeA;
            });
    }, [conversations]);

    // Count handoff requests for badge
    const handoffCount = useMemo(() =>
        conversations.filter(c => c.handoffRequested && c.state !== "closed").length
    , [conversations]);

    // Handle manual reply from merchant
    const handleSendReply = async (conv) => {
        if (!replyText.trim() || !store?.id) return;
        setSending(true);

        try {
            // Add the reply as a message in the conversation
            const convRef = doc(db, "stores", store.id, "whatsapp_conversations", conv.id);
            const existingMessages = conv.messages || [];

            await updateDoc(convRef, {
                messages: [
                    ...existingMessages,
                    {
                        role: "merchant",
                        content: replyText.trim(),
                        timestamp: new Date().toISOString()
                    }
                ],
                lastMessageAt: serverTimestamp(),
                handoffRequested: false // Clear handoff after merchant responds
            });

            // Log the outbound message
            await addDoc(collection(db, "stores", store.id, "whatsapp_logs"), {
                direction: "outbound_manual",
                phone: conv.phone,
                content: replyText.trim(),
                orderId: conv.orderId || "",
                timestamp: serverTimestamp()
            });

            toast.success("Message envoyé (à traiter manuellement via WhatsApp)");
            setReplyText("");
            setExpandedChat(null);
        } catch (error) {
            console.error("[WhatsApp] Reply error:", error);
            toast.error("Erreur lors de l'envoi");
        } finally {
            setSending(false);
        }
    };

    // Handle close conversation
    const handleCloseConversation = async (conv) => {
        if (!store?.id) return;
        try {
            const convRef = doc(db, "stores", store.id, "whatsapp_conversations", conv.id);
            await updateDoc(convRef, {
                state: "closed",
                handoffRequested: false
            });
            toast.success("Conversation fermée");
        } catch (error) {
            console.error("[WhatsApp] Close error:", error);
            toast.error("Erreur");
        }
    };

    if (loading) {
        return (
            <div className="glass-panel rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="h-5 w-5 bg-green-200 rounded animate-pulse" />
                    <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
                </div>
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    if (sortedConversations.length === 0) return null;

    return (
        <div className="glass-panel rounded-xl overflow-hidden">
            {/* Header */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="w-full p-5 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="bg-green-100 p-2 rounded-lg">
                            <MessageCircle className="h-5 w-5 text-green-600" />
                        </div>
                        {handoffCount > 0 && (
                            <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-[10px] font-bold bg-red-500 text-white rounded-full animate-pulse">
                                {handoffCount}
                            </span>
                        )}
                    </div>
                    <div className="text-left">
                        <h3 className="text-sm font-bold text-gray-900">
                            WhatsApp Beya3
                        </h3>
                        <p className="text-xs text-gray-500">
                            {sortedConversations.length} conversation{sortedConversations.length > 1 ? "s" : ""} active{sortedConversations.length > 1 ? "s" : ""}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {handoffCount > 0 && (
                        <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded-lg border border-red-200">
                            {handoffCount} transfert{handoffCount > 1 ? "s" : ""}
                        </span>
                    )}
                    {isCollapsed ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronUp className="h-4 w-4 text-gray-400" />}
                </div>
            </button>

            {/* Conversation List */}
            <AnimatePresence>
                {!isCollapsed && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="px-5 pb-5 space-y-2 max-h-[400px] overflow-y-auto">
                            {sortedConversations.map(conv => {
                                const statusCfg = STATUS_CONFIG[conv.state] || STATUS_CONFIG.question;
                                const lastMsg = conv.messages?.[conv.messages.length - 1];
                                const isExpanded = expandedChat === conv.id;

                                return (
                                    <div key={conv.id} className={`rounded-xl border transition-all ${
                                        conv.handoffRequested
                                            ? "border-red-200 bg-red-50/50"
                                            : "border-gray-100 bg-gray-50/50 hover:bg-gray-50"
                                    }`}>
                                        {/* Conversation Row */}
                                        <div
                                            className="p-3 cursor-pointer"
                                            onClick={() => setExpandedChat(isExpanded ? null : conv.id)}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                                    {/* Handoff indicator */}
                                                    {conv.handoffRequested && (
                                                        <div className="flex-shrink-0">
                                                            <AlertTriangle className="h-4 w-4 text-red-500 animate-pulse" />
                                                        </div>
                                                    )}

                                                    {/* Phone */}
                                                    <div className="flex items-center gap-1.5">
                                                        <Phone className="h-3 w-3 text-gray-400" />
                                                        <span className="text-sm font-mono font-medium text-gray-700">
                                                            {maskPhone(conv.phone)}
                                                        </span>
                                                    </div>

                                                    {/* Order number */}
                                                    {conv.orderNumber && (
                                                        <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 flex-shrink-0">
                                                            #{conv.orderNumber}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                                    {/* Status badge */}
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusCfg.color}`}>
                                                        {statusCfg.icon} {statusCfg.label}
                                                    </span>

                                                    {/* Time */}
                                                    <span className="text-[10px] text-gray-400 whitespace-nowrap hidden sm:inline">
                                                        {timeAgo(conv.lastMessageAt)}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Last message preview */}
                                            {lastMsg && (
                                                <p className="text-xs text-gray-500 mt-1.5 truncate pl-0 sm:pl-7">
                                                    <span className="font-medium text-gray-600">
                                                        {lastMsg.role === "user" ? "Client" : lastMsg.role === "merchant" ? "Vous" : "Beya3"}:
                                                    </span>{" "}
                                                    {(lastMsg.content || "").slice(0, 50)}{lastMsg.content?.length > 50 ? "…" : ""}
                                                </p>
                                            )}
                                        </div>

                                        {/* Expanded: Mini-chat */}
                                        <AnimatePresence>
                                            {isExpanded && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: "auto", opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="border-t border-gray-200 overflow-hidden"
                                                >
                                                    {/* Message History */}
                                                    <div className="p-3 max-h-48 overflow-y-auto space-y-2 bg-white/50">
                                                        {(conv.messages || []).slice(-8).map((msg, idx) => (
                                                            <div key={idx} className={`flex ${msg.role === "user" ? "justify-start" : "justify-end"}`}>
                                                                <div className={`max-w-[80%] px-3 py-1.5 rounded-xl text-xs ${
                                                                    msg.role === "user"
                                                                        ? "bg-gray-200 text-gray-800"
                                                                        : msg.role === "merchant"
                                                                        ? "bg-indigo-500 text-white"
                                                                        : "bg-green-100 text-green-800"
                                                                }`}>
                                                                    <p className="font-medium text-[10px] opacity-70 mb-0.5">
                                                                        {msg.role === "user" ? "Client" : msg.role === "merchant" ? "Vous" : "Beya3 🤖"}
                                                                    </p>
                                                                    <p>{msg.content}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {(!conv.messages || conv.messages.length === 0) && (
                                                            <p className="text-xs text-gray-400 text-center italic py-2">
                                                                Aucun message dans l'historique
                                                            </p>
                                                        )}
                                                    </div>

                                                    {/* Reply Input */}
                                                    <div className="p-3 bg-gray-50 border-t border-gray-100 flex items-center gap-2">
                                                        <input
                                                            type="text"
                                                            value={replyText}
                                                            onChange={(e) => setReplyText(e.target.value)}
                                                            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendReply(conv)}
                                                            placeholder="Répondre au client..."
                                                            className="flex-1 text-sm px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none bg-white"
                                                        />
                                                        <button
                                                            onClick={() => handleSendReply(conv)}
                                                            disabled={!replyText.trim() || sending}
                                                            className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                                                        >
                                                            <Send className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleCloseConversation(conv)}
                                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                                                            title="Fermer la conversation"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
