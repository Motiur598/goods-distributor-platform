import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, ArrowRight, Eye, EyeOff } from 'lucide-react';
import api from '../api';

const LoginPage = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const formData = new URLSearchParams();
            formData.append('username', username);
            formData.append('password', password);

            const response = await api.post('/auth/login', formData);

            const { access_token, role } = response.data;

            // Store token
            sessionStorage.setItem('token', access_token);
            sessionStorage.setItem('role', role);
            sessionStorage.setItem('username', username);

            // Redirect based on role (or just to dashboard for now)
            navigate('/');
        } catch (err) {
            console.error("Login Error", err);
            if (err.response) {
                // Server responded with a status code outside 2xx range
                setError(`Login Failed: ${err.response.status} - ${err.response.data.detail || err.message}`);
            } else if (err.request) {
                // Request was made but no response was received
                setError('Network Error: No response from server. Ensure backend is running.');
            } else {
                // Something happened in setting up the request
                setError(`Error: ${err.message}`);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="p-8 bg-indigo-600 text-center">
                    <h1 className="text-3xl font-bold text-white mb-2">Good Luck Enterprise</h1>
                    <p className="text-indigo-100">Distributor Management System</p>
                </div>

                <div className="p-8">
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <User className="h-5 w-5 text-slate-400" />
                                </div>
                                <input
                                    type="text"
                                    className="pl-10 block w-full border border-slate-300 rounded-lg py-3 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                                    placeholder="Enter username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-slate-400" />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    className="pl-10 pr-10 block w-full border border-slate-300 rounded-lg py-3 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                                    placeholder="Enter password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-5 w-5 text-slate-400 hover:text-indigo-600 cursor-pointer" />
                                    ) : (
                                        <Eye className="h-5 w-5 text-slate-400 hover:text-indigo-600 cursor-pointer" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-70"
                        >
                            {loading ? 'Signing in...' : 'Sign In'}
                            {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                        </button>
                    </form>

                    <div className="mt-6 text-center text-xs text-slate-400">
                        <p>Restricted Access System</p>
                        <p>&copy; 2026 Good Luck Enterprise</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
