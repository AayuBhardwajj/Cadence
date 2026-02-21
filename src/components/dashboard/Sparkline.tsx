import React from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

export const Sparkline: React.FC<{ data: number[]; color?: string }> = ({
    data,
    color = "#3b82f6"
}) => {
    const chartData = data.map((val, i) => ({ val, i }));

    return (
        <div className="h-8 w-24">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <LineChart data={chartData}>
                    <Line
                        type="monotone"
                        dataKey="val"
                        stroke={color}
                        strokeWidth={2}
                        dot={false}
                        animationDuration={1500}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};
