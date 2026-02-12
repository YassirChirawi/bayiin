import { X, AlertTriangle } from 'lucide-react';
import Button from './Button';
import { useLanguage } from '../context/LanguageContext';

export default function ConfirmationModal({ isOpen, onClose, onConfirm, title, message, confirmText, cancelText, isDestructive = false }) {
    const { t } = useLanguage();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden relative animate-in fade-in zoom-in duration-200">
                <div className="p-6">
                    <div className="flex items-start gap-4">
                        <div className={`p-2 rounded-full ${isDestructive ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600'}`}>
                            <AlertTriangle className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-gray-900 mb-2">
                                {title || t('confirm_title')}
                            </h3>
                            <p className="text-sm text-gray-500">
                                {message}
                            </p>
                        </div>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 rounded-b-xl border-t border-gray-100">
                    <Button
                        variant="secondary"
                        onClick={onClose}
                    >
                        {cancelText || t('confirm_no') || "Annuler"}
                    </Button>
                    <Button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={isDestructive ? 'bg-red-600 hover:bg-red-700 text-white border-transparent' : ''}
                    >
                        {confirmText || t('confirm_yes') || "Confirmer"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
