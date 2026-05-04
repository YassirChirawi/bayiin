import React from 'react';
import { ArrowUpRight, ArrowDownRight, TrendingUp, Users, Activity, Wallet } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const MetricCard = ({ title, value, trend, icon: Icon, color = "indigo", subtitle }) => {
  const isPositive = trend > 0;
  
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all">
      <div className="flex justify-between items-start">
        <div className={`p-3 rounded-2xl bg-${color}-50 text-${color}-600`}>
          <Icon className="w-6 h-6" />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${isPositive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
            {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(trend).toFixed(1)}%
          </div>
        )}
      </div>
      <div className="mt-4">
        <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-2xl font-black text-gray-900">{value}</span>
          {subtitle && <span className="text-xs text-gray-400">{subtitle}</span>}
        </div>
      </div>
    </div>
  );
};

export const PerformanceTrend = ({ data, title }) => (
  <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
    <div className="flex items-center justify-between mb-6">
      <h3 className="font-black text-gray-900 tracking-tight">{title}</h3>
      <div className="flex gap-2">
        <span className="px-2 py-1 rounded-lg bg-gray-50 text-[10px] font-bold text-gray-400 uppercase">30 Derniers Jours</span>
      </div>
    </div>
    <div className="h-[250px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorGmv" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.1}/>
              <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9CA3AF'}} />
          <YAxis hide />
          <Tooltip 
            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
            itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
          />
          <Area type="monotone" dataKey="value" stroke="#4F46E5" strokeWidth={3} fillOpacity={1} fill="url(#colorGmv)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  </div>
);

export const StoreActivityTable = ({ stores }) => (
  <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
    <table className="min-w-full divide-y divide-gray-100">
      <thead className="bg-gray-50/50">
        <tr>
          <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Boutique</th>
          <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Activité</th>
          <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Score</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-50">
        {stores.slice(0, 5).map((s, i) => (
          <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
            <td className="px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs">
                  {i + 1}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{s.name}</p>
                  <p className="text-[10px] text-gray-400">{s.plan === 'pro' ? '💎 Premium' : '🌱 Free'}</p>
                </div>
              </div>
            </td>
            <td className="px-6 py-4">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden min-w-[60px]">
                  <div 
                    className="h-full bg-indigo-500 rounded-full" 
                    style={{ width: `${Math.min(100, (s.products || 0) * 10)}%` }}
                  />
                </div>
                <span className="text-[10px] font-bold text-gray-500">{s.products || 0} prod.</span>
              </div>
            </td>
            <td className="px-6 py-4 text-right">
              <span className="text-sm font-black text-gray-900">
                {((s.products || 0) * 1.5 + (s.plan === 'pro' ? 20 : 0)).toFixed(0)}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
