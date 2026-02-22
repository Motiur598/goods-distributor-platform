
import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, DollarSign, MessageSquare, Package, Plus, Trash2, ArrowRight } from 'lucide-react';
import api from '../api';
import SearchableInput from '../components/common/SearchableInput';

const TotalDue = () => {
    const [groups, setGroups] = useState([]);
    const [expandedGroup, setExpandedGroup] = useState(null);
    const [activeTab, setActiveTab] = useState('commissions'); // commissions, remarks, product_taken

    // Data for active group
    const [commissions, setCommissions] = useState({ total: 0, paid: 0, remaining: 0, items: [] });
    const [remarks, setRemarks] = useState({ total: 0, paid: 0, remaining: 0, items: [] });
    const [productTaken, setProductTaken] = useState([]);
    const [products, setProducts] = useState([]); // Stock for Product Taken

    useEffect(() => {
        fetchGroups();
    }, []);

    const fetchGroups = async () => {
        try {
            const res = await api.get('/total-due/groups');
            setGroups(res.data);
        } catch (error) {
            console.error("Failed to fetch groups", error);
        }
    };

    const toggleGroup = async (groupId) => {
        if (expandedGroup === groupId) {
            setExpandedGroup(null);
        } else {
            setExpandedGroup(groupId);
            setActiveTab('commissions');
            // Fetch initial data for the group
            fetchGroupData(groupId, 'commissions');
        }
    };

    const fetchGroupData = async (groupId, tab) => {
        try {
            if (tab === 'commissions') {
                const res = await api.get(`/total-due/${groupId}/commissions`);
                setCommissions({
                    total: res.data.total_commission,
                    paid: res.data.paid_commission,
                    remaining: res.data.remaining_commission,
                    items: res.data.items
                });
            } else if (tab === 'remarks') {
                const res = await api.get(`/total-due/${groupId}/remarks`);
                setRemarks({
                    total: res.data.total_remarks,
                    paid: res.data.paid_remarks,
                    remaining: res.data.remaining_remarks,
                    items: res.data.items
                });
            } else if (tab === 'product_taken') {
                const res = await api.get(`/total-due/${groupId}/product-taken`);
                setProductTaken(res.data);
                // Also fetch products for stock selection
                const prodRes = await api.get(`/products/group/${groupId}`);
                setProducts(prodRes.data);
            }
        } catch (error) {
            console.error(`Failed to fetch ${tab} data`, error);
        }
    };

    useEffect(() => {
        if (expandedGroup) {
            fetchGroupData(expandedGroup, activeTab);
        }
    }, [activeTab, expandedGroup]);

    // Product Taken Logic
    const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [quantity, setQuantity] = useState('');
    const [pieces, setPieces] = useState('');
    const [totalPrice, setTotalPrice] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    const handleAddProductTaken = async () => {
        if (!selectedProduct || (!quantity && !pieces) || !totalPrice) {
            alert("Please fill all fields");
            return;
        }

        try {
            await api.post('/total-due/product-taken', {
                group_id: expandedGroup,
                product_id: selectedProduct.id,
                quantity: parseInt(quantity) || 0,
                pieces: parseInt(pieces) || 0,
                total_price: parseFloat(totalPrice),
                date: date
            });
            setIsAddProductModalOpen(false);
            setQuantity('');
            setPieces('');
            setTotalPrice('');
            setSelectedProduct(null);
            setSelectedProduct(null);
            fetchGroupData(expandedGroup, 'product_taken');
            fetchGroups(); // Refresh total due
        } catch (error) {
            console.error("Failed to add product taken", error);
            alert(error.response?.data?.detail || "Failed to add");
        }
    };

    // Pay / Return Logic
    const [payModal, setPayModal] = useState({ open: false, item: null, amount: '' });
    const [genericPayModal, setGenericPayModal] = useState({ open: false, type: 'commission', amount: '' });
    const [returnModal, setReturnModal] = useState({ open: false, item: null, quantity: '', pieces: '' });

    const handlePay = async () => {
        try {
            await api.post(`/total-due/product-taken/${payModal.item.id}/pay`, {
                amount: parseFloat(payModal.amount)
            });
            setPayModal({ open: false, item: null, amount: '' });
            fetchGroupData(expandedGroup, 'product_taken');
            fetchGroups(); // Refresh total due
        } catch (error) {
            alert("Payment failed");
        }
    };

    const handleReturn = async () => {
        const qty = parseInt(returnModal.quantity) || 0;
        const pcs = parseInt(returnModal.pieces) || 0;

        if (qty === 0 && pcs === 0) {
            alert("Please enter a quantity to return");
            return;
        }

        const item = returnModal.item;
        const perQty = item.pieces_per_quantity || 1; // Default to 1 if missing

        const currentTotal = (item.quantity * perQty) + item.pieces;
        const returnTotal = (qty * perQty) + pcs;

        if (returnTotal > currentTotal) {
            alert("Cannot return more than what was taken!");
            return;
        }

        try {
            await api.post(`/total-due/product-taken/${returnModal.item.id}/return`, {
                quantity: qty,
                pieces: pcs
            });
            setReturnModal({ open: false, item: null, quantity: '', pieces: '' });
            fetchGroupData(expandedGroup, 'product_taken');
            fetchGroups(); // Refresh total due
        } catch (error) {
            console.error(error);
            alert("Return failed");
        }
    };

    const handleGenericPay = async () => {
        try {
            if (genericPayModal.type === 'remark' && genericPayModal.item) {
                // Specific Remark Payment
                const amount = parseFloat(genericPayModal.amount);
                const remaining = genericPayModal.item.amount - (genericPayModal.item.paid_amount || 0);

                if (amount > remaining + 0.01) {
                    alert(`Payment amount (${amount}) exceeds remaining balance (${remaining.toFixed(2)})`);
                    return;
                }

                await api.post(`/total-due/remarks/${genericPayModal.item.id}/pay`, {
                    group_id: expandedGroup,
                    amount: amount,
                    payment_type: 'remark',
                    date: new Date().toISOString().split('T')[0]
                });
                setGenericPayModal({ open: false, type: 'remark', amount: '', item: null });
                fetchGroupData(expandedGroup, 'remarks');
            } else {
                // Generic Commission Payment
                await api.post(`/total-due/${expandedGroup}/pay-generic`, {
                    group_id: expandedGroup,
                    amount: parseFloat(genericPayModal.amount),
                    payment_type: genericPayModal.type,
                    date: new Date().toISOString().split('T')[0]
                });
                const type = genericPayModal.type;
                setGenericPayModal({ open: false, type: 'commission', amount: '' });
                fetchGroupData(expandedGroup, type === 'commission' ? 'commissions' : 'remarks');
            }
            fetchGroups(); // Refresh total due
        } catch (error) {
            console.error(error);
            alert("Payment failed: " + (error.response?.data?.detail || error.message));
        }
    };

    const [searchTerm, setSearchTerm] = useState('');

    // Filter available products
    const filteredStock = products.filter(p => {
        const weight = `${p.weight_value || ''}${p.weight_type || ''}`;
        const combined = `${p.name} ${weight}`;
        return (p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            combined.toLowerCase().includes(searchTerm.toLowerCase())) && p.quantity_value > 0;
    });

    const addToCart = (product) => {
        setSelectedProduct(product);
        setQuantity('');
        setPieces('');
        setTotalPrice('');
    };

    // Auto-calculate price when quantity/pieces change
    useEffect(() => {
        if (selectedProduct) {
            const qty = parseInt(quantity) || 0;
            const pcs = parseInt(pieces) || 0;
            // Calculate base price
            const calculatedPrice = (qty * (selectedProduct.sell_price_per_type || 0)) +
                (pcs * (selectedProduct.sell_price_per_piece || 0));

            if (calculatedPrice > 0) {
                setTotalPrice(calculatedPrice.toFixed(2));
            } else if (qty === 0 && pcs === 0) {
                setTotalPrice('');
            }
        }
    }, [quantity, pieces, selectedProduct]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <header>
                <h2 className="text-3xl font-extrabold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">Total Due Management</h2>
                <p className="text-slate-500">Manage commissions, remarks, and product credits per group.</p>
            </header>

            <div className="space-y-4">
                {groups.map(group => (
                    <div key={group.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm">
                        <div
                            onClick={() => toggleGroup(group.id)}
                            className="p-4 flex justify-between items-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                        >
                            <div className="flex items-center space-x-3">
                                {expandedGroup === group.id ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                                <h3 className="font-bold text-lg text-slate-800 dark:text-white">{group.name}</h3>
                            </div>
                            <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Due:</span>
                                <span className={`text-lg font-bold ${(group.total_due || 0) > 0 ? 'text-red-500' : 'text-green-600'}`}>
                                    {(group.total_due || 0).toFixed(2)}
                                </span>
                            </div>
                        </div>

                        {expandedGroup === group.id && (
                            <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
                                {/* Tabs */}
                                <div className="flex space-x-2 mb-6 border-b border-slate-200 dark:border-slate-700 pb-1">
                                    <button
                                        onClick={() => setActiveTab('commissions')}
                                        className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeTab === 'commissions' ? 'bg-white dark:bg-slate-800 text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                                    >Commisssions</button>
                                    <button
                                        onClick={() => setActiveTab('remarks')}
                                        className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeTab === 'remarks' ? 'bg-white dark:bg-slate-800 text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                                    >Remarkses</button>
                                    <button
                                        onClick={() => setActiveTab('product_taken')}
                                        className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeTab === 'product_taken' ? 'bg-white dark:bg-slate-800 text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                                    >Product Taken</button>
                                </div>

                                {/* Content */}
                                <div className="bg-white dark:bg-slate-800 rounded-lg p-4 min-h-[300px]">
                                    {activeTab === 'commissions' && (
                                        <div>
                                            <div className="flex justify-between items-center mb-4">
                                                <h4 className="font-bold text-slate-700 dark:text-slate-200">SR Commisssions</h4>
                                                <div className="flex items-center space-x-4">
                                                    <div className="text-right">
                                                        <div className="text-xs text-slate-500">Total</div>
                                                        <div className="font-bold text-slate-800 dark:text-white">{commissions.total.toFixed(2)}</div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-xs text-slate-500">Paid</div>
                                                        <div className="font-bold text-green-600">{commissions.paid.toFixed(2)}</div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-xs text-slate-500">Total Due</div>
                                                        <div className="font-bold text-red-500 text-lg">{commissions.remaining.toFixed(2)}</div>
                                                    </div>
                                                    <button
                                                        onClick={() => setGenericPayModal({ open: true, type: 'commission', amount: '' })}
                                                        className="px-3 py-1.5 bg-indigo-600 text-white text-sm font-bold rounded hover:bg-indigo-700 transition"
                                                    >
                                                        Pay
                                                    </button>
                                                </div>
                                            </div>
                                            <ul className="space-y-2">
                                                {commissions.items.map((item, idx) => (
                                                    <li key={idx} className="flex justify-between items-center p-3 border border-slate-100 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                                        <span className="text-slate-600 dark:text-slate-400 text-sm">
                                                            {new Date(item.date).toLocaleDateString()} {item.day_name}
                                                        </span>
                                                        <span className={`font-bold ${item.amount >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                            {item.amount > 0 ? '+' : ''}{item.amount.toFixed(2)} tk
                                                        </span>
                                                    </li>
                                                ))}
                                                {commissions.items.length === 0 && <p className="text-slate-400 text-center py-4">No commissions recorded.</p>}
                                            </ul>
                                        </div>
                                    )}

                                    {activeTab === 'remarks' && (
                                        <div>
                                            <div className="flex justify-between items-center mb-4">
                                                <h4 className="font-bold text-slate-700 dark:text-slate-200">Remarkses</h4>
                                                <div className="flex items-center space-x-4">
                                                    <div className="text-right">
                                                        <div className="text-xs text-slate-500">Total</div>
                                                        <div className="font-bold text-slate-800 dark:text-white">{remarks.total.toFixed(2)}</div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-xs text-slate-500">Paid</div>
                                                        <div className="font-bold text-green-600">{remarks.paid.toFixed(2)}</div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-xs text-slate-500">Total Due</div>
                                                        <div className="font-bold text-red-500 text-lg">{remarks.remaining.toFixed(2)}</div>
                                                    </div>
                                                </div>
                                            </div>
                                            <ul className="space-y-2">
                                                {remarks.items
                                                    .filter(item => !item.is_fully_paid) // Hide fully paid remarks
                                                    .map((item, idx) => (
                                                        <li key={idx} className="flex justify-between items-center p-3 border border-slate-100 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                                            <div className="flex flex-col">
                                                                <span className="text-slate-800 dark:text-white font-medium">{item.comment}</span>
                                                                <span className="text-slate-500 text-xs">{new Date(item.date).toLocaleDateString()} {item.day_name}</span>
                                                            </div>
                                                            <div className="flex items-center space-x-3">
                                                                <div className="text-right mr-2">
                                                                    <div className="text-xs text-slate-400">Due</div>
                                                                    <span className="font-bold text-red-500">
                                                                        {(item.amount - (item.paid_amount || 0)).toFixed(2)}
                                                                    </span>
                                                                </div>
                                                                <button
                                                                    onClick={() => setGenericPayModal({ open: true, type: 'remark', amount: '', item: item })}
                                                                    className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded text-xs font-bold hover:bg-indigo-100 transition"
                                                                >
                                                                    Pay
                                                                </button>
                                                            </div>
                                                        </li>
                                                    ))}
                                                {remarks.items.length === 0 && <p className="text-slate-400 text-center py-4">No remarks recorded.</p>}
                                            </ul>
                                        </div>
                                    )}

                                    {activeTab === 'product_taken' && (
                                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                            {/* Left Col: Stock Selection */}
                                            <div className="lg:col-span-1 space-y-4">
                                                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl shadow-inner border border-slate-100 dark:border-slate-700">
                                                    <h3 className="font-bold text-slate-800 dark:text-white mb-3">Available Stock</h3>
                                                    <div className="mb-3">
                                                        <SearchableInput
                                                            value={searchTerm}
                                                            onChange={setSearchTerm}
                                                            items={products}
                                                            placeholder="Search..."
                                                        />
                                                    </div>

                                                    <div className="max-h-[400px] overflow-y-auto space-y-2">
                                                        {filteredStock.map(product => (
                                                            <div key={product.id} className="p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg hover:shadow-md transition-all flex justify-between items-center group cursor-pointer" onClick={() => addToCart(product)}>
                                                                <div>
                                                                    <div className="font-medium text-slate-800 dark:text-slate-200 text-sm">
                                                                        {product.name}
                                                                        {product.weight_value && (
                                                                            <span className="ml-1 text-slate-500 dark:text-slate-400 text-xs font-normal">
                                                                                ({product.weight_value}{product.weight_type})
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-xs text-slate-500 dark:text-slate-400">
                                                                        Stock: {product.quantity_value} {product.quantity_type} {product.pieces_quantity} pcs
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    className="p-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-md hover:bg-indigo-100 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                >
                                                                    <Plus className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Right Col: New Entry Form & Active List */}
                                            <div className="lg:col-span-2 space-y-6">
                                                {/* New Entry Form (Cart-like) */}
                                                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
                                                    <h4 className="font-bold text-slate-800 dark:text-white mb-3 flex items-center">
                                                        <Plus className="w-4 h-4 mr-2 text-indigo-500" />
                                                        Add New Product Taken
                                                    </h4>

                                                    {selectedProduct ? (
                                                        <div className="space-y-4">
                                                            <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                                                                <span className="font-medium text-slate-900 dark:text-white">{selectedProduct.name}</span>
                                                                <button onClick={() => setSelectedProduct(null)} className="text-xs text-red-500 hover:underline">Remove</button>
                                                            </div>
                                                            <div className="grid grid-cols-3 gap-3">
                                                                <div>
                                                                    <label className="text-xs text-slate-500 mb-1 block">Qty ({selectedProduct.quantity_type})</label>
                                                                    <input type="number" className="w-full border rounded p-2 dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="0" />
                                                                </div>
                                                                <div>
                                                                    <label className="text-xs text-slate-500 mb-1 block">Pieces</label>
                                                                    <input type="number" className="w-full border rounded p-2 dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={pieces} onChange={e => setPieces(e.target.value)} placeholder="0" />
                                                                </div>
                                                                <div>
                                                                    <label className="text-xs text-slate-500 mb-1 block">Total Price</label>
                                                                    <input type="number" className="w-full border rounded p-2 dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={totalPrice} onChange={e => setTotalPrice(e.target.value)} placeholder="0.00" />
                                                                </div>
                                                            </div>
                                                            <div className="flex justify-end">
                                                                <button
                                                                    onClick={handleAddProductTaken}
                                                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-bold shadow-md transition-all"
                                                                >
                                                                    Save Record
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="text-center py-8 text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
                                                            Select a product from the left to add.
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Active List */}
                                                <div>
                                                    <h4 className="font-bold text-slate-800 dark:text-white mb-3">Active Debts / Taken Products</h4>
                                                    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                                                        <table className="w-full text-left border-collapse text-sm">
                                                            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                                                <tr>
                                                                    <th className="p-3">Product</th>
                                                                    <th className="p-3">Qty</th>
                                                                    <th className="p-3 text-right">Total Price</th>
                                                                    <th className="p-3 text-right">Paid</th>
                                                                    <th className="p-3 text-right">Remaining</th>
                                                                    <th className="p-3 text-right">Actions</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700 bg-white dark:bg-slate-900">
                                                                {productTaken.map(item => (
                                                                    <tr key={item.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                                        <td className="p-3 font-medium text-slate-800 dark:text-white">{item.product_name}</td>
                                                                        <td className="p-3 text-slate-600 dark:text-slate-300">
                                                                            {item.quantity} {item.quantity_type || 'box'} {item.pieces} pcs
                                                                        </td>
                                                                        <td className="p-3 text-right font-bold text-slate-800 dark:text-white">{item.total_price.toFixed(2)}</td>
                                                                        <td className="p-3 text-right text-green-600 font-medium">{item.paid_amount.toFixed(2)}</td>
                                                                        <td className="p-3 text-right text-red-500 font-bold">{(item.total_price - item.paid_amount).toFixed(2)}</td>
                                                                        <td className="p-3 text-right">
                                                                            <div className="flex justify-end space-x-2">
                                                                                <button
                                                                                    onClick={() => setPayModal({ open: true, item: item, amount: '' })}
                                                                                    className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold hover:bg-green-200 transition-colors"
                                                                                >Pay</button>
                                                                                <button
                                                                                    onClick={() => setReturnModal({ open: true, item: item, quantity: '', pieces: '' })}
                                                                                    className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold hover:bg-red-200 transition-colors"
                                                                                >Return</button>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                                {productTaken.length === 0 && (
                                                                    <tr><td colSpan="6" className="text-center py-6 text-slate-400">No products taken.</td></tr>
                                                                )}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                ))
                }
            </div >

            {/* Modals */}
            {/* Add Product Modal */}
            {
                isAddProductModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-white dark:bg-slate-800 rounded-xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95">
                            <h3 className="text-lg font-bold mb-4 dark:text-white">Add Product Taken</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Product</label>
                                    <SearchableInput items={products} value={selectedProduct ? selectedProduct.name : ''} onChange={(val) => { }} onSelect={setSelectedProduct} placeholder="Search product..." />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1 dark:text-slate-300">Quantity (Type)</label>
                                        <input type="number" className="w-full border rounded p-2 dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={quantity} onChange={e => setQuantity(e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1 dark:text-slate-300">Pieces</label>
                                        <input type="number" className="w-full border rounded p-2 dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={pieces} onChange={e => setPieces(e.target.value)} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Total Price</label>
                                    <input type="number" className="w-full border rounded p-2 dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={totalPrice} onChange={e => setTotalPrice(e.target.value)} />
                                </div>
                                <div className="flex justify-end space-x-2 pt-2">
                                    <button onClick={() => setIsAddProductModalOpen(false)} className="px-4 py-2 text-slate-500">Cancel</button>
                                    <button onClick={handleAddProductTaken} className="px-4 py-2 bg-indigo-600 text-white rounded">Add</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Pay Modal */}
            {
                payModal.open && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-white dark:bg-slate-800 rounded-xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95">
                            <h3 className="text-lg font-bold mb-4 dark:text-white">Pay for Product</h3>
                            <div className="space-y-4">
                                <p className="text-sm text-slate-500">Remaining: {(payModal.item.total_price - payModal.item.paid_amount).toFixed(2)}</p>
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Amount</label>
                                    <input type="number" className="w-full border rounded p-2 dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={payModal.amount} onChange={e => setPayModal({ ...payModal, amount: e.target.value })} autoFocus />
                                </div>
                                <div className="flex justify-end space-x-2 pt-2">
                                    <button onClick={() => setPayModal({ open: false, item: null, amount: '' })} className="px-4 py-2 text-slate-500">Cancel</button>
                                    <button onClick={handlePay} className="px-4 py-2 bg-green-600 text-white rounded">Pay</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Return Modal */}
            {
                returnModal.open && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-white dark:bg-slate-800 rounded-xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95">
                            <h3 className="text-lg font-bold mb-4 dark:text-white">Return Product</h3>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1 dark:text-slate-300">Quantity ({returnModal.item ? (returnModal.item.quantity_type || 'box') : 'Type'})</label>
                                        <input type="number" className="w-full border rounded p-2 dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={returnModal.quantity} onChange={e => setReturnModal({ ...returnModal, quantity: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1 dark:text-slate-300">Pieces</label>
                                        <input type="number" className="w-full border rounded p-2 dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={returnModal.pieces} onChange={e => setReturnModal({ ...returnModal, pieces: e.target.value })} />
                                    </div>
                                </div>
                                <div className="flex justify-end space-x-2 pt-2">
                                    <button onClick={() => setReturnModal({ open: false, item: null, quantity: '', pieces: '' })} className="px-4 py-2 text-slate-500">Cancel</button>
                                    <button onClick={handleReturn} className="px-4 py-2 bg-red-600 text-white rounded">Return</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Generic Pay Modal */}
            {
                genericPayModal.open && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-white dark:bg-slate-800 rounded-xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95">
                            <h3 className="text-lg font-bold mb-4 dark:text-white">
                                Pay {genericPayModal.type === 'commission' ? 'Commission' : 'Remark'}
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Amount</label>
                                    <input type="number" className="w-full border rounded p-2 dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={genericPayModal.amount} onChange={e => setGenericPayModal({ ...genericPayModal, amount: e.target.value })} autoFocus />
                                </div>
                                <div className="flex justify-end space-x-2 pt-2">
                                    <button onClick={() => setGenericPayModal({ open: false, type: 'commission', amount: '' })} className="px-4 py-2 text-slate-500">Cancel</button>
                                    <button onClick={handleGenericPay} className="px-4 py-2 bg-green-600 text-white rounded">Pay</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default TotalDue;
