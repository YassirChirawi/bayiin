import { useState, useMemo } from 'react';
import { where, orderBy, limit } from 'firebase/firestore';

export function useOrderFilters(activeTab, showTrash, defaultLimit = 50) {
    // Search State
    const [searchTerm, setSearchTerm] = useState("");
    const [activeSearch, setActiveSearch] = useState("");
    const [limitCount, setLimitCount] = useState(defaultLimit);

    // Filter State
    const [statusFilter, setStatusFilter] = useState("all");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    // Generate Firestore Constraints dynamically
    const orderConstraints = useMemo(() => {
        if (activeSearch) {
            // Smart Search Detection: If it looks like a phone number, search phone exact match
            const isPhone = /^\d+$/.test(activeSearch.replace(/\s/g, ''));
            if (isPhone) {
                return [where("clientPhone", "==", activeSearch)];
            } else {
                // Try searching as number first if it looks like one, or exact string
                const orderNum = parseInt(activeSearch);
                if (!isNaN(orderNum)) {
                    return [where("orderNumber", "==", orderNum)];
                }
                return [where("orderNumber", "==", activeSearch)];
            }
        }
        // Default View: Recent items based on limit
        return [orderBy("date", "desc"), limit(limitCount)];
    }, [activeSearch, limitCount]);

    // Apply Client-Side Filtering on the fetched data
    const filterData = (orders) => {
        if (!orders) return [];

        return orders
            .filter(o => activeTab === 'carts' ? o.status === 'pending_catalog' : o.status !== 'pending_catalog')
            .filter(o => showTrash ? o.deleted : !o.deleted)
            .filter(o => statusFilter === 'all' || o.status === statusFilter)
            .filter(o => !startDate || o.date >= startDate)
            .filter(o => !endDate || o.date <= endDate)
            .filter(o => {
                if (activeSearch) return true; // DB handles exact match active search

                // Allow fuzzy searching on the currently fetched subset
                if (!searchTerm) return true;
                const lowerSearch = searchTerm.toLowerCase();
                return (
                    o.clientName?.toLowerCase().includes(lowerSearch) ||
                    String(o.orderNumber || '').toLowerCase().includes(lowerSearch) ||
                    o.clientPhone?.includes(searchTerm)
                );
            });
    };

    return {
        searchTerm,
        setSearchTerm,
        activeSearch,
        setActiveSearch,
        limitCount,
        setLimitCount,
        statusFilter,
        setStatusFilter,
        startDate,
        setStartDate,
        endDate,
        setEndDate,
        orderConstraints,
        filterData
    };
}
