import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import Button from './Button';

export default function ConfirmDialog({ isOpen, title, message, onConfirm, onCancel, isDestructive }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md relative animate-in fade-in zoom-in-95 duration-200">
                <button 
                    onClick={onCancel}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <X className="h-5 w-5" />
                </button>
                
                <div className="p-6">
                    <div className="flex items-start gap-4 mb-4">
                        <div className={`p-3 rounded-full flex-shrink-0 ${isDestructive ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600'}`}>
                            <AlertTriangle className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">{title}</h3>
                            <p className="text-gray-600 mt-2 whitespace-pre-wrap">{message}</p>
                        </div>
                    </div>
                    
                    <div className="flex gap-3 justify-end mt-6">
                        <Button variant="secondary" onClick={onCancel} className="px-6">
                            Annuler
                        </Button>
                        <Button 
                            onClick={() => {
                                onConfirm();
                                onCancel();
                            }}
                            className={`px-6 ${isDestructive ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
                        >
                            Confirmer
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
