import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import api from '../../api';
import { useToast } from '../../context/ToastContext';

const AddProductModal = ({ isOpen, onClose, group, onProductAdded }) => {
    const { addToast } = useToast();

    if (!isOpen) return null;

    const [formData, setFormData] = useState({
        name: '',
        weight_type: 'g',
        weight_value: '',
        quantity_type: 'Cartoon', // Default
        quantity_value: '',
        pieces_per_quantity: '',
        pieces_quantity: '',
        buy_price_total: '',
        sell_price_per_type: '',
        sell_price_per_piece: ''
    });

    // Helper to calculate inferred pieces logic
    const calculatePieces = () => {
        // This is visual helper, actual logic is in backend
        // But we can show "Normalized: X Dozen Y Pieces"
    };

    const handleSubmit = async () => {
        try {
            // Validation
            if (!formData.name || !formData.weight_value) {
                alert("Please fill required fields");
                return;
            }

            // Calculate Buy Price Avg (Per Piece)
            // Backend expects 'buy_price_avg' (unit cost).
            // User inputs "Whole bought price for the whole Quantity" -> formData.buy_price_total
            // We need to calculate avg per piece to send to backend? 
            // OR we send total and let backend handle it?
            // The backend Create Product endpoint expects 'buy_price_avg' directly.
            // So we must calculate it here.

            const qtyVal = parseInt(formData.quantity_value) || 0;
            const piecesPerQty = parseInt(formData.pieces_per_quantity) || 1;
            const piecesQty = parseInt(formData.pieces_quantity) || 0;
            const totalPrice = parseFloat(formData.buy_price_total) || 0;

            let totalPieces = 0;
            if (formData.quantity_type === 'pieces') {
                totalPieces = qtyVal; // logic: if type is pieces, quantity_value is pieces? 
                // Wait, prompt says: "if we select pieces there will be no third and fourth option (pieces in type, pieces quantity)"
                // "In the second option we have to put Quantity of the type"
                // So for 'pieces', quantity_value IS the total pieces.
            } else {
                totalPieces = (qtyVal * piecesPerQty) + piecesQty;
            }

            const buyPriceAvg = totalPieces > 0 ? totalPrice / totalPieces : 0;

            const sellPriceType = parseFloat(formData.sell_price_per_type) || 0;
            const piecesPerQuantity = parseInt(formData.pieces_per_quantity) || 1;
            const sellPricePiece = piecesPerQuantity > 0 ? sellPriceType / piecesPerQuantity : 0;

            const payload = {
                group_id: group.id,
                name: formData.name,
                weight_type: formData.weight_type,
                weight_value: parseFloat(formData.weight_value),
                quantity_type: formData.quantity_type,
                quantity_value: parseInt(formData.quantity_value) || 0,
                pieces_per_quantity: piecesPerQuantity,
                pieces_quantity: parseInt(formData.pieces_quantity) || 0,
                buy_price_avg: buyPriceAvg,
                sell_price_per_type: sellPriceType,
                sell_price_per_piece: sellPricePiece
            };

            await api.post('/products/', payload);
            addToast(`Successfully added product: ${formData.name}`, 'success');

            onProductAdded();
            onClose();
        } catch (error) {
            console.error("Error adding product", error);
            alert("Failed to add product");
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-xl w-[600px] shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-700">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">Add New Product</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {/* Product Name */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Product Name</label>
                        <input
                            type="text"
                            className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white placeholder-slate-400"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    {/* Weight */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Weight Type</label>
                            <select
                                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white"
                                value={formData.weight_type}
                                onChange={(e) => setFormData({ ...formData, weight_type: e.target.value })}
                            >
                                <option value="g">Gram (g)</option>
                                <option value="kg">Kilogram (kg)</option>
                                <option value="ml">Milliliter (ml)</option>
                                <option value="L">Liter (L)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Weight Amount</label>
                            <input
                                type="number"
                                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white placeholder-slate-400"
                                value={formData.weight_value}
                                onChange={(e) => setFormData({ ...formData, weight_value: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Quantity Section */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 space-y-4">
                        <h4 className="font-semibold text-slate-700 dark:text-slate-300">Stock Quantity</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Type</label>
                                <select
                                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white"
                                    value={formData.quantity_type}
                                    onChange={(e) => setFormData({ ...formData, quantity_type: e.target.value })}
                                >
                                    <option value="Cartoon">Cartoon</option>
                                    <option value="Dozen">Dozen</option>
                                    <option value="Poly">Poly</option>
                                    <option value="pieces">Pieces</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Quantity</label>
                                <input
                                    type="number"
                                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white placeholder-slate-400"
                                    value={formData.quantity_value}
                                    onChange={(e) => setFormData({ ...formData, quantity_value: e.target.value })}
                                />
                            </div>
                        </div>

                        {formData.quantity_type !== 'pieces' && (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Pieces per {formData.quantity_type}</label>
                                    <input
                                        type="number"
                                        className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white placeholder-slate-400"
                                        value={formData.pieces_per_quantity}
                                        onChange={(e) => setFormData({ ...formData, pieces_per_quantity: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Extra Pieces</label>
                                    <input
                                        type="number"
                                        className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white placeholder-slate-400"
                                        value={formData.pieces_quantity}
                                        onChange={(e) => setFormData({ ...formData, pieces_quantity: e.target.value })}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Pricing */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Total Buy Price (For this whole quantity)</label>
                        <input
                            type="number"
                            className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white placeholder-slate-400"
                            value={formData.buy_price_total}
                            onChange={(e) => setFormData({ ...formData, buy_price_total: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Sell Price Per {formData.quantity_type}</label>
                            <input
                                type="number"
                                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white placeholder-slate-400"
                                value={formData.sell_price_per_type}
                                onChange={(e) => setFormData({ ...formData, sell_price_per_type: e.target.value })}
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
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center space-x-2"
                    >
                        <Save className="w-4 h-4" />
                        <span>Add Product</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddProductModal;
