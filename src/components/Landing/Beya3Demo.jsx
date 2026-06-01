import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Bot, User, Sparkles, X } from 'lucide-react';
import { generateLocalResponse } from '../../services/localCopilot';

const mockContext = {
  stats: { totalRevenue: 15400, totalProfit: 4620, totalOrders: 35, totalReturns: 2 },
  products: [
    { name: "Pack Argan Bio", stock: 12 },
    { name: "T-Shirt Oversize", stock: 2 }
  ],
  store: { name: "Ma Boutique Test" }
};

const SUGGESTIONS = [
  "Analyse ma rentabilité",
  "Crée une commande pour Amine au 0611223344",
  "Quels sont mes produits en rupture ?"
];

export default function Beya3Demo() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Salam ! Je suis Beya3, l'IA de BayIIn. Posez-moi une question sur vos ventes, ou demandez-moi de créer une commande !" }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, isOpen]);

  const handleSend = async (text) => {
    if (!text.trim()) return;

    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setInput('');
    setIsTyping(true);

    // Simulate network delay
    setTimeout(() => {
      const response = generateLocalResponse(text, mockContext);
      
      // Basic formatting for JSON blocks in demo
      const formattedResponse = response.replace(/```json\n([\s\S]*?)\n```/g, (match, jsonString) => {
          try {
              const data = JSON.parse(jsonString);
              if (data.action === "CREATE_ORDER") {
                  return `\n\n*(Action simulée : Création d'une commande de ${data.data.price || 0} DH pour ${data.data.clientName})* ✅`;
              }
              if (data.action === "ANALYZE_FINANCES") {
                  return `\n\n*(Action simulée : Lancement de l'analyse financière profonde)* 📊`;
              }
              return `\n\n*(Action simulée : ${data.action})* ⚡`;
          } catch(e) { return match; }
      });

      setMessages(prev => [...prev, { role: 'assistant', content: formattedResponse }]);
      setIsTyping(false);
    }, 1000);
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(true)}
          className="relative flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-primary-600 to-indigo-600 text-white rounded-full shadow-2xl hover:shadow-primary-500/50 transition-all"
        >
          <div className="absolute -inset-1 bg-white/20 rounded-full blur-md animate-pulse"></div>
          <Bot className="w-6 h-6" />
          <span className="font-semibold">Tester Beya3 IA</span>
          <Sparkles className="w-4 h-4 text-yellow-300" />
        </motion.button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-3rem)]">
      <motion.div 
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="bg-white/80 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[500px]"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-indigo-600 p-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold leading-tight">Beya3 (Démo Live)</h3>
              <p className="text-xs text-primary-100">Directrice Financière & Opérationnelle</p>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-primary-600" />
                </div>
              )}
              <div className={`px-4 py-3 rounded-2xl max-w-[85%] text-sm ${
                msg.role === 'user' 
                  ? 'bg-gray-900 text-white rounded-br-none' 
                  : 'bg-white border border-gray-100 shadow-sm text-gray-800 rounded-tl-none'
              }`}>
                {msg.content.split('\n').map((line, i) => (
                  <p key={i} className="mb-1 last:mb-0">
                    {line.includes('**') ? (
                       <span dangerouslySetInnerHTML={{__html: line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}} />
                    ) : line}
                  </p>
                ))}
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary-600" />
              </div>
              <div className="px-4 py-3 rounded-2xl bg-white border border-gray-100 shadow-sm rounded-tl-none flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions */}
        {messages.length === 1 && (
          <div className="px-4 pb-2 flex flex-wrap gap-2">
            {SUGGESTIONS.map((sug, i) => (
              <button 
                key={i}
                onClick={() => handleSend(sug)}
                className="text-xs px-3 py-1.5 bg-primary-50 text-primary-700 hover:bg-primary-100 rounded-full transition-colors border border-primary-100"
              >
                {sug}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="p-4 bg-white/50 border-t border-gray-100">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Écrivez un message..."
              className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
            />
            <button 
              type="submit"
              disabled={!input.trim() || isTyping}
              className="p-2.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
