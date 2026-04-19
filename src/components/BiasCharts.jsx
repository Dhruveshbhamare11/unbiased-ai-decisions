import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, ReferenceLine
} from 'recharts';

// Custom Tooltip for better aesthetics
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-surface-dark border border-white/10 text-xs p-3 rounded-xl shadow-neo backdrop-blur-md">
        <p className="font-bold text-white mb-2">{label}</p>
        {payload.map((entry, index) => (
          <p key={`item-${index}`} style={{ color: entry.color }} className="font-medium flex justify-between gap-4">
            <span>{entry.name}:</span> <span>{entry.value}%</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export const GenderOutcomeChart = ({ data }) => {
  const chartData = Object.keys(data).map(key => ({
    name: key,
    Hired: data[key].hired,
    'Not Hired': data[key].not_hired
  }));

  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis dataKey="name" tick={{fill: '#94a3b8', fontSize: 13, fontWeight: 'bold'}} axisLine={false} tickLine={false} />
          <YAxis tick={{fill: '#94a3b8', fontSize: 13}} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} cursor={{fill: '#ffffff05'}} />
          <Legend wrapperStyle={{fontSize: '12px', paddingTop: '10px', color: '#f8fafc', fontWeight: 'bold'}} />
          <Bar dataKey="Hired" fill="#06b6d4" radius={[4, 4, 0, 0]} maxBarSize={50} />
          <Bar dataKey="Not Hired" fill="#334155" radius={[4, 4, 0, 0]} maxBarSize={50} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export const AgeOutcomeChart = ({ data }) => {
  const chartData = Object.keys(data).map(key => ({
    name: key,
    Hired: data[key].hired,
    'Not Hired': data[key].not_hired
  }));

  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis dataKey="name" tick={{fill: '#94a3b8', fontSize: 13, fontWeight: 'bold'}} axisLine={false} tickLine={false} />
          <YAxis tick={{fill: '#94a3b8', fontSize: 13}} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} cursor={{fill: '#ffffff05'}} />
          <Legend wrapperStyle={{fontSize: '12px', paddingTop: '10px', color: '#f8fafc', fontWeight: 'bold'}} />
          <Bar dataKey="Hired" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={50} />
          <Bar dataKey="Not Hired" fill="#334155" radius={[4, 4, 0, 0]} maxBarSize={50} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export const MetricsThresholdChart = ({ metrics }) => {
  const chartData = [
    { name: 'Demo Parity', value: metrics.demographic_parity, threshold: 0.1, isRatio: false },
    { name: 'Equal Opp', value: metrics.equal_opportunity, threshold: 0.1, isRatio: false },
    { name: 'Disp Impact', value: metrics.disparate_impact, threshold: 0.8, isRatio: true }
  ];

  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
          <XAxis type="number" tick={{fill: '#94a3b8', fontSize: 12}} axisLine={false} tickLine={false} />
          <YAxis dataKey="name" type="category" tick={{fill: '#f8fafc', fontSize: 12, fontWeight: 'bold'}} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} cursor={{fill: '#ffffff05'}} />
          <Bar dataKey="value" maxBarSize={30} radius={[0, 4, 4, 0]}>
            {chartData.map((entry, index) => {
              const pass = entry.isRatio 
                ? entry.value >= entry.threshold 
                : entry.value <= entry.threshold;
              return <Cell key={`cell-${index}`} fill={pass ? '#10b981' : '#ef4444'} />;
            })}
          </Bar>
          <ReferenceLine x={0.1} stroke="#f59e0b" strokeDasharray="3 3" opacity={0.5} />
          <ReferenceLine x={0.8} stroke="#f59e0b" strokeDasharray="3 3" opacity={0.5} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export const FairnessBreakdownChart = ({ score }) => {
  const data = [
    { name: 'Fairness Score', value: score },
    { name: 'Penalty', value: 100 - score }
  ];
  const COLORS = ['#06b6d4', '#ef4444']; // cyan and red

  return (
    <div className="h-[220px] w-full flex justify-center items-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            fill="#8884d8"
            paddingAngle={5}
            stroke="none"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend verticalAlign="bottom" height={36} wrapperStyle={{fontSize: '12px', fontWeight: 'bold', color: '#f8fafc'}} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
