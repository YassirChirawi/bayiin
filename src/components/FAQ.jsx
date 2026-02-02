import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "../context/LanguageContext";

export default function FAQ() {
    const { t, language } = useLanguage();
    const isRTL = language === 'ar';

    const faqs = [
        {
            question: t('faq_start_q'),
            answer: t('faq_start_a')
        },
        {
            question: t('faq_multi_q'),
            answer: t('faq_multi_a')
        },
        {
            question: t('faq_billing_q'),
            answer: t('faq_billing_a')
        },
        {
            question: t('faq_integration_q'),
            answer: t('faq_integration_a')
        },
        {
            question: t('faq_security_q'),
            answer: t('faq_security_a')
        },
        {
            question: t('faq_import_q'),
            answer: t('faq_import_a')
        }
    ];

    return (
        <section className={`py-20 bg-gray-50 ${isRTL ? 'font-arabic' : ''}`} id="faq" dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl mb-4">
                        {t('faq_title')}
                    </h2>
                    <p className="text-lg text-gray-600">
                        {t('faq_subtitle')}
                    </p>
                </div>

                <div className="space-y-4">
                    {faqs.map((faq, index) => (
                        <FAQItem key={index} faq={faq} isRTL={isRTL} />
                    ))}
                </div>
            </div>
        </section>
    );
}

function FAQItem({ faq, isRTL }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full px-6 py-4 flex items-center justify-between text-left focus:outline-none ${isRTL ? 'text-right' : ''}`}
            >
                <div className="flex items-center gap-4 flex-1">
                    <span className={`font-semibold text-gray-900 ${isRTL ? 'ml-auto' : ''}`}>{faq.question}</span>
                </div>
                {isOpen ? (
                    <ChevronUp className="h-5 w-5 text-indigo-600 flex-shrink-0" />
                ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0" />
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
                        <div className={`px-6 pb-4 text-gray-600 border-t border-gray-100 pt-4 ${isRTL ? 'text-right' : ''}`}>
                            {faq.answer}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
