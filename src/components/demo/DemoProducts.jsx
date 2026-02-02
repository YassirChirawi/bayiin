import { Plus, Search, MoreHorizontal, Image as ImageIcon } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";

export default function DemoProducts() {
    const { t } = useLanguage();

    const products = [
        { id: 1, name: "Montre Premium Gold", price: "599 DH", stock: 12, sales: 45, image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=100&q=80" },
        { id: 2, name: "Casque Audio Pro", price: "299 DH", stock: 5, sales: 120, image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=100&q=80" },
        { id: 3, name: "Sneakers Urban", price: "450 DH", stock: 8, sales: 32, image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=100&q=80" },
        { id: 4, name: "Sac à Dos Cuir", price: "350 DH", stock: 20, sales: 15, image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=100&q=80" },
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-slate-900">{t('products') || "Produits"}</h2>
                    <p className="text-sm text-slate-500">Gérez votre catalogue.</p>
                </div>
                <button className="flex items-center gap-2 bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm shadow-indigo-200">
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">{t('create') || "Ajouter"}</span>
                </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {products.map((product) => (
                    <div key={product.id} className="flex items-center gap-4 p-3 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                        <div className="w-16 h-16 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0 border border-slate-100">
                            <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-slate-900 truncate">{product.name}</h3>
                            <p className="text-sm text-slate-500">{product.price}</p>
                        </div>
                        <div className="text-right hidden sm:block">
                            <div className={`text-sm font-bold ${product.stock < 10 ? 'text-red-600' : 'text-green-600'}`}>{product.stock} en stock</div>
                            <div className="text-xs text-slate-400">{product.sales} ventes</div>
                        </div>
                        <button className="p-2 text-slate-400 hover:text-slate-600">
                            <MoreHorizontal className="w-5 h-5" />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
