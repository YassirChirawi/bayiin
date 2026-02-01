import { useState, useMemo } from "react";
import { toast } from "react-hot-toast";
import { useStoreData } from "../hooks/useStoreData";
import { Search, MapPin, Users, DollarSign, TrendingUp, Eye, Trash2, RotateCcw, Download, Upload, Plus, Edit2 } from "lucide-react";
import CustomerDetailModal from "../components/CustomerDetailModal";
import CustomerModal from "../components/CustomerModal";
import ImportModal from "../components/ImportModal";
import Button from "../components/Button";
import { exportToCSV } from "../utils/csvHelper";
import { orderBy, limit } from "firebase/firestore";
import { useLanguage } from "../context/LanguageContext"; // NEW
import { vibrate } from "../utils/haptics";
import { motion } from "framer-motion";

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

export default function Customers() {
    const { t } = useLanguage(); // NEW
    // Limit to 50 active clients for performance
    const customerConstraints = useMemo(() => [
        orderBy("lastOrderDate", "desc"),
        limit(50)
    ], []);

    const { data: customers, loading, addStoreItem, updateStoreItem, deleteStoreItem, restoreStoreItem, permanentDeleteStoreItem } = useStoreData("customers", customerConstraints);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCustomer, setSelectedCustomer] = useState(null); // For Detail View
    const [editingCustomer, setEditingCustomer] = useState(null); // For Edit Modal
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [showTrash, setShowTrash] = useState(false);

    const kpiStats = useMemo(() => {
        if (!customers.length) return { total: 0, ltv: 0, topCity: 'N/A' };

        const total = customers.length;
        const totalRevenue = customers.reduce((acc, c) => acc + (c.totalSpent || 0), 0);
        const ltv = totalRevenue / total;

        // Calculate top city
        const cityCounts = customers.reduce((acc, c) => {
            const city = c.city || 'Unknown';
            acc[city] = (acc[city] || 0) + 1;
            return acc;
        }, {});

        const topCity = Object.entries(cityCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

        return {
            total,
            ltv: ltv.toFixed(2),
            topCity
        };
    }, [customers]);

    const handleDelete = async (id, e) => {
        e.stopPropagation();
        vibrate('medium');
        if (showTrash) {
            if (window.confirm(t('confirm_delete_customer_perm'))) {
                await permanentDeleteStoreItem(id);
                toast.success(t('msg_customer_deleted_perm'));
            }
        } else {
            if (window.confirm(t('confirm_move_customer_trash'))) {
                await deleteStoreItem(id);
                toast.success(t('msg_customer_moved_trash'));
            }
        }
    };

    const handleRestore = async (id, e) => {
        e.stopPropagation();
        await restoreStoreItem(id);
        toast.success(t('msg_customer_restored'));
    };

    const handleSaveCustomer = async (formData) => {
        if (editingCustomer) {
            await updateStoreItem(editingCustomer.id, formData);
            toast.success(t('msg_customer_updated'));
        } else {
            await addStoreItem({
                ...formData,
                totalSpent: 0,
                orderCount: 0,
                firstOrderDate: null,
                lastOrderDate: null
            });
            toast.success(t('msg_customer_added'));
        }
        setIsEditModalOpen(false);
        setEditingCustomer(null);
    };

    // Generic CSV Export
    const handleExportCSV = () => {
        const dataToExport = customers.map(c => ({
            [t('label_full_name')]: c.name,
            [t('label_phone')]: c.phone || '',
            [t('label_city')]: c.city || '',
            [t('label_address')]: c.address || '',
            [t('table_orders_count')]: c.orderCount || 0,
            [t('table_spent')]: c.totalSpent || 0,
            [t('table_last_order')]: c.lastOrderDate || ''
        }));
        exportToCSV(dataToExport, 'customers');
    };

    // CSV Import Handler
    const handleImport = async (data) => {
        let importedCount = 0;
        // Parallelize requests for speed? Or sequential for safety? 
        // Firestore batch is limited to 500. `addStoreItem` does one by one.
        // Let's do parallel with Promise.all for reasonable speed.
        const promises = data.map(row => {
            if (!row.Name || !row.Phone) return null; // Skip invalid rows
            return addStoreItem({
                name: row.Name,
                phone: row.Phone,
                email: row.Email || "",
                address: row.Address || "",
                city: row.City || "",
                notes: row.Notes || "",
                totalSpent: 0,
                orderCount: 0,
                firstOrderDate: null,
                lastOrderDate: null
            }).then(() => { importedCount++; }).catch(e => console.error("Import error", e));
        });

        await Promise.all(promises);
        await Promise.all(promises);
        await Promise.all(promises);
        toast.success(t('success_import_customers', { count: importedCount }));
    };

    const filteredCustomers = customers
        .filter(c => showTrash ? c.deleted : !c.deleted)
        .filter(c =>
            c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.phone?.includes(searchTerm) ||
            c.city?.toLowerCase().includes(searchTerm.toLowerCase())
        );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{t('page_title_customers')}</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        {t('page_subtitle_customers')}
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
                        disabled={customers.length === 0}
                    >
                        {t('export')}
                    </Button>
                    <div className="flex bg-gray-100 p-1 rounded-lg self-center sm:self-auto">
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
                        <Button onClick={() => { setEditingCustomer(null); setIsEditModalOpen(true); }} icon={Plus}>
                            {t('btn_new_customer')}
                        </Button>
                    )}
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                            <Users className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">{t('kpi_total_clients')}</p>
                            <p className="text-2xl font-bold text-gray-900">{kpiStats.total}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-green-50 text-green-600 rounded-lg">
                            <TrendingUp className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">{t('kpi_ltv')}</p>
                            <p className="text-2xl font-bold text-gray-900">{kpiStats.ltv} DH</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-orange-50 text-orange-600 rounded-lg">
                            <MapPin className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">{t('kpi_top_city')}</p>
                            <p className="text-2xl font-bold text-gray-900">{kpiStats.topCity}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <div className="relative max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder={t('search_placeholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block bg-white shadow border-b border-gray-200 sm:rounded-lg overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('table_client')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('table_phone')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('table_city')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('table_orders_count')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('table_spent')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('table_last_order')}</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('actions')}</th>
                        </tr>
                    </thead>
                    <motion.tbody
                        variants={containerVariants}
                        initial="hidden"
                        animate="show"
                        className="bg-white divide-y divide-gray-200"
                    >
                        {loading ? (
                            <tr><td colSpan="7" className="px-6 py-4 text-center">{t('loading')}</td></tr>
                        ) : filteredCustomers.length === 0 ? (
                            <tr><td colSpan="7" className="px-6 py-4 text-center text-gray-500">{t('no_data')}</td></tr>
                        ) : filteredCustomers.map((customer) => (
                            <motion.tr key={customer.id} variants={itemVariants} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {customer.phone}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {customer.city || '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {customer.orderCount || 0}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                                    {customer.totalSpent ? `${customer.totalSpent.toFixed(2)} DH` : '0 DH'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {customer.lastOrderDate || '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex items-center justify-end gap-2">
                                        {showTrash ? (
                                            <>
                                                <button
                                                    onClick={(e) => handleRestore(customer.id, e)}
                                                    className="p-2 text-gray-400 hover:text-blue-600 rounded-full hover:bg-gray-100 transition-colors"
                                                    title="Restore"
                                                >
                                                    <RotateCcw className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={(e) => handleDelete(customer.id, e)}
                                                    className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-gray-100 transition-colors"
                                                    title="Delete Permanently"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => setSelectedCustomer(customer)}
                                                    className="text-gray-400 hover:text-gray-900 p-2 hover:bg-gray-100 rounded-full"
                                                    title="View Details"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => { setEditingCustomer(customer); setIsEditModalOpen(true); }}
                                                    className="text-indigo-600 hover:text-indigo-900 p-2 hover:bg-indigo-50 rounded-full"
                                                    title="Edit"
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={(e) => handleDelete(customer.id, e)}
                                                    className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-full"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </motion.tr>
                        ))}
                    </motion.tbody>
                </table>
            </div>

            {/* Mobile Card View */}
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="md:hidden space-y-4"
            >
                {loading ? (
                    <div className="text-center py-10 text-gray-500">{t('loading')}</div>
                ) : filteredCustomers.length === 0 ? (
                    <div className="text-center py-10 text-gray-500 bg-white rounded-lg shadow p-8">
                        <p>{t('no_data')}</p>
                    </div>
                ) : (
                    filteredCustomers.map((customer) => (
                        <motion.div key={customer.id} variants={itemVariants} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className="font-bold text-gray-900 text-lg">{customer.name}</h3>
                                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                        <MapPin className="h-3.5 w-3.5" />
                                        <span>{customer.city || 'No City'}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="block font-bold text-green-600 text-lg">
                                        {customer.totalSpent ? `${customer.totalSpent.toFixed(0)}` : '0'} <span className="text-xs">DH</span>
                                    </span>
                                    <span className="text-xs text-gray-400">{customer.orderCount || 0} Orders</span>
                                </div>
                            </div>

                            <div className="flex items-center text-sm text-gray-600 mb-4 bg-gray-50 p-2 rounded-lg">
                                <span className="font-mono">{customer.phone}</span>
                            </div>

                            <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                                <div className="flex gap-2">
                                    {showTrash ? (
                                        <>
                                            <button
                                                onClick={(e) => handleRestore(customer.id, e)}
                                                className="p-2 bg-blue-50 text-blue-600 rounded-full"
                                            >
                                                <RotateCcw className="h-5 w-5" />
                                            </button>
                                            <button
                                                onClick={(e) => handleDelete(customer.id, e)}
                                                className="p-2 bg-red-50 text-red-600 rounded-full"
                                            >
                                                <Trash2 className="h-5 w-5" />
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <a href={`tel:${customer.phone}`} className="p-2 bg-green-50 text-green-600 rounded-full">
                                                <Users className="h-5 w-5" />
                                            </a>
                                            <button
                                                onClick={() => setSelectedCustomer(customer)}
                                                className="p-2 bg-gray-100 text-gray-600 rounded-full"
                                            >
                                                <Eye className="h-5 w-5" />
                                            </button>
                                        </>
                                    )}
                                </div>
                                {!showTrash && (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => { setEditingCustomer(customer); setIsEditModalOpen(true); }}
                                            className="px-3 py-1.5 bg-indigo-50 text-indigo-600 text-sm font-medium rounded-lg"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={(e) => handleDelete(customer.id, e)}
                                            className="p-2 text-red-600 bg-red-50 rounded-lg"
                                        >
                                            <Trash2 className="h-5 w-5" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))
                )}
            </motion.div>

            <CustomerDetailModal
                isOpen={!!selectedCustomer}
                onClose={() => setSelectedCustomer(null)}
                customer={selectedCustomer}
            />

            <CustomerModal
                isOpen={isEditModalOpen}
                onClose={() => { setIsEditModalOpen(false); setEditingCustomer(null); }}
                onSave={handleSaveCustomer}
                customer={editingCustomer}
            />

            <ImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onImport={handleImport}
                title={`${t('import')} ${t('page_title_customers')}`}
                templateHeaders={["Name", "Phone"]}
            />
        </div >
    );
}
