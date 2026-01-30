import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const faqs = [
    {
        question: "Est-ce que je peux utiliser BayIIn sans connaissances techniques ?",
        answer: "Absolument ! BayIIn est conçu pour être intuitif et facile à utiliser. Aucune compétence en codage n'est requise. Notre interface est simple et nous vous guiderons à chaque étape."
    },
    {
        question: "Puis-je gérer plusieurs boutiques ?",
        answer: "Oui, notre plan Pro vous permet de gérer plusieurs boutiques à partir d'un seul compte, avec un basculement facile entre elles."
    },
    {
        question: "Comment fonctionne la facturation ?",
        answer: "Nous proposons un abonnement mensuel simple et transparent. Vous pouvez payer par carte bancaire marocaine ou internationale. Pas de frais cachés."
    },
    {
        question: "Proposez-vous une intégration avec les livreurs locaux ?",
        answer: "Oui, nous intégrons les principaux services de livraison au Maroc pour automatiser vos expéditions et le suivi de vos colis."
    },
    {
        question: "Mes données sont-elles sécurisées ?",
        answer: "La sécurité est notre priorité. Vos données sont chiffrées et stockées sur des serveurs sécurisés. Nous respectons scrupuleusement la loi 09-08 sur la protection des données."
    },
    {
        question: "Puis-je importer mes produits depuis une autre plateforme ?",
        answer: "Oui, nous proposons un outil d'importation facile via fichier CSV pour transférer votre catalogue produits en quelques clics."
    }
];

export default function FAQ() {
    return (
        <section className="py-20 bg-gray-50" id="faq">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl mb-4">
                        Questions Fréquemment Posées
                    </h2>
                    <p className="text-lg text-gray-600">
                        Tout ce que vous devez savoir pour démarrer avec BayIIn.
                    </p>
                </div>

                <div className="space-y-4">
                    {faqs.map((faq, index) => (
                        <FAQItem key={index} faq={faq} />
                    ))}
                </div>
            </div>
        </section>
    );
}

function FAQItem({ faq }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-6 py-4 flex items-center justify-between text-left focus:outline-none"
            >
                <span className="font-semibold text-gray-900">{faq.question}</span>
                {isOpen ? (
                    <ChevronUp className="h-5 w-5 text-indigo-600" />
                ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <div className="px-6 pb-4 text-gray-600 border-t border-gray-100 pt-4">
                            {faq.answer}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
