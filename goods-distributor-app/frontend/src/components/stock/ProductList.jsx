import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Search, Trash2, ArrowDown, ArrowUp, History } from 'lucide-react';
import api from '../../api';
import AddProductModal from './AddProductModal';
import TransactionModal from './TransactionModal';
import HistoryModal from './HistoryModal';
import SearchableInput from '../common/SearchableInput';

const ProductList = ({ group, onBack }) => {
    const [products, setProducts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // History Transaction State
    const [historyModalOpen, setHistoryModalOpen] = useState(false);
    const [historyLogs, setHistoryLogs] = useState([]);

    // Transaction Modal State
    const [transactionModalData, setTransactionModalData] = useState({
        isOpen: false,
        product: null,
        type: 'add' // 'add' or 'purchase'
    });

    useEffect(() => {
        fetchProducts();
    }, [group]);

    const fetchProducts = async () => {
        try {
            const response = await api.get(`/products/group/${group.id}`);
            setProducts(response.data);
        } catch (error) {
            console.error("Failed to fetch products", error);
        }
    };

    const handleDelete = async (productId) => {
        if (window.confirm("Are you sure you want to delete this product?")) {
            try {
                await api.delete(`/products/${productId}`);
                fetchProducts(); // Refresh list
            } catch (error) {
                alert("Failed to delete product");
            }
        }
    };

    const openTransactionModal = (product, type) => {
        setTransactionModalData({
            isOpen: true,
            product,
            type
        });
    };

    const handleOpenHistory = async () => {
        try {
            const response = await api.get(`/products/group/${group.id}/history`);
            setHistoryLogs(response.data);
            setHistoryModalOpen(true);
        } catch (error) {
            console.error("Failed to fetch history", error);
            alert("Failed to load history.");
        }
    };

    // Filter products
    const filteredProducts = products.filter(p => {
        const weight = `${p.weight_value || ''}${p.weight_type || ''}`;
        const combined = `${p.name} ${weight}`;
        return p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            combined.toLowerCase().includes(searchTerm.toLowerCase());
    });

    const getFormattedQuantity = (p) => {
        return `${p.quantity_value} ${p.quantity_type || ''} ${p.pieces_quantity} pcs`;
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-1">
                <div className="flex items-center space-x-4">
                    <button onClick={onBack} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-600 dark:text-slate-300">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h2 className="text-2xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">{group.name} Stock</h2>
                        <p className="text-slate-500 dark:text-slate-400">Manage products and inventory.</p>
                    </div>
                </div>
                <div className="flex space-x-3 items-center">
                    <div className="relative w-72">
                        <SearchableInput
                            value={searchTerm}
                            onChange={setSearchTerm}
                            items={products}
                            placeholder="Search products..."
                            className="text-slate-900 dark:text-white"
                        />
                    </div>
                    <button
                        onClick={handleOpenHistory}
                        className="flex items-center space-x-2 px-4 py-2 text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors font-medium border border-slate-200 dark:border-slate-600"
                    >
                        <History className="w-5 h-5" />
                        <span>History</span>
                    </button>
                    {sessionStorage.getItem('role') === 'admin' && (
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-500/20 transition-all hover:-translate-y-0.5"
                        >
                            <Plus className="w-5 h-5" />
                            <span>Add Product</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden transition-colors duration-300">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                            <tr>
                                <th className="py-4 px-6 font-semibold text-sm text-slate-600 dark:text-slate-300">Product Name</th>
                                <th className="py-4 px-6 font-semibold text-sm text-slate-600 dark:text-slate-300">Weight</th>
                                <th className="py-4 px-6 font-semibold text-sm text-slate-600 dark:text-slate-300">Quantity Remaining</th>
                                <th className="py-4 px-6 font-semibold text-sm text-slate-600 dark:text-slate-300">Avg Buy Price (Type)</th>
                                <th className="py-4 px-6 font-semibold text-sm text-slate-600 dark:text-slate-300">Avg Buy Price (pc)</th>
                                <th className="py-4 px-6 font-semibold text-sm text-slate-600 dark:text-slate-300">Sell Price (Type)</th>
                                <th className="py-4 px-6 font-semibold text-sm text-slate-600 dark:text-slate-300">Sell Price (Piece)</th>
                                <th className="py-4 px-6 font-semibold text-sm text-slate-600 dark:text-slate-300 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {filteredProducts.length > 0 ? (
                                filteredProducts.map((product) => (
                                    <tr key={product.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group">
                                        <td className="py-4 px-6 font-medium text-slate-800 dark:text-white">{product.name}</td>
                                        <td className="py-4 px-6 text-slate-600 dark:text-slate-400">
                                            <span className="bg-slate-100 dark:bg-slate-700 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap">
                                                {product.weight_value} {product.weight_type}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-indigo-600 dark:text-indigo-400 font-semibold">{getFormattedQuantity(product)}</td>
                                        <td className="py-4 px-6 text-slate-600 dark:text-slate-400 font-mono">
                                            ${(product.buy_price_avg * (product.pieces_per_quantity || 1)).toFixed(2)}
                                        </td>
                                        <td className="py-4 px-6 text-slate-600 dark:text-slate-400 font-mono">${product.buy_price_avg?.toFixed(2)}</td>
                                        <td className="py-4 px-6 text-slate-600 dark:text-slate-400 font-mono font-medium">
                                            ${product.sell_price_per_type?.toFixed(2)}
                                        </td>
                                        <td className="py-4 px-6 text-slate-600 dark:text-slate-400 font-mono font-medium">
                                            ${product.sell_price_per_piece?.toFixed(2)}
                                        </td>
                                        <td className="py-4 px-6 text-right space-x-2">
                                            {sessionStorage.getItem('role') === 'admin' && (
                                                <>
                                                    <button
                                                        onClick={() => openTransactionModal(product, 'add')}
                                                        className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                                                        title="Add Stock"
                                                    >
                                                        <ArrowDown className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => openTransactionModal(product, 'purchase')}
                                                        className="p-2 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/30 rounded-lg transition-colors"
                                                        title="Purchase/Return Stock"
                                                    >
                                                        <ArrowUp className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(product.id)}
                                                        className="p-2 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                                        title="Delete Product"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="py-12 text-center text-slate-500 dark:text-slate-400">
                                        <div className="flex flex-col items-center justify-center space-y-3">
                                            <Search className="w-12 h-12 text-slate-300 dark:text-slate-600" />
                                            <p>No products found matching your search.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modals */}
            <AddProductModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                group={group}
                onProductAdded={fetchProducts}
            />

            <TransactionModal
                isOpen={transactionModalData.isOpen}
                onClose={() => setTransactionModalData({ ...transactionModalData, isOpen: false })}
                product={transactionModalData.product}
                type={transactionModalData.type}
                onTransactionComplete={fetchProducts}
            />

            <HistoryModal
                isOpen={historyModalOpen}
                onClose={() => setHistoryModalOpen(false)}
                groupName={group.name}
                historyLogs={historyLogs}
            />
        </div>
    );
};


export default ProductList;
