import React from 'react';
import {
    CheckSquare, Square, DollarSign, Edit2,
    Trash2, QrCode, RotateCcw, Truck,
    Package, MessageCircle, Box, MapPin
} from 'lucide-react';
import { getOrderStatusConfig } from '../../utils/statusConfig';
import { createRawWhatsAppLink, getWhatsappMessage } from '../../utils/whatsappTemplates';

export default function OrderTable({
    orders,
    selectedOrders,
    handleSelectAll,
    handleSelectOne,
    activeTab,
    showTrash,
    store,
    togglePaid,
    handleEdit,
    deleteStoreItem,
    handleRestore,
    handleDelete,
    openConfirmation,
    sendToOlivraison,
    sendToSendit,
    handleOpenTracking,
    setQrOrder,
    t
}) {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto min-h-[400px]">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50/80 backdrop-blur-sm sticky top-0 z-10">
                        <tr>
                            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-12">
                                <button onClick={handleSelectAll} className="text-gray-400 hover:text-gray-600 focus:outline-none transition-colors">
                                    {selectedOrders.length === orders.length && orders.length > 0 ? (
                                        <CheckSquare className="h-5 w-5 text-indigo-600" />
                                    ) : (
                                        <Square className="h-5 w-5" />
                                    )}
                                </button>
                            </th>
                            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('order_id')}</th>
                            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('client')}</th>
                            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('order_price')}</th>
                            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('order_status')}</th>
                            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('payment')}</th>
                            <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                        {orders.map((order) => {
                            const isSelected = selectedOrders.includes(order.id);
                            const waLink = createRawWhatsAppLink(order.clientPhone,
                                getWhatsappMessage(order.status, order, store)
                            );

                            const totalPrice = order.price
                                ? (order.source === 'public_catalog'
                                    ? parseFloat(order.price).toFixed(2)
                                    : (order.price * order.quantity).toFixed(2))
                                : '-';

                            // Prevent status click if pending_catalog
                            const handleStatusClick = () => {
                                if (activeTab === 'carts') {
                                    handleEdit(order);
                                } else {
                                    handleEdit(order);
                                }
                            };

                            return (
                                <tr
                                    key={order.id}
                                    className={`hover:bg-gray-50/50 transition-colors cursor-pointer group ${isSelected ? 'bg-indigo-50/30' : ''}`}
                                    onClick={(e) => {
                                        if (e.target.closest('button') || e.target.closest('a')) return;
                                        handleSelectOne(order.id);
                                    }}
                                >
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <button onClick={(e) => { e.stopPropagation(); handleSelectOne(order.id); }} className="text-gray-400 hover:text-gray-600 focus:outline-none transition-colors">
                                            {isSelected ? <CheckSquare className="h-5 w-5 text-indigo-600" /> : <Square className="h-5 w-5" />}
                                        </button>
                                    </td>

                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                                                {order.orderNumber}
                                            </span>
                                            <span className="text-xs text-gray-500 font-medium">
                                                {order.date}
                                                {order.source === 'public_catalog' && <span className="ml-1 text-yellow-600">({t('catalog_source')})</span>}
                                            </span>
                                        </div>
                                    </td>

                                    <td className="px-6 py-4">
                                        <div className="flex flex-col max-w-[200px]">
                                            <span className="text-sm font-semibold text-gray-900 truncate" title={order.clientName}>
                                                {order.clientName}
                                            </span>
                                            <a
                                                href={`tel:${order.clientPhone}`}
                                                className="text-sm text-indigo-600 hover:text-indigo-800 transition-colors truncate"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                {order.clientPhone}
                                            </a>
                                            {order.driverNote && (
                                                <div className="mt-1 text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded px-1.5 py-0.5 inline-block w-fit truncate max-w-full" title={order.driverNote}>
                                                    💬 {order.driverNote}
                                                </div>
                                            )}
                                        </div>
                                    </td>

                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-gray-900">
                                                {totalPrice} <span className="text-xs font-normal text-gray-500">{store?.currency || 'MAD'}</span>
                                            </span>
                                            <span className="text-xs text-gray-500 truncate max-w-[150px]" title={order.articleName}>
                                                {order.articleName} <span className="font-semibold px-1 rounded bg-gray-100 text-gray-600">x{order.quantity}</span>
                                            </span>
                                        </div>
                                    </td>

                                    <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => { e.stopPropagation(); handleStatusClick(); }}>
                                        {activeTab === 'carts' ? (
                                            <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-bold rounded-md bg-yellow-100 text-yellow-800 border border-yellow-200 cursor-pointer hover:bg-yellow-200 transition-colors">
                                                {t('status_pending_action') || "Pending Action"}
                                            </span>
                                        ) : (
                                            <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-bold rounded-md border cursor-pointer hover:opacity-80 transition-opacity ${getOrderStatusConfig(order.status).color.replace('bg-', 'bg-opacity-20 bg-').replace('text-', 'text-')}`}>
                                                {t(`status_${order.status.toLowerCase().replace(/\s+/g, '_')}`) || getOrderStatusConfig(order.status).label}
                                            </span>
                                        )}
                                    </td>

                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); togglePaid(order); }}
                                            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${order.isPaid
                                                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border border-emerald-200 shadow-sm'
                                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 border border-transparent'
                                                }`}
                                            title="Click to toggle payment status"
                                        >
                                            <DollarSign className="h-3.5 w-3.5" />
                                            {order.isPaid ? t('status_paid') : t('status_unpaid')}
                                        </button>
                                    </td>

                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        {activeTab === 'carts' ? (
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={(e) => { e.stopPropagation(); handleEdit(order); }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm transition-all active:scale-95 font-medium text-xs">
                                                    {t('btn_transform')}
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); deleteStoreItem(order.id); }} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                                    <Trash2 className="h-5 w-5" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={(e) => { e.stopPropagation(); setQrOrder(order); }} className="p-2 text-gray-400 hover:text-gray-900 transition-colors" title="Generate QR Code">
                                                    <QrCode className="h-4 w-4" />
                                                </button>

                                                {(order.carrier || order.livreurToken) && (
                                                    <button onClick={(e) => { e.stopPropagation(); handleOpenTracking(order); }} className="p-2 text-blue-500 hover:text-blue-700 transition-colors" title={t('tracking_timeline')}>
                                                        <MapPin className="h-4 w-4" />
                                                    </button>
                                                )}

                                                <button
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        if (!store?.olivraisonApiKey) {
                                                            toast.error(t('err_no_olivraison_keys'));
                                                            return;
                                                        }
                                                        if (order.carrier === 'olivraison') return;

                                                        openConfirmation({
                                                            title: t('send_to_olivraison'),
                                                            message: t('confirm_send_olivraison', { orderNumber: order.orderNumber }),
                                                            onConfirm: async () => {
                                                                try {
                                                                    toast.loading(t('sending_to_carrier'));
                                                                    await sendToOlivraison(order);
                                                                    toast.dismiss();
                                                                    toast.success(t('success_send_olivraison'));
                                                                } catch (err) {
                                                                    toast.dismiss();
                                                                    toast.error(err.message);
                                                                }
                                                            }
                                                        });
                                                    }}
                                                    disabled={!store?.olivraisonApiKey || order.carrier === 'olivraison'}
                                                    className={`p-2 transition-colors ${!store?.olivraisonApiKey
                                                        ? 'text-gray-300 cursor-not-allowed'
                                                        : order.carrier === 'olivraison'
                                                            ? 'text-green-500 cursor-default'
                                                            : 'text-gray-400 hover:text-blue-600'
                                                        }`}
                                                    title={!store?.olivraisonApiKey ? t('err_no_olivraison_keys') : order.carrier === 'olivraison' ? t('success_send_olivraison') : t('send_to_olivraison')}
                                                >
                                                    <Truck className="h-4 w-4" />
                                                </button>

                                                <button
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        if (!store?.senditPublicKey) {
                                                            toast.error(t('err_no_sendit_keys'));
                                                            return;
                                                        }
                                                        if (order.carrier === 'sendit') return;

                                                        openConfirmation({
                                                            title: t('send_to_sendit'),
                                                            message: t('confirm_send_sendit', { orderNumber: order.orderNumber }),
                                                            onConfirm: async () => {
                                                                try {
                                                                    toast.loading(t('sending_to_carrier'));
                                                                    await sendToSendit(order);
                                                                    toast.dismiss();
                                                                    toast.success(t('success_send_sendit'));
                                                                } catch (err) {
                                                                    toast.dismiss();
                                                                    toast.error(err.message);
                                                                }
                                                            }
                                                        });
                                                    }}
                                                    disabled={!store?.senditPublicKey || order.carrier === 'sendit'}
                                                    className={`p-2 transition-colors ${!store?.senditPublicKey
                                                        ? 'text-gray-300 cursor-not-allowed'
                                                        : order.carrier === 'sendit'
                                                            ? 'text-green-500 cursor-default'
                                                            : 'text-gray-400 hover:text-orange-600'
                                                        }`}
                                                    title={!store?.senditPublicKey ? t('err_no_sendit_keys') : order.carrier === 'sendit' ? t('success_send_sendit') : t('send_to_sendit')}
                                                >
                                                    <Truck className="h-4 w-4" />
                                                </button>

                                                <button disabled className="p-2 text-gray-200 cursor-not-allowed" title="Amana">
                                                    <Package className="h-4 w-4" />
                                                </button>

                                                <button disabled className="p-2 text-gray-200 cursor-not-allowed" title="Cathedis">
                                                    <Box className="h-4 w-4" />
                                                </button>

                                                <a href={waLink} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="p-2 text-gray-400 hover:text-green-600 transition-colors" title={t('btn_whatsapp')}>
                                                    <MessageCircle className="h-4 w-4" />
                                                </a>

                                                <button onClick={(e) => { e.stopPropagation(); handleEdit(order); }} className="p-2 text-gray-400 hover:text-indigo-600 transition-colors" title={t('edit')}>
                                                    <Edit2 className="h-4 w-4" />
                                                </button>

                                                {showTrash && (
                                                    <button onClick={(e) => { e.stopPropagation(); handleRestore(order.id); }} className="p-2 text-gray-400 hover:text-blue-600 transition-colors" title={t('restore')}>
                                                        <RotateCcw className="h-4 w-4" />
                                                    </button>
                                                )}

                                                {showTrash ? (
                                                    <button onClick={(e) => { e.stopPropagation(); handleDelete(order.id); }} className="p-2 text-gray-400 hover:text-red-600 transition-colors" title={t('delete_permanently')}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                ) : null}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
