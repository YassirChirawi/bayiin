import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Truck, CheckCircle, User, Phone, MapPin, ChevronRight } from 'lucide-react';

const VEHICLES = [
    { value: 'moto', label: 'Moto / Scooter', emoji: '🏍️' },
    { value: 'voiture', label: 'Voiture', emoji: '🚗' },
    { value: 'velo', label: 'Vélo / Trottinette', emoji: '🚲' },
];

export default function DriverApplication() {
    const { storeId } = useParams();
    const [storeName, setStoreName] = useState('');
    const [storeLogo, setStoreLogo] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        name: '',
        phone: '',
        city: '',
        vehicle: 'moto',
        message: ''
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
        if (!form.name || !form.phone) return;
        setLoading(true);
        try {
            await addDoc(collection(db, 'driverApplications'), {
                storeId,
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
            <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center p-6">
                <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
                    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="h-10 w-10 text-emerald-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Candidature envoyée !</h2>
                    <p className="text-gray-500 mb-4">
                        Merci <strong>{form.name}</strong> ! Votre candidature a bien été reçue par{' '}
                        <strong>{storeName || 'le magasin'}</strong>.
                    </p>
                    <p className="text-sm text-gray-400">
                        Vous serez contacté(e) sur le <strong>{form.phone}</strong> après examen de votre candidature.
                    </p>
                    <div className="mt-6 bg-indigo-50 rounded-2xl p-4 text-xs text-indigo-600">
                        🚀 Propulsé par <strong>Bayiin</strong>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-8 text-white text-center">
                    {storeLogo ? (
                        <img src={storeLogo} alt={storeName} className="h-14 w-14 rounded-2xl object-cover mx-auto mb-3 border-2 border-white/30" />
                    ) : (
                        <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                            <Truck className="h-7 w-7" />
                        </div>
                    )}
                    <h1 className="text-xl font-bold">{storeName || 'Rejoindre l\'équipe'}</h1>
                    <p className="text-indigo-200 text-sm mt-1">Candidature Livreur</p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                            <User className="h-4 w-4 inline mr-1 text-indigo-500" />
                            Nom complet *
                        </label>
                        <input
                            required
                            type="text"
                            name="name"
                            value={form.name}
                            onChange={handleChange}
                            placeholder="Votre nom et prénom"
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                            <Phone className="h-4 w-4 inline mr-1 text-indigo-500" />
                            Téléphone *
                        </label>
                        <input
                            required
                            type="tel"
                            name="phone"
                            value={form.phone}
                            onChange={handleChange}
                            placeholder="0612345678"
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                            <MapPin className="h-4 w-4 inline mr-1 text-indigo-500" />
                            Ville
                        </label>
                        <input
                            type="text"
                            name="city"
                            value={form.city}
                            onChange={handleChange}
                            placeholder="Casablanca, Rabat..."
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">🚗 Moyen de transport</label>
                        <div className="grid grid-cols-3 gap-2">
                            {VEHICLES.map(v => (
                                <button
                                    type="button"
                                    key={v.value}
                                    onClick={() => setForm(prev => ({ ...prev, vehicle: v.value }))}
                                    className={`flex flex-col items-center gap-1 py-3 rounded-xl border-2 text-sm font-medium transition-all ${form.vehicle === v.value
                                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                        : 'border-gray-200 text-gray-600 hover:border-indigo-200'}`}
                                >
                                    <span className="text-2xl">{v.emoji}</span>
                                    <span className="text-xs">{v.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">💬 Message (optionnel)</label>
                        <textarea
                            name="message"
                            value={form.message}
                            onChange={handleChange}
                            placeholder="Parlez-nous de vous, votre expérience, disponibilités..."
                            rows={3}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm resize-none"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-3.5 rounded-xl transition-all disabled:opacity-60 shadow-lg shadow-indigo-200"
                    >
                        {loading
                            ? <div className="h-5 w-5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                            : <><Truck className="h-5 w-5" /> Envoyer ma candidature <ChevronRight className="h-4 w-4" /></>
                        }
                    </button>

                    <p className="text-center text-xs text-gray-400">
                        🚀 Propulsé par <strong>Bayiin</strong>
                    </p>
                </form>
            </div>
        </div>
    );
}
