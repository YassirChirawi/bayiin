import React from 'react';
import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import {
    X,
    CheckCircle,
    Truck,
    AlertCircle,
    Home,
    Package,
    Clock,
    MapPin,
    Copy
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const STATUS_ICONS = {
    'DELIVERED': CheckCircle,
    'LIVRÉ': CheckCircle,
    'CANCELED': AlertCircle,
    'ANNULÉ': AlertCircle,
    'REFUSE': AlertCircle,
    'REFUSÉ': AlertCircle,
    'DELIVERING': Truck,
    'EN COURS DE LIVRAISON': Truck,
    'PICKED_UP': Package,
    'RAMASSÉ': Package,
    'WAREHOUSE': Home,
    'ENTREPÔT': Home,
    'CREATED': Clock,
    'PENDING': Clock
};

const STATUS_COLORS = {
    'DELIVERED': 'text-green-500 bg-green-50',
    'LIVRÉ': 'text-green-500 bg-green-50',
    'CANCELED': 'text-red-500 bg-red-50',
    'ANNULÉ': 'text-red-500 bg-red-50',
    'REFUSE': 'text-red-500 bg-red-50',
    'REFUSÉ': 'text-red-500 bg-red-50',
    'DELIVERING': 'text-blue-500 bg-blue-50',
    'EN COURS DE LIVRAISON': 'text-blue-500 bg-blue-50',
    'PICKED_UP': 'text-purple-500 bg-purple-50',
    'RAMASSÉ': 'text-purple-500 bg-purple-50',
    'WAREHOUSE': 'text-indigo-500 bg-indigo-50',
    'ENTREPÔT': 'text-indigo-500 bg-indigo-50',
    'CREATED': 'text-gray-500 bg-gray-50',
    'PENDING': 'text-gray-500 bg-gray-50'
};

export default function TrackingTimelineModal({ isOpen, onClose, trackingData, provider }) {
    if (!isOpen || !trackingData) return null;

    // Sendit specific data extraction
    const audits = trackingData.audits || (trackingData.data && trackingData.data.audits) || [];
    const currentStatus = trackingData.status || (trackingData.data && trackingData.data.status);
    const trackingCode = trackingData.code || (trackingData.data && trackingData.data.code);

    // Sort audits by date descending (newest first)
    // Assuming 'created_at' or similar timestamp in audit
    const sortedAudits = [...audits].sort((a, b) => {
        const dateA = new Date(a.created_at || a.date);
        const dateB = new Date(b.created_at || b.date);
        return dateB - dateA;
    });

    const copyToClipboard = () => {
        if (trackingCode) {
            navigator.clipboard.writeText(trackingCode);
            toast.success("Code de suivi copié !");
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('fr-FR', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };

    const getIcon = (status) => STATUS_ICONS[status] || MapPin;
    const getColorClass = (status) => STATUS_COLORS[status] || 'text-gray-500 bg-gray-50';

    return (
        <Transition.Root show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
                </Transition.Child>

                <div className="fixed inset-0 z-10 overflow-y-auto">
                    <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                            enterTo="opacity-100 translate-y-0 sm:scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        >
                            <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                                <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                                    <button
                                        type="button"
                                        className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none"
                                        onClick={onClose}
                                    >
                                        <span className="sr-only">Fermer</span>
                                        <X className="h-6 w-6" aria-hidden="true" />
                                    </button>
                                </div>

                                <div>
                                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                                        <Truck className="h-6 w-6 text-blue-600" aria-hidden="true" />
                                    </div>
                                    <div className="mt-3 text-center sm:mt-5">
                                        <Dialog.Title as="h3" className="text-base font-semibold leading-6 text-gray-900">
                                            Suivi de Colis {provider === 'sendit' ? 'Sendit' : 'Olivraison'}
                                        </Dialog.Title>
                                        <div className="mt-2 flex justify-center items-center gap-2">
                                            <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono text-gray-700">
                                                {trackingCode || 'N/A'}
                                            </code>
                                            {trackingCode && (
                                                <button onClick={copyToClipboard} className="text-gray-400 hover:text-gray-600">
                                                    <Copy className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6 max-h-[60vh] overflow-y-auto px-2">
                                    <div className="flow-root">
                                        <ul role="list" className="-mb-8">
                                            {sortedAudits.map((event, eventIdx) => {
                                                const status = event.status || (event.data && event.data.status);
                                                const Icon = getIcon(status);
                                                const colorClass = getColorClass(status);
                                                const date = formatDate(event.created_at || event.date);
                                                const note = event.note || (event.data && event.data.note) || (event.data && event.data.comment);

                                                return (
                                                    <li key={eventIdx}>
                                                        <div className="relative pb-8">
                                                            {eventIdx !== sortedAudits.length - 1 ? (
                                                                <span
                                                                    className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200"
                                                                    aria-hidden="true"
                                                                />
                                                            ) : null}
                                                            <div className="relative flex space-x-3">
                                                                <div>
                                                                    <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${colorClass}`}>
                                                                        <Icon className="h-5 w-5" aria-hidden="true" />
                                                                    </span>
                                                                </div>
                                                                <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                                                                    <div>
                                                                        <p className="text-sm font-medium text-gray-900">
                                                                            {status}
                                                                        </p>
                                                                        {note && (
                                                                            <p className="text-xs text-gray-500 mt-0.5">
                                                                                {note}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                    <div className="whitespace-nowrap text-right text-xs text-gray-500">
                                                                        <time dateTime={event.created_at}>{date}</time>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                        {sortedAudits.length === 0 && (
                                            <div className="text-center py-4 text-gray-500 text-sm">
                                                Aucun historique disponible pour le moment.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-5 sm:mt-6">
                                    <button
                                        type="button"
                                        className="inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                                        onClick={onClose}
                                    >
                                        Fermer
                                    </button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition.Root>
    );
}
