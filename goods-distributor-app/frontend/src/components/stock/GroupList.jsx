import React, { useState, useEffect } from 'react';
import { Plus, Package, ChevronRight, Trash2 } from 'lucide-react';
import api from '../../api';

const GroupList = ({ onSelectGroup, showAddButton = true }) => {
    const [groups, setGroups] = useState([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');

    useEffect(() => {
        fetchGroups();
    }, []);

    const fetchGroups = async () => {
        try {
            const response = await api.get('/groups');
            setGroups(response.data);
        } catch (error) {
            console.error("Failed to fetch groups", error);
        }
    };

    const deleteGroup = async (groupId) => {
        try {
            await api.delete(`/groups/${groupId}`);
            fetchGroups();
        } catch (error) {
            console.error("Failed to delete group", error);
            alert("Failed to delete group");
        }
    };

    const handleAddGroup = async () => {
        if (sessionStorage.getItem('role') !== 'admin') {
            alert("Only Admins can add groups.");
            return;
        }
        if (!newGroupName.trim()) return;
        try {
            await api.post('/groups', { name: newGroupName });
            setNewGroupName('');
            setIsAddModalOpen(false);
            fetchGroups();
        } catch (error) {
            alert('Failed to add group');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">Stock Management</h2>
                    <p className="text-slate-500">Select a group to manage inventory.</p>
                </div>

                {sessionStorage.getItem('role') === 'admin' && showAddButton && (
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                        <span>Add Group</span>
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groups.map((group) => (
                    <div
                        key={group.id}
                        className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-all group relative overflow-hidden"
                    >
                        <div
                            onClick={() => onSelectGroup(group)}
                            className="cursor-pointer"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/40 transition-colors">
                                    <Package className="w-6 h-6" />
                                </div>
                                <ChevronRight className="w-5 h-5 text-slate-400 dark:text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
                            </div>

                            <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-1">{group.name}</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Stock Value: <span className="font-semibold text-slate-900 dark:text-slate-200">${group.total_stock_value?.toLocaleString() || '0'}</span>
                            </p>
                        </div>

                        {sessionStorage.getItem('role') === 'admin' && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (window.confirm(`Are you sure you want to delete ${group.name}? This will remove all associated products!`)) {
                                        deleteGroup(group.id);
                                    }
                                }}
                                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                title="Delete Group"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {/* Simple Modal for Add Group */}
            {
                isAddModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl w-96 shadow-2xl animate-in zoom-in-95 duration-200 border border-transparent dark:border-slate-700">
                            <h3 className="text-lg font-bold mb-4 text-slate-900 dark:text-white">Add New Group</h3>
                            <input
                                type="text"
                                className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg p-2 mb-4 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white placeholder-slate-400"
                                placeholder="Group Name (e.g. Akij Group)"
                                value={newGroupName}
                                onChange={(e) => setNewGroupName(e.target.value)}
                            />
                            <div className="flex justify-end space-x-3">
                                <button
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAddGroup}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                                >
                                    Add Group
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default GroupList;
