import React, { useState, useEffect } from 'react';
import { X, Save, ArrowDown, ArrowUp } from 'lucide-react';
import api from '../../api';
import { useToast } from '../../context/ToastContext';

const TransactionModal = ({ isOpen, onClose, product, type, onTransactionComplete }) => {
    const { addToast } = useToast();

    if (!isOpen || !product) return null;

    const isPurchase = type === 'purchase'; // 'purchase' means removing stock
    const isAdd = type === 'add';

    const [formData, setFormData] = useState({
        quantity_value: '',
        pieces_quantity: '',
        buy_price_total: '',
        sell_price_per_type: product.sell_price_per_type,
        sell_price_per_piece: product.sell_price_per_piece
    });

    const handleSubmit = async () => {
        try {
            // Convert strings to numbers
            const payload = {
                quantity_value: parseInt(formData.quantity_value) || 0,
                pieces_quantity: parseInt(formData.pieces_quantity) || 0,
                buy_price_total: parseFloat(formData.buy_price_total) || 0,
                sell_price_per_type: parseFloat(formData.sell_price_per_type) || 0,
                sell_price_per_piece: parseFloat(formData.sell_price_per_piece) || 0
            };

            if (isAdd) {
                await api.put(`/products/${product.id}/add`, payload);
                addToast(`Successfully added stock for ${product.name}`, 'success');
            } else {
                await api.put(`/products/${product.id}/purchase`, payload);
                addToast(`Successfully purchased/returned stock for ${product.name}`, 'danger');
            }

            onTransactionComplete();
            onClose();
        } catch (error) {
            console.error("Transaction failed", error);
            alert("Transaction failed: " + (error.response?.data?.detail || "Unknown error"));
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-xl w-[500px] shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-700">
                    <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${isAdd ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
                            {isAdd ? <ArrowDown className="w-5 h-5" /> : <ArrowUp className="w-5 h-5" />}
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                            {isAdd ? 'Add Stock' : 'Purchase (Return Coverage)'} - {product.name}
                        </h3>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Current Stock: <span className="font-semibold text-slate-800 dark:text-white">{product.quantity_value} {product.quantity_type} {product.pieces_quantity} pcs</span>
                    </p>

                    <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700 space-y-3">
                        <h4 className="font-medium text-slate-700 dark:text-slate-300">Transaction Quantity</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{product.quantity_type}</label>
                                <input
                                    type="number"
                                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white placeholder-slate-400"
                                    placeholder="0"
                                    value={formData.quantity_value}
                                    onChange={(e) => setFormData({ ...formData, quantity_value: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Pieces</label>
                                <input
                                    type="number"
                                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white placeholder-slate-400"
                                    placeholder="0"
                                    value={formData.pieces_quantity}
                                    onChange={(e) => setFormData({ ...formData, pieces_quantity: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            {isAdd ? 'Total Cost for this Batch' : 'Value of Removed Stock'}
                        </label>
                        <input
                            type="number"
                            className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white placeholder-slate-400"
                            value={formData.buy_price_total}
                            onChange={(e) => setFormData({ ...formData, buy_price_total: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">New Sell Price ({product.quantity_type})</label>
                            <input
                                type="number"
                                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white placeholder-slate-400"
                                value={formData.sell_price_per_type}
                                onChange={(e) => setFormData({ ...formData, sell_price_per_type: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">New Sell Price (Piece)</label>
                            <input
                                type="number"
                                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white placeholder-slate-400"
                                value={formData.sell_price_per_piece}
                                onChange={(e) => setFormData({ ...formData, sell_price_per_piece: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 dark:border-slate-700 flex justify-end space-x-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        className={`px-4 py-2 text-white rounded-lg flex items-center space-x-2 ${isAdd ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                    >
                        <Save className="w-4 h-4" />
                        <span>{isAdd ? 'Add Stock' : 'Confirm Purchase'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TransactionModal;
