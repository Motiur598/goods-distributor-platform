import React, { useState, useEffect } from 'react';
import { Calendar, TrendingUp, Filter } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import api from '../api';
import GroupList from '../components/stock/GroupList';

const Reports = () => {
    const [viewMode, setViewMode] = useState('monthly'); // 'monthly' or 'yearly' or 'daily_logs'
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [reportData, setReportData] = useState([]);

    useEffect(() => {
        if (selectedGroup) {
            fetchReportData();
        }
    }, [selectedGroup, selectedDate, viewMode]);

    const [monthlyTarget, setMonthlyTarget] = useState(null);
    const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
    const [targetInput, setTargetInput] = useState('');

    useEffect(() => {
        if (selectedGroup) {
            fetchReportData();
            if (viewMode === 'monthly') {
                fetchMonthlyTarget();
            }
        }
    }, [selectedGroup, selectedDate, viewMode]);

    const [selectedSale, setSelectedSale] = useState(null);

    const fetchMonthlyTarget = async () => {
        try {
            const monthStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`;
            const response = await api.get(`/reports/target/${selectedGroup.id}/${monthStr}`);
            setMonthlyTarget(response.data);
            setTargetInput(response.data.target_amount.toString());
        } catch (error) {
            console.error("Failed to fetch monthly target", error);
            setMonthlyTarget(null);
        }
    };

    const handleUpdateTarget = async (e) => {
        e.preventDefault();
        try {
            const monthStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`;
            const response = await api.post('/reports/target', {
                group_id: selectedGroup.id,
                month: monthStr,
                target_amount: parseFloat(targetInput)
            });
            setMonthlyTarget(response.data);
            setIsTargetModalOpen(false);
        } catch (error) {
            console.error("Failed to update target", error);
        }
    };

    const fetchReportData = async () => {
        try {
            let response;
            if (viewMode === 'monthly') {
                const month = selectedDate.getMonth() + 1;
                const year = selectedDate.getFullYear();
                response = await api.get(`/reports/monthly/${selectedGroup.id}`, {
                    params: { month, year }
                });
            } else {
                const year = selectedDate.getFullYear();
                response = await api.get(`/reports/yearly/${selectedGroup.id}`, {
                    params: { year }
                });
            }
            setReportData(response.data);
        } catch (error) {
            console.error("Failed to fetch report data", error);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            weekday: 'long'
        }); // 10/02/2026 Tuesday
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <header className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">Sales Reports</h2>
                    <p className="text-slate-500">Analyze performance over time.</p>
                </div>
                <div className="flex space-x-2 bg-white dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                    <button
                        onClick={() => setViewMode('monthly')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'monthly' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
                    >
                        Monthly
                    </button>
                    <button
                        onClick={() => setViewMode('yearly')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'yearly' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
                    >
                        Yearly
                    </button>
                </div>
            </header>

            {!selectedGroup ? (
                <>
                    <p className="text-slate-500 dark:text-slate-400 mb-4">Select a group to view detailed reports.</p>
                    <GroupList onSelectGroup={setSelectedGroup} showAddButton={false} />
                </>
            ) : (
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center space-x-4">
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white">{selectedGroup.name} - {viewMode === 'monthly' ? 'Monthly Report' : 'Yearly Overview'}</h3>
                            <button onClick={() => setSelectedGroup(null)} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">Change Group</button>
                        </div>
                        <div className="flex items-center space-x-2">
                            <span className="text-sm text-slate-500 dark:text-slate-400">Filter Date:</span>
                            <div className="border border-slate-300 dark:border-slate-600 rounded px-2 py-1 bg-white dark:bg-slate-700">
                                <DatePicker
                                    selected={selectedDate}
                                    onChange={(date) => setSelectedDate(date)}
                                    dateFormat={viewMode === 'monthly' ? "MM/yyyy" : "yyyy"}
                                    showMonthYearPicker={viewMode === 'monthly'}
                                    showYearPicker={viewMode === 'yearly'}
                                    className="bg-transparent dark:text-white outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Monthly Target Section */}
                    {viewMode === 'monthly' && (
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm animate-in fade-in slide-in-from-top-4 mb-6">
                            <div className="flex justify-between items-end mb-2">
                                <div>
                                    <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400">Monthly Target</h4>
                                    <div className="flex items-baseline space-x-2 mt-1">
                                        <span className="text-2xl font-bold text-slate-800 dark:text-white">
                                            {reportData?.total_sales?.toLocaleString() || 0}
                                        </span>
                                        <span className="text-sm text-slate-400">
                                            / {monthlyTarget?.target_amount?.toLocaleString() || 'Set Target'} tk
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsTargetModalOpen(true)}
                                    className="text-sm text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
                                >
                                    {monthlyTarget?.target_amount ? 'Edit Target' : 'Set Target'}
                                </button>
                            </div>

                            {/* Progress Bar */}
                            <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                                <div
                                    className="bg-gradient-to-r from-indigo-500 to-purple-500 h-3 rounded-full transition-all duration-1000 ease-out"
                                    style={{
                                        width: monthlyTarget?.target_amount ? `${Math.min(((reportData?.total_sales || 0) / monthlyTarget.target_amount) * 100, 100)}%` : '0%'
                                    }}
                                ></div>
                            </div>
                            <div className="flex justify-between mt-1 text-xs text-slate-400">
                                <span>0%</span>
                                <span>
                                    {monthlyTarget?.target_amount
                                        ? `${Math.round(((reportData?.total_sales || 0) / monthlyTarget.target_amount) * 100)}% Achieved`
                                        : '0% Achieved'}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Report Content */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2">
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm h-96">
                                <div className="h-full w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={
                                                viewMode === 'monthly'
                                                    ? (reportData?.sales || []).map(s => ({
                                                        name: new Date(s.date).getDate(), // Day of month
                                                        amount: s.total_amount,
                                                        fullDate: formatDate(s.date)
                                                    }))
                                                    : (Array.isArray(reportData) ? reportData : []).map(m => ({
                                                        name: new Date(0, m.month - 1).toLocaleString('default', { month: 'short' }),
                                                        amount: m.total
                                                    }))
                                            }
                                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                        >
                                            <defs>
                                                <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.8} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" strokeOpacity={0.1} vertical={false} />
                                            <XAxis
                                                dataKey="name"
                                                tick={{ fill: '#94a3b8', fontSize: 12 }}
                                                axisLine={false}
                                                tickLine={false}
                                                dy={10}
                                            />
                                            <YAxis
                                                tick={{ fill: '#94a3b8', fontSize: 12 }}
                                                axisLine={false}
                                                tickLine={false}
                                                tickFormatter={(value) => `${value / 1000}k`}
                                            />
                                            <Tooltip
                                                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                                content={({ active, payload, label }) => {
                                                    if (active && payload && payload.length) {
                                                        return (
                                                            <div className="bg-white dark:bg-slate-800 p-4 border border-slate-100 dark:border-slate-700 shadow-2xl rounded-xl">
                                                                <p className="font-medium text-slate-500 dark:text-slate-400 text-xs mb-1">
                                                                    {payload[0].payload.fullDate || label}
                                                                </p>
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                                                                    <p className="text-indigo-600 dark:text-indigo-400 font-bold text-lg">
                                                                        {payload[0].value.toLocaleString()} <span className="text-xs font-normal text-slate-400">tk</span>
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                }}
                                            />
                                            <Bar
                                                dataKey="amount"
                                                fill="url(#colorAmount)"
                                                radius={[6, 6, 0, 0]}
                                                barSize={40}
                                                animationDuration={1000}
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                        <div className="lg:col-span-1">
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm h-full max-h-96 overflow-y-auto">
                                <h4 className="font-bold text-slate-700 dark:text-slate-200 mb-4">Breakdown</h4>
                                {/* List of sales or months */}
                                <ul className="space-y-3">
                                    {Array.isArray(reportData?.sales) && reportData.sales.map((sale) => (
                                        <li
                                            key={sale.id}
                                            onClick={() => setSelectedSale(sale)}
                                            className="flex justify-between items-center text-sm p-3 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-indigo-100 dark:hover:border-indigo-800"
                                        >
                                            <span className="text-slate-600 dark:text-slate-300">{formatDate(sale.date)}</span>
                                            <span className="font-bold text-indigo-600 dark:text-indigo-400">Total sell {sale.total_amount?.toLocaleString() || 0} tk</span>
                                        </li>
                                    ))}
                                    {/* Monthly summary for yearly view */}
                                    {Array.isArray(reportData) && !reportData.sales && reportData.map((item, idx) => (
                                        <li key={idx} className="flex justify-between items-center text-sm p-3 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg">
                                            <span className="text-slate-600 dark:text-slate-300 font-medium">
                                                {new Date(0, item.month - 1).toLocaleString('default', { month: 'long' })}
                                            </span>
                                            <span className="font-bold text-indigo-600 dark:text-indigo-400">
                                                {item.total?.toLocaleString()} tk
                                            </span>
                                        </li>
                                    ))}
                                    {((!reportData.sales && !Array.isArray(reportData)) || (Array.isArray(reportData.sales) && reportData.sales.length === 0)) && (
                                        <li className="text-sm text-slate-400 text-center py-4">No data found.</li>
                                    )}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Sale Detail Modal */}
            {selectedSale && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setSelectedSale(null)}>
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800 dark:text-white">Sales Cart</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">{formatDate(selectedSale.date)}</p>
                            </div>
                            <button onClick={() => setSelectedSale(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                X
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            <table className="w-full text-left border-collapse text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300">
                                    <tr>
                                        <th className="p-2">Product</th>
                                        <th className="p-2">Request</th>
                                        <th className="p-2">Return</th>
                                        <th className="p-2">Sold</th>
                                        <th className="p-2 text-right">Price</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {selectedSale.sale_items.map((item) => (
                                        <tr key={item.id}>
                                            <td className="p-2 font-semibold text-slate-900 dark:text-slate-100">
                                                {item.product ? item.product.name : 'Unknown Product'}
                                                {item.product && item.product.weight_value && (
                                                    <span className="ml-1 text-slate-500 dark:text-slate-400 text-xs font-normal">
                                                        ({item.product.weight_value}{item.product.weight_type})
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-2 text-slate-600 dark:text-slate-400">
                                                {item.request_type_qty} {item.product?.quantity_type} {item.request_piece_qty} pcs
                                            </td>
                                            <td className="p-2 text-red-500 dark:text-red-400">
                                                {item.return_type_qty} {item.product?.quantity_type} {item.return_piece_qty} pcs
                                            </td>
                                            <td className="p-2 font-semibold text-slate-700 dark:text-slate-300">
                                                {item.sold_type_qty} {item.product?.quantity_type && item.product.quantity_type[0]} {item.sold_piece_qty}pc
                                            </td>
                                            <td className="p-2 text-right font-bold text-indigo-600 dark:text-indigo-400">
                                                {item.price.toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="border-t-2 border-slate-100 dark:border-slate-700">
                                    <tr>
                                        <td colSpan="4" className="p-3 text-right font-bold text-slate-600 dark:text-slate-400">Total Valid Sold</td>
                                        <td className="p-3 text-right font-bold text-lg text-indigo-600 dark:text-indigo-400">{selectedSale.total_amount.toFixed(2)}</td>
                                    </tr>
                                    <tr>
                                        <td colSpan="4" className="p-2 text-right text-slate-500">Cash Received</td>
                                        <td className="p-2 text-right font-semibold text-slate-800 dark:text-white">{selectedSale.cash_received.toFixed(2)}</td>
                                    </tr>
                                    <tr>
                                        <td colSpan="4" className="p-2 text-right text-slate-500">Commission/Due</td>
                                        <td className="p-2 text-right font-bold text-green-600 dark:text-green-400">{selectedSale.commission.toFixed(2)}</td>
                                    </tr>
                                </tfoot>
                            </table>

                            {selectedSale.remarks && selectedSale.remarks.length > 0 && (
                                <div className="mt-6">
                                    <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-2">Remarks / Expenses</h4>
                                    <ul className="space-y-2">
                                        {selectedSale.remarks.map((remark, idx) => (
                                            <li key={idx} className="flex justify-between items-center bg-slate-50 dark:bg-slate-700/50 p-2 rounded text-sm">
                                                <span className="text-slate-600 dark:text-slate-300">{remark.comment}</span>
                                                <span className="font-semibold text-red-500 dark:text-red-400">-{remark.amount.toFixed(2)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-end">
                            <button
                                onClick={() => setSelectedSale(null)}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Target Edit Modal */}
            {isTargetModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4">Set Monthly Sales Target</h3>
                        <form onSubmit={handleUpdateTarget}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Target Amount (TK)</label>
                                <input
                                    type="number"
                                    value={targetInput}
                                    onChange={(e) => setTargetInput(e.target.value)}
                                    className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="Enter target amount"
                                    required
                                    min="0"
                                />
                            </div>
                            <div className="flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setIsTargetModalOpen(false)}
                                    className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
                                >
                                    Save Target
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Reports;
