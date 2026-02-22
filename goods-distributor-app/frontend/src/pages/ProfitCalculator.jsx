import React, { useState, useEffect } from 'react';
import { Calendar, TrendingUp, DollarSign, Save } from 'lucide-react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import api from '../api';

const ProfitCalculator = () => {
    const [viewMode, setViewMode] = useState('daily'); // daily, monthly, yearly
    const [reportData, setReportData] = useState([]); // For table data in monthly/yearly views
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [profitData, setProfitData] = useState(null);
    const [expenseDescription, setExpenseDescription] = useState('');
    const [expenseAmount, setExpenseAmount] = useState('');

    const [lifetimeProfit, setLifetimeProfit] = useState(0);

    // Check for query param date and Role Access
    useEffect(() => {
        // Role Check
        if (sessionStorage.getItem('role') !== 'admin') {
            window.location.href = '/'; // Or show "Access Denied"
            return;
        }

        const queryParams = new URLSearchParams(window.location.search);
        const dateParam = queryParams.get('date');
        if (dateParam) {
            setSelectedDate(new Date(dateParam));
            setViewMode('daily');
        }

        fetchLifetimeProfit();
    }, []);

    useEffect(() => {
        if (selectedDate) {
            fetchData();
        }
    }, [selectedDate, viewMode]);

    const fetchLifetimeProfit = async () => {
        try {
            const response = await api.get('/reports/profit/lifetime');
            setLifetimeProfit(response.data.net_profit);
        } catch (error) {
            console.error("Failed to fetch lifetime profit", error);
        }
    };

    const fetchData = () => {
        if (viewMode === 'daily') {
            fetchDailyProfit(selectedDate);
        } else if (viewMode === 'monthly') {
            fetchMonthlyReport(selectedDate);
        } else if (viewMode === 'yearly') {
            fetchYearlyReport(selectedDate);
        }
        // Refresh lifetime on data change if needed, but for now specific period fetch is enough
        fetchLifetimeProfit();
    };

    const fetchDailyProfit = async (date) => {
        try {
            const formattedDate = date.toISOString().split('T')[0];
            const response = await api.get(`/reports/profit/daily/${formattedDate}`);
            setProfitData(response.data);
        } catch (error) {
            console.error("Failed to fetch daily profit", error);
            setProfitData({
                date: date.toISOString().split('T')[0],
                revenue: 0, cogs: 0, gross_profit: 0, expense: 0, net_profit: 0
            });
        }
    };

    const fetchMonthlyReport = async (date) => {
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        try {
            const response = await api.get(`/reports/profit/monthly/${year}/${month}`);
            setReportData(response.data);

            // Calculate totals for summary cards
            const totals = response.data.reduce((acc, curr) => ({
                revenue: acc.revenue + curr.revenue,
                cogs: acc.cogs + curr.cogs,
                gross_profit: acc.gross_profit + (curr.revenue - curr.cogs),
                expense: acc.expense + curr.expense,
                net_profit: acc.net_profit + curr.net_profit
            }), { revenue: 0, cogs: 0, gross_profit: 0, expense: 0, net_profit: 0 });
            setProfitData(totals);
        } catch (error) {
            console.error("Failed to fetch monthly report", error);
            setReportData([]);
            setProfitData({ revenue: 0, cogs: 0, gross_profit: 0, expense: 0, net_profit: 0 });
        }
    };

    const fetchYearlyReport = async (date) => {
        const year = date.getFullYear();
        try {
            const response = await api.get(`/reports/profit/yearly/${year}`);
            setReportData(response.data);

            const totals = response.data.reduce((acc, curr) => ({
                revenue: acc.revenue + curr.revenue,
                cogs: acc.cogs + curr.cogs,
                gross_profit: acc.gross_profit + (curr.revenue - curr.cogs),
                expense: acc.expense + curr.expense,
                net_profit: acc.net_profit + curr.net_profit
            }), { revenue: 0, cogs: 0, gross_profit: 0, expense: 0, net_profit: 0 });
            setProfitData(totals);
        } catch (error) {
            console.error("Failed to fetch yearly report", error);
            setReportData([]);
            setProfitData({ revenue: 0, cogs: 0, gross_profit: 0, expense: 0, net_profit: 0 });
        }
    };


    const handleAddExpense = async () => {
        if (!expenseAmount || !expenseDescription) return;
        try {
            const formattedDate = selectedDate.toISOString().split('T')[0];
            await api.post('/reports/expense', {
                description: expenseDescription,
                amount: parseFloat(expenseAmount),
                date: formattedDate
            });

            setExpenseDescription('');
            setExpenseAmount('');
            fetchData(); // Refresh current view
        } catch (error) {
            console.error("Failed to add expense", error);
        }
    };

    const renderSummaryCards = () => {
        if (!profitData) return null;
        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <div className="flex items-center space-x-3 mb-2">
                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                        <h3 className="text-sm font-medium text-slate-500">Total Lifetime Profit</h3>
                    </div>
                    <p className="text-2xl font-bold text-slate-800">${lifetimeProfit.toFixed(2)}</p>
                    <p className="text-xs text-slate-400 mt-1">All time net profit</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <div className="flex items-center space-x-3 mb-2">
                        <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                            <DollarSign className="w-5 h-5" />
                        </div>
                        <h3 className="text-sm font-medium text-slate-500">Gross Profit</h3>
                    </div>
                    <p className="text-2xl font-bold text-slate-800">${profitData.gross_profit.toFixed(2)}</p>
                    <p className="text-xs text-slate-400 mt-1">COGS: ${profitData.cogs.toFixed(2)}</p>
                </div>
                <div className="bg-indigo-600 p-6 rounded-xl shadow-lg text-white">
                    <div className="flex items-center space-x-3 mb-2">
                        <div className="p-2 bg-white/20 rounded-lg">
                            <DollarSign className="w-5 h-5" />
                        </div>
                        <h3 className="text-sm font-medium text-indigo-100">Net Profit</h3>
                    </div>
                    <p className="text-3xl font-bold">${profitData.net_profit.toFixed(2)}</p>
                    <p className="text-xs text-indigo-200 mt-1">Total Expenses: ${profitData.expense.toFixed(2)}</p>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">Profit Calculator</h2>
                    <p className="text-slate-500">Track revenue, costs, and expenses.</p>
                </div>

                <div className="flex items-center space-x-4">
                    {/* View Switcher */}
                    <div className="bg-white dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 flex">
                        {['daily', 'monthly', 'yearly'].map(mode => (
                            <button
                                key={mode}
                                onClick={() => setViewMode(mode)}
                                className={`px-4 py-1.5 text-sm font-medium rounded-md capitalize transition-colors ${viewMode === mode
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                                    }`}
                            >
                                {mode}
                            </button>
                        ))}
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                        <DatePicker
                            selected={selectedDate}
                            onChange={(date) => setSelectedDate(date)}
                            className="outline-none text-slate-700 dark:text-slate-200 font-medium bg-transparent w-32 text-center"
                            dateFormat={viewMode === 'monthly' ? "MM/yyyy" : viewMode === 'yearly' ? "yyyy" : "dd/MM/yyyy"}
                            showMonthYearPicker={viewMode === 'monthly'}
                            showYearPicker={viewMode === 'yearly'}
                        />
                    </div>
                </div>
            </header>

            {/* Summary Cards */}
            {renderSummaryCards()}

            {/* Daily View: Expense Entry */}
            {viewMode === 'daily' && (
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4">Add Daily Expense</h3>
                    <div className="flex flex-col md:flex-row gap-4 items-end mb-6">
                        <div className="flex-1 w-full">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
                            <input
                                type="text"
                                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none"
                                placeholder="e.g. Lunch, Transport"
                                value={expenseDescription}
                                onChange={(e) => setExpenseDescription(e.target.value)}
                            />
                        </div>
                        <div className="w-full md:w-48">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Amount</label>
                            <input
                                type="number"
                                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none"
                                placeholder="0.00"
                                value={expenseAmount}
                                onChange={(e) => setExpenseAmount(e.target.value)}
                            />
                        </div>
                        <button
                            onClick={handleAddExpense}
                            className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 w-full md:w-auto justify-center"
                        >
                            <Save className="w-4 h-4" />
                            <span>Add Expense</span>
                        </button>
                    </div>

                    {/* Expense List */}
                    {profitData?.expenses_list && profitData.expenses_list.length > 0 && (
                        <div className="mt-4 border-t border-slate-100 dark:border-slate-700 pt-4">
                            <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-3">Today's Expenses</h4>
                            <div className="space-y-2">
                                {profitData.expenses_list.map((expense, idx) => (
                                    <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-100 dark:border-slate-700">
                                        <span className="text-slate-700 dark:text-slate-300">{expense.description}</span>
                                        <span className="font-bold text-red-500 dark:text-red-400">-${expense.amount.toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Monthly/Yearly View: Data Table */}
            {viewMode !== 'daily' && reportData.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 border-b border-slate-100 dark:border-slate-700">
                            <tr>
                                <th className="p-4">{viewMode === 'monthly' ? 'Date' : 'Month'}</th>
                                <th className="p-4 text-right">Revenue</th>
                                <th className="p-4 text-right">COGS</th>
                                <th className="p-4 text-right">Expenses</th>
                                <th className="p-4 text-right">Net Profit</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {reportData.map((row, idx) => (
                                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                    <td className="p-4 font-medium text-slate-900 dark:text-white">
                                        {viewMode === 'monthly'
                                            ? new Date(row.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'numeric', year: 'numeric', weekday: 'long' })
                                            : new Date(0, row.month - 1).toLocaleString('default', { month: 'long' })}
                                    </td>
                                    <td className="p-4 text-right text-slate-600 dark:text-slate-300">${row.revenue.toFixed(2)}</td>
                                    <td className="p-4 text-right text-slate-500 dark:text-slate-400">${row.cogs.toFixed(2)}</td>
                                    <td className="p-4 text-right text-red-500 dark:text-red-400">-${row.expense.toFixed(2)}</td>
                                    <td className={`p-4 text-right font-bold ${row.net_profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                        {row.net_profit >= 0 ? '+' : ''}{row.net_profit.toFixed(2)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default ProfitCalculator;
