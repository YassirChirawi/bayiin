import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function ReloadPrompt() {
    const {
        offlineReady: [offlineReady, setOfflineReady],
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r) {
            console.log('SW Registered: ' + r);
        },
        onRegisterError(error) {
            console.log('SW registration error', error);
        },
    });

    const close = () => {
        setOfflineReady(false);
        setNeedRefresh(false);
    };

    if (!offlineReady && !needRefresh) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 animate-bounce-in">
            <div className="bg-white rounded-xl shadow-2xl border border-indigo-100 p-4 max-w-sm flex flex-col gap-3">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-100 p-2 rounded-lg">
                            <RefreshCw className="w-5 h-5 text-indigo-600 animate-spin-slow" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-gray-900">
                                {needRefresh ? 'Mise à jour disponible' : 'Application prête'}
                            </h3>
                            <p className="text-xs text-gray-500 mt-0.5">
                                {needRefresh 
                                    ? 'Une nouvelle version de BayIIn est disponible. Mettez à jour pour profiter des nouveautés.' 
                                    : 'L\'application fonctionne désormais hors-ligne.'}
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={close}
                        className="text-gray-400 hover:text-gray-600 p-1"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
                
                {needRefresh && (
                    <button
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors shadow-sm"
                        onClick={() => updateServiceWorker(true)}
                    >
                        Mettre à jour maintenant
                    </button>
                )}
            </div>
        </div>
    );
}
