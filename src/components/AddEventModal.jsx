import { useState } from 'react';
import { X, Calendar, Clock, Truck, FileText, Phone, ShoppingBag, RefreshCw } from 'lucide-react'; // Added icons
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { useLanguage } from '../context/LanguageContext';
import { useTenant } from '../context/TenantContext';

export default function AddEventModal({ isOpen, onClose, defaultDate, onSave }) {
    const { t } = useLanguage();
    const { store } = useTenant();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        date: defaultDate ? defaultDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        time: '09:00',
        type: 'other', // ramassage, livraison, confirmation, custom_collection, retour, other
        notes: '',
        color: '#3B82F6' // Default Blue
    });

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.title || !formData.date) return;

        setLoading(true);
        try {
            await addDoc(collection(db, 'events'), {
                ...formData,
                storeId: store.id,
                createdAt: serverTimestamp()
            });
            toast.success("Event added!");
            onSave && onSave();
            onClose();
        } catch (err) {
            console.error(err);
            toast.error("Failed to add event");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />

                <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                    <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                        <div className="flex justify-between items-center mb-5">
                            <h3 className="text-lg font-semibold leading-6 text-gray-900">
                                {t('add_event') || "Add Event"}
                            </h3>
                            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <form id="event-form" onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">{t('label_title') || "Title"}</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                    placeholder="Ex: Ramassage Amana..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">{t('label_date') || "Date"}</label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.date}
                                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">{t('label_time') || "Time"}</label>
                                    <input
                                        type="time"
                                        value={formData.time}
                                        onChange={e => setFormData({ ...formData, time: e.target.value })}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">{t('label_type') || "Type"}</label>
                                <div className="mt-2 grid grid-cols-2 gap-2">
                                    {['ramassage', 'livraison', 'confirmation', 'custom_collection', 'retour', 'other'].map(type => (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, type })}
                                            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium border flex items-center justify-start gap-2 ${formData.type === type
                                                ? 'bg-indigo-50 border-indigo-500 text-indigo-700 ring-1 ring-indigo-500'
                                                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                                                }`}
                                        >
                                            <span className="flex-shrink-0">
                                                {type === 'ramassage' && <Truck className="h-4 w-4" />}
                                                {type === 'livraison' && <Clock className="h-4 w-4" />}
                                                {type === 'confirmation' && <Phone className="h-4 w-4" />}
                                                {type === 'custom_collection' && <ShoppingBag className="h-4 w-4" />}
                                                {type === 'retour' && <RefreshCw className="h-4 w-4" />}
                                                {type === 'other' && <FileText className="h-4 w-4" />}
                                            </span>
                                            <span className="capitalize truncate">{t(`type_${type}`) || type}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">{t('label_color') || "Color"}</label>
                                <div className="flex flex-wrap gap-2">
                                    {['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6B7280'].map(color => (
                                        <button
                                            key={color}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, color: color })}
                                            className={`w-8 h-8 rounded-full border-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${formData.color === color ? 'border-gray-900 ring-2 ring-gray-900' : 'border-transparent'}`}
                                            style={{ backgroundColor: color }}
                                            aria-label={`Select color ${color}`}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">{t('label_notes') || "Notes"}</label>
                                <textarea
                                    value={formData.notes}
                                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                    rows={3}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                />
                            </div>
                        </form>
                    </div>
                    <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                        <button
                            type="submit"
                            form="event-form"
                            disabled={loading}
                            className="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 sm:ml-3 sm:w-auto disabled:opacity-50"
                        >
                            {loading ? t('loading') : (t('btn_save_event') || 'Save Event')}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                        >
                            {t('cancel') || "Cancel"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
