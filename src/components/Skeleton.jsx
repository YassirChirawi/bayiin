import React from 'react';
import { motion } from 'framer-motion';

export const DashboardSkeleton = () => {
    return (
        <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="w-full space-y-8"
        >
            {/* Header */}
            <div className="flex justify-between items-start">
                <div className="space-y-3">
                    <div className="h-8 w-64 bg-gray-200 animate-shimmer rounded-lg"></div>
                    {/* max-w-full : w-96 vaut 384 px et, avec les marges, dépassait
                        la largeur d'un téléphone de 390 px pendant le chargement. */}
                    <div className="h-4 w-96 max-w-full bg-gray-100 animate-shimmer rounded"></div>
                </div>
                <div className="h-10 w-10 bg-gray-200 animate-shimmer rounded-lg"></div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="glass-panel rounded-xl p-5 shadow-sm">
                        <div className="flex items-center">
                            <div className="h-12 w-12 bg-indigo-50/50 animate-shimmer rounded-lg"></div>
                            <div className="ml-5 space-y-2 flex-1">
                                <div className="h-4 w-24 bg-gray-200 animate-shimmer rounded"></div>
                                <div className="h-6 w-16 bg-gray-300 animate-shimmer rounded"></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="glass-panel rounded-xl p-6 h-[400px]">
                        <div className="h-6 w-48 bg-gray-200 animate-shimmer rounded mb-6"></div>
                        <div className="h-[300px] w-full bg-gray-50/50 animate-shimmer rounded-lg"></div>
                    </div>
                </div>
                <div className="lg:col-span-1 space-y-6">
                    <div className="glass-panel rounded-xl p-6 h-[400px]">
                         <div className="h-6 w-32 bg-gray-200 animate-shimmer rounded mb-6"></div>
                         <div className="flex justify-center items-center h-[300px]">
                             <div className="h-48 w-48 bg-gray-100/80 animate-shimmer rounded-full"></div>
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
            className="w-full glass-panel rounded-xl shadow-sm overflow-hidden"
        >
            {/* Toolbar */}
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
                <div className="h-10 w-1/3 bg-gray-200 animate-shimmer rounded-lg"></div>
                <div className="h-10 w-24 bg-gray-200 animate-shimmer rounded-lg"></div>
            </div>
            
            {/* Header */}
            <div className="bg-gray-50/50 px-6 py-3 border-b border-gray-100 flex justify-between">
                {Array.from({ length: cols }).map((_, i) => (
                    <div key={i} className="h-4 w-20 bg-gray-200 animate-shimmer rounded"></div>
                ))}
            </div>

            {/* Rows */}
            <div className="divide-y divide-gray-50">
                {Array.from({ length: rows }).map((_, rowIndex) => (
                    <div key={rowIndex} className="px-6 py-4 flex justify-between items-center transition-colors">
                        {Array.from({ length: cols }).map((_, colIndex) => (
                            <div key={colIndex} className={`h-4 bg-gray-100 animate-shimmer rounded ${colIndex === 0 ? 'w-32' : colIndex === cols - 1 ? 'w-16' : 'w-24'}`}></div>
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
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="glass-panel rounded-xl shadow-sm overflow-hidden h-64 flex flex-col">
                    <div className="h-32 bg-gray-200 animate-shimmer w-full"></div>
                    <div className="p-4 flex-1 space-y-3">
                        <div className="h-5 w-3/4 bg-gray-200 animate-shimmer rounded"></div>
                        <div className="h-4 w-1/2 bg-gray-100 animate-shimmer rounded"></div>
                    </div>
                    <div className="p-4 border-t border-gray-50/50 flex justify-end">
                         <div className="h-8 w-20 bg-gray-200 animate-shimmer rounded-lg"></div>
                    </div>
                </div>
            ))}
        </motion.div>
    );
};
