import { useState, useMemo } from "react";
import { toast } from "react-hot-toast";
import { useStoreData } from "../hooks/useStoreData";
import { Plus, Edit2, Trash2, Package, Search, RotateCcw, AlertCircle, Upload, Download } from "lucide-react";
import Button from "../components/Button";
import ProductModal from "../components/ProductModal";
import ImportModal from "../components/ImportModal";
import { exportToCSV } from "../utils/csvHelper";
import { orderBy, limit } from "firebase/firestore";
import { useLanguage } from "../context/LanguageContext"; // NEW

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
    const [editingProduct, setEditingProduct] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [showTrash, setShowTrash] = useState(false);


    const handleSave = async (productData) => {
        if (editingProduct) {
            await updateStoreItem(editingProduct.id, productData);
            toast.success(t('msg_product_updated'));
        } else {
            await addStoreItem(productData);
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
        if (showTrash) {
            if (window.confirm(t('confirm_delete_permanent'))) {
                await permanentDeleteStoreItem(id);
                toast.success(t('msg_product_deleted_perm'));
            }
        } else {
            if (window.confirm(t('confirm_move_trash'))) {
                await deleteStoreItem(id);
                toast.success(t('msg_product_moved_trash'));
            }
        }
    };

    const handleRestore = async (id) => {
        await restoreStoreItem(id);
        toast.success(t('msg_product_restored'));
    };

    const handleExportCSV = () => {
        const dataToExport = products.map(p => ({
            [t('label_product_name')]: p.name,
            [t('label_category')]: p.category || '',
            [t('table_price')]: p.price,
            [t('table_stock')]: p.stock,
            [t('label_cost_price_dh')]: p.costPrice || 0,
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
            p.category?.toLowerCase().includes(searchTerm.toLowerCase())
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
                <div className="flex gap-2">
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
                <div className="bg-white shadow overflow-hidden sm:rounded-md">
                    <ul className="divide-y divide-gray-200">
                        {filteredProducts.map((product) => (
                            <li key={product.id}>
                                <div className="px-4 py-4 sm:px-6 hover:bg-gray-50 flex items-center justify-between">
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        <div className="flex-shrink-0 h-16 w-16 bg-gray-100 rounded-md overflow-hidden border border-gray-200">
                                            {product.photoUrl ? (
                                                <img className="h-full w-full object-cover" src={product.photoUrl} alt={product.name} />
                                            ) : (
                                                <div className="h-full w-full flex items-center justify-center text-gray-400">
                                                    <Package className="h-8 w-8" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-medium text-indigo-600 truncate">{product.name}</p>
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
                                                            {product.variants.length} combinations ({product.attributes?.map(a => a.name).join(", ")})
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
                                                        title="Restore"
                                                    >
                                                        <RotateCcw className="h-5 w-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(product.id)}
                                                        className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-gray-100 transition-colors"
                                                        title="Delete Permanently"
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
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Pagination / Load More */}
            <div className="mt-4 flex justify-center">
                <Button
                    variant="secondary"
                    onClick={() => setLimitCount(prev => prev + 50)}
                    disabled={loading || products.length < limitCount}
                >
                    {loading ? t('loading') : "Load More"}
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
        </div>
    );
}
