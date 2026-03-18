import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { Html5QrcodeScanner } from "html5-qrcode";
import { collection, query, where, getDocs, doc, updateDoc, increment } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useTenant } from "../context/TenantContext";
import PageTransition from "../components/PageTransition";
import Button from "../components/Button";
import { Package, ShoppingBag, Barcode as BarcodeIcon, Truck, CheckCircle, RotateCcw } from "lucide-react";
import { vibrate } from "../utils/haptics";
import { useLanguage } from "../context/LanguageContext";

export default function Warehouse() {
    const { store } = useTenant();
    const { t } = useLanguage();
    const [scanResult, setScanResult] = useState(null);
    const [scanType, setScanType] = useState(null); // 'order' or 'product'
    const [isScanning, setIsScanning] = useState(true);
    const [scannerInstance, setScannerInstance] = useState(null);

    useEffect(() => {
        if (!isScanning) return;

        const scanner = new Html5QrcodeScanner(
            "reader",
            { fps: 10, qrbox: { width: 250, height: 250 }, rememberLastUsedCamera: true },
            /* verbose= */ false
        );
        
        setScannerInstance(scanner);

        scanner.render(async (decodedText) => {
            // Pause scanning as soon as we detect something
            scanner.pause(true);
            vibrate('medium');
            
            try {
                // TRY PARSING AS ORDER JSON (from Orders page QR)
                const data = JSON.parse(decodedText);
                if (data.number && data.id) {
                    setScanType("order");
                    setScanResult(data);
                    setIsScanning(false);
                    return;
                }
            } catch(e) {
                // Not JSON, continue to Product search
            }

            // TRY FINDING PRODUCT BY SKU
            try {
                const q = query(
                    collection(db, "products"), 
                    where("storeId", "==", store.id), 
                    where("sku", "==", decodedText)
                );
                const snapshot = await getDocs(q);
                
                if (!snapshot.empty) {
                    setScanType("product");
                    setScanResult({ id: snapshot.docs[0].id, ...snapshot.docs[0].data(), scannedCode: decodedText });
                    setIsScanning(false);
                } else {
                    toast.error(`Code non reconnu: ${decodedText}`);
                    scanner.resume(); // keep trying
                }
            } catch (err) {
                console.error("DB Error:", err);
                toast.error("Erreur de recherche.");
                scanner.resume();
            }

        }, undefined);

        return () => {
            scanner.clear().catch(console.error);
        };
    }, [isScanning, store.id]);

    const handleResetScan = () => {
        setScanResult(null);
        setScanType(null);
        setIsScanning(true);
        vibrate('soft');
    };

    // --- QUICK ACTIONS ---
    const markOrderShipped = async () => {
        if (!scanResult || scanType !== 'order') return;
        try {
            await updateDoc(doc(db, "orders", scanResult.id), { status: "en_expedition" });
            vibrate('success');
            toast.success("Commande marquée en expédition !");
            handleResetScan();
        } catch (e) {
            toast.error("Erreur lors de la mise à jour.");
        }
    };

    const updateProductStock = async (amount) => {
        if (!scanResult || scanType !== 'product') return;
        try {
            await updateDoc(doc(db, "products", scanResult.id), {
                stock: increment(amount)
            });
            // Update local state to reflect change immediately before resetting
            setScanResult(prev => ({ ...prev, stock: (parseInt(prev.stock) || 0) + amount }));
            vibrate('success');
            toast.success(`Stock mis à jour (${amount > 0 ? '+' : ''}${amount})`);
        } catch (e) {
            toast.error("Erreur de mise à jour du stock.");
        }
    };

    return (
        <PageTransition>
            <div className="space-y-6 max-w-2xl mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <BarcodeIcon className="h-6 w-6 text-indigo-600" />
                            Warehouse & Scan
                        </h1>
                        <p className="mt-1 text-sm text-gray-500">
                            Scannez un colis (QR Commande) ou un produit (Code-barres EAN/SKU) pour une action rapide.
                        </p>
                    </div>
                </div>

                {/* Scanner View */}
                {isScanning && (
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center">
                        <div id="reader" className="w-full max-w-sm rounded-lg overflow-hidden border-2 border-indigo-100 mb-4"></div>
                        <p className="text-gray-500 text-sm animate-pulse flex items-center gap-2">
                            <BarcodeIcon className="h-4 w-4" /> Caméra active. Présentez un code.
                        </p>
                    </div>
                )}

                {/* Results View */}
                {!isScanning && scanResult && (
                    <div className="bg-white rounded-xl shadow-lg border border-indigo-100 overflow-hidden animate-in fade-in zoom-in duration-300">
                        {/* Result Header */}
                        <div className={`p-4 border-b ${scanType === 'order' ? 'bg-indigo-50 border-indigo-100' : 'bg-purple-50 border-purple-100'} flex items-center gap-4`}>
                            <div className={`p-3 rounded-full ${scanType === 'order' ? 'bg-indigo-100 text-indigo-700' : 'bg-purple-100 text-purple-700'}`}>
                                {scanType === 'order' ? <ShoppingBag className="h-6 w-6" /> : <Package className="h-6 w-6" />}
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">
                                    {scanType === 'order' ? 'Commande Scannée' : 'Produit Scanné'}
                                </h2>
                                <p className="text-sm font-mono text-gray-600">
                                    {scanType === 'order' ? `#${scanResult.number}` : scanResult.scannedCode}
                                </p>
                            </div>
                        </div>

                        {/* Result Body (ORDER) */}
                        {scanType === 'order' && (
                            <div className="p-6 space-y-6">
                                <div>
                                    <p className="text-sm text-gray-500 uppercase font-semibold">Client</p>
                                    <p className="text-lg font-medium text-gray-900">{scanResult.client}</p>
                                    <p className="text-sm text-gray-600 font-mono mt-1">{scanResult.phone}</p>
                                </div>
                                <div className="pt-4 border-t border-gray-100 flex gap-4">
                                    <Button onClick={markOrderShipped} className="flex-1 justify-center bg-indigo-600 text-white hover:bg-indigo-700 py-3" icon={Truck}>
                                        Expédier Commande
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Result Body (PRODUCT) */}
                        {scanType === 'product' && (
                            <div className="p-6 space-y-6">
                                <div>
                                    <p className="text-sm text-gray-500 uppercase font-semibold">Produit</p>
                                    <p className="text-xl font-bold text-gray-900">{scanResult.name}</p>
                                    <p className="text-sm font-medium text-purple-600 mt-1">{scanResult.category}</p>
                                </div>
                                
                                <div className="bg-gray-50 p-4 rounded-lg flex justify-between items-center">
                                    <span className="text-gray-600 font-medium">Stock Actuel :</span>
                                    <span className={`text-2xl font-bold ${scanResult.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {scanResult.stock || 0}
                                    </span>
                                </div>
                                
                                <div className="pt-4 border-t border-gray-100 grid grid-cols-2 gap-4">
                                     <button 
                                        onClick={() => updateProductStock(1)}
                                        className="py-4 bg-green-50 text-green-700 rounded-xl border border-green-200 hover:bg-green-100 font-bold text-lg flex flex-col items-center gap-1 shadow-sm transition-all active:scale-95"
                                     >
                                         <span className="text-2xl">+1</span>
                                         <span className="text-xs font-normal">Entrée Stock</span>
                                     </button>
                                     <button 
                                        onClick={() => updateProductStock(-1)}
                                        className="py-4 bg-red-50 text-red-700 rounded-xl border border-red-200 hover:bg-red-100 font-bold text-lg flex flex-col items-center gap-1 shadow-sm transition-all active:scale-95"
                                     >
                                         <span className="text-2xl">-1</span>
                                         <span className="text-xs font-normal">Sortie Stock</span>
                                     </button>
                                </div>
                            </div>
                        )}

                        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-center">
                             <Button variant="secondary" onClick={handleResetScan} icon={RotateCcw}>Scanner un autre code</Button>
                        </div>
                    </div>
                )}
            </div>
        </PageTransition>
    );
}
