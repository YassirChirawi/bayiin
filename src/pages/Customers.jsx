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

export default function Customers() {
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
        if (showTrash) {
            if (window.confirm("Are you sure you want to permanently delete this customer? This cannot be undone.")) {
                await permanentDeleteStoreItem(id);
                toast.success("Customer permanently deleted");
            }
        } else {
            if (window.confirm("Are you sure you want to move this customer to trash?")) {
                await deleteStoreItem(id);
                toast.success("Customer moved to trash");
            }
        }
    };

    const handleRestore = async (id, e) => {
        e.stopPropagation();
        await restoreStoreItem(id);
        toast.success("Customer restored");
    };

    const handleSaveCustomer = async (formData) => {
        if (editingCustomer) {
            await updateStoreItem(editingCustomer.id, formData);
            toast.success("Customer updated");
        } else {
            await addStoreItem({
                ...formData,
                totalSpent: 0,
                orderCount: 0,
                firstOrderDate: null,
                lastOrderDate: null
            });
            toast.success("Customer added");
        }
        setIsEditModalOpen(false);
        setEditingCustomer(null);
    };

    // Generic CSV Export
    const handleExportCSV = () => {
        const dataToExport = customers.map(c => ({
            Name: c.name,
            Phone: c.phone || '',
            City: c.city || '',
            Address: c.address || '',
            'Total Orders': c.orderCount || 0,
            'Total Spent': c.totalSpent || 0,
            'Last Order': c.lastOrderDate || ''
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
        toast.success(`Successfully imported ${importedCount} customers.`);
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
                    <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        View customer profiles, lifetime value, and history.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="secondary"
                        icon={Upload}
                        onClick={() => setIsImportModalOpen(true)}
                    >
                        Import
                    </Button>
                    <Button
                        variant="secondary"
                        icon={Download}
                        onClick={handleExportCSV}
                        disabled={customers.length === 0}
                    >
                        Export
                    </Button>
                    <div className="flex bg-gray-100 p-1 rounded-lg self-center sm:self-auto">
                        <button
                            onClick={() => setShowTrash(false)}
                            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${!showTrash ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Active
                        </button>
                        <button
                            onClick={() => setShowTrash(true)}
                            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${showTrash ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Trash
                        </button>
                    </div>
                    {!showTrash && (
                        <Button onClick={() => { setEditingCustomer(null); setIsEditModalOpen(true); }} icon={Plus}>
                            New Customer
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
                            <p className="text-sm text-gray-500">Total Clients</p>
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
                            <p className="text-sm text-gray-500">Avg. Lifetime Value</p>
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
                            <p className="text-sm text-gray-500">Top City</p>
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
                        placeholder="Search by Name, Phone, or City..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white shadow border-b border-gray-200 sm:rounded-lg overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">City</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Orders</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Spent</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Order</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr><td colSpan="7" className="px-6 py-4 text-center">Loading...</td></tr>
                        ) : filteredCustomers.length === 0 ? (
                            <tr><td colSpan="7" className="px-6 py-4 text-center text-gray-500">No customers found.</td></tr>
                        ) : filteredCustomers.map((customer) => (
                            <tr key={customer.id} className="hover:bg-gray-50">
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
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

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
                title="Import Customers"
                templateHeaders={["Name", "Phone"]}
            />
        </div>
    );
}
