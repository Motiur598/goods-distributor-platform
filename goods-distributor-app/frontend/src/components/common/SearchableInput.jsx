import React, { useState, useRef, useEffect } from 'react';
import { Search } from 'lucide-react';

const SearchableInput = ({
    value,
    onChange,
    items = [],
    placeholder = "Search...",
    className = ""
}) => {
    const [showSuggestions, setShowSuggestions] = useState(false);
    const wrapperRef = useRef(null);

    // Filter items based on query (case-insensitive)
    const suggestions = value ? items.filter(item => {
        const nameMatch = item.name.toLowerCase().includes(value.toLowerCase());
        const weightString = `${item.weight_value || ''}${item.weight_type || ''}`;
        const combined = `${item.name} ${weightString}`;
        return nameMatch || combined.toLowerCase().includes(value.toLowerCase());
    }) : [];

    // Handle clicking outside to close
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const handleSelect = (item) => {
        // Trigger change with just name for now, as that's what parent expects for filtering list
        onChange(item.name);
        setShowSuggestions(false);
    };

    return (
        <div ref={wrapperRef} className={`relative ${className}`}>
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
                type="text"
                placeholder={placeholder}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                value={value}
                onChange={(e) => {
                    onChange(e.target.value);
                    setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
            />

            {/* Suggestions Dropdown */}
            {showSuggestions && value && suggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {suggestions.map((item, index) => (
                        <div
                            key={index}
                            className="px-4 py-2 hover:bg-slate-50 cursor-pointer text-sm text-slate-700 transition-colors flex justify-between items-center border-b border-slate-50 last:border-0"
                            onClick={() => handleSelect(item)}
                        >
                            <span className="font-medium text-slate-800">{item.name}</span>
                            {item.weight_value && (
                                <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full ml-3 whitespace-nowrap">
                                    {item.weight_value} {item.weight_type}
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SearchableInput;
