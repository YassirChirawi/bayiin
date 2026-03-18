import { useState, useMemo } from "react";
import { toast } from "react-hot-toast";
import { useStoreData } from "../hooks/useStoreData";
import { Plus, Edit2, Trash2, Package, Search, RotateCcw, AlertCircle, Upload, Download, Share2, ImageOff } from "lucide-react";
import Button from "../components/Button";
import ProductModal from "../components/ProductModal";
import ImportModal from "../components/ImportModal";
import { exportToCSV } from "../utils/csvHelper";
import { orderBy, limit } from "firebase/firestore";
import { useLanguage } from "../context/LanguageContext"; // NEW
import { vibrate } from "../utils/haptics";
import { motion } from "framer-motion";
import ShareCatalogModal from "../components/ShareCatalogModal"; // NEW
import { useTenant } from "../context/TenantContext"; // NEW
import { logActivity } from "../utils/logger"; // NEW
import { useAuth } from "../context/AuthContext"; // NEW
import { db } from "../lib/firebase"; // NEW

const containerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
};

export default function Products() {
    const { t } = useLanguage(); // NEW
    const [limitCount, setLimitCount] = useState(50);

    // Limit to 50 products for performance
    const productConstraints = useMemo(() => [
        orderBy("createdAt", "desc"),
        limit(limitCount)
    ], [limitCount]);

    const { data: products, loading, error, addStoreItem, updateStoreItem, deleteStoreItem, restoreStoreItem, permanentDeleteStoreItem } = useStoreData("products", productConstraints);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false); // NEW
    const { store } = useTenant(); // NEW
    const { user } = useAuth(); // NEW
    const [editingProduct, setEditingProduct] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [showTrash, setShowTrash] = useState(false);


    const handleSave = async (productData) => {
        if (editingProduct) {
            await updateStoreItem(editingProduct.id, productData);
            logActivity(db, store.id, user, 'PRODUCT_UPDATE', `Updated Product: ${productData.name}`, { productId: editingProduct.id });
            toast.success(t('msg_product_updated'));
        } else {
            const newId = await addStoreItem(productData);
            logActivity(db, store.id, user, 'PRODUCT_CREATE', `Created Product: ${productData.name}`, { productId: newId });
            toast.success(t('msg_product_added'));
        }
        setIsModalOpen(false);
        setEditingProduct(null);
    };

    const handleEdit = (product) => {
        setEditingProduct(product);
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        vibrate('medium');
        if (showTrash) {
            if (window.confirm(t('confirm_delete_permanent'))) {
                await permanentDeleteStoreItem(id);
                logActivity(db, store.id, user, 'PRODUCT_DELETE_PERMANENT', `Permanently deleted product ${id}`, { productId: id });
                toast.success(t('msg_product_deleted_perm'));
            }
        } else {
            if (window.confirm(t('confirm_move_trash'))) {
                await deleteStoreItem(id);
                logActivity(db, store.id, user, 'PRODUCT_TRASH', `Moved product ${id} to trash`, { productId: id });
                toast.success(t('msg_product_moved_trash'));
            }
        }
    };

    const handleRestore = async (id) => {
        await restoreStoreItem(id);
        logActivity(db, store.id, user, 'PRODUCT_RESTORE', `Restored product ${id}`, { productId: id });
        toast.success(t('msg_product_restored'));
    };

    const handleExportCSV = () => {
        const dataToExport = products.map(p => ({
            SKU: p.sku || '',
            [t('label_product_name')]: p.name,
            [t('label_category')]: p.category || '',
            [t('table_price')]: p.price,
            [t('table_stock')]: p.stock,
            [t('label_cost_price_dh')]: p.costPrice || 0,
            'Ref Fournisseur': p.supplier_ref || '',
            [t('with_variants')]: p.isVariable ? t('yes') : t('no')
        }));
        exportToCSV(dataToExport, 'products');
    };

    const handleImport = async (data) => {
        let importedCount = 0;
        const promises = data.map(row => {
            if (!row.Name || !row.Price) return null;
            return addStoreItem({
                name: row.Name,
                category: row.Category || "Uncategorized",
                price: parseFloat(row.Price) || 0,
                costPrice: parseFloat(row['Cost Price']) || 0,
                stock: parseInt(row.Stock) || 0,
                description: row.Description || "",
                isVariable: false, // Default to simple for CSV import for now
                sizes: [], // Legacy
                attributes: [],
                variants: []
            }).then(() => { importedCount++; }).catch(e => console.error("Import error", e));
        });

        await Promise.all(promises);
        await Promise.all(promises);
        await Promise.all(promises);
        toast.success(t('success_import_products', { count: importedCount }));
    };

    const filteredProducts = products
        .filter(p => showTrash ? p.deleted : !p.deleted)
        .filter(p =>
            p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.sku?.toUpperCase().includes(searchTerm.toUpperCase())
        );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{t('page_title_products')}</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        {t('page_subtitle_products')}
                    </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <Button
                        variant="secondary"
                        icon={Share2}
                        className="bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
                        onClick={() => setIsShareModalOpen(true)}
                    >
                        {t('btn_share_catalog') || "Share Catalog"}
                    </Button>
                    <Button
                        variant="secondary"
                        icon={Upload}
                        onClick={() => setIsImportModalOpen(true)}
                    >
                        {t('import')}
                    </Button>
                    <Button
                        variant="secondary"
                        icon={Download}
                        onClick={handleExportCSV}
                        disabled={products.length === 0}
                    >
                        {t('export')}
                    </Button>
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button
                            onClick={() => setShowTrash(false)}
                            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${!showTrash ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            {t('active')}
                        </button>
                        <button
                            onClick={() => setShowTrash(true)}
                            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${showTrash ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            {t('trash')}
                        </button>
                    </div>
                    {!showTrash && (
                        <Button onClick={() => { setEditingProduct(null); setIsModalOpen(true); }} icon={Plus}>
                            {t('btn_add_product')}
                        </Button>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex gap-4">
                <div className="relative flex-1 max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition duration-150 ease-in-out"
                        placeholder={t('search_placeholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* List */}
            {loading ? (
                <div className="text-center py-12">
                    <Package className="mx-auto h-12 w-12 text-gray-300 animate-pulse" />
                    <p className="mt-2 text-sm text-gray-500">{t('loading')}</p>
                </div>
            ) : filteredProducts.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg border border-gray-200 border-dashed">
                    <Package className="mx-auto h-12 w-12 text-gray-300" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">{t('no_data')}</h3>
                    <div className="mt-6">
                        <Button onClick={() => setIsModalOpen(true)} icon={Plus}>
                            {t('btn_add_product')}
                        </Button>
                    </div>
                </div>
            ) : (
                <>
                    {/* Desktop List */}
                    <div className="hidden md:block bg-white shadow overflow-hidden sm:rounded-md">
                        <motion.ul
                            variants={containerVariants}
                            initial="hidden"
                            animate="show"
                            className="divide-y divide-gray-200"
                        >
                            {filteredProducts.map((product) => (
                                <motion.li key={product.id} variants={itemVariants}>
                                    <div className="px-4 py-4 sm:px-6 hover:bg-gray-50 flex items-center justify-between">
                                        <div className="flex items-center gap-4 flex-1 min-w-0">
                                            <div className="flex-shrink-0 h-16 w-16 bg-gray-100 rounded-md overflow-hidden border border-gray-200">
                                                {product.photoUrl ? (
                                                    <img className="h-full w-full object-cover" src={product.photoUrl} alt={product.name} />
                                                ) : (
                                                    <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 text-indigo-300">
                                                        <Package className="h-7 w-7" strokeWidth={1.5} />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-medium text-indigo-600 truncate">{product.name}</p>
                                                    {product.sku && (
                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                                            {product.sku}
                                                        </span>
                                                    )}
                                                    {product.isVariable && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                                            {t('with_variants')}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="flex items-center text-sm text-gray-500">
                                                    <span className="truncate">{product.category}</span>
                                                    <span className="mx-2">•</span>
                                                    <span className={parseInt(product.stock) === 0 ? "text-red-600 font-bold" : ""}>
                                                        {product.stock} {t('table_stock').toLowerCase()}
                                                    </span>
                                                </p>

                                                {/* Attributes/Variants Display */}
                                                {product.isVariable ? (
                                                    <div className="mt-1 flex flex-wrap gap-1">
                                                        {product.variants?.length > 0 && (
                                                            <span className="text-xs text-gray-400">
                                                                {product.variants.length} {t('combinations')} ({product.attributes?.map(a => a.name).join(", ")})
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    product.sizes && product.sizes.length > 0 && (
                                                        <div className="mt-1 flex gap-1">
                                                            {product.sizes.map(size => (
                                                                <span key={size} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                                                    {size}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )
                                                )}

                                                {(parseInt(product.stock) || 0) < 5 && (
                                                    <div className="mt-1 flex items-center gap-1 text-xs text-red-600 font-medium bg-red-50 px-2 py-0.5 rounded w-fit">
                                                        <AlertCircle className="h-3 w-3" />
                                                        {t('low_stock')}
                                                    </div>
                                                )}

                                                {product.inventoryBatches?.some(b => {
                                                    if (!b.expiryDate) return false;
                                                    const expDate = new Date(b.expiryDate);
                                                    const threeMonthsFromNow = new Date();
                                                    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
                                                    return expDate <= threeMonthsFromNow && expDate >= new Date() && parseInt(b.quantity) > 0;
                                                }) && (
                                                        <motion.div
                                                            initial={{ opacity: 0, scale: 0.9 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            className="mt-1 flex items-center gap-1 text-xs text-red-700 font-bold bg-red-100 px-2 py-0.5 rounded w-fit shadow-sm border border-red-200"
                                                        >
                                                            <AlertCircle className="h-3 w-3" />
                                                            {t('expiring_soon') || "Lot(s) expirant bientôt"}
                                                        </motion.div>
                                                    )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right hidden sm:block">
                                                <p className="text-sm font-semibold text-gray-900">{parseFloat(product.price).toFixed(2)} DH</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {showTrash ? (
                                                    <>
                                                        <button
                                                            onClick={() => handleRestore(product.id)}
                                                            className="p-2 text-gray-400 hover:text-blue-600 rounded-full hover:bg-gray-100 transition-colors"
                                                            title={t('restore')}
                                                        >
                                                            <RotateCcw className="h-5 w-5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(product.id)}
                                                            className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-gray-100 transition-colors"
                                                            title={t('delete_permanently')}
                                                        >
                                                            <Trash2 className="h-5 w-5" />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button
                                                            onClick={() => handleEdit(product)}
                                                            className="p-2 text-gray-400 hover:text-indigo-600 rounded-full hover:bg-gray-100 transition-colors"
                                                        >
                                                            <Edit2 className="h-5 w-5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(product.id)}
                                                            className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-gray-100 transition-colors"
                                                        >
                                                            <Trash2 className="h-5 w-5" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </motion.li>
                            ))}
                        </motion.ul>
                    </div>

                    {/* Mobile Card View */}
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="show"
                        className="md:hidden space-y-4"
                    >
                        {filteredProducts.map((product) => (
                            <motion.div key={product.id} variants={itemVariants} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="flex p-4 gap-4">
                                    {/* Image */}
                                    <div className="flex-shrink-0 h-24 w-24 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                                        {product.photoUrl ? (
                                            <img className="h-full w-full object-cover" src={product.photoUrl} alt={product.name} />
                                        ) : (
                                            <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 text-indigo-300">
                                                <Package className="h-7 w-7" strokeWidth={1.5} />
                                            </div>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                                        <div>
                                            <div className="flex justify-between items-start">
                                                <h3 className="text-base font-bold text-gray-900 line-clamp-2">{product.name}</h3>
                                                <p className="text-indigo-600 font-bold whitespace-nowrap ml-2">
                                                    {parseFloat(product.price).toFixed(0)} <span className="text-xs">DH</span>
                                                </p>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">{product.category}</p>
                                            {product.isVariable && (
                                                <span className="inline-flex mt-1 items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-800">
                                                    {product.variants?.length || 0} variants
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex flex-col items-start mt-2 space-y-1">
                                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${parseInt(product.stock) === 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                                {product.stock} {t('in_stock')}
                                            </span>
                                            {product.inventoryBatches?.some(b => {
                                                if (!b.expiryDate) return false;
                                                const expDate = new Date(b.expiryDate);
                                                const threeMonthsFromNow = new Date();
                                                threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
                                                return expDate <= threeMonthsFromNow && expDate >= new Date() && parseInt(b.quantity) > 0;
                                            }) && (
                                                    <motion.div
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        className="flex items-center gap-1 text-[10px] text-red-700 font-bold bg-red-100 px-1.5 py-0.5 rounded whitespace-nowrap"
                                                    >
                                                        <AlertCircle className="h-2.5 w-2.5" />
                                                        Exp. proche
                                                    </motion.div>
                                                )}
                                        </div>
                                    </div>
                                </div>

                                {/* Actions Footer */}
                                <div className="bg-gray-50 px-4 py-3 flex justify-between items-center border-t border-gray-100">
                                    {showTrash ? (
                                        <div className="flex gap-3 w-full">
                                            <button
                                                onClick={() => handleRestore(product.id)}
                                                className="flex-1 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                                            >
                                                <RotateCcw className="h-4 w-4" /> {t('restore')}
                                            </button>
                                            <button
                                                onClick={() => handleDelete(product.id)}
                                                className="flex-1 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                                            >
                                                <Trash2 className="h-4 w-4" /> {t('delete')}
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex gap-3 w-full">
                                            <button
                                                onClick={() => handleEdit(product)}
                                                className="flex-1 py-1.5 bg-white border border-gray-300 shadow-sm text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center justify-center gap-2"
                                            >
                                                <Edit2 className="h-4 w-4" /> {t('edit')}
                                            </button>
                                            <button
                                                onClick={() => handleDelete(product.id)}
                                                className="py-1.5 px-3 bg-red-50 text-red-600 rounded-lg"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                </>
            )}

            {/* Pagination / Load More */}
            <div className="mt-4 flex justify-center">
                <Button
                    variant="secondary"
                    onClick={() => setLimitCount(prev => prev + 50)}
                    disabled={loading || products.length < limitCount}
                >
                    {loading ? t('loading') : t('load_more')}
                </Button>
            </div>

            <ProductModal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setEditingProduct(null); }}
                onSave={handleSave}
                product={editingProduct}
            />

            <ImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onImport={handleImport}
                title={`${t('import')} ${t('page_title_products')}`}
                templateHeaders={["Name", "Price"]}
            />

            <ShareCatalogModal
                isOpen={isShareModalOpen}
                onClose={() => setIsShareModalOpen(false)}
                storeId={store?.id}
            />
        </div >
    );
}
