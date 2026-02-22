import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import GroupList from '../components/stock/GroupList';
import SalesInterface from '../components/sales/SalesInterface';
import { ArrowLeft } from 'lucide-react';
import api from '../api';

const Sales = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const groupId = searchParams.get('groupId');
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [loadingGroup, setLoadingGroup] = useState(false);

    // Initial Load based on URL
    useEffect(() => {
        const fetchGroup = async () => {
            if (groupId) {
                setLoadingGroup(true);
                try {
                    const res = await api.get(`/groups`); // We might need a specific endpoint or just find it from list
                    // Optimization: Better to have /groups/{id} endpoint, but finding from list is okay for now if list is small.
                    // Or since we don't have get-group-by-id easily exposed in frontend api calls yet without looking at backend...
                    // Let's assume we can fetch all and find. 
                    // Actually, let's just fetch the specific group if we can, or filtering.
                    // Looking at backend execution might be needed if /groups/{id} doesn't exist.
                    // Assuming /groups returns all, we find one.
                    const groups = res.data;
                    const group = groups.find(g => g.id === parseInt(groupId));
                    if (group) {
                        setSelectedGroup(group);
                    }
                } catch (err) {
                    console.error("Failed to load group from URL", err);
                } finally {
                    setLoadingGroup(false);
                }
            } else {
                setSelectedGroup(null);
            }
        };

        fetchGroup();
    }, [groupId]);

    const handleSelectGroup = (group) => {
        setSearchParams({ groupId: group.id });
        setSelectedGroup(group);
    };

    const handleBack = () => {
        setSearchParams({});
        setSelectedGroup(null);
    };

    if (loadingGroup) {
        return <div className="p-10 text-center">Loading Group...</div>;
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {!selectedGroup ? (
                <>
                    <div className="mb-6">
                        <h2 className="text-2xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">Today's Sale</h2>
                        <p className="text-slate-500">Select a group to process sales.</p>
                    </div>
                    <GroupList onSelectGroup={handleSelectGroup} showAddButton={false} />
                </>
            ) : (
                <div className="space-y-4">
                    <button
                        onClick={handleBack}
                        className="flex items-center space-x-2 text-slate-500 hover:text-slate-800 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back to Groups</span>
                    </button>
                    <SalesInterface group={selectedGroup} />
                </div>
            )}
        </div>
    );
};

export default Sales;
