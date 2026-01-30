
import { useState } from "react";
import { Plus, Edit2, Trash2, Package, Search, RotateCcw, AlertCircle, Upload, Download } from "lucide-react";
import Button from "../components/Button";
import ScreenshotLayout from "../components/ScreenshotLayout";

export default function ScreenshotProducts() {
    // Hardcoded French labels since we want "Vrai Outil" look (assuming FR default)
    // Or we could use the real translation hook if it works, but hardcoding is safer for a screenshot.

    const products = [
        { id: 1, name: "Wireless Headphones Pro", category: "Electronics", price: 299.00, stock: 45, photoUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&q=80" },
        { id: 2, name: "Smart Watch Series 5", category: "Electronics", price: 599.00, stock: 12, photoUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&q=80" },
        { id: 3, name: "Premium Yoga Mat", category: "Fitness", price: 149.00, stock: 8, photoUrl: "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=200&q=80" },
        { id: 4, name: "Running Shoes", category: "Sport", price: 450.00, stock: 3, photoUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&q=80" },
        { id: 5, name: "Minimalist Backpack", category: "Accessories", price: 320.00, stock: 150, photoUrl: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=200&q=80" },
        { id: 6, name: "Organic Face Cream", category: "Beauty", price: 180.00, stock: 2, photoUrl: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=200&q=80" },
    ];

    return (
        <ScreenshotLayout>
            <div className="space-y-6 font-sans text-slate-900">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Produits</h1>
                        <p className="mt-1 text-sm text-gray-500">
                            Gérez votre catalogue et vos stocks
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <div className="flex gap-2">
                            <Button variant="secondary" icon={Upload}>Importer</Button>
                            <Button variant="secondary" icon={Download}>Exporter</Button>
                        </div>
                        <Button icon={Plus}>Nouveau Produit</Button>
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
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            placeholder="Rechercher un produit..."
                        />
                    </div>
                </div>

                {/* List */}
                <div className="bg-white shadow overflow-hidden sm:rounded-md">
                    <ul className="divide-y divide-gray-200">
                        {products.map((product) => (
                            <li key={product.id}>
                                <div className="px-4 py-4 sm:px-6 hover:bg-gray-50 flex items-center justify-between">
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        <div className="flex-shrink-0 h-16 w-16 bg-gray-100 rounded-md overflow-hidden border border-gray-200">
                                            <img className="h-full w-full object-cover" src={product.photoUrl} alt={product.name} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-medium text-indigo-600 truncate">{product.name}</p>
                                            </div>
                                            <p className="flex items-center text-sm text-gray-500">
                                                <span className="truncate">{product.category}</span>
                                                <span className="mx-2">•</span>
                                                <span className={product.stock <= 5 ? "text-red-600 font-bold" : ""}>
                                                    {product.stock} en stock
                                                </span>
                                            </p>

                                            {product.stock <= 5 && (
                                                <div className="mt-1 flex items-center gap-1 text-xs text-red-600 font-medium bg-red-50 px-2 py-0.5 rounded w-fit">
                                                    <AlertCircle className="h-3 w-3" />
                                                    Stock Faible
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right hidden sm:block">
                                            <p className="text-sm font-semibold text-gray-900">{product.price.toFixed(2)} DH</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button className="p-2 text-gray-400 hover:text-indigo-600 rounded-full hover:bg-gray-100 transition-colors">
                                                <Edit2 className="h-5 w-5" />
                                            </button>
                                            <button className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-gray-100 transition-colors">
                                                <Trash2 className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </ScreenshotLayout>
    );
}
