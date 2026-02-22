import React, { useState, useEffect } from 'react';
import { Search, Plus, Trash2, ShoppingCart, Calculator, Save, RefreshCw, DollarSign } from 'lucide-react';
import api from '../../api';
import SearchableInput from '../common/SearchableInput';

const SalesInterface = ({ group }) => {
    const [products, setProducts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const role = sessionStorage.getItem('role');

    // Cart/Sale State
    const [saleItems, setSaleItems] = useState([]); // [{ product, request_type_qty, request_piece_qty, return_type_qty, return_piece_qty, sold_type_qty, sold_piece_qty, price }]
    const [cashReceived, setCashReceived] = useState('');
    const [remarks, setRemarks] = useState([]); // [{comment, amount}]
    const [isLocked, setIsLocked] = useState(false);

    // Remark State
    const [isRemarkModalOpen, setIsRemarkModalOpen] = useState(false);
    const [remarkComment, setRemarkComment] = useState('');
    const [remarkAmount, setRemarkAmount] = useState('');

    const handleAddRemark = () => {
        if (!remarkComment || !remarkAmount) return;
        const amount = parseFloat(remarkAmount);
        if (isNaN(amount) || amount <= 0) return;

        setRemarks([...remarks, { comment: remarkComment, amount: amount }]);
        setRemarkComment('');
        setRemarkAmount('');
        setIsRemarkModalOpen(false);
    };

    const removeRemark = (index) => {
        const newRemarks = [...remarks];
        newRemarks.splice(index, 1);
        setRemarks(newRemarks);
    };

    const [submitted, setSubmitted] = useState(false);
    const [hasExistingSale, setHasExistingSale] = useState(false);

    // Load products and check for existing sale
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                // 1. Fetch Products
                const productRes = await api.get(`/products/group/${group.id}`);
                const productsData = productRes.data;
                setProducts(productsData);

                // 2. Check for existing sale today (DB Source of Truth)
                try {
                    const saleRes = await api.get(`/sales/today/${group.id}`);
                    if (saleRes.data) {
                        const saleData = saleRes.data;
                        setHasExistingSale(true);

                        // Populate Cash and Remarks
                        setCashReceived(saleData.cash_received || '');

                        // Populate Remarks
                        if (saleData.remarks && Array.isArray(saleData.remarks)) {
                            setRemarks(saleData.remarks.map(r => ({
                                comment: r.comment,
                                amount: r.amount
                            })));
                        }

                        // Map items
                        const loadedItems = saleData.sale_items.map(item => {
                            // Find full product details
                            const product = productsData.find(p => p.id === item.product_id);
                            if (!product) return null;

                            return {
                                product: product,
                                request_type_qty: item.request_type_qty,
                                request_piece_qty: item.request_piece_qty,
                                return_type_qty: item.return_type_qty,
                                return_piece_qty: item.return_piece_qty,
                                sold_type_qty: item.sold_type_qty,
                                sold_piece_qty: item.sold_piece_qty,
                                price: item.price
                            };
                        }).filter(Boolean);

                        setSaleItems(loadedItems);

                        // Clear local storage if DB exists (it takes precedence)
                        const dateStr = new Date().toISOString().split('T')[0];
                        localStorage.removeItem(`goods_cart_${group.id}_${dateStr}`);


                        // Determine Locked/Submitted State
                        // Guest: If exists -> Locked (Submitted=true) locally
                        // Admin: If exists -> Locked ONLY if db says is_locked=1
                        const role = sessionStorage.getItem('role');
                        if (role !== 'admin') {
                            setSubmitted(true);
                        } else {
                            // Check DB lock status
                            if (saleData.is_locked === 1 || saleData.is_locked === true) {
                                setSubmitted(true);
                            } else {
                                setSubmitted(false);
                            }
                        }
                    }
                } catch (err) {
                    if (err.response && err.response.status === 404) {
                        // 3. No DB Sale -> Load from LocalStorage (Draft)
                        const dateStr = new Date().toISOString().split('T')[0];
                        const savedData = localStorage.getItem(`goods_cart_${group.id}_${dateStr}`);

                        if (savedData) {
                            try {
                                const parsed = JSON.parse(savedData);
                                if (parsed) {
                                    setCashReceived(parsed.cashReceived || '');
                                    setRemarks(parsed.remarks || []);

                                    // Rehydrate items with fresh product data
                                    if (parsed.items && Array.isArray(parsed.items)) {
                                        const hydratedItems = parsed.items.map(item => {
                                            const product = productsData.find(p => p.id === item.product.id);
                                            if (!product) return null;
                                            // Use fresh product but saved quantities & price
                                            return {
                                                ...item,
                                                product: product
                                            };
                                        }).filter(Boolean);
                                        setSaleItems(hydratedItems);
                                    }
                                }
                            } catch (e) {
                                console.error("Failed to parse local cart", e);
                            }
                        }
                    } else {
                        console.error("Error checking existing sale", err);
                    }
                }

            } catch (error) {
                console.error("Failed to fetch initial data", error);
            }
        };
        fetchInitialData();
    }, [group]);

    // Save to LocalStorage on Change (Auto-Save Draft)
    useEffect(() => {
        if (submitted || hasExistingSale) return; // Don't overwrite if submitted or editing DB record

        const dateStr = new Date().toISOString().split('T')[0];
        const key = `goods_cart_${group.id}_${dateStr}`;

        const dataToSave = {
            cashReceived,
            remarks,
            items: saleItems.map(item => ({
                ...item,
                product: { id: item.product.id } // Minimal product data to save space, we rehydrate anyway
            }))
        };

        if (saleItems.length > 0 || cashReceived || remarks.length > 0) {
            localStorage.setItem(key, JSON.stringify(dataToSave));
        }
    }, [saleItems, cashReceived, remarks, submitted, hasExistingSale, group]);

    const [addedProductId, setAddedProductId] = useState(null);

    const addToCart = (product) => {
        // Allow admin to add even if sale exists (updating)
        // Block only if currently in "submitted" state (just saved) or if Guest
        if (submitted) return;

        // Check if already in cart
        if (saleItems.find(item => item.product.id === product.id)) {
            alert("Product already in sales list");
            return;
        }

        // Trigger animation
        setAddedProductId(product.id);
        setTimeout(() => setAddedProductId(null), 400);

        setSaleItems([...saleItems, {
            product: product,
            request_type_qty: 0,
            request_piece_qty: 0,
            return_type_qty: 0,
            return_piece_qty: 0,
            sold_type_qty: 0,
            sold_piece_qty: 0,
            price: 0
        }]);
    };

    const removeFromCart = (index) => {
        if (submitted) return;
        const newItems = [...saleItems];
        newItems.splice(index, 1);
        setSaleItems(newItems);
    };

    const [errorInput, setErrorInput] = useState(null); // { index, field }

    const updateItem = (index, field, value) => {
        if (submitted) return;

        const newItems = [...saleItems];
        const item = newItems[index];
        const p = item.product;
        const piecesPerQty = p.pieces_per_quantity || 1;

        // Calculate potential new state
        const potentialItem = { ...item, [field]: parseInt(value) || 0 };

        // Validation: Check if Request > Stock
        const reqTotalPieces = (potentialItem.request_type_qty * piecesPerQty) + potentialItem.request_piece_qty;
        const stockTotalPieces = (p.quantity_value * piecesPerQty) + p.pieces_quantity;

        if (reqTotalPieces > stockTotalPieces) {
            // Trigger visual error
            setErrorInput({ index, field });
            setTimeout(() => setErrorInput(null), 500); // Clear after 500ms
            return; // Do not update state (Input rejected)
        }

        // Validation: Check if Return > Request
        const retTotalPieces = (potentialItem.return_type_qty * piecesPerQty) + potentialItem.return_piece_qty;

        // We need to compare against the *potential* request if we are editing request, 
        // OR against the *current* request if we are editing return.
        // potentiallyItem has the *new* value for the field being edited.

        // However, if we are editing 'request', we should also check if it becomes LESS than 'return'.
        // Wait, if I decrease request, return might become invalid. 
        // But the user asked "return product can't be selected more than request".
        // So effectively: Return <= Request.

        const currentReqTotal = (potentialItem.request_type_qty * piecesPerQty) + potentialItem.request_piece_qty;

        if (retTotalPieces > currentReqTotal) {
            // Trigger visual error
            setErrorInput({ index, field });
            setTimeout(() => setErrorInput(null), 500);
            return;
        }

        const newItem = potentialItem;

        // Calculate Sold & Price Logic
        // Logic: Request - Return = Sold
        const reqTotal = (newItem.request_type_qty * piecesPerQty) + newItem.request_piece_qty;
        const retTotal = (newItem.return_type_qty * piecesPerQty) + newItem.return_piece_qty;

        let soldTotal = reqTotal - retTotal;
        if (soldTotal < 0) soldTotal = 0;

        newItem.sold_type_qty = Math.floor(soldTotal / piecesPerQty);
        newItem.sold_piece_qty = soldTotal % piecesPerQty;

        // Calculate Price
        // Sold Type * Sell Price Type + Sold Piece * Sell Price Piece
        newItem.price = (newItem.sold_type_qty * p.sell_price_per_type) + (newItem.sold_piece_qty * p.sell_price_per_piece);

        newItems[index] = newItem;
        setSaleItems(newItems);
    };

    // Financial calculations
    const totalAmount = saleItems.reduce((sum, item) => sum + item.price, 0);
    const remarksTotal = remarks.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
    const due = totalAmount - (parseFloat(cashReceived) || 0) - remarksTotal;
    const commission = due; // User logic says Commission is remaining Due... ok.

    const handleSave = async () => {
        if (submitted) return;

        try {
            const role = sessionStorage.getItem('role');
            const status = role === 'admin' ? 'completed' : 'pending';

            const localDate = new Date();
            const year = localDate.getFullYear();
            const month = String(localDate.getMonth() + 1).padStart(2, '0');
            const day = String(localDate.getDate()).padStart(2, '0');
            const formattedDate = `${year}-${month}-${day}`;

            const payload = {
                group_id: group.id,
                date: formattedDate,
                cash_received: parseFloat(cashReceived) || 0,
                status: status,
                sale_items: saleItems.map(item => ({
                    product_id: item.product.id,
                    request_type_qty: item.request_type_qty,
                    request_piece_qty: item.request_piece_qty,
                    return_type_qty: item.return_type_qty,
                    return_piece_qty: item.return_piece_qty
                })),
                remarks: remarks
            };

            const response = await api.post('/sales/today', payload);

            // If Admin, lock the sale to finalize and subtract stock
            if (role === 'admin' && response.data.id) {
                await api.post(`/sales/${response.data.id}/lock`);
            }

            alert(role !== 'admin' ? "Sale Requested Successfully!" : "Sale Saved Successfully!");

            // Clear local storage on success
            const dateStr = new Date().toISOString().split('T')[0];
            localStorage.removeItem(`goods_cart_${group.id}_${dateStr}`);

            // Update state to disable inputs and button
            setSubmitted(true);

        } catch (error) {
            console.error("Save failed", error);
            const errorMessage = error.response?.data?.detail || "Failed to save sale. Please check your network or try again.";
            alert(errorMessage);
        }
    };

    // Filter available products
    const filteredStock = products.filter(p => {
        const weight = `${p.weight_value || ''}${p.weight_type || ''}`;
        const combined = `${p.name} ${weight}`;
        return (p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            combined.toLowerCase().includes(searchTerm.toLowerCase())) && p.quantity_value > 0;
    });

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Col: Stock Selection */}
            <div className={`lg:col-span-1 space-y-4 ${submitted ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <h3 className="font-bold text-slate-800 dark:text-white mb-3">Available Stock</h3>
                    <div className="mb-3">
                        <SearchableInput
                            value={searchTerm}
                            onChange={setSearchTerm}
                            items={products}
                            placeholder="Search..."
                        />
                    </div>

                    <div className="max-h-[600px] overflow-y-auto space-y-2 relative">
                        {filteredStock.map(product => {
                            const isAdded = addedProductId === product.id;
                            return (
                                <div
                                    key={product.id}
                                    className={`p-3 border rounded-lg flex justify-between items-center group relative overflow-hidden transition-all duration-300 ${isAdded
                                            ? 'border-green-400 dark:border-green-600 shadow-sm shadow-green-200 dark:shadow-green-900/50 scale-[1.01]'
                                            : 'border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                                        }`}
                                >
                                    {/* Sliding green background */}
                                    {isAdded && (
                                        <div className="absolute inset-0 bg-green-100 dark:bg-green-900/40 animate-in slide-in-from-left duration-300" />
                                    )}

                                    <div className="relative z-10 flex justify-between items-center w-full">
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
                                            onClick={() => addToCart(product)}
                                            className={`p-1.5 rounded-md transition-all ${isAdded
                                                    ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                                                    : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 opacity-0 group-hover:opacity-100'
                                                }`}
                                        >
                                            <Plus className={`w-4 h-4 ${isAdded ? 'rotate-90 transition-transform duration-300' : ''}`} />
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* Right Col: Today's Sale Table */}
            <div className="lg:col-span-2 space-y-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-xl text-slate-800 dark:text-white">Sales Cart</h3>
                        <div className="text-sm text-slate-500 dark:text-slate-400">{new Date().toLocaleDateString()}</div>
                    </div>

                    <div className={`overflow-x-auto ${submitted ? 'opacity-70 pointer-events-none' : ''}`}>
                        <table className="w-full text-left border-collapse text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300">
                                <tr>
                                    <th className="p-2">Product</th>
                                    <th className="p-2 w-24">Request</th>
                                    <th className="p-2 w-24">Return</th>
                                    <th className="p-2">Sold</th>
                                    <th className="p-2 text-right">Price</th>
                                    {sessionStorage.getItem('role') === 'admin' && (
                                        <th className="p-2 text-right">Profit</th>
                                    )}
                                    <th className="p-2"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {saleItems.map((item, idx) => {
                                    // Calculate Profit
                                    const buyPriceType = item.product.buy_price_avg * item.product.pieces_per_quantity;
                                    const buyPricePiece = item.product.buy_price_avg;
                                    const cost = (item.sold_type_qty * buyPriceType) + (item.sold_piece_qty * buyPricePiece);
                                    const profit = item.price - cost;

                                    return (
                                        <tr key={item.product.id}>
                                            <td className="p-2">
                                                <div className="font-semibold text-slate-900 dark:text-slate-100">{item.product.name}</div>
                                                {item.product.weight_value && (
                                                    <div className="text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                                        ({item.product.weight_value} {item.product.weight_type})
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-2">
                                                <div className="flex flex-col space-y-1">
                                                    <input
                                                        type="number"
                                                        placeholder={item.product.quantity_type}
                                                        className={`w-16 border rounded px-1 py-0.5 text-slate-900 dark:text-white bg-white dark:bg-slate-700 focus:ring-2 focus:ring-indigo-500 transition-colors duration-200 ${errorInput?.index === idx && errorInput?.field === 'request_type_qty'
                                                            ? 'border-red-500 ring-2 ring-red-500 bg-red-50'
                                                            : 'border-slate-300 dark:border-slate-600'
                                                            }`}
                                                        value={item.request_type_qty || ''}
                                                        onChange={(e) => updateItem(idx, 'request_type_qty', e.target.value)}
                                                        disabled={submitted}
                                                    />
                                                    <input
                                                        type="number"
                                                        placeholder="pcs"
                                                        className={`w-16 border rounded px-1 py-0.5 text-slate-900 dark:text-white bg-white dark:bg-slate-700 focus:ring-2 focus:ring-indigo-500 transition-colors duration-200 ${errorInput?.index === idx && errorInput?.field === 'request_piece_qty'
                                                            ? 'border-red-500 ring-2 ring-red-500 bg-red-50'
                                                            : 'border-slate-300 dark:border-slate-600'
                                                            }`}
                                                        value={item.request_piece_qty || ''}
                                                        onChange={(e) => updateItem(idx, 'request_piece_qty', e.target.value)}
                                                        disabled={submitted}
                                                    />
                                                </div>
                                            </td>
                                            <td className="p-2">
                                                <div className="flex flex-col space-y-1">
                                                    <input
                                                        type="number"
                                                        placeholder={item.product.quantity_type}
                                                        className={`w-16 border rounded px-1 py-0.5 text-red-600 dark:text-red-400 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-red-500 disabled:bg-slate-100 disabled:text-gray-400 transition-colors duration-200 ${errorInput?.index === idx && errorInput?.field === 'return_type_qty'
                                                            ? 'border-red-600 ring-2 ring-red-600 bg-red-100' // Darker red for emphasis
                                                            : 'border-red-200 dark:border-red-900/50'
                                                            }`}
                                                        value={item.return_type_qty || ''}
                                                        onChange={(e) => updateItem(idx, 'return_type_qty', e.target.value)}
                                                        disabled={submitted || role !== 'admin'}
                                                        title={role !== 'admin' ? "Only Admin can enter returns" : ""}
                                                    />
                                                    <input
                                                        type="number"
                                                        placeholder="pcs"
                                                        className={`w-16 border rounded px-1 py-0.5 text-red-600 dark:text-red-400 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-red-500 disabled:bg-slate-100 disabled:text-gray-400 transition-colors duration-200 ${errorInput?.index === idx && errorInput?.field === 'return_piece_qty'
                                                            ? 'border-red-600 ring-2 ring-red-600 bg-red-100'
                                                            : 'border-red-200 dark:border-red-900/50'
                                                            }`}
                                                        value={item.return_piece_qty || ''}
                                                        onChange={(e) => updateItem(idx, 'return_piece_qty', e.target.value)}
                                                        disabled={submitted || role !== 'admin'}
                                                        title={role !== 'admin' ? "Only Admin can enter returns" : ""}
                                                    />
                                                </div>
                                            </td>
                                            <td className="p-2 font-semibold text-slate-700 dark:text-slate-300">
                                                {item.sold_type_qty} {item.product.quantity_type && item.product.quantity_type[0]} {item.sold_piece_qty}pc
                                            </td>
                                            <td className="p-2 text-right font-bold text-indigo-600 dark:text-indigo-400">
                                                {item.price.toFixed(2)}
                                            </td>
                                            {sessionStorage.getItem('role') === 'admin' && (
                                                <td className={`p-2 text-right font-bold ${profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                                                    {profit.toFixed(2)}
                                                </td>
                                            )}
                                            <td className="p-2 text-right">
                                                <button
                                                    onClick={() => removeFromCart(idx)}
                                                    className="text-red-400 hover:text-red-600 transition-colors"
                                                    disabled={submitted}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Financial Summary */}
                    <div className="mt-8 space-y-3 border-t border-slate-100 dark:border-slate-700 pt-4 max-w-sm ml-auto">
                        <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                            <span>Money to Receive</span>
                            <span className="font-bold text-lg text-slate-900 dark:text-white">{totalAmount.toFixed(2)}</span>
                        </div>
                        <div className={`flex justify-between items-center ${submitted ? 'opacity-70 pointer-events-none' : ''}`}>
                            <span className="text-slate-600 dark:text-slate-400">Cash Received</span>
                            <input
                                type="number"
                                className="w-32 border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-right font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-700 focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-500"
                                value={cashReceived}
                                onChange={(e) => setCashReceived(e.target.value)}
                                disabled={submitted || sessionStorage.getItem('role') !== 'admin'}
                                placeholder={sessionStorage.getItem('role') !== 'admin' ? "Admin Only" : ""}
                            />
                        </div>
                        <div className="flex justify-between items-center text-slate-800 dark:text-white font-bold border-t border-slate-300 dark:border-slate-600 pt-2">
                            <span>Due</span>
                            <span className={due > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}>{due.toFixed(2)}</span>
                        </div>

                        {/* Remarks Section */}
                        {/* Remarks Section */}
                        <div className={`pt-2 ${submitted ? 'opacity-70 pointer-events-none' : ''}`}>
                            {sessionStorage.getItem('role') === 'admin' && (
                                <button
                                    onClick={() => setIsRemarkModalOpen(true)}
                                    className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline flex items-center"
                                >
                                    <Plus className="w-3 h-3 mr-1" /> Add Remarks (Expense)
                                </button>
                            )}

                            {remarks.length > 0 && (
                                <ul className="mt-2 space-y-1">
                                    {remarks.map((rem, idx) => (
                                        <li key={idx} className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50 p-1 rounded">
                                            <span>{rem.comment}</span>
                                            <div className="flex items-center space-x-2">
                                                <span className="font-semibold text-red-500 dark:text-red-400">-{rem.amount.toFixed(2)}</span>
                                                {sessionStorage.getItem('role') === 'admin' && (
                                                    <button onClick={() => removeRemark(idx)} className="text-slate-400 hover:text-red-500">
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <div className="flex justify-between items-center bg-slate-100 dark:bg-slate-700 p-2 rounded text-slate-900 dark:text-white font-bold">
                            <span>SR Commission</span>
                            <span>{commission.toFixed(2)}</span>
                        </div>

                        <div className="flex flex-col gap-3 mt-4">
                            <button
                                onClick={handleSave}
                                disabled={submitted}
                                className={`w-full text-white py-3 rounded-xl font-bold flex justify-center items-center space-x-2 transition-all duration-300 ${submitted
                                    ? 'bg-green-600 cursor-not-allowed opacity-100'
                                    : sessionStorage.getItem('role') !== 'admin'
                                        ? 'bg-indigo-600 hover:bg-indigo-700'
                                        : 'bg-indigo-600 hover:bg-indigo-700'
                                    }`}
                            >
                                {submitted ? (
                                    <>
                                        <span>{sessionStorage.getItem('role') !== 'admin' ? "Requested Successfully!" : "Saved Successfully!"}</span>
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4" />
                                        <span>{sessionStorage.getItem('role') !== 'admin' ? 'Request Sale' : 'Save Sale'}</span>
                                    </>
                                )}
                            </button>

                            {(submitted || hasExistingSale) && sessionStorage.getItem('role') === 'admin' && (
                                <button
                                    onClick={() => {
                                        // Navigate to Profit Calculator with today's date
                                        const dateStr = new Date().toISOString().split('T')[0];
                                        window.location.href = `/profit?date=${dateStr}`;
                                    }}
                                    className="w-full bg-slate-800 hover:bg-slate-900 text-white py-3 rounded-xl font-bold flex justify-center items-center space-x-2 transition-all duration-300 animate-in fade-in slide-in-from-bottom-2"
                                >
                                    <DollarSign className="w-4 h-4" />
                                    <span>Profit Calculator</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
                {/* Add Remark Modal */}
                {isRemarkModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-white dark:bg-slate-800 rounded-xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Add Remark / Expense</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
                                    <input
                                        type="text"
                                        className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none"
                                        placeholder="e.g. Lunch Cost"
                                        value={remarkComment}
                                        onChange={(e) => setRemarkComment(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Amount</label>
                                    <input
                                        type="number"
                                        className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none"
                                        placeholder="0.00"
                                        value={remarkAmount}
                                        onChange={(e) => setRemarkAmount(e.target.value)}
                                    />
                                </div>
                                <div className="flex justify-end space-x-3 pt-2">
                                    <button
                                        onClick={() => setIsRemarkModalOpen(false)}
                                        className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleAddRemark}
                                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
                                    >
                                        Add
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SalesInterface;
