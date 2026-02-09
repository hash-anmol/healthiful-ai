import React from 'react';
import { ArcGauge } from './ArcGauge';

interface AgeStepProps {
  data: { age: string };
  updateData: (data: Partial<{ age: string }>) => void;
}

export const AgeStep: React.FC<AgeStepProps> = ({ data, updateData }) => {
  const age = data.age || '';
  const ageNum = parseInt(age);
  
  // Dynamic percentage: 0 to 100 years
  const activePercent = isNaN(ageNum) ? 0 : Math.min(Math.max((ageNum / 100) * 100, 0), 100);

  return (
    <div className="flex flex-col items-center w-full max-w-sm mx-auto">
      <ArcGauge
        value={age || '--'}
        label={age ? 'Years' : 'Enter Age'}
        caption="Tap below to adjust"
        activePercent={activePercent}
      />
      <div className="w-full px-6 -mt-4">
        <input
          type="number"
          value={age}
          onChange={(e) => {
            const val = e.target.value.slice(0, 3);
            updateData({ age: val });
          }}
          placeholder="0"
          className="w-full text-center text-4xl font-black bg-white border-2 border-[var(--border)] focus:border-[var(--primary)] focus:ring-4 focus:ring-orange-100 rounded-3xl py-6 transition-all outline-none shadow-sm"
        />
      </div>
    </div>
  );
};
