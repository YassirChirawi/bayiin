import React from 'react';
import {
    CheckSquare, Square, DollarSign, Edit2,
    Trash2, QrCode, RotateCcw, Truck,
    Package, MessageCircle, Box, MapPin
} from 'lucide-react';
import { getOrderStatusConfig } from '../../utils/statusConfig';
import { createRawWhatsAppLink, getWhatsappMessage } from '../../utils/whatsappTemplates';

export default function OrderMobileList({
    orders,
    selectedOrders,
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
        <div className="md:hidden space-y-4">
            {orders.map((order) => {
                const isSelected = selectedOrders.includes(order.id);
                const waLink = createRawWhatsAppLink(order.clientPhone, getWhatsappMessage(order.status, order, store));
                const totalPrice = order.price ? (order.source === 'public_catalog' ? parseFloat(order.price).toFixed(2) : (order.price * order.quantity).toFixed(2)) : '-';

                return (
                    <div
                        key={order.id}
                        className={`bg-white rounded-xl shadow-sm border p-4 transition-all ${isSelected ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-gray-100'}`}
                    >
                        {/* Header: Order ID, Date, Selection */}
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                                <button onClick={() => handleSelectOne(order.id)} className="text-gray-400">
                                    {isSelected ? <CheckSquare className="h-6 w-6 text-indigo-600" /> : <Square className="h-6 w-6" />}
                                </button>
                                <div>
                                    <h3 className="font-bold text-gray-900">{order.orderNumber}</h3>
                                    <p className="text-xs text-gray-500">{order.date}</p>
                                </div>
                            </div>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${activeTab === 'carts' ? 'bg-yellow-100 text-yellow-800' : getOrderStatusConfig(order.status).color}`}>
                                {activeTab === 'carts' ? 'Pending Action' : getOrderStatusConfig(order.status).label}
                            </span>
                        </div>

                        {/* Body: Client & Product Info */}
                        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                            <div>
                                <p className="text-xs text-gray-400 mb-1">{t('client')}</p>
                                <p className="font-semibold text-gray-900 truncate">{order.clientName}</p>
                                <a href={`tel:${order.clientPhone}`} className="text-indigo-600 text-xs flex items-center gap-1 mt-1">
                                    {order.clientPhone}
                                </a>
                                {order.driverNote && (
                                    <div className="mt-2 text-[10px] text-rose-700 bg-rose-50 border border-rose-100 rounded px-1.5 py-0.5 leading-tight w-fit">
                                        💬 {order.driverNote}
                                    </div>
                                )}
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-gray-400 mb-1">{t('table_total')}</p>
                                <p className="font-bold text-gray-900 text-base">{totalPrice} <span className="text-xs font-normal">{store?.currency || 'MAD'}</span></p>
                                <p className="text-xs text-gray-500 truncate mt-1">{order.articleName} (x{order.quantity})</p>
                            </div>
                        </div>

                        {/* Footer: Actions */}
                        <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                            {/* Left: Payment Toggle */}
                            <button
                                onClick={() => togglePaid(order)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${order.isPaid
                                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                    }`}
                            >
                                <DollarSign className="h-3.5 w-3.5" />
                                {order.isPaid ? t('status_paid') : t('status_unpaid')}
                            </button>

                            {activeTab === 'carts' ? (
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleEdit(order)}
                                        className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium shadow-sm active:scale-95 transition-transform"
                                    >
                                        {t('btn_confirm')}
                                    </button>
                                    <button
                                        onClick={() => deleteStoreItem(order.id)}
                                        className="p-2 rounded-full bg-red-50 text-red-600 hover:bg-red-100 border border-red-100"
                                    >
                                        <Trash2 className="h-5 w-5" />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3">
                                    {/* O-Livraison Action */}
                                    <button
                                        onClick={async () => {
                                            if (!store?.olivraisonApiKey) {
                                                toast.error("Please configure O-Livraison API Keys in Settings first.");
                                                return;
                                            }
                                            if (order.carrier === 'olivraison') return;

                                            openConfirmation({
                                                title: "Send to O-Livraison",
                                                message: `Send Order #${order.orderNumber} to O-Livraison?`,
                                                onConfirm: async () => {
                                                    try {
                                                        toast.loading("Sending to Carrier...");
                                                        await sendToOlivraison(order);
                                                        toast.dismiss();
                                                        toast.success("Order sent to O-Livraison!");
                                                    } catch (err) {
                                                        toast.dismiss();
                                                        toast.error(err.message);
                                                    }
                                                }
                                            });
                                        }}
                                        disabled={!store?.olivraisonApiKey || order.carrier === 'olivraison'}
                                        className={`p-2 rounded-full transition-colors ${!store?.olivraisonApiKey
                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            : order.carrier === 'olivraison'
                                                ? 'bg-green-100 text-green-600 cursor-default'
                                                : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                                            }`}
                                        title={
                                            !store?.olivraisonApiKey ? "Configure O-Livraison in Settings to enable"
                                                : order.carrier === 'olivraison' ? "Order already sent to O-Livraison"
                                                    : "Send to O-Livraison"
                                        }
                                    >
                                        <Truck className="h-5 w-5" />
                                    </button>

                                    <button
                                        onClick={async () => {
                                            if (!store?.senditPublicKey) {
                                                toast.error("Please configure Sendit API Keys in Settings first.");
                                                return;
                                            }
                                            if (order.carrier === 'sendit') return;

                                            openConfirmation({
                                                title: "Send to Sendit",
                                                message: `Send Order #${order.orderNumber} to Sendit?`,
                                                onConfirm: async () => {
                                                    try {
                                                        toast.loading("Sending to Sendit...");
                                                        await sendToSendit(order);
                                                        toast.dismiss();
                                                        toast.success("Order sent to Sendit!");
                                                    } catch (err) {
                                                        toast.dismiss();
                                                        toast.error(err.message);
                                                    }
                                                }
                                            });
                                        }}
                                        disabled={!store?.senditPublicKey || order.carrier === 'sendit'}
                                        className={`p-2 rounded-full transition-colors ${!store?.senditPublicKey
                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            : order.carrier === 'sendit'
                                                ? 'bg-green-100 text-green-600 cursor-default'
                                                : 'bg-orange-50 text-orange-600 hover:bg-orange-100'
                                            }`}
                                        title={
                                            !store?.senditPublicKey ? "Configure Sendit in Settings to enable"
                                                : order.carrier === 'sendit' ? "Order already sent to Sendit"
                                                    : "Send to Sendit"
                                        }
                                    >
                                        <Truck className="h-5 w-5" />
                                    </button>

                                    {/* Tracking Timeline (Internal or Carrier) */}
                                    {(order.carrier || order.livreurToken) && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleOpenTracking(order); }}
                                            className="p-2 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                                            title="Suivi / Historique"
                                        >
                                            <MapPin className="h-5 w-5" />
                                        </button>
                                    )}

                                    {/* Amana Placeholder */}
                                    <button disabled className="p-2 rounded-full bg-gray-50 text-gray-300 cursor-not-allowed" title="Amana Integration Coming Soon">
                                        <Package className="h-5 w-5" />
                                    </button>
                                    {/* Cathedis Placeholder */}
                                    <button disabled className="p-2 rounded-full bg-gray-50 text-gray-300 cursor-not-allowed" title="Cathedis Integration Coming Soon">
                                        <Box className="h-5 w-5" />
                                    </button>
                                    {/* WhatsApp Notification */}
                                    <a
                                        href={waLink}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="p-2 rounded-full bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                                    >
                                        <MessageCircle className="h-5 w-5" />
                                    </a>
                                    <button
                                        onClick={() => handleEdit(order)}
                                        className="p-2 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                                    >
                                        <Edit2 className="h-5 w-5" />
                                    </button>
                                    {showTrash && (
                                        <button
                                            onClick={() => handleRestore(order.id)}
                                            className="p-2 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100"
                                        >
                                            <RotateCcw className="h-5 w-5" />
                                        </button>
                                    )}
                                    {showTrash ? (
                                        <button
                                            onClick={() => handleDelete(order.id)}
                                            className="p-2 rounded-full bg-red-50 text-red-600 hover:bg-red-100"
                                        >
                                            <Trash2 className="h-5 w-5" />
                                        </button>
                                    ) : null}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
