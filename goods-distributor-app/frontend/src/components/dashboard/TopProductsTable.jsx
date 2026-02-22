import React, { useState, useEffect } from 'react';
import api from '../../api';

const TopProductsTable = () => {
    const [products, setProducts] = useState([]);

    useEffect(() => {
        const fetchTopProducts = async () => {
            try {
                const response = await api.get('/reports/dashboard/top-products');
                setProducts(response.data);
            } catch (error) {
                console.error("Failed to fetch top products", error);
            }
        };
        fetchTopProducts();
    }, []);

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Frequently Selling Products (Top 5)</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700">
                            <th className="py-3 px-2 font-medium text-sm">Group Name</th>
                            <th className="py-3 px-2 font-medium text-sm">Product Name</th>
                            <th className="py-3 px-2 font-medium text-sm text-right">Sold Quantity</th>
                        </tr>
                    </thead>
                    <tbody>
                        {products.map((product, index) => (
                            <tr key={index} className="border-b border-slate-50 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                <td className="py-3 px-2 text-slate-600 dark:text-slate-300 text-sm">{product.group}</td>
                                <td className="py-3 px-2 text-slate-800 dark:text-white font-medium text-sm">{product.name}</td>
                                <td className="py-3 px-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm text-right">{product.sold}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TopProductsTable;
