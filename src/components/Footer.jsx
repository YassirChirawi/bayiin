import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Twitter, Linkedin, Github, Mail, Phone, MapPin, ArrowRight } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

export default function Footer() {
    const { t, language } = useLanguage();
    const isRTL = language === 'ar';

    return (
        <footer className={`bg-slate-900 text-slate-300 border-t border-slate-800 ${isRTL ? 'font-arabic' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
                    {/* Brand */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-white">
                            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center overflow-hidden">
                                <span className="font-bold text-lg text-white">B</span>
                            </div>
                            <span className="font-bold text-xl tracking-tight">BayIIn</span>
                        </div>
                        <p className="text-sm leading-relaxed text-slate-400">
                            {t('footer_description')}
                        </p>
                        <div className="flex gap-4">
                            <SocialIcon icon={Facebook} href="#" />
                            <SocialIcon icon={Instagram} href="https://www.instagram.com/bayiin_os/" />
                            <SocialIcon icon={Linkedin} href="#" />
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h3 className="text-white font-semibold mb-6">{t('footer_nav_title')}</h3>
                        <ul className="space-y-3">
                            <li><a href="#features" className="hover:text-indigo-400 transition-colors">{t('footer_nav_features')}</a></li>
                            <li><a href="#pricing" className="hover:text-indigo-400 transition-colors">{t('footer_nav_pricing')}</a></li>
                            {/* <li><a href="#testimonials" className="hover:text-indigo-400 transition-colors">{t('footer_nav_testimonials')}</a></li> */}
                            <li><Link to="/login" className="hover:text-indigo-400 transition-colors">{t('footer_nav_login')}</Link></li>
                        </ul>
                    </div>

                    {/* Legal */}
                    <div>
                        <h3 className="text-white font-semibold mb-6">{t('footer_legal_title')}</h3>
                        <ul className="space-y-3">
                            <li><Link to="/privacy" className="hover:text-indigo-400 transition-colors">{t('footer_legal_privacy')}</Link></li>
                            <li><Link to="/terms" className="hover:text-indigo-400 transition-colors">{t('footer_legal_terms')}</Link></li>
                            <li><a href="#" className="hover:text-indigo-400 transition-colors">{t('footer_legal_cookies')}</a></li>
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h3 className="text-white font-semibold mb-6">{t('footer_contact_title')}</h3>
                        <ul className="space-y-4">
                            <li className="flex items-start gap-3">
                                <Mail className="h-5 w-5 text-indigo-500 mt-0.5" />
                                <span className="text-sm">support@bayiin.shop</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <Phone className="h-5 w-5 text-indigo-500 mt-0.5" />
                                <span className="text-sm" dir="ltr">+212 6 00 00 00 00</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <span className="flex items-center gap-2 text-indigo-400 text-sm font-medium">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                                    </span>
                                    {t('footer_support_avail')}
                                </span>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="mt-16 pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-500">
                    <p>{t('footer_copyright', { year: new Date().getFullYear() })}</p>
                    <p>{t('footer_made_with_love')}</p>
                </div>
            </div>
        </footer>
    );
}

function SocialIcon({ icon: Icon, href }) {
    return (
        <a
            href={href}
            className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-indigo-600 hover:text-white transition-all transform hover:-translate-y-1"
        >
            <Icon className="h-5 w-5" />
        </a>
    );
}
