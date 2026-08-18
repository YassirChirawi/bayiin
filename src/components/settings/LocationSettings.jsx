import { useState, useEffect } from "react";
import { doc, updateDoc, collection, query, getDocs, orderBy, addDoc, serverTimestamp, where, runTransaction, increment } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { Truck, Package, Plus, Zap } from "lucide-react";
import Button from "../Button";
import { toast } from "react-hot-toast";
import { vibrate } from "../../utils/haptics";
import { useStoreData } from "../../hooks/useStoreData";

export default function LocationSettings({ store, t }) {
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [newLoc, setNewLoc] = useState({ name: '', address: '' });
    const [creating, setCreating] = useState(false);
    const [transfer, setTransfer] = useState({ prodId: '', from: '', to: '', qty: 0 });
    const [transferring, setTransferring] = useState(false);
    const { data: allProds } = useStoreData("products");

    const handleTransfer = async (e) => {
        e.preventDefault();
        const { prodId, from, to, qty } = transfer;
        if (!prodId || !from || !to || qty <= 0) return toast.error("Tous les champs sont requis");
        if (from === to) return toast.error("Le dépôt source et destination doivent être différents");

        setTransferring(true);
        try {
            await runTransaction(db, async (transaction) => {
                const prodRef = doc(db, "products", prodId);
                const prodSnap = await transaction.get(prodRef);
                if (!prodSnap.exists()) throw new Error("Produit non trouvé");
                const product = prodSnap.data();

                const currentFromStock = product.warehouseStocks?.[from] || 0;
                if (currentFromStock < qty) throw new Error("Stock insuffisant dans le dépôt source");

                transaction.update(prodRef, {
                    [`warehouseStocks.${from}`]: increment(-qty),
                    [`warehouseStocks.${to}`]: increment(qty),
                    updatedAt: serverTimestamp()
                });

                const logRef = doc(collection(db, "stores", store.id, "audit_logs"));
                transaction.set(logRef, {
                    action: 'STOCK_TRANSFER',
                    details: `Transféré ${qty} de ${product.name} du dépôt ${locations.find(l => l.id === from)?.name} vers ${locations.find(l => l.id === to)?.name}`,
                    timestamp: serverTimestamp(),
                    user: { id: 'system', name: 'Transfert Manager' }
                });
            });
            vibrate('success');
            toast.success(t('msg_transfer_success') || "Transfert réussi !");
            setTransfer({ prodId: '', from: '', to: '', qty: 0 });
        } catch (e) {
            vibrate('error');
            console.error(e);
            toast.error(t('err_transfer_failed') || e.message || "Erreur de transfert");
        } finally {
            setTransferring(false);
        }
    };

    useEffect(() => {
        if (!store?.id) return;
        const fetchLocations = async () => {
            setLoading(true);
            try {
                const q = query(collection(db, "warehouses"), where("storeId", "==", store.id), orderBy("createdAt", "desc"));
                const snap = await getDocs(q);
                setLocations(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (e) {
                console.error("Fetch error:", e);
            } finally {
                setLoading(false);
            }
        };
        fetchLocations();
    }, [store?.id]);

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!newLoc.name) return toast.error("Nom requis");
        setCreating(true);
        try {
            const locsRef = collection(db, "warehouses");
            await addDoc(locsRef, {
                ...newLoc,
                storeId: store.id,
                isDefault: locations.length === 0,
                createdAt: serverTimestamp()
            });
            toast.success("Emplacement créé !");
            setNewLoc({ name: '', address: '' });
            // Re-fetch locations to update the list
            if (store?.id) { // Ensure store.id is available before triggering re-fetch
                const q = query(collection(db, "warehouses"), where("storeId", "==", store.id), orderBy("createdAt", "desc"));
                const snap = await getDocs(q);
                setLocations(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            }
        } catch (e) {
            console.error(e);
            toast.error("Erreur de création");
        } finally {
            setCreating(false);
        }
    };

    const toggleDefault = async (locId) => {
        try {
            const batch = locations.map(l => {
                const ref = doc(db, "warehouses", l.id);
                return updateDoc(ref, { isDefault: l.id === locId });
            });
            await Promise.all(batch);
            toast.success("Emplacement par défaut mis à jour");
            // Re-fetch locations to update the list
            if (store?.id) { // Ensure store.id is available before triggering re-fetch
                const q = query(collection(db, "warehouses"), where("storeId", "==", store.id), orderBy("createdAt", "desc"));
                const snap = await getDocs(q);
                setLocations(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            }
        } catch (e) {
            toast.error("Erreur");
        }
    };

    return (
        <div className="space-y-6">
            <div className="glass-panel rounded-2xl p-6 sm:p-8">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 uppercase tracking-wider">
                            <Truck className="h-5 w-5 text-indigo-500" />
                            {t('section_locations') || 'Boutiques & Dépôts'}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">{t('help_locations') || 'Gérez vos emplacements physiques pour un inventaire précis.'}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    {locations.map(loc => (
                        <div key={loc.id} className={`p-4 rounded-xl border-2 transition-all group ${loc.isDefault ? 'border-indigo-500 bg-indigo-50/30' : 'border-gray-100 bg-white hover:border-gray-200'}`}>
                            <div className="flex justify-between items-start">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-bold text-gray-900 truncate">{loc.name}</h4>
                                        {loc.isDefault && (
                                            <span className="bg-indigo-600 text-white text-[10px] px-2 py-0.5 rounded-full flex-shrink-0">Défaut</span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1 truncate">{loc.address || "Pas d'adresse spécifiée"}</p>
                                </div>
                                {!loc.isDefault && (
                                    <button 
                                        onClick={() => toggleDefault(loc.id)}
                                        className="text-[10px] text-gray-400 hover:text-indigo-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        Définir défaut
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                    {locations.length === 0 && !loading && (
                        <div className="col-span-1 md:col-span-2 py-12 text-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/30">
                            <Package className="w-10 h-10 text-gray-300 mx-auto mb-3 opacity-50" />
                            <p className="text-sm text-gray-400 font-medium">Aucun dépôt configuré.</p>
                            <p className="text-xs text-gray-400 mt-1">Ajoutez votre premier emplacement ci-dessous.</p>
                        </div>
                    )}
                </div>

                <div className="bg-white/50 rounded-2xl p-6 border border-gray-100/50 mt-8">
                    <h4 className="text-sm font-bold text-gray-900 mb-6 flex items-center gap-2 uppercase tracking-wider">
                        <Plus className="w-4 h-4 text-indigo-600" />
                        {t('section_new_location') || 'Nouvel emplacement'}
                    </h4>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">{t('label_location_name') || 'Nom du Dépôt'}</label>
                                <input 
                                    placeholder="Ex: Entrepôt Principal" 
                                    className="w-full p-3 border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm" 
                                    value={newLoc.name}
                                    onChange={e => setNewLoc({...newLoc, name: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">{t('label_location_address') || 'Adresse (optionnel)'}</label>
                                <input 
                                    placeholder="Ex: Zone Industrielle, Casa" 
                                    className="w-full p-3 border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm" 
                                    value={newLoc.address}
                                    onChange={e => setNewLoc({...newLoc, address: e.target.value})}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end mt-2">
                            <Button type="submit" isLoading={creating} icon={Plus}>{t('btn_create_location') || "Créer l'emplacement"}</Button>
                        </div>
                    </form>
                </div>

                <div className="mt-10 pt-8 border-t border-gray-100">
                    <h4 className="text-sm font-bold text-gray-900 mb-6 flex items-center gap-2 uppercase tracking-wider">
                        <Zap className="w-4 h-4 text-amber-500" />
                        {t('section_stock_transfer') || 'Transfert de Stock Inter-Dépôts'}
                    </h4>
                    <form onSubmit={handleTransfer} className="bg-amber-50/50 p-6 rounded-2xl border border-amber-100/50 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="md:col-span-1">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t('label_product') || 'Produit'}</label>
                                <select 
                                    className="w-full p-3 border-amber-200/50 rounded-xl text-sm bg-white focus:ring-2 focus:ring-amber-500 outline-none transition-all shadow-sm"
                                    value={transfer.prodId}
                                    onChange={e => setTransfer({...transfer, prodId: e.target.value})}
                                >
                                    <option value="">Sélectionner...</option>
                                    {/* Exclut bundles ET produits à variantes : un transfert au niveau
                                        produit ne peut pas répartir correctement le stock par variante. */}
                                    {allProds.filter(p => !p.isBundle && !p.isVariable).map(p => (
                                        <option key={p.id} value={p.id}>{p.name} ({p.stock || 0})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t('label_from_source') || 'De (Source)'}</label>
                                <select 
                                    className="w-full p-3 border-amber-200/50 rounded-xl text-sm bg-white focus:ring-2 focus:ring-amber-500 outline-none transition-all shadow-sm"
                                    value={transfer.from}
                                    onChange={e => setTransfer({...transfer, from: e.target.value})}
                                >
                                    <option value="">Source...</option>
                                    {locations.map(l => (
                                        <option key={l.id} value={l.id}>{l.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t('label_to_destination') || 'Vers (Destination)'}</label>
                                <select 
                                    className="w-full p-3 border-amber-200/50 rounded-xl text-sm bg-white focus:ring-2 focus:ring-amber-500 outline-none transition-all shadow-sm"
                                    value={transfer.to}
                                    onChange={e => setTransfer({...transfer, to: e.target.value})}
                                >
                                    <option value="">Destination...</option>
                                    {locations.map(l => (
                                        <option key={l.id} value={l.id}>{l.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t('label_quantity') || 'Quantité'}</label>
                                <input 
                                    type="number" min="1"
                                    className="w-full p-3 border-amber-200/50 rounded-xl text-sm bg-white focus:ring-2 focus:ring-amber-500 outline-none transition-all shadow-sm"
                                    value={transfer.qty}
                                    onChange={e => setTransfer({...transfer, qty: parseInt(e.target.value) || 0})}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end mt-2">
                            <Button type="submit" isLoading={transferring} icon={Zap} className="bg-amber-600 hover:bg-amber-700 text-white border-transparent">
                                {t('btn_execute_transfer') || 'Exécuter le Transfert'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
