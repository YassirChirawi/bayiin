import { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Mail, Loader2, CheckCircle2 } from 'lucide-react';

export default function Newsletter() {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState('idle'); // idle, loading, success, error
    const [message, setMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email) return;

        setStatus('loading');
        try {
            await addDoc(collection(db, 'leads'), {
                email,
                source: 'landing_page',
                createdAt: serverTimestamp(),
                converted: false
            });
            setStatus('success');
            setEmail('');
            setMessage("Thanks for joining! We'll be in touch soon.");
        } catch (error) {
            console.error("Error adding lead:", error);
            setStatus('error');
            setMessage("Something went wrong. Please try again.");
        }
    };

    return (
        <section className="py-24 bg-slate-900 text-white relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-20">
                <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-indigo-600 blur-3xl"></div>
                <div className="absolute top-1/2 right-0 w-64 h-64 rounded-full bg-purple-600 blur-3xl"></div>
            </div>

            <div className="max-w-4xl mx-auto px-4 relative z-10 text-center">
                <div className="inline-flex items-center justify-center p-3 bg-indigo-500/20 rounded-xl mb-8 backdrop-blur-sm border border-indigo-500/30">
                    <Mail className="w-6 h-6 text-indigo-300" />
                </div>
                <h2 className="text-3xl md:text-4xl font-bold mb-6">Join the waiting list</h2>
                <p className="text-indigo-200 text-lg mb-10 max-w-2xl mx-auto">
                    Get early access to new features, exclusive tips on growing your business, and special offers.
                </p>

                {status === 'success' ? (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6 max-w-md mx-auto flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4">
                        <div className="bg-green-500 rounded-full p-2">
                            <CheckCircle2 className="w-6 h-6 text-white" />
                        </div>
                        <p className="text-green-200 font-medium text-left">{message}</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
                        <div className="flex-1 relative">
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Enter your email"
                                className="w-full px-6 py-4 rounded-full bg-white/10 border border-white/20 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 backdrop-blur-sm transition-all"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={status === 'loading'}
                            className="px-8 py-4 rounded-full bg-indigo-600 hover:bg-indigo-700 font-semibold transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/50"
                        >
                            {status === 'loading' ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Joining...
                                </>
                            ) : (
                                "Join Now"
                            )}
                        </button>
                    </form>
                )}
                {status === 'error' && (
                    <p className="mt-4 text-red-400 text-sm">{message}</p>
                )}
                <p className="mt-6 text-slate-500 text-sm">
                    We care about your data in our <a href="#" className="underline hover:text-indigo-400">privacy policy</a>.
                </p>
            </div>
        </section>
    );
}
