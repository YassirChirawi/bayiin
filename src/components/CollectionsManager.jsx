
import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useStoreData } from '../hooks/useStoreData';
import Button from './Button';
import Input from './Input';
import { Plus, Trash2, X } from 'lucide-react';
import { parseISO, format } from 'date-fns';

export default function CollectionsManager({ onClose, onSelect }) {
    const { t } = useLanguage();
    const { data: collections, addStoreItem, deleteStoreItem, loading } = useStoreData('collections');
    const [form, setForm] = useState({ name: '', startDate: '', endDate: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name || !form.startDate || !form.endDate) return;

        setIsSubmitting(true);
        try {
            await addStoreItem({
                name: form.name,
                startDate: form.startDate,
                endDate: form.endDate,
                createdAt: new Date().toISOString()
            });
            setForm({ name: '', startDate: '', endDate: '' });
            // Optional: Show success toast
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm(t('confirm_delete'))) {
            await deleteStoreItem(id);
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                    <h2 className="text-xl font-semibold text-gray-900">{t('modal_collections')}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    {/* Create Form */}
                    <form onSubmit={handleSubmit} className="mb-8 p-4 bg-gray-50 rounded-lg border border-gray-100 space-y-4">
                        <h3 className="font-medium text-gray-900">{t('create')}</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Input
                                label={t('collection_name')}
                                placeholder="e.g. Summer Launch"
                                value={form.name}
                                onChange={e => setForm({ ...form, name: e.target.value })}
                                required
                            />
                            <div className="grid grid-cols-2 gap-2">
                                <Input
                                    type="date"
                                    label={t('label_start_date')}
                                    value={form.startDate}
                                    onChange={e => setForm({ ...form, startDate: e.target.value })}
                                    required
                                />
                                <Input
                                    type="date"
                                    label={t('label_end_date')}
                                    value={form.endDate}
                                    onChange={e => setForm({ ...form, endDate: e.target.value })}
                                    required
                                />
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <Button type="submit" isLoading={isSubmitting} icon={Plus}>
                                {t('btn_create_collection')}
                            </Button>
                        </div>
                    </form>

                    {/* List */}
                    <div className="space-y-4">
                        <h3 className="font-medium text-gray-900">{t('collections_title')}</h3>
                        {collections.length === 0 ? (
                            <p className="text-center text-gray-500 py-4">{t('no_data')}</p>
                        ) : (
                            <div className="bg-white border text-left border-gray-200 rounded-md shadow-sm overflow-hidden">
                                <ul className="divide-y divide-gray-200">
                                    {collections.map((col) => (
                                        <li key={col.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                                            <div>
                                                <p className="font-semibold text-gray-900">{col.name}</p>
                                                <p className="text-sm text-gray-500">
                                                    {col.startDate && format(parseISO(col.startDate), 'dd MMM yyyy')} - {col.endDate && format(parseISO(col.endDate), 'dd MMM yyyy')}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {onSelect && (
                                                    <Button size="sm" variant="secondary" onClick={() => onSelect(col)}>
                                                        {t('view_details')}
                                                    </Button>
                                                )}
                                                <button
                                                    onClick={() => handleDelete(col.id)}
                                                    className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
