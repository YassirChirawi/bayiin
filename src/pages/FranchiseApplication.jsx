// src/pages/FranchiseApplication.jsx
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Building2, CheckCircle, User, Phone, MapPin, ChevronRight, Briefcase, DollarSign } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

const BUDGETS = [
    { value: '< 50k', label: 'Moins de 50,000 DH' },
    { value: '50k - 150k', label: '50k - 150,000 DH' },
    { value: '> 150k', label: 'Plus de 150,000 DH' },
];

export default function FranchiseApplication() {
    const { storeId } = useParams();
    const [storeName, setStoreName] = useState('');
    const [storeLogo, setStoreLogo] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        name: '',
        email: '',
        phone: '',
        city: '',
        budget: '50k - 150k',
        experience: 'Oui, j\'ai de l\'expérience',
        motivation: ''
    });

    useEffect(() => {
        if (!storeId) return;
        async function loadStore() {
            try {
                const storeDoc = await getDoc(doc(db, 'stores', storeId));
                if (storeDoc.exists()) {
                    const data = storeDoc.data();
                    setStoreName(data.name || '');
                    setStoreLogo(data.logoUrl || '');
                }
            } catch (_) { }
        }
        loadStore();
    }, [storeId]);

    const handleChange = (e) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name || !form.phone || !form.email) return;
        setLoading(true);
        try {
            await addDoc(collection(db, 'franchiseApplications'), {
                storeId, // The brand they are applying to
                ...form,
                status: 'pending',
                createdAt: serverTimestamp()
            });
            setSubmitted(true);
        } catch (err) {
            console.error(err);
            alert('Une erreur est survenue. Veuillez réessayer.');
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-900 flex items-center justify-center p-6">
                <Helmet>
                    <title>Candidature Envoyée | {storeName || 'Franchise'}</title>
                </Helmet>
                <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
                    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="h-10 w-10 text-emerald-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Candidature envoyée !</h2>
                    <p className="text-slate-500 mb-4">
                        Merci <strong>{form.name}</strong> ! Votre demande de franchise a bien été reçue par{' '}
                        <strong>{storeName || 'notre marque'}</strong>.
                    </p>
                    <p className="text-sm text-slate-400">
                        Notre équipe de développement vous contactera très prochainement pour discuter de votre projet à <strong>{form.city}</strong>.
                    </p>
                    <div className="mt-6 bg-slate-50 rounded-2xl p-4 text-xs text-slate-500">
                        🚀 Propulsé par <strong>BayIIn</strong>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center py-10 px-4">
            <Helmet>
                <title>Ouvrir une Franchise | {storeName || 'Rejoignez-nous'}</title>
            </Helmet>
            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 w-full max-w-xl overflow-hidden">
                {/* Header */}
                <div className="bg-slate-900 px-6 py-10 text-white text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none"></div>
                    <div className="relative z-10">
                        {storeLogo ? (
                            <img src={storeLogo} alt={storeName} className="h-20 w-20 rounded-2xl object-cover mx-auto mb-4 border-4 border-white/10 shadow-lg" />
                        ) : (
                            <div className="w-20 h-20 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                                <Building2 className="h-10 w-10 text-indigo-300" />
                            </div>
                        )}
                        <h1 className="text-2xl font-bold">{storeName ? `Devenir Franchisé ${storeName}` : 'Rejoindre la Franchise'}</h1>
                        <p className="text-slate-300 text-sm mt-2 max-w-md mx-auto">Complétez ce formulaire pour postuler à l'ouverture de votre propre succursale et rejoindre notre réseau en pleine croissance.</p>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                                <User className="h-4 w-4 text-slate-400" /> Nom complet *
                            </label>
                            <input
                                required
                                type="text"
                                name="name"
                                value={form.name}
                                onChange={handleChange}
                                placeholder="Prénom Nom"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                                <MapPin className="h-4 w-4 text-slate-400" /> Ville ciblée *
                            </label>
                            <input
                                required
                                type="text"
                                name="city"
                                value={form.city}
                                onChange={handleChange}
                                placeholder="Où souhaitez-vous ouvrir ?"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none text-sm"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                                <Phone className="h-4 w-4 text-slate-400" /> Téléphone *
                            </label>
                            <input
                                required
                                type="tel"
                                name="phone"
                                value={form.phone}
                                onChange={handleChange}
                                placeholder="+212 6..."
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                                <Briefcase className="h-4 w-4 text-slate-400" /> Adresse Email *
                            </label>
                            <input
                                required
                                type="email"
                                name="email"
                                value={form.email}
                                onChange={handleChange}
                                placeholder="contact@email.com"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none text-sm"
                            />
                        </div>
                    </div>

                    <div className="pt-2">
                        <label className="block text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
                            <DollarSign className="h-4 w-4 text-slate-400" /> Budget d'investissement disponible
                        </label>
                        <div className="flex flex-col sm:flex-row gap-3">
                            {BUDGETS.map(b => (
                                <label
                                    key={b.value}
                                    className={`flex-1 flex items-center justify-center p-3 rounded-xl border-2 text-sm font-medium cursor-pointer transition-all ${form.budget === b.value
                                        ? 'border-slate-900 bg-slate-900 text-white'
                                        : 'border-slate-200 text-slate-600 hover:border-slate-300 bg-slate-50'}`}
                                >
                                    <input
                                        type="radio"
                                        name="budget"
                                        value={b.value}
                                        checked={form.budget === b.value}
                                        onChange={handleChange}
                                        className="hidden"
                                    />
                                    {b.label}
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="pt-2">
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Avez-vous de l'expérience en gestion d'équipe/commerce ?</label>
                        <select
                            name="experience"
                            value={form.experience}
                            onChange={handleChange}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none text-sm"
                        >
                            <option>Oui, je suis déjà gérant(e)</option>
                            <option>Oui, j'ai une expérience managériale</option>
                            <option>Non, mais je suis motivé(e) et prêt(e) à apprendre</option>
                        </select>
                    </div>

                    <div className="pt-2">
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Pourquoi choisir notre franchise ? (Motivation)</label>
                        <textarea
                            name="motivation"
                            value={form.motivation}
                            onChange={handleChange}
                            placeholder="Vos atouts, pourquoi ce choix..."
                            rows={4}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none text-sm resize-none"
                        />
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-black text-white font-bold py-4 rounded-xl transition-all disabled:opacity-60 shadow-lg"
                        >
                            {loading
                                ? <div className="h-5 w-5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                                : <><Building2 className="h-5 w-5" /> Soumettre ma candidature <ChevronRight className="h-4 w-4" /></>
                            }
                        </button>
                    </div>
                </form>
                <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 text-center">
                    <p className="text-xs text-slate-400">
                        Solution de création de franchise propulsée par <strong>BayIIn ERP</strong>
                    </p>
                </div>
            </div>
        </div>
    );
}
