import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, MessageCircle } from 'lucide-react';

const FAQS = [
  {
    question: "BayIIn est-il compatible avec ma boutique YouCan / Shopify ?",
    // Réponse revue : les intégrations YouCan et Shopify sont derrière un drapeau
    // (src/config/features.js) et ne sont pas accessibles aujourd'hui. Répondre
    // « Absolument » puis « en développement » dans la même phrase était
    // contradictoire, et promettait une fonctionnalité qu'un marchand ne trouve
    // pas dans l'application.
    answer: "Aujourd'hui, oui — par import. Vous récupérez vos commandes depuis YouCan, Shopify ou WooCommerce avec un fichier Excel ou CSV, en un clic, et BayIIn prend le relais : stock, confirmation WhatsApp, livraison, finances. La synchronisation automatique est en cours de développement et n'est pas encore ouverte."
  },
  {
    question: "Comment fonctionne l'intelligence artificielle Beya3 ?",
    answer: "Beya3 est un agent autonome alimenté par les modèles d'IA de pointe (Llama-3 sur l'infrastructure Groq). Elle analyse vos ventes, stocks et dépenses en temps réel pour vous fournir des insights, anticiper les ruptures et même réaliser des actions (comme brouillonner des dépenses ou envoyer des messages WhatsApp)."
  },
  {
    question: "Puis-je gérer mes propres livreurs avec BayIIn ?",
    answer: "Oui ! Le plan PRO inclut une application PWA (Progressive Web App) dédiée à vos livreurs. Vous leur assignez les commandes depuis votre tableau de bord, et ils valident les livraisons (et encaissent le COD) directement sur leur téléphone via GPS."
  },
  {
    question: "Est-ce que je dois payer par commande ou un abonnement fixe ?",
    answer: "BayIIn fonctionne sur un modèle d'abonnement mensuel ou annuel 100% transparent. Aucune commission n'est prise sur vos ventes ou vos commandes."
  },
  {
    question: "Les messages WhatsApp de confirmation sont-ils inclus ?",
    answer: "Oui. Vous pouvez générer les liens WhatsApp pré-remplis en 1 clic pour envoyer vos confirmations manuellement (Plan Starter), ou configurer des scénarios automatiques qui envoient le message dès le changement de statut (Plan PRO)."
  }
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section className="py-24 bg-white" id="faq">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-50 text-primary-700 font-medium text-sm mb-4">
              <MessageCircle className="w-4 h-4" />
              <span>Questions Fréquentes</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Vous avez des questions ?
            </h2>
            <p className="text-xl text-gray-600">
              Tout ce que vous devez savoir sur BayIIn et comment nous pouvons vous aider.
            </p>
          </motion.div>
        </div>

        <div className="space-y-4">
          {FAQS.map((faq, index) => {
            const isOpen = index === openIndex;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className={`border rounded-2xl overflow-hidden transition-colors ${
                  isOpen ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-100 hover:border-gray-200'
                }`}
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? -1 : index)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none"
                >
                  <span className="font-semibold text-gray-900 pr-8">{faq.question}</span>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                    isOpen ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-500'
                  }`}>
                    <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                  </div>
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                      <div className="px-6 pb-5 text-gray-600 leading-relaxed border-t border-gray-100 pt-4">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
