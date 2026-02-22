import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, BarChart2, TrendingUp, LogOut, Calculator, AlertCircle, Menu } from 'lucide-react';
import ThemeToggle from './common/ThemeToggle';
import { cn } from '../lib/utils';

const Sidebar = ({ isOpen, toggleSidebar }) => {
    const navigate = useNavigate();
    const handleLogout = () => {
        if (window.confirm("Are you sure you want to logout?")) {
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('role');
            sessionStorage.removeItem('username');
            navigate('/login');
        }
    };

    const navItems = [
        { path: '/', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/stock', label: 'Stock', icon: Package },
        { path: '/sales/today', label: 'Today\'s Sale', icon: ShoppingCart },
        { path: '/reports', label: 'Monthly/Yearly Sales', icon: TrendingUp },
        ...(sessionStorage.getItem('role') === 'admin' ? [
            { path: '/profit', label: 'Profit Calculator', icon: Calculator },
            { path: '/total-due', label: 'Total Due', icon: AlertCircle }
        ] : []),
    ];

    return (
        <div className={`w-64 bg-slate-900 dark:bg-slate-950 text-white h-screen fixed left-0 top-0 flex flex-col shadow-xl z-50 transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            {/* Header */}
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                    Goods Dist.
                </h1>
                <button
                    onClick={toggleSidebar}
                    className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none"
                >
                    <Menu className="w-5 h-5" />
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            cn(
                                "flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                                isActive
                                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 translate-x-1"
                                    : "text-slate-400 hover:bg-slate-800 hover:text-white hover:translate-x-1"
                            )
                        }
                    >
                        <item.icon className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
                        <span className="font-medium">{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            {/* Footer / Logout / Theme */}
            <div className="p-4 border-t border-slate-800 space-y-4">
                {/* Theme Toggle Section */}
                <div className="bg-slate-800/50 rounded-xl p-3 flex justify-between items-center backdrop-blur-sm border border-slate-800">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Theme Mode</span>
                    <ThemeToggle />
                </div>

                <div className="pt-2">
                    <button
                        onClick={handleLogout}
                        className="flex w-full items-center justify-center space-x-2 px-4 py-3 text-slate-400 hover:bg-red-500/10 hover:text-red-400 rounded-xl transition-all duration-200 group border border-transparent hover:border-red-500/20"
                    >
                        <LogOut className="w-5 h-5 group-hover:rotate-180 transition-transform duration-300" />
                        <span className="font-medium">Logout</span>
                    </button>
                    <div className="mt-4 text-center text-[10px] text-slate-600 dark:text-slate-500">
                        &copy; 2026 Goods Distributor
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
