import { useState } from 'react';
import { Copy, ExternalLink, X, Check } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import Button from './Button';

export default function ShareCatalogModal({ isOpen, onClose, storeId }) {
    const { t } = useLanguage();
    const [copied, setCopied] = useState(false);

    if (!isOpen || !storeId) return null;

    const catalogUrl = `${window.location.origin}/catalog/${storeId}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(catalogUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleOpen = () => {
        window.open(catalogUrl, '_blank');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h2 className="text-xl font-bold text-gray-900">{t('title_share_catalog') || "Share Catalog"}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 text-indigo-800 text-sm">
                        <p>{t('msg_share_catalog_desc') || "Your public catalog is ready! Share this link with your customers to let them view your products and order via WhatsApp."}</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">{t('label_catalog_link') || "Catalog Link"}</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                readOnly
                                value={catalogUrl}
                                className="flex-1 block w-full rounded-lg border-gray-300 bg-gray-50 text-gray-500 sm:text-sm px-3 py-2 border"
                            />
                            <button
                                onClick={handleCopy}
                                className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors"
                                title="Copy to clipboard"
                            >
                                {copied ? <Check className="h-5 w-5 text-green-600" /> : <Copy className="h-5 w-5" />}
                            </button>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <Button
                            variant="secondary"
                            onClick={handleOpen}
                            icon={ExternalLink}
                        >
                            {t('btn_open_catalog') || "Open Catalog"}
                        </Button>
                        <Button
                            onClick={onClose}
                        >
                            {t('btn_done') || "Done"}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
