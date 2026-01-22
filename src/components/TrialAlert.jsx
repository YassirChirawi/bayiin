import { differenceInDays, parseISO, addDays, format } from "date-fns";
import { Clock, AlertTriangle, Lock } from "lucide-react";
import { Link } from "react-router-dom";

export default function TrialAlert({ createdAt, plan }) {
    if (!createdAt) return null;
    if (plan === 'pro' || plan === 'unlimited') return null; // Hide if already upgraded
    // Calculate trial status
    // Fallback to today if createdAt is missing (Legacy stores get a fresh trial)
    const startDate = createdAt ? parseISO(createdAt) : new Date();
    const today = new Date();
    const daysUsed = differenceInDays(today, startDate);
    const trialLength = 14;
    const daysLeft = trialLength - daysUsed;
    const endDate = addDays(startDate, trialLength);

    // Don't show if upgraded (store.plan === 'pro') - logic handled by parent or here if we pass plan
    // For now, assume all checks are trial based

    if (daysLeft <= 0) {
        return (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        <Lock className="h-5 w-5 text-red-500 mr-3" />
                        <div>
                            <h3 className="text-sm font-bold text-red-800">Trial Period Expired</h3>
                            <p className="text-xs text-red-700 mt-1">
                                Your 14-day free trial ended on {format(endDate, 'MMM dd, yyyy')}.
                                <br />Please upgrade to a Pro plan to continue managing your store.
                            </p>
                        </div>
                    </div>
                    <button className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition shadow-sm whitespace-nowrap">
                        Upgrade Now
                    </button>
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
                            <h3 className="text-sm font-bold text-orange-800">Trial Ending Soon</h3>
                            <p className="text-xs text-orange-700 mt-1">
                                You have <strong>{daysLeft} days left</strong> in your free trial.
                                Don't lose access to your store data.
                            </p>
                        </div>
                    </div>
                    <button className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-orange-700 transition shadow-sm whitespace-nowrap">
                        Upgrade Plan
                    </button>
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
                    <span className="text-sm font-medium text-indigo-900">Free Trial Active</span>
                    <span className="mx-2 text-indigo-300">|</span>
                    <span className="text-xs text-indigo-600 font-medium">{daysLeft} days remaining</span>
                </div>
            </div>
            <Link to="/settings" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline">
                View Plans
            </Link>
        </div>
    );
}
