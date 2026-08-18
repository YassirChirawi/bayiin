import { useState, useRef, useEffect } from "react";
import { useCopilot } from "../context/CopilotContext";
import { X, Send, Sparkles, Trash2, Mic, MicOff, CheckCircle2, XCircle, Undo2 } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { useVoiceCopilot } from "../hooks/useVoiceCopilot";
import { useLanguage } from "../context/LanguageContext";

// --- COMPOSANT ACTION CONFIRMATION ---
const ActionConfirmation = ({ action, onConfirm, onCancel, timeoutSeconds = 60 }) => {
    const [timeLeft, setTimeLeft] = useState(timeoutSeconds);

    useEffect(() => {
        if (timeLeft <= 0) {
            onCancel(action.toolCallId);
            return;
        }
        const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
        return () => clearInterval(timer);
    }, [timeLeft, action.toolCallId, onCancel]);

    let title = "Action demandée";
    let description = "";

    if (action.toolName === "draft_expense") {
        title = "Créer une dépense";
        description = `${action.toolArgs.label} — ${action.toolArgs.amount} MAD (${action.toolArgs.category})`;
    } else if (action.toolName === "bulk_update_orders") {
        title = "Mise à jour groupée";
        description = `${action.toolArgs.orderIds.length} commandes vers le statut "${action.toolArgs.newStatus}"`;
    } else if (action.toolName === "send_whatsapp_campaign") {
        title = "Campagne WhatsApp";
        description = `Vers le segment "${action.toolArgs.customerSegment}"`;
    }

    return (
        <div className="bg-white border border-rose-200 rounded-xl p-4 shadow-sm mb-4 relative overflow-hidden">
            <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-rose-500" />
                <h4 className="font-bold text-gray-800 text-sm">{title}</h4>
            </div>
            <p className="text-sm text-gray-600 mb-4">{description}</p>
            
            {/* Progress bar for timer */}
            <div className="w-full bg-gray-100 h-1.5 rounded-full mb-3 overflow-hidden">
                <motion.div 
                    initial={{ width: "100%" }}
                    animate={{ width: `${(timeLeft / timeoutSeconds) * 100}%` }}
                    transition={{ ease: "linear", duration: 1 }}
                    className={`h-full ${timeLeft < 10 ? 'bg-red-500' : 'bg-rose-500'}`}
                />
            </div>
            
            <div className="flex items-center justify-between">
                <span className={`text-xs font-medium ${timeLeft < 10 ? 'text-red-500' : 'text-gray-500'}`}>
                    Expire dans {timeLeft}s
                </span>
                <div className="flex gap-2">
                    <button 
                        onClick={() => onCancel(action.toolCallId)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                        <XCircle className="w-3 h-3" /> Annuler
                    </button>
                    <button 
                        onClick={() => onConfirm(action.toolCallId, action.toolName, action.toolArgs)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-green-500 hover:bg-green-600 transition-colors shadow-sm shadow-green-500/20"
                    >
                        <CheckCircle2 className="w-3 h-3" /> Confirmer
                    </button>
                </div>
            </div>
        </div>
    );
};


export default function Copilot() {
    const { isOpen, togglePanel, messages, sendMessage, loading, clearHistory, pendingActions, confirmAction, cancelAction, recentActions, undoLastAction, thinkingState } = useCopilot();
    const [input, setInput] = useState("");
    const scrollRef = useRef(null);
    const { language: currentLang } = useLanguage();

    // Voice Command Hook — multi-language with interim results
    const voiceLang = currentLang === 'ar' ? 'ar' : currentLang === 'en' ? 'en' : 'fr';
    const { 
        isListening, isSupported: voiceSupported, interimTranscript, error: voiceError,
        toggleListening, clearTranscript 
    } = useVoiceCopilot({
        language: voiceLang,
        onTranscript: (text) => setInput(text),
    });

    // Show voice errors as toasts
    useEffect(() => {
        if (voiceError) toast.error(voiceError);
    }, [voiceError]);

    const toggleListen = (e) => {
        e.preventDefault();
        if (!voiceSupported) {
            toast.error("La reconnaissance vocale n'est pas supportée sur ce navigateur.");
            return;
        }
        toggleListening();
    };

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, loading, pendingActions]);

    const handleSend = (e) => {
        e.preventDefault();
        if (!input.trim()) return;
        sendMessage(input);
        setInput("");
        clearTranscript();
    };

    return (
        <>
            {!isOpen && (
                <motion.button
                    data-testid="copilot-trigger"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    whileHover={{ scale: 1.1 }}
                    onClick={togglePanel}
                    className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-gradient-to-r from-rose-500 to-pink-500 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all"
                >
                    <div className="relative">
                        <img src="https://api.dicebear.com/9.x/avataaars/svg?seed=Beya3&style=circle&eyebrows=defaultNatural&eyes=default&mouth=smile" alt="Beya3" className="w-8 h-8 rounded-full bg-white" />
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                        </span>
                    </div>
                    <span className="font-semibold hidden sm:block">Ask Beya3</span>
                </motion.button>
            )}

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 100, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 100, scale: 0.9 }}
                        className="fixed bottom-0 right-0 sm:bottom-6 sm:right-6 z-50 w-full sm:w-[450px] h-[100dvh] sm:h-[650px] bg-white sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-rose-100"
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-rose-500 to-pink-600 p-4 flex items-center justify-between text-white shadow-md z-10 relative">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-white/20 p-0.5 border-2 border-white/50">
                                    <img src="https://api.dicebear.com/9.x/avataaars/svg?seed=Beya3&style=circle&eyebrows=defaultNatural&eyes=default&mouth=smile" alt="Beya3" className="w-full h-full rounded-full bg-white" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">Beya3 AI</h3>
                                    <div className="flex items-center gap-1.5 ">
                                        <Sparkles className="w-3 h-3 text-yellow-300" />
                                        <p className="text-xs text-rose-100 font-medium">CFO / COO • BayIIn</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={clearHistory} className="p-2 hover:bg-white/10 rounded-full transition-colors" title="Nouvelle conversation">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                                <button onClick={togglePanel} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Memory Indicator (Optional, could be populated dynamically if context exposes it) */}
                        <div className="bg-rose-50 px-4 py-2 text-[10px] text-rose-700 font-medium flex items-center gap-1.5 border-b border-rose-100">
                            <Sparkles className="w-3 h-3" />
                            <span>Je me souviens de vos préférences et mémorise nos échanges clés.</span>
                        </div>

                        {/* Messages Area */}
                        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 scroll-smooth">
                            {messages.map((msg) => (
                                <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] rounded-2xl p-3.5 shadow-sm relative text-sm leading-relaxed ${msg.role === 'user' ? 'bg-rose-500 text-white rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'}`}>
                                        {msg.role === 'assistant' ? (
                                            <div className="markdown-body text-gray-800 prose prose-sm">
                                                <ReactMarkdown
                                                    components={{
                                                        p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                                                        ul: ({ node, ...props }) => <ul className="list-disc pl-4 mb-2" {...props} />,
                                                        li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                                                        strong: ({ node, ...props }) => <strong className="font-bold text-rose-600" {...props} />,
                                                    }}
                                                >
                                                    {msg.content}
                                                </ReactMarkdown>
                                            </div>
                                        ) : (
                                            <p>{msg.content}</p>
                                        )}
                                        <span className={`text-[10px] absolute bottom-1 ${msg.role === 'user' ? 'left-2 text-rose-200' : 'right-2 text-gray-400'}`}>
                                            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </motion.div>
                            ))}

                            {/* Pending Actions UI */}
                            {pendingActions.map(action => (
                                <motion.div key={action.toolCallId} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                                    <ActionConfirmation 
                                        action={action} 
                                        onConfirm={confirmAction} 
                                        onCancel={cancelAction} 
                                        timeoutSeconds={60} 
                                    />
                                </motion.div>
                            ))}

                            {loading && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 rounded-tl-none flex flex-col items-start gap-2">
                                        {thinkingState && (
                                            <div className="flex items-center gap-2 text-xs text-rose-500 font-medium italic mb-1">
                                                <Sparkles className="animate-pulse w-3 h-3" />
                                                {thinkingState}
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 bg-rose-400 rounded-full animate-bounce"></div>
                                            <div className="w-2 h-2 bg-rose-400 rounded-full animate-bounce delay-75"></div>
                                            <div className="w-2 h-2 bg-rose-400 rounded-full animate-bounce delay-150"></div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* Rollback-eligible actions */}
                            {recentActions?.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 px-1">
                                    {recentActions.map(action => {
                                        const minutesLeft = Math.max(0, Math.round((action.rollbackDeadline - Date.now()) / 60000));
                                        return (
                                            <motion.button
                                                key={action.id}
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0 }}
                                                onClick={() => undoLastAction(action.id)}
                                                className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-full text-[10px] text-amber-700 font-medium transition-colors cursor-pointer"
                                                title={`Annuler: ${action.toolName}`}
                                            >
                                                <Undo2 className="w-3 h-3" />
                                                <span>↩️ Annulable {minutesLeft}m</span>
                                            </motion.button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Input Area */}
                        <form onSubmit={handleSend} className="p-4 bg-white border-t border-gray-100">
                            {/* Interim transcript indicator */}
                            <AnimatePresence>
                                {isListening && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="mb-2 px-3 py-2 bg-rose-50 rounded-lg border border-rose-100 flex items-center gap-2"
                                    >
                                        <div className="flex gap-1">
                                            <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" />
                                            <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" style={{ animationDelay: '0.15s' }} />
                                            <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }} />
                                        </div>
                                        <span className="text-xs text-rose-600 font-medium truncate">
                                            {interimTranscript || 'Écoute en cours...'}
                                        </span>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="relative flex items-center">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Posez une question sur vos finances, stocks..."
                                    className="w-full pl-4 pr-24 py-3.5 bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:border-rose-300 focus:ring-1 focus:ring-rose-300 transition-all text-sm shadow-inner"
                                    autoFocus
                                />
                                <div className="absolute right-2 flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={toggleListen}
                                        className={`relative p-2 rounded-full transition-all duration-300 ${isListening ? "bg-rose-500 text-white shadow-lg shadow-rose-500/30" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"}`}
                                        title="Parler à Beya3"
                                    >
                                        {/* Animated ring when listening */}
                                        {isListening && (
                                            <span className="absolute inset-0 rounded-full border-2 border-rose-400 animate-ping opacity-50" />
                                        )}
                                        {isListening ? <Mic className="w-4 h-4 relative z-10" /> : <MicOff className="w-4 h-4" />}
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!input.trim() || loading}
                                        className="p-2 bg-rose-500 text-white rounded-full hover:bg-rose-600 disabled:opacity-50 disabled:hover:bg-rose-500 transition-colors shadow-md"
                                    >
                                        <Send className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
