import React, { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import {
    Trash2, RotateCcw, DollarSign, Edit2,
    Truck, CheckSquare, Square, ChevronDown
} from 'lucide-react';
import { ORDER_STATUS_CONFIG } from '../../utils/statusConfig';

export default function OrderBulkActions({
    selectedOrders,
    filteredOrdersCount,
    handleSelectAll,
    activeTab,
    showTrash,
    store,
    handleBulkPaid,
    handleBulkRemitted,
    handleRequestPickup,
    setIsInternalPickupModalOpen,
    handleBulkDelete,
    handleBulkRestore,
    handleBulkStatus,
    t
}) {
    if (selectedOrders.length === 0) {
        return (
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={handleSelectAll} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <Square className="h-6 w-6" />
                    </button>
                    <span className="text-sm font-medium text-gray-700">
                        {filteredOrdersCount} {t('orders')}
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-indigo-50 p-4 rounded-xl shadow-sm border border-indigo-100 flex flex-wrap items-center gap-4 justify-between transition-all animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
                <button onClick={handleSelectAll} className="text-indigo-600 hover:text-indigo-700 transition-colors">
                    <CheckSquare className="h-6 w-6" />
                </button>
                <span className="text-sm font-bold text-indigo-900">
                    {selectedOrders.length} {t('selected')}
                </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                {activeTab === 'carts' ? (
                    <button
                        onClick={handleBulkDelete}
                        className="flex items-center gap-2 px-4 py-2 bg-white text-red-600 rounded-xl hover:bg-red-50 border border-red-100 font-medium text-sm transition-colors shadow-sm"
                    >
                        <Trash2 className="h-4 w-4" />
                        {t('delete')}
                    </button>
                ) : (
                    <>
                        <button
                            onClick={() => handleBulkPaid(t)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-white text-emerald-600 rounded-xl hover:bg-emerald-50 border border-emerald-100 font-medium text-sm transition-colors shadow-sm"
                        >
                            <DollarSign className="h-4 w-4" />
                            {t('btn_paid')}
                        </button>

                        <button
                            onClick={handleBulkRemitted}
                            className="flex items-center gap-2 px-3 py-1.5 bg-white text-teal-600 rounded-xl hover:bg-teal-50 border border-teal-100 font-medium text-sm transition-colors shadow-sm"
                        >
                            <DollarSign className="h-4 w-4" />
                            {t('btn_encaisse')}
                        </button>

                        <Menu as="div" className="relative">
                            <Menu.Button className="flex items-center gap-2 px-3 py-1.5 bg-white text-indigo-600 rounded-xl hover:bg-indigo-50 border border-indigo-100 font-medium text-sm transition-colors shadow-sm">
                                <Edit2 className="h-4 w-4" />
                                {t('btn_status')}
                                <ChevronDown className="h-4 w-4" />
                            </Menu.Button>
                            <Transition
                                as={Fragment}
                                enter="transition ease-out duration-100"
                                enterFrom="transform opacity-0 scale-95"
                                enterTo="transform opacity-100 scale-100"
                                leave="transition ease-in duration-75"
                                leaveFrom="transform opacity-100 scale-100"
                                leaveTo="transform opacity-0 scale-95"
                            >
                                <Menu.Items className="absolute z-20 mt-2 w-48 origin-top-left rounded-xl bg-white shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none divide-y divide-gray-100">
                                    <div className="p-1">
                                        {Object.entries(ORDER_STATUS_CONFIG).map(([statusKey, config]) => {
                                            if (statusKey === 'pending_catalog') return null;
                                            return (
                                                <Menu.Item key={statusKey}>
                                                    {({ active }) => (
                                                        <button
                                                            onClick={() => handleBulkStatus(statusKey, t)}
                                                            className={`${active ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700'
                                                                } group flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium`}
                                                        >
                                                            <div className={`w-2 h-2 rounded-full mr-3 ${config.color.split(' ')[0]}`}></div>
                                                            {config.label}
                                                        </button>
                                                    )}
                                                </Menu.Item>
                                            );
                                        })}
                                    </div>
                                </Menu.Items>
                            </Transition>
                        </Menu>

                        <Menu as="div" className="relative">
                            <Menu.Button className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 font-medium text-sm transition-colors shadow-sm">
                                <Truck className="h-4 w-4" />
                                {t('action_driver')}
                                <ChevronDown className="h-4 w-4 text-gray-400" />
                            </Menu.Button>
                            <Transition
                                as={Fragment}
                                enter="transition ease-out duration-100"
                                enterFrom="transform opacity-0 scale-95"
                                enterTo="transform opacity-100 scale-100"
                                leave="transition ease-in duration-75"
                                leaveFrom="transform opacity-100 scale-100"
                                leaveTo="transform opacity-0 scale-95"
                            >
                                <Menu.Items className="absolute right-0 z-20 mt-2 w-56 origin-top-right rounded-xl bg-white shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none divide-y divide-gray-100">
                                    <div className="p-1">
                                        <Menu.Item>
                                            {({ active }) => (
                                                <button
                                                    onClick={() => setIsInternalPickupModalOpen(true)}
                                                    className={`${active ? 'bg-indigo-50 text-indigo-700' : 'text-gray-900'} group flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium`}
                                                >
                                                    <Truck className="mr-3 h-4 w-4 text-indigo-500" />
                                                    {t('assign_internal_driver')}
                                                </button>
                                            )}
                                        </Menu.Item>
                                        <Menu.Item>
                                            {({ active }) => (
                                                <button
                                                    onClick={handleRequestPickup}
                                                    disabled={!store?.senditPublicKey}
                                                    className={`${active ? 'bg-orange-50 text-orange-700' : 'text-gray-900'} group flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed`}
                                                    title={!store?.senditPublicKey ? "Configurez Sendit dans les paramètres" : ""}
                                                >
                                                    <Truck className="mr-3 h-4 w-4 text-orange-500" />
                                                    {t('request_sendit_pickup')}
                                                </button>
                                            )}
                                        </Menu.Item>
                                    </div>
                                </Menu.Items>
                            </Transition>
                        </Menu>

                        {showTrash ? (
                            <>
                                <button
                                    onClick={() => handleBulkRestore(t)}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-white text-blue-600 rounded-xl hover:bg-blue-50 border border-blue-100 font-medium text-sm transition-colors shadow-sm"
                                >
                                    <RotateCcw className="h-4 w-4" />
                                    {t('restore')}
                                </button>
                                <button
                                    onClick={() => handleBulkDelete(showTrash, t)}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-white text-red-600 rounded-xl hover:bg-red-50 border border-red-100 font-medium text-sm transition-colors shadow-sm"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    {t('delete_permanently')}
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => handleBulkDelete(showTrash, t)}
                                className="flex items-center gap-2 px-3 py-1.5 bg-white text-red-600 rounded-xl hover:bg-red-50 border border-red-100 font-medium text-sm transition-colors shadow-sm"
                            >
                                <Trash2 className="h-4 w-4" />
                                {t('delete')}
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
