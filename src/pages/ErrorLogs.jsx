import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bug, ChevronDown, AlertTriangle, Clock, Hash, User, Loader2 } from 'lucide-react';
import { useErrorLogs } from '../hooks/useErrorLogs';

const timeAgo = (ms) => {
    if (!ms) return '—';
    const s = Math.floor((Date.now() - ms) / 1000);
    if (s < 60) return `il y a ${s}s`;
    if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
    if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
    return new Date(ms).toLocaleDateString('fr-MA', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const ErrorGroup = ({ g }) => {
    const [open, setOpen] = useState(false);
    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <button onClick={() => setOpen((o) => !o)} className="w-full text-left p-4 flex items-start gap-3 hover:bg-gray-50 transition-colors">
                <div className="p-2 rounded-lg bg-rose-50 text-rose-600 flex-shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 break-words">{g.message}</div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-gray-500">
                        <span className="inline-flex items-center gap-1"><Hash className="w-3 h-3" />{g.fingerprint}</span>
                        <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />{timeAgo(g.lastSeen)}</span>
                        <span className="inline-flex items-center gap-1">source: {g.source}</span>
                        {g.modes.map((m) => (
                            <span key={m} className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${m === 'prod' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>{m}</span>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 text-sm font-bold text-white bg-rose-500 rounded-full">{g.count}</span>
                    <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                </div>
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-gray-100">
                        <div className="p-4 space-y-3 bg-gray-50/60 text-sm">
                            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-600">
                                <span className="inline-flex items-center gap-1"><User className="w-3 h-3" />{g.sample.userEmail || 'anonyme'}</span>
                                <span>1re vue : {timeAgo(g.firstSeen === Infinity ? 0 : g.firstSeen)}</span>
                                {g.sample.url && <span className="truncate max-w-full">URL : {g.sample.url}</span>}
                            </div>
                            {g.sample.stack && (
                                <div>
                                    <div className="text-xs font-semibold text-gray-500 mb-1">Stack</div>
                                    <pre className="text-xs bg-gray-900 text-gray-300 rounded-lg p-3 overflow-x-auto max-h-64">{g.sample.stack}</pre>
                                </div>
                            )}
                            {g.sample.componentStack && (
                                <div>
                                    <div className="text-xs font-semibold text-gray-500 mb-1">Component stack (React)</div>
                                    <pre className="text-xs bg-gray-900 text-gray-300 rounded-lg p-3 overflow-x-auto max-h-48">{g.sample.componentStack}</pre>
                                </div>
                            )}
                            {g.sample.userAgent && <div className="text-xs text-gray-400 break-words">UA : {g.sample.userAgent}</div>}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default function ErrorLogs() {
    const { groups, total, loading, error } = useErrorLogs();

    return (
        <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
            <div className="mb-6">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Bug className="w-6 h-6 text-rose-600" /> Journal d'erreurs
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                    Erreurs remontées par l'application, regroupées par empreinte. {total > 0 && `${groups.length} type(s) · ${total} occurrence(s) récentes.`}
                </p>
            </div>

            {loading && (
                <div className="flex items-center justify-center py-16 text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
            )}

            {!loading && error && (
                <div className="p-4 rounded-xl bg-rose-50 text-rose-700 border border-rose-100">{error}</div>
            )}

            {!loading && !error && groups.length === 0 && (
                <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
                    <Bug className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-gray-500 font-medium">Aucune erreur enregistrée 🎉</h3>
                </div>
            )}

            {!loading && !error && groups.length > 0 && (
                <div className="space-y-3">
                    {groups.map((g) => <ErrorGroup key={g.fingerprint} g={g} />)}
                </div>
            )}
        </div>
    );
}
