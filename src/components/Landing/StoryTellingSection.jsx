import { motion } from "framer-motion";
import { useLanguage } from "../../context/LanguageContext";
import { Store, Smartphone, MessageSquare, TrendingUp, Zap, BarChart3, Check } from "lucide-react";

const steps = [
    {
        id: 'create',
        icon: Store,
        color: 'from-indigo-500 to-blue-500',
        title: "1. Créez en un éclair",
        desc: "Tapez le nom de votre boutique. En 60 secondes, votre plateforme est prête. Pas de configuration technique, pas de plugin à installer. Juste vous et vos produits.",
        mockup: (
            <div className="bg-slate-900 rounded-xl p-4 shadow-2xl border border-slate-700 font-mono text-sm">
                <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <div className="text-slate-400">
                    <span className="text-green-400">➜</span> ~ bayiin init <span className="text-indigo-400">"My Awesome Store"</span>
                </div>
                <motion.div 
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mt-2 text-slate-300"
                >
                    [+] Workspace créé avec succès<br/>
                    [+] Base de données isolée prête<br/>
                    [+] IA Copilot activée
                </motion.div>
                <motion.div 
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    transition={{ delay: 1.5 }}
                    className="mt-2 text-green-400 font-bold"
                >
                    ✔ Votre boutique est live sur myawesomestore.bayiin.com
                </motion.div>
            </div>
        )
    },
    {
        id: 'sell',
        icon: MessageSquare,
        color: 'from-green-400 to-emerald-600',
        title: "2. La première commande tombe",
        desc: "Dès qu'un client achète, l'automatisation prend le relais. Un message WhatsApp avec la localisation exacte et la confirmation est généré en un clic pour valider la commande.",
        mockup: (
            <div className="relative">
                <div className="absolute inset-0 bg-green-500/20 blur-xl rounded-full"></div>
                <div className="relative bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden">
                    <div className="bg-[#075E54] text-white p-3 flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 font-bold">C</div>
                        <div>
                            <div className="font-bold text-sm">Client #1042</div>
                            <div className="text-xs text-white/70">en ligne</div>
                        </div>
                    </div>
                    <div className="bg-[#E5DDD5] p-4 h-48 flex flex-col justify-end gap-2">
                        <motion.div 
                            initial={{ x: -20, opacity: 0 }}
                            whileInView={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="bg-white p-2 rounded-lg rounded-tl-none max-w-[80%] text-sm shadow-sm"
                        >
                            Salam, bghit nconfirmé la commande dyali (Pack Premium) à Casablanca.
                        </motion.div>
                        <motion.div 
                            initial={{ x: 20, opacity: 0 }}
                            whileInView={{ x: 0, opacity: 1 }}
                            transition={{ delay: 1.2 }}
                            className="bg-[#DCF8C6] p-2 rounded-lg rounded-tr-none max-w-[80%] self-end text-sm shadow-sm"
                        >
                            <span className="font-bold">BayIIn Bot:</span> Commande confirmée avec succès. Le livreur vous contactera dans 24h.
                        </motion.div>
                    </div>
                </div>
            </div>
        )
    },
    {
        id: 'scale',
        icon: TrendingUp,
        color: 'from-purple-500 to-pink-500',
        title: "3. Observez la croissance",
        desc: "Pendant que vous dormez, le tableau de bord financier réconcilie vos flux COD, calcule vos marges nettes réelles (Ads + Shipping déduits) et l'IA prévoit vos ruptures de stock.",
        mockup: (
            <div className="bg-slate-950 rounded-xl p-5 border border-slate-800 shadow-2xl relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-600/30 blur-2xl rounded-full"></div>
                <div className="flex justify-between items-center mb-6">
                    <div className="text-white font-bold">Chiffre d'Affaires</div>
                    <div className="text-emerald-400 flex items-center text-sm font-bold"><TrendingUp className="w-4 h-4 mr-1"/> +24%</div>
                </div>
                <div className="text-4xl font-extrabold text-white mb-2">
                    12,450 <span className="text-lg text-slate-500">MAD</span>
                </div>
                <div className="text-sm text-slate-400 mb-6">Aujourd'hui</div>
                
                <div className="flex items-end gap-2 h-24">
                    {[30, 45, 20, 60, 40, 80, 100].map((h, i) => (
                        <motion.div 
                            key={i}
                            initial={{ height: 0 }}
                            whileInView={{ height: `${h}%` }}
                            transition={{ delay: i * 0.1, duration: 0.5, type: 'spring' }}
                            className={`flex-1 rounded-t-sm ${i === 6 ? 'bg-gradient-to-t from-purple-600 to-pink-500' : 'bg-slate-800'}`}
                        ></motion.div>
                    ))}
                </div>
            </div>
        )
    }
];

export default function StoryTellingSection() {
    const { language } = useLanguage();
    const isRTL = language === 'ar';

    return (
        <section className="py-24 bg-slate-50 relative overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-20">
                    <h2 className="text-sm font-bold tracking-widest text-indigo-600 uppercase mb-3">L'Expérience BayIIn</h2>
                    <p className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
                        De l'idée à la <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500">croissance explosive</span>
                    </p>
                </div>

                <div className="space-y-24">
                    {steps.map((step, index) => (
                        <div key={step.id} className={`flex flex-col md:flex-row items-center gap-12 lg:gap-20 ${index % 2 !== 0 ? 'md:flex-row-reverse' : ''}`}>
                            {/* Text Content */}
                            <motion.div 
                                initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true, margin: "-100px" }}
                                transition={{ duration: 0.6 }}
                                className="flex-1"
                            >
                                <div className={`inline-flex items-center justify-center p-4 rounded-2xl bg-gradient-to-br ${step.color} text-white mb-6 shadow-lg`}>
                                    <step.icon className="w-8 h-8" />
                                </div>
                                <h3 className="text-3xl font-extrabold text-slate-900 mb-4">{step.title}</h3>
                                <p className="text-xl text-slate-600 leading-relaxed">
                                    {step.desc}
                                </p>
                            </motion.div>

                            {/* Mockup / Visual */}
                            <motion.div 
                                initial={{ opacity: 0, y: 50 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-100px" }}
                                transition={{ duration: 0.6, delay: 0.2 }}
                                className="flex-1 w-full perspective-1000"
                            >
                                <div className={`transform transition-transform duration-700 hover:rotate-y-0 hover:rotate-x-0 ${index % 2 === 0 ? 'rotate-y-[-5deg] rotate-x-[5deg]' : 'rotate-y-[5deg] rotate-x-[5deg]'} `}>
                                    {step.mockup}
                                </div>
                            </motion.div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
