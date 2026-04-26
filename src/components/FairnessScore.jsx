import React, { useEffect, useState } from 'react';

const FairnessScore = ({ score }) => {
 const [animatedScore, setAnimatedScore] = useState(0);
 const radius = 60;
 const stroke = 12;
 const normalizedRadius = radius - stroke * 2;
 const circumference = normalizedRadius * 2 * Math.PI;
 const strokeDashoffset = circumference - (animatedScore / 100) * circumference;

 useEffect(() => {
 let current = 0;
 const interval = setInterval(() => {
 current += 1;
 if (current <= score) {
 setAnimatedScore(current);
 } else {
 clearInterval(interval);
 }
 }, 15);
 return () => clearInterval(interval);
 }, [score]);

 const getColor = (s) => {
 if (s >= 80) return '#22c55e'; // green-500
 if (s >= 50) return '#eab308'; // yellow-500
 return '#ef4444'; // red-500
 };

 return (
 <div className={`relative flex items-center justify-center`}>
 <svg
 height={radius * 2}
 width={radius * 2}
 className="-rotate-90"
 >
 {/* Background ring */}
 <circle
 stroke="#1e293b"
 fill="transparent"
 strokeWidth={stroke}
 r={normalizedRadius}
 cx={radius}
 cy={radius}
 />
 {/* Animated score ring */}
 <circle
 stroke={getColor(animatedScore)}
 fill="transparent"
 strokeWidth={stroke}
 strokeDasharray={circumference + ' ' + circumference}
 style={{ strokeDashoffset }}
 strokeLinecap="round"
 r={normalizedRadius}
 cx={radius}
 cy={radius}
 />
 </svg>
 <div className="absolute flex flex-col items-center justify-center">
 <span className="text-4xl font-black"style={{ color: getColor(animatedScore)}}>
 {animatedScore}
 </span>
 <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">/ 100</span>
 </div>
 </div>
 );
};

export default FairnessScore;
