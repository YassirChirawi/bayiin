import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { MapPin, AlertTriangle } from 'lucide-react';

export default function CityRevenueChart({ data, highReturnCities = [] }) {
    // Only show top 8 cities by revenue to avoid clutter
    const chartData = data ? data.slice(0, 8) : [];

    if (!chartData.length) {
        return (
            <div className="h-64 flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                <MapPin className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">No city data yet</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* High Return Alerts */}
            {highReturnCities.length > 0 && (
                <div className="mb-4 space-y-2">
                    {highReturnCities.slice(0, 2).map(city => (
                        <div key={city.name} className="flex items-center gap-2 text-xs text-red-700 bg-red-50 p-2 rounded-md border border-red-100">
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                            <span>
                                <strong>High Returns in {city.name}:</strong> {city.returnRate.toFixed(1)}% return rate!
                            </span>
                        </div>
                    ))}
                </div>
            )}

            <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={chartData}
                        margin={{ top: 5, right: 10, left: 10, bottom: 0 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis
                            dataKey="name"
                            tick={{ fontSize: 10 }}
                            interval={0}
                            height={40}
                            tickFormatter={(val) => val.slice(0, 6)} // Truncate long city names
                        />
                        <YAxis hide />
                        <Tooltip
                            cursor={{ fill: '#F3F4F6' }}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                            formatter={(value, name) => [
                                name === 'revenue'
                                    ? value.toLocaleString() + ' DH'
                                    : value.toFixed(1) + '%',
                                name === 'revenue' ? 'Revenue' : 'Return Rate'
                            ]}
                        />
                        <Bar yAxisId="left" dataKey="revenue" fill="#4F46E5" radius={[4, 4, 0, 0]} name="Revenue" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
