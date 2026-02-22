import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import GroupList from '../components/stock/GroupList';
import ProductList from '../components/stock/ProductList';
import api from '../api';

const Stock = () => {
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
                    const res = await api.get(`/groups`);
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
        return <div className="p-10 text-center">Loading Stock Group...</div>;
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {!selectedGroup ? (
                <GroupList onSelectGroup={handleSelectGroup} />
            ) : (
                <ProductList
                    group={selectedGroup}
                    onBack={handleBack}
                />
            )}
        </div>
    );
};

export default Stock;
