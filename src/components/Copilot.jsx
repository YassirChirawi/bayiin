import { useState, useRef, useEffect } from "react";
import { useCopilot } from "../context/CopilotContext";
import { X, Send, Sparkles, MessageSquare, Trash2, Minimize2, Maximize2 } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from "framer-motion";

export default function Copilot() {
    const { isOpen, togglePanel, messages, sendMessage, loading, clearHistory } = useCopilot();
    const [input, setInput] = useState("");
    const scrollRef = useRef(null);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, loading]);

    const handleSend = (e) => {
        e.preventDefault();
        sendMessage(input);
        setInput("");
    };

    return (
        <>
            {/* Floating Trigger Button */}
            {!isOpen && (
                <motion.button
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    whileHover={{ scale: 1.1 }}
                    onClick={togglePanel}
                    className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-gradient-to-r from-rose-500 to-pink-500 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all"
                >
                    <div className="relative">
                        <img
                            src="https://api.dicebear.com/9.x/avataaars/svg?seed=Beya3&style=circle&eyebrows=defaultNatural&eyes=default&mouth=smile"
                            alt="Beya3"
                            className="w-8 h-8 rounded-full bg-white"
                        />
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                        </span>
                    </div>
                    <span className="font-semibold hidden sm:block">Ask Beya3</span>
                </motion.button>
            )}

            {/* Chat Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 100, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 100, scale: 0.9 }}
                        className="fixed bottom-0 right-0 sm:bottom-6 sm:right-6 z-50 w-full sm:w-[450px] h-[100dvh] sm:h-[600px] bg-white sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-rose-100"
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-rose-500 to-pink-600 p-4 flex items-center justify-between text-white shadow-md">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-white/20 p-0.5 border-2 border-white/50">
                                    <img
                                        src="https://api.dicebear.com/9.x/avataaars/svg?seed=Beya3&style=circle&eyebrows=defaultNatural&eyes=default&mouth=smile"
                                        alt="Beya3"
                                        className="w-full h-full rounded-full bg-white"
                                    />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">Beya3 AI</h3>
                                    <div className="flex items-center gap-1.5 ">
                                        <Sparkles className="w-3 h-3 text-yellow-300" />
                                        <p className="text-xs text-rose-100 font-medium">Head of Growth • BayIIn</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={clearHistory}
                                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                                    title="Nouvelle conversation"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={togglePanel}
                                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div
                            ref={scrollRef}
                            className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 scroll-smooth"
                        >
                            {messages.map((msg) => (
                                <motion.div
                                    key={msg.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`
                                            max-w-[85%] rounded-2xl p-3.5 shadow-sm relative text-sm leading-relaxed
                                            ${msg.role === 'user'
                                                ? 'bg-rose-500 text-white rounded-tr-none'
                                                : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
                                            }
                                        `}
                                    >
                                        {msg.role === 'assistant' ? (
                                            <div className="markdown-body text-gray-800">
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

                            {loading && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex justify-start"
                                >
                                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 rounded-tl-none flex items-center gap-2">
                                        <div className="w-2 h-2 bg-rose-400 rounded-full animate-bounce"></div>
                                        <div className="w-2 h-2 bg-rose-400 rounded-full animate-bounce delay-75"></div>
                                        <div className="w-2 h-2 bg-rose-400 rounded-full animate-bounce delay-150"></div>
                                    </div>
                                </motion.div>
                            )}
                        </div>

                        {/* Input Area */}
                        <form onSubmit={handleSend} className="p-4 bg-white border-t border-gray-100">
                            <div className="relative flex items-center">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Demande un conseil à Beya3..."
                                    className="w-full pl-4 pr-12 py-3.5 bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:border-rose-300 focus:ring-1 focus:ring-rose-300 transition-all text-sm shadow-inner"
                                    autoFocus
                                />
                                <button
                                    type="submit"
                                    disabled={!input.trim() || loading}
                                    className="absolute right-2 p-2 bg-rose-500 text-white rounded-full hover:bg-rose-600 disabled:opacity-50 disabled:hover:bg-rose-500 transition-colors shadow-md"
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="mt-2 text-center">
                                <p className="text-[10px] text-gray-400 flex items-center justify-center gap-1">
                                    <Sparkles className="w-3 h-3" /> Powered by Gemini AI
                                </p>
                            </div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
