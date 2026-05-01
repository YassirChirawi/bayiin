import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { toast } from "react-hot-toast";
import {
    MessageSquare, Send, Phone, Mail, Building2,
    Layers, ShieldCheck, CheckCircle, ArrowRight,
    Zap, Users, Headphones, FileText
} from "lucide-react";

const REQUEST_TYPES = [
    {
        id: "support",
        icon: Headphones,
        label: "Support Technique",
        desc: "Un bug, une question ou besoin d'aide rapide",
        color: "bg-blue-50 text-blue-600 border-blue-200",
        activeColor: "bg-blue-600 text-white border-blue-600",
    },
    {
        id: "devis",
        icon: FileText,
        label: "Demande de Devis",
        desc: "Obtenir un tarif personnalisé pour votre activité",
        color: "bg-indigo-50 text-indigo-600 border-indigo-200",
        activeColor: "bg-indigo-600 text-white border-indigo-600",
    },
    {
        id: "integration",
        icon: Layers,
        label: "Intégration Complète",
        desc: "Déploiement complet avec accompagnement dédié",
        color: "bg-purple-50 text-purple-600 border-purple-200",
        activeColor: "bg-purple-600 text-white border-purple-600",
    },
    {
        id: "franchise",
        icon: Building2,
        label: "Franchise / Réseau",
        desc: "Configurer plusieurs boutiques en réseau",
        color: "bg-emerald-50 text-emerald-600 border-emerald-200",
        activeColor: "bg-emerald-600 text-white border-emerald-600",
    },
];

const INTEGRATION_OPTIONS = [
    "Migration des données existantes",
    "Formation de l'équipe (sur site)",
    "Paramétrage des automatisations",
    "Intégration livraison (O-Livraison / Sendit)",
    "Configuration multi-boutiques",
    "Support dédié 30 jours",
];

export default function ContactSection() {
    const [type, setType] = useState("devis");
    const [step, setStep] = useState(1);
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        name: "",
        email: "",
        phone: "",
        company: "",
        storeCount: "1",
        message: "",
        integrationOptions: [],
        budget: "",
    });

    const selectedType = REQUEST_TYPES.find(t => t.id === type);

    const toggleOption = (opt) => {
        setForm(f => ({
            ...f,
            integrationOptions: f.integrationOptions.includes(opt)
                ? f.integrationOptions.filter(o => o !== opt)
                : [...f.integrationOptions, opt],
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name || !form.phone) {
            toast.error("Nom et téléphone sont obligatoires.");
            return;
        }
        setLoading(true);
        try {
            await addDoc(collection(db, "contact_requests"), {
                type,
                ...form,
                createdAt: serverTimestamp(),
                status: "new",
            });
            setSubmitted(true);
        } catch (err) {
            console.error(err);
            toast.error("Erreur lors de l'envoi. Réessayez.");
        } finally {
            setLoading(false);
        }
    };

    const inputCls = "w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm";

    return (
        <section id="contact" className="py-24 bg-gradient-to-b from-slate-50 to-white border-t border-slate-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* Header */}
                <div className="text-center mb-16">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-sm font-semibold mb-4 border border-indigo-100">
                        <MessageSquare className="w-4 h-4" /> Contactez-nous
                    </div>
                    <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4">
                        Passez à l'étape suivante
                        <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                            on s'occupe de tout
                        </span>
                    </h2>
                    <p className="text-xl text-slate-500 max-w-2xl mx-auto">
                        Que vous ayez besoin d'aide, d'un devis sur mesure ou d'une intégration complète — notre équipe est là pour vous accompagner.
                    </p>
                </div>

                <div className="grid lg:grid-cols-2 gap-12 items-start">

                    {/* Left — Info Cards */}
                    <div className="space-y-6">
                        {[
                            {
                                icon: Zap,
                                color: "bg-amber-50 text-amber-600",
                                title: "Réponse en moins de 2h",
                                desc: "Notre équipe traite chaque demande avec urgence et vous recontacte rapidement par WhatsApp ou email."
                            },
                            {
                                icon: ShieldCheck,
                                color: "bg-green-50 text-green-600",
                                title: "Intégration clé en main",
                                desc: "Nous configurons votre boutique, importons vos données, formons votre équipe et assurons le suivi jusqu'à stabilisation."
                            },
                            {
                                icon: Users,
                                color: "bg-indigo-50 text-indigo-600",
                                title: "Adapté à votre business",
                                desc: "Que vous ayez 1 boutique ou un réseau de franchise, notre solution s'adapte à votre organisation."
                            },
                        ].map((card, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1 }}
                                viewport={{ once: true }}
                                className="flex items-start gap-5 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
                            >
                                <div className={`flex-shrink-0 w-12 h-12 rounded-xl ${card.color} flex items-center justify-center`}>
                                    <card.icon className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 mb-1">{card.title}</h3>
                                    <p className="text-slate-500 text-sm leading-relaxed">{card.desc}</p>
                                </div>
                            </motion.div>
                        ))}

                        {/* WhatsApp Direct CTA */}
                        <a
                            href="https://wa.me/212600000000?text=Bonjour,%20je%20voudrais%20en%20savoir%20plus%20sur%20BayIIn"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-4 bg-[#25D366] hover:bg-[#1DAE57] text-white p-5 rounded-2xl transition-all shadow-lg shadow-green-100 hover:shadow-xl hover:-translate-y-0.5 group"
                        >
                            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                                <Phone className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="font-bold text-lg">Contactez-nous sur WhatsApp</p>
                                <p className="text-white/80 text-sm">Réponse immédiate — en Français ou Darija</p>
                            </div>
                            <ArrowRight className="w-5 h-5 ml-auto group-hover:translate-x-1 transition-transform" />
                        </a>
                    </div>

                    {/* Right — Form */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden"
                    >
                        <AnimatePresence mode="wait">
                            {submitted ? (
                                <motion.div
                                    key="success"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="flex flex-col items-center justify-center text-center p-12 gap-4"
                                >
                                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-2">
                                        <CheckCircle className="w-10 h-10 text-green-600" />
                                    </div>
                                    <h3 className="text-2xl font-extrabold text-slate-900">Demande envoyée !</h3>
                                    <p className="text-slate-500 max-w-sm">
                                        Notre équipe vous recontacte dans les 2 heures via WhatsApp ou email. Merci de votre confiance.
                                    </p>
                                    <button
                                        onClick={() => { setSubmitted(false); setStep(1); setForm({ name: "", email: "", phone: "", company: "", storeCount: "1", message: "", integrationOptions: [], budget: "" }); }}
                                        className="mt-4 px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium text-sm transition-colors"
                                    >
                                        Nouvelle demande
                                    </button>
                                </motion.div>
                            ) : (
                                <motion.form
                                    key="form"
                                    onSubmit={handleSubmit}
                                    className="p-8 space-y-6"
                                >
                                    {/* Type selector */}
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-3">Type de demande</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {REQUEST_TYPES.map(rt => (
                                                <button
                                                    key={rt.id}
                                                    type="button"
                                                    onClick={() => setType(rt.id)}
                                                    className={`flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all ${type === rt.id ? rt.activeColor : rt.color + ' hover:opacity-80'}`}
                                                >
                                                    <rt.icon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                                    <div>
                                                        <p className="font-bold text-xs leading-tight">{rt.label}</p>
                                                        <p className={`text-[10px] mt-0.5 leading-tight ${type === rt.id ? 'opacity-80' : 'opacity-60'}`}>{rt.desc}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Basic fields */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Nom complet *</label>
                                            <input
                                                className={inputCls}
                                                placeholder="Mohamed Alami"
                                                value={form.name}
                                                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">WhatsApp / Tél *</label>
                                            <input
                                                className={inputCls}
                                                placeholder="06XXXXXXXX"
                                                value={form.phone}
                                                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Email</label>
                                            <input
                                                type="email"
                                                className={inputCls}
                                                placeholder="vous@exemple.com"
                                                value={form.email}
                                                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Entreprise / Boutique</label>
                                            <input
                                                className={inputCls}
                                                placeholder="Nom de votre boutique"
                                                value={form.company}
                                                onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                                            />
                                        </div>
                                    </div>

                                    {/* Conditional fields */}
                                    <AnimatePresence mode="wait">
                                        {(type === "franchise" || type === "integration") && (
                                            <motion.div
                                                key="extra"
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: "auto" }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="space-y-4 overflow-hidden"
                                            >
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Nombre de boutiques</label>
                                                        <select
                                                            className={inputCls}
                                                            value={form.storeCount}
                                                            onChange={e => setForm(f => ({ ...f, storeCount: e.target.value }))}
                                                        >
                                                            {["1", "2-5", "6-10", "11-20", "+20"].map(v => (
                                                                <option key={v}>{v}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Budget mensuel estimé</label>
                                                        <select
                                                            className={inputCls}
                                                            value={form.budget}
                                                            onChange={e => setForm(f => ({ ...f, budget: e.target.value }))}
                                                        >
                                                            <option value="">-- Sélectionner --</option>
                                                            <option>Moins de 500 DH/mois</option>
                                                            <option>500 – 1 500 DH/mois</option>
                                                            <option>1 500 – 5 000 DH/mois</option>
                                                            <option>+5 000 DH/mois</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">Services souhaités</label>
                                                    <div className="grid grid-cols-1 gap-1.5">
                                                        {INTEGRATION_OPTIONS.map(opt => (
                                                            <label
                                                                key={opt}
                                                                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${form.integrationOptions.includes(opt) ? 'bg-indigo-50 border-indigo-300 text-indigo-800' : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'}`}
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={form.integrationOptions.includes(opt)}
                                                                    onChange={() => toggleOption(opt)}
                                                                    className="rounded text-indigo-600 accent-indigo-600"
                                                                />
                                                                <span className="text-sm font-medium">{opt}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Message */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                                            {type === "support" ? "Décrivez votre problème" : "Message / Détails supplémentaires"}
                                        </label>
                                        <textarea
                                            className={inputCls + " resize-none"}
                                            rows={3}
                                            placeholder={
                                                type === "support"
                                                    ? "Ex: Je n'arrive pas à accéder à la page Finances..."
                                                    : type === "devis"
                                                    ? "Ex: J'ai une boutique de 200 commandes/mois, je vends des vêtements..."
                                                    : "Décrivez votre activité, vos besoins et vos contraintes..."
                                            }
                                            value={form.message}
                                            onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full flex items-center justify-center gap-3 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-2xl font-bold text-base transition-all shadow-lg shadow-indigo-200 hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-60 disabled:translate-y-0"
                                    >
                                        {loading ? (
                                            <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                                        ) : (
                                            <>
                                                <Send className="w-5 h-5" />
                                                {type === "support" ? "Envoyer ma demande de support" :
                                                 type === "devis" ? "Demander mon devis gratuit" :
                                                 type === "integration" ? "Demander l'intégration complète" :
                                                 "Contacter l'équipe Franchise"}
                                            </>
                                        )}
                                    </button>

                                    <p className="text-center text-xs text-slate-400">
                                        <Mail className="w-3 h-3 inline mr-1" />
                                        Vos informations restent confidentielles et ne sont jamais partagées.
                                    </p>
                                </motion.form>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
