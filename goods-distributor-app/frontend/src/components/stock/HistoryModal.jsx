import React from 'react';
import { X, Calendar, Clock, Activity, Trash2, ShoppingCart, PlusCircle } from 'lucide-react';

const HistoryModal = ({ isOpen, onClose, groupName, historyLogs }) => {
    if (!isOpen) return null;

    // Helper to format date like "4/02/2026 on Wednesday"
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'numeric',
            year: 'numeric',
            weekday: 'long'
        }).replace(',', ' on');
        // "10/02/2026 on Tuesday"
    };

    const getActionIcon = (action) => {
        switch (action) {
            case 'Added': return <PlusCircle className="w-5 h-5 text-green-500" />;
            case 'Purchased/Returned': return <ShoppingCart className="w-5 h-5 text-orange-500" />; // Or return icon
            case 'Deleted': return <Trash2 className="w-5 h-5 text-red-500" />;
            default: return <Activity className="w-5 h-5 text-blue-500" />;
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-xl w-[700px] shadow-xl animate-in zoom-in-95 duration-200 max-h-[80vh] flex flex-col border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-700">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <Activity className="w-6 h-6 text-indigo-500" />
                            <span>Stock History - {groupName}</span>
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Track all stock movements and changes.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {historyLogs.length === 0 ? (
                        <div className="text-center py-10 text-slate-400 dark:text-slate-500">
                            No history records found for this group.
                        </div>
                    ) : (
                        historyLogs.map((log) => (
                            <div key={log.id} className="flex gap-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-colors">
                                <div className="mt-1">
                                    {getActionIcon(log.action)}
                                </div>
                                <div className="flex-1">
                                    <p className="text-slate-800 dark:text-slate-200 font-medium text-base">
                                        {log.description} at {formatDate(log.timestamp)}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 rounded-b-xl flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default HistoryModal;
