import React from 'react';
import { cn } from '../../lib/utils';

const DashboardCard = ({ title, value, icon: Icon, color, secondaryText }) => {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</h3>
                    {value ? (
                        <p className="text-2xl font-bold mt-2 text-slate-800 dark:text-white">{value}</p>
                    ) : (
                        <p className="text-2xl font-bold mt-2 text-slate-300 dark:text-slate-600">---</p>
                    )}
                    {secondaryText && (
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{secondaryText}</p>
                    )}
                </div>
                <div className={cn("p-3 rounded-lg bg-opacity-10", color)}>
                    <Icon className={cn("w-6 h-6", color.replace('bg-', 'text-'))} />
                </div>
            </div>
        </div>
    );
};

export default DashboardCard;
