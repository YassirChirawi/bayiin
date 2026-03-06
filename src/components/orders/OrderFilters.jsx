import React from 'react';
import { Search, X, Plus } from 'lucide-react';
import Button from '../Button';
import { ORDER_STATUS_CONFIG } from '../../utils/statusConfig';

export default function OrderFilters({
    searchTerm,
    setSearchTerm,
    clearSearch,
    handleSearch,
    handleKeyDown,
    statusFilter,
    setStatusFilter,
    showTrash,
    setShowTrash,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    limitCount,
    setLimitCount,
    t,
    setIsModalOpen
}) {
    return (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">
            {/* Left: Search & Filters */}
            <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                <div className="relative flex-1 min-w-[200px] xl:w-64">
                    <input
                        type="text"
                        placeholder={t('label_search_placeholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="w-full pl-10 pr-10 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                    {searchTerm && (
                        <button
                            onClick={clearSearch}
                            className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 focus:outline-none"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    )}
                </div>

                <button
                    onClick={handleSearch}
                    className="p-2 border rounded-xl bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"
                    title={t('search')}
                >
                    <Search className="h-5 w-5" />
                </button>

                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                >
                    <option value="all">{t('label_all_status')}</option>
                    {Object.entries(ORDER_STATUS_CONFIG).map(([key, config]) => {
                        if (key === 'pending_catalog') return null; // Filtered separately via tabs
                        return <option key={key} value={key}>{config.label}</option>;
                    })}
                </select>

                <div className="flex items-center gap-2">
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="text-gray-400">-</span>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                </div>

                <label className="flex items-center gap-2 cursor-pointer ml-2">
                    <input
                        type="checkbox"
                        checked={showTrash}
                        onChange={(e) => setShowTrash(e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500 rounded-md"
                    />
                    <span className="text-sm font-medium text-gray-700">{t('label_trash')}</span>
                </label>
            </div>

            {/* Right: Record limit & Create */}
            <div className="flex items-center gap-3 w-full xl:w-auto justify-end">
                <select
                    value={limitCount}
                    onChange={(e) => setLimitCount(Number(e.target.value))}
                    className="border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 w-full sm:w-auto"
                >
                    <option value={50}>50 Récents</option>
                    <option value={100}>100 Récents</option>
                    <option value={200}>200 Récents</option>
                    <option value={500}>500 Récents (Lent)</option>
                </select>
                <div className="hidden sm:block">
                    <Button onClick={() => setIsModalOpen(true)} icon={Plus}>
                        {t('btn_new_order')}
                    </Button>
                </div>
            </div>
        </div>
    );
}
