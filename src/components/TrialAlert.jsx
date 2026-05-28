import { differenceInDays, parseISO, addDays, format } from "date-fns";
import { Clock, AlertTriangle, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";

export default function TrialAlert({ createdAt, plan }) {
    const { t } = useLanguage();
    if (!createdAt) return null;
    if (plan === 'pro' || plan === 'starter' || plan === 'unlimited') return null; // Hide if already upgraded

    const toDate = (val) => {
        if (!val) return new Date();
        if (typeof val?.toDate === 'function') return val.toDate(); // Firestore Timestamp
        if (val instanceof Date) return val;
        return parseISO(String(val)); // ISO string fallback
    };
    const startDate = toDate(createdAt);
    const today = new Date();
    const daysUsed = differenceInDays(today, startDate);
    const trialLength = 14;
    const daysLeft = trialLength - daysUsed;
    const endDate = addDays(startDate, trialLength);

    if (daysLeft <= 0) {
        return (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        <Lock className="h-5 w-5 text-red-500 mr-3" />
                        <div>
                            <h3 className="text-sm font-bold text-red-800">{t('trial_expired_title')}</h3>
                            <p className="text-xs text-red-700 mt-1">
                                {t('trial_expired_desc').replace('{date}', format(endDate, 'MMM dd, yyyy'))}
                            </p>
                        </div>
                    </div>
                    <Link
                        to="/settings?tab=billing"
                        className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition shadow-sm whitespace-nowrap"
                    >
                        {t('btn_upgrade')} →
                    </Link>
                </div>
            </div>
        );
    }

    if (daysLeft <= 5) {
        return (
            <div className="bg-orange-50 border-l-4 border-orange-500 p-4 mb-6 rounded-r-lg shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        <AlertTriangle className="h-5 w-5 text-orange-500 mr-3" />
                        <div>
                            <h3 className="text-sm font-bold text-orange-800">{t('trial_ending_soon_title')}</h3>
                            <p className="text-xs text-orange-700 mt-1" dangerouslySetInnerHTML={{ 
                                __html: t('trial_ending_soon_desc').replace('{days}', daysLeft) 
                            }} />
                        </div>
                    </div>
                    <Link
                        to="/settings?tab=billing"
                        className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-orange-700 transition shadow-sm whitespace-nowrap flex items-center gap-1.5"
                    >
                        ⚡ {t('btn_upgrade')}
                    </Link>
                </div>
            </div>
        );
    }

    // Default: Trial Active (Good state)
    return (
        <div className="bg-indigo-50 border-1 border-indigo-100 p-3 mb-6 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className="bg-indigo-100 p-1.5 rounded-md">
                    <Clock className="h-4 w-4 text-indigo-600" />
                </div>
                <div>
                    <span className="text-sm font-medium text-indigo-900">{t('trial_active_title')}</span>
                    <span className="mx-2 text-indigo-300">|</span>
                    <span className="text-xs text-indigo-600 font-medium">{t('trial_active_desc').replace('{days}', daysLeft)}</span>
                </div>
            </div>
            <Link to="/settings?tab=billing" className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-indigo-700 transition shadow-sm whitespace-nowrap flex items-center gap-1.5">
                ⚡ {t('btn_upgrade')}
            </Link>
        </div>
    );
}
