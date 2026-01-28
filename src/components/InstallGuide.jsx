import { useState } from 'react';
import { X, Smartphone, Share, PlusSquare, MoreVertical, Download } from 'lucide-react';
import Button from './Button';

export default function InstallGuide({ isOpen, onClose }) {
    const [activeTab, setActiveTab] = useState('ios'); // 'ios' or 'android'

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scaleIn">
                {/* Header */}
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Download className="w-5 h-5 text-indigo-600" />
                        Install App
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab('ios')}
                        className={`flex-1 py-3 text-sm font-medium text-center transition-colors ${activeTab === 'ios' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                    >
                        iOS (iPhone)
                    </button>
                    <button
                        onClick={() => setActiveTab('android')}
                        className={`flex-1 py-3 text-sm font-medium text-center transition-colors ${activeTab === 'android' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                    >
                        Android
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {activeTab === 'ios' ? (
                        <div className="space-y-6">
                            <div className="flex items-start gap-4">
                                <div className="bg-gray-100 p-3 rounded-xl">
                                    <Share className="w-6 h-6 text-blue-500" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">1. Tap the Share Button</h3>
                                    <p className="text-sm text-gray-500 mt-1">Look for the share icon <Share className="inline w-3 h-3" /> at the bottom of your Safari browser.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="bg-gray-100 p-3 rounded-xl">
                                    <PlusSquare className="w-6 h-6 text-gray-700" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">2. Add to Home Screen</h3>
                                    <p className="text-sm text-gray-500 mt-1">Scroll down the list and tap <strong>"Add to Home Screen"</strong>.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="bg-gray-100 p-3 rounded-xl">
                                    <Smartphone className="w-6 h-6 text-indigo-600" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">3. Confirm & Install</h3>
                                    <p className="text-sm text-gray-500 mt-1">Tap <strong>Add</strong> in the top right corner. The app will appear on your home screen.</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex items-start gap-4">
                                <div className="bg-gray-100 p-3 rounded-xl">
                                    <MoreVertical className="w-6 h-6 text-gray-700" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">1. Open Menu</h3>
                                    <p className="text-sm text-gray-500 mt-1">Tap the three dots <MoreVertical className="inline w-3 h-3" /> at the top right of Chrome.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="bg-gray-100 p-3 rounded-xl">
                                    <Download className="w-6 h-6 text-green-600" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">2. Install App</h3>
                                    <p className="text-sm text-gray-500 mt-1">Tap <strong>"Install App"</strong> or <strong>"Add to Home screen"</strong>.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="bg-gray-100 p-3 rounded-xl">
                                    <Smartphone className="w-6 h-6 text-indigo-600" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">3. Confirm</h3>
                                    <p className="text-sm text-gray-500 mt-1">Follow the prompt to install. The app icon will be added to your device.</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-gray-50 text-center">
                    <Button onClick={onClose} className="w-full justify-center">
                        Got it!
                    </Button>
                </div>
            </div>
        </div>
    );
}
