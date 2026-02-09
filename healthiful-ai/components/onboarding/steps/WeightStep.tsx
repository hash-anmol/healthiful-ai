import React from 'react';
import { ArcGauge } from './ArcGauge';

interface WeightStepProps {
  data: { weight: string };
  updateData: (data: Partial<{ weight: string }>) => void;
}

export const WeightStep: React.FC<WeightStepProps> = ({ data, updateData }) => {
  const weight = data.weight || '';

  return (
    <div className="flex flex-col justify-center items-center">
      <ArcGauge
        value={weight || '--'}
        label={weight ? 'kg' : 'Enter Weight'}
        caption="Tap below to adjust"
        activePercent={28}
      />
      <input
        type="number"
        value={weight}
        onChange={(e) => updateData({ weight: e.target.value })}
        placeholder="e.g. 70"
        className="w-full max-w-xs text-center text-3xl font-bold bg-[var(--surface)] border border-[var(--border)] rounded-2xl py-4"
      />
    </div>
  );
};
