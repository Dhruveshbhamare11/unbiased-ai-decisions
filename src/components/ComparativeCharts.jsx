import React from 'react';
import {
 BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Cell
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
 if (active && payload && payload.length) {
 return (
 <div className="bg-surface-dark border border-white/10 text-xs p-3 rounded-xl shadow-neo backdrop-blur-md">
 <p className="font-bold text-white mb-2">{label}</p>
 {payload.map((entry, index) => (
 <p key={`item-${index}`} style={{ color: entry.color }} className="font-medium flex justify-between gap-4">
 <span>{entry.name}:</span> <span>{Number(entry.value).toFixed(2)}</span>
 </p>
 ))}
 </div>
 );
 }
 return null;
};

export const ComparativeMetricsChart = ({ origMetrics, debMetrics }) => {
 const data = [
 { name: 'Demo Parity', Biased: origMetrics.demographic_parity, Debiased: debMetrics.demographic_parity },
 { name: 'Disp Impact', Biased: origMetrics.disparate_impact, Debiased: debMetrics.disparate_impact },
 { name: 'Equal Opp', Biased: origMetrics.equal_opportunity, Debiased: debMetrics.equal_opportunity },
 { name: 'Equal Odds', Biased: origMetrics.equalized_odds_difference, Debiased: debMetrics.equalized_odds_difference },
 { name: 'Pred Parity', Biased: origMetrics.predictive_parity, Debiased: debMetrics.predictive_parity },
 { name: 'Avg Odds', Biased: origMetrics.average_odds_difference, Debiased: debMetrics.average_odds_difference },
 ];

 return (
 <div className="h-[300px] w-full">
 <ResponsiveContainer width="100%"height="100%">
 <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
 <CartesianGrid strokeDasharray="3 3"stroke="#334155"vertical={false} />
 <XAxis dataKey="name"tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
 <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
 <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff05' }} />
 <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px', color: '#f8fafc', fontWeight: 'bold' }} />
 <Bar dataKey="Biased"fill="#ef4444"radius={[4, 4, 0, 0]} maxBarSize={40} />
 <Bar dataKey="Debiased"fill="#10b981"radius={[4, 4, 0, 0]} maxBarSize={40} />
 
 <ReferenceLine y={0.10} stroke="#f59e0b"strokeDasharray="4 3"opacity={0.7} />
 <ReferenceLine y={0.80} stroke="#06b6d4"strokeDasharray="4 3"opacity={0.7} />
 </BarChart>
 </ResponsiveContainer>
 </div>
 );
};

export const ComparativeApprovalChart = ({ origStats, debStats }) => {
 const data = [
 { name: 'Male (Original)', Approval: origStats.maleOrig },
 { name: 'Male (Debiased)', Approval: debStats.maleDeb },
 { name: 'Female (Original)', Approval: origStats.femaleOrig },
 { name: 'Female (Debiased)', Approval: debStats.femaleDeb },
 ];

 return (
 <div className="h-[300px] w-full">
 <ResponsiveContainer width="100%"height="100%">
 <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
 <CartesianGrid strokeDasharray="3 3"stroke="#334155"vertical={false} />
 <XAxis dataKey="name"tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
 <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 1]} />
 <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff05' }} />
 <Bar dataKey="Approval"radius={[4, 4, 0, 0]} maxBarSize={50}>
 {
 data.map((entry, index) => (
 <Cell key={`cell-${index}`} fill={entry.name.includes('Original') ? '#ef4444' : '#10b981'} />
 ))
 }
 </Bar>
 </BarChart>
 </ResponsiveContainer>
 </div>
 );
};
