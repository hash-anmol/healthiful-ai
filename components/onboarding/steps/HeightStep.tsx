import React from 'react';
import { ArcGauge } from './ArcGauge';

interface HeightStepProps {
  data: { height: string };
  updateData: (data: Partial<{ height: string }>) => void;
}

export const HeightStep: React.FC<HeightStepProps> = ({ data, updateData }) => {
  const height = data.height || '';

  return (
    <div className="flex flex-col justify-center items-center">
      <ArcGauge
        value={height || '--'}
        label={height ? 'cm' : 'Enter Height'}
        caption="Tap below to adjust"
        activePercent={32}
      />
      <input
        type="number"
        value={height}
        onChange={(e) => updateData({ height: e.target.value })}
        placeholder="e.g. 175"
        className="w-full max-w-xs text-center text-3xl font-bold bg-[var(--surface)] border border-[var(--border)] rounded-2xl py-4"
      />
    </div>
  );
};
