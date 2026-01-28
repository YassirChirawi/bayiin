import { useState } from "react";
import { ChevronDown, ChevronUp, MessageCircle, ExternalLink } from "lucide-react";
import Button from "../components/Button";
import { useLanguage } from "../context/LanguageContext"; // NEW

export default function Help() {
    const [openIndex, setOpenIndex] = useState(null);
    const { t } = useLanguage(); // NEW

    const faqs = [
        {
            category: t('cat_startup'),
            items: [
                { question: t('q_dashboard'), answer: t('a_dashboard') },
                { question: t('q_create_store'), answer: t('a_create_store') }
            ]
        },
        {
            category: t('cat_orders'),
            items: [
                { question: t('q_new_order'), answer: t('a_new_order') },
                { question: t('q_status'), answer: t('a_status') },
                { question: t('q_whatsapp'), answer: t('a_whatsapp') }
            ]
        },
        {
            category: t('cat_finances'),
            items: [
                { question: t('q_profit'), answer: t('a_profit') },
                { question: t('q_expense'), answer: t('a_expense') },
                { question: t('q_roas'), answer: t('a_roas') },
                { question: t('q_cac'), answer: t('a_cac') },
                { question: t('q_margin'), answer: t('a_margin') },
                { question: t('q_shipping_ratio'), answer: t('a_shipping_ratio') }
            ]
        },
        {
            category: t('cat_settings'),
            items: [
                { question: t('q_currency'), answer: t('a_currency') },
                { question: t('q_team'), answer: t('a_team') }
            ]
        }
    ];

    const toggleAccordion = (index) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-12">
            <div className="space-y-4">
                <h1 className="text-3xl font-bold text-gray-900">{t('help_center')}</h1>
                <p className="text-lg text-gray-600">
                    {t('help_subtitle')}
                </p>
            </div>

            <div className="space-y-6">
                {faqs.map((section, sectionIdx) => (
                    <div key={section.category} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100">
                            <h2 className="text-lg font-semibold text-gray-900">{section.category}</h2>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {section.items.map((item, itemIdx) => {
                                const index = `${sectionIdx}-${itemIdx}`;
                                const isOpen = openIndex === index;
                                return (
                                    <div key={index} className="bg-white">
                                        <button
                                            onClick={() => toggleAccordion(index)}
                                            className="w-full px-6 py-4 flex items-center justify-between text-left focus:outline-none hover:bg-gray-50 transition-colors"
                                        >
                                            <span className="text-sm font-medium text-gray-900">{item.question}</span>
                                            {isOpen ? (
                                                <ChevronUp className="h-5 w-5 text-gray-500" />
                                            ) : (
                                                <ChevronDown className="h-5 w-5 text-gray-500" />
                                            )}
                                        </button>
                                        {isOpen && (
                                            <div className="px-6 pb-4 text-sm text-gray-600 animate-in fade-in slide-in-from-top-1 duration-200">
                                                {item.answer}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-indigo-50 rounded-xl p-8 text-center space-y-4">
                <div className="mx-auto h-12 w-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
                    <MessageCircle className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">{t('still_questions')}</h3>
                <p className="text-gray-600 max-w-md mx-auto">
                    {t('help_description')}
                </p>
                <div className="pt-2">
                    <a
                        href="https://wa.me/33605741054?text=Bonjour%20Support%20BayIIn%2C%20j'ai%20une%20question..."
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 shadow-sm transition-colors"
                    >
                        <MessageCircle className="mr-2 h-5 w-5" />
                        {t('chat_support')}
                        <ExternalLink className="ml-2 h-4 w-4 opacity-50" />
                    </a>
                </div>
            </div>
        </div>
    );
}
