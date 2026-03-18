import React from 'react';
import { motion } from 'framer-motion';

export const DashboardSkeleton = () => {
    return (
        <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="w-full space-y-8 animate-pulse"
        >
            {/* Header */}
            <div className="flex justify-between items-start">
                <div className="space-y-3">
                    <div className="h-8 w-64 bg-gray-200 rounded-lg"></div>
                    <div className="h-4 w-96 bg-gray-100 rounded"></div>
                </div>
                <div className="h-10 w-10 bg-gray-200 rounded-lg"></div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                        <div className="flex items-center">
                            <div className="h-12 w-12 bg-indigo-50 rounded-lg"></div>
                            <div className="ml-5 space-y-2 flex-1">
                                <div className="h-4 w-24 bg-gray-200 rounded"></div>
                                <div className="h-6 w-16 bg-gray-300 rounded"></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-xl border border-gray-100 p-6 h-[400px]">
                        <div className="h-6 w-48 bg-gray-200 rounded mb-6"></div>
                        <div className="h-[300px] w-full bg-gray-50 rounded-lg"></div>
                    </div>
                </div>
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-xl border border-gray-100 p-6 h-[400px]">
                         <div className="h-6 w-32 bg-gray-200 rounded mb-6"></div>
                         <div className="flex justify-center items-center h-[300px]">
                             <div className="h-48 w-48 bg-gray-100 rounded-full"></div>
                         </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export const TableSkeleton = ({ rows = 5, cols = 5 }) => {
    return (
        <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="w-full animate-pulse bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
        >
            {/* Toolbar */}
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div className="h-10 w-1/3 bg-gray-200 rounded-lg"></div>
                <div className="h-10 w-24 bg-gray-200 rounded-lg"></div>
            </div>
            
            {/* Header */}
            <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex justify-between">
                {Array.from({ length: cols }).map((_, i) => (
                    <div key={i} className="h-4 w-20 bg-gray-200 rounded"></div>
                ))}
            </div>

            {/* Rows */}
            <div className="divide-y divide-gray-100">
                {Array.from({ length: rows }).map((_, rowIndex) => (
                    <div key={rowIndex} className="px-6 py-4 flex justify-between items-center hover:bg-gray-50/50 transition-colors">
                        {Array.from({ length: cols }).map((_, colIndex) => (
                            <div key={colIndex} className={`h-4 bg-gray-100 rounded ${colIndex === 0 ? 'w-32' : colIndex === cols - 1 ? 'w-16' : 'w-24'}`}></div>
                        ))}
                    </div>
                ))}
            </div>
        </motion.div>
    );
};

export const CardGridSkeleton = ({ count = 6 }) => {
    return (
        <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse"
        >
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden h-64 flex flex-col">
                    <div className="h-32 bg-gray-200 w-full"></div>
                    <div className="p-4 flex-1 space-y-3">
                        <div className="h-5 w-3/4 bg-gray-200 rounded"></div>
                        <div className="h-4 w-1/2 bg-gray-100 rounded"></div>
                    </div>
                    <div className="p-4 border-t border-gray-50 flex justify-end">
                         <div className="h-8 w-20 bg-gray-200 rounded-lg"></div>
                    </div>
                </div>
            ))}
        </motion.div>
    );
};
