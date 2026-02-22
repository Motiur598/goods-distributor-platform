import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const ThemeToggle = () => {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className="p-2 rounded-lg transition-all duration-300 ease-in-out hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400"
            title="Toggle Theme"
        >
            {theme === 'dark' ? (
                <Sun className="w-5 h-5 text-amber-400 animate-in spin-in-90 duration-300" />
            ) : (
                <Moon className="w-5 h-5 text-indigo-600 animate-in spin-in-(-90) duration-300" />
            )}
        </button>
    );
};

export default ThemeToggle;
