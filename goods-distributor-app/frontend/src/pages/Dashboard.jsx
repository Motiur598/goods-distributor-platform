import React, { useState, useEffect } from 'react';
import {
    Calendar, TrendingUp, DollarSign, PieChart,
    Package, ShoppingCart, Calculator, AlertCircle
} from 'lucide-react';
import DashboardCard from '../components/dashboard/DashboardCard';
import SalesChart from '../components/dashboard/SalesChart';
import TopProductsTable from '../components/dashboard/TopProductsTable';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const Dashboard = () => {
    const navigate = useNavigate();

    const [metrics, setMetrics] = useState({
        totalSellYear: 0,
        totalSellMonth: 0,
        totalProfitYear: 0,
        profitMonth: 0,
        totalDue: 0
    });

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const response = await api.get('/reports/dashboard');
                setMetrics(response.data);
            } catch (error) {
                console.error("Failed to fetch dashboard metrics", error);
            }
        };
        fetchDashboardData();
    }, []);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <header>
                <h2 className="text-3xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">Overview</h2>
                <p className="text-slate-500">Welcome to your dashboard.</p>
            </header>

            {/* Top Row: Financial Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <DashboardCard
                    title="Total Sell This Year"
                    value={`$${metrics.totalSellYear.toLocaleString()}`}
                    icon={TrendingUp}
                    color="bg-indigo-100 text-indigo-600"
                />
                <DashboardCard
                    title="Total Sell This Month"
                    value={`$${metrics.totalSellMonth.toLocaleString()}`}
                    icon={Calendar}
                    color="bg-pink-100 text-pink-600"
                />
                <DashboardCard
                    title="Total Profit This Year"
                    value={`$${metrics.totalProfitYear.toLocaleString()}`}
                    icon={PieChart}
                    color="bg-emerald-100 text-emerald-600"
                />
                <DashboardCard
                    title="Profit This Month"
                    value={`$${metrics.profitMonth.toLocaleString()}`}
                    icon={DollarSign}
                    color="bg-orange-100 text-orange-600"
                />
            </div>

            {/* Second Row: Navigation / Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Stock - Navigation */}
                <div onClick={() => navigate('/stock')} className="cursor-pointer group">
                    <DashboardCard
                        title="Stock Management"
                        value=""
                        icon={Package}
                        color="bg-blue-100 text-blue-600"
                        secondaryText="Manage inventory & groups"
                    />
                </div>

                {/* Today's Sale - Navigation */}
                <div onClick={() => navigate('/sales/today')} className="cursor-pointer group">
                    <DashboardCard
                        title="Today's Sale"
                        value=""
                        icon={ShoppingCart}
                        color="bg-purple-100 text-purple-600"
                        secondaryText="Process daily transactions"
                    />
                </div>

                {/* Total Due - Metric */}
                <DashboardCard
                    title="Total Due"
                    value={`$${metrics.totalDue.toLocaleString()}`}
                    icon={AlertCircle}
                    color="bg-red-100 text-red-600"
                />

                {/* Profit Calculator - Navigation */}
                <div onClick={() => navigate('/profit')} className="cursor-pointer group">
                    <DashboardCard
                        title="Profit Calculator"
                        value=""
                        icon={Calculator}
                        color="bg-teal-100 text-teal-600"
                        secondaryText="Calculate daily profits"
                    />
                </div>
            </div>

            {/* Charts and Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <SalesChart />
                </div>
                <div className="lg:col-span-1">
                    <TopProductsTable />
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
