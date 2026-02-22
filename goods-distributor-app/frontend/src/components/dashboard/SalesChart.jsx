import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line, ComposedChart } from 'recharts';
import api from '../../api';

const SalesChart = () => {
    const [chartData, setChartData] = useState([]);

    useEffect(() => {
        const fetchChartData = async () => {
            try {
                const response = await api.get('/reports/dashboard/chart');
                setChartData(response.data);
            } catch (error) {
                console.error("Failed to fetch dashboard chart data", error);
            }
        };
        fetchChartData();
    }, []);

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 h-96">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Monthly Sales vs Target</h3>
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                    data={chartData}
                    margin={{
                        top: 20,
                        right: 20,
                        bottom: 20,
                        left: 20,
                    }}
                >
                    <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" vertical={false} strokeOpacity={0.5} />
                    <XAxis
                        dataKey="name"
                        stroke="#94a3b8"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        dy={10}
                    />
                    <YAxis
                        stroke="#94a3b8"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `${value / 1000}k`}
                    />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        itemStyle={{ color: '#1e293b' }}
                        formatter={(value) => value.toLocaleString()}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar dataKey="sales" barSize={20} fill="#6366f1" radius={[4, 4, 0, 0]} name="Actual Sales" />
                    <Line type="monotone" dataKey="target" stroke="#ec4899" strokeWidth={2} dot={{ r: 4, strokeWidth: 2 }} name="Target" />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
};

export default SalesChart;
