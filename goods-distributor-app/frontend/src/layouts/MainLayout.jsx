import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { Menu } from 'lucide-react';

const MainLayout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    return (
        <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300 overflow-x-hidden">
            <Sidebar isOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
            <main className={`flex-1 ${isSidebarOpen ? 'ml-64' : 'ml-0'} p-8 transition-all duration-300 ease-in-out text-slate-900 dark:text-slate-100 min-w-0 relative`}>
                {!isSidebarOpen && (
                    <div className="mb-6 flex items-center">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors focus:outline-none shadow-sm"
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                    </div>
                )}
                <Outlet />
            </main>
        </div>
    );
};

export default MainLayout;
