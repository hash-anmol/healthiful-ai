import React from 'react';
import { ArcGauge } from './ArcGauge';

interface StrengthTestStepProps {
  data: { strengthTest: { bicepCurlWeight: number; pushupsCount: number } };
  updateData: (data: Partial<{ strengthTest: { bicepCurlWeight: number; pushupsCount: number } }>) => void;
}

export const StrengthTestStep: React.FC<StrengthTestStepProps> = ({ data, updateData }) => {
  const strengthTest = data.strengthTest || { bicepCurlWeight: 0, pushupsCount: 0 };

  return (
    <div className="flex flex-col gap-8">
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold">Dumbbell Bicep Curls</h3>
          <p className="text-sm text-[var(--muted-foreground)]">Weight per dumbbell (KG)</p>
        </div>
        <div className="flex flex-col items-center">
          <ArcGauge 
            value={strengthTest.bicepCurlWeight || '--'} 
            label="KG" 
            activePercent={Math.min((strengthTest.bicepCurlWeight / 40) * 100, 100)} 
          />
          <input
            type="number"
            value={strengthTest.bicepCurlWeight || ''}
            onChange={(e) => updateData({ 
              strengthTest: { ...strengthTest, bicepCurlWeight: parseInt(e.target.value) || 0 } 
            })}
            placeholder="e.g. 15"
            className="w-full max-w-xs text-center text-3xl font-bold bg-white border border-gray-200 rounded-2xl py-4"
          />
        </div>
      </div>

      <div className="space-y-4 pt-8 border-t border-gray-100">
        <div className="text-center">
          <h3 className="text-lg font-semibold">Simultaneous Push-ups</h3>
          <p className="text-sm text-[var(--muted-foreground)]">Max reps in one set</p>
        </div>
        <div className="flex flex-col items-center">
          <ArcGauge 
            value={strengthTest.pushupsCount || '--'} 
            label="Reps" 
            activePercent={Math.min((strengthTest.pushupsCount / 60) * 100, 100)} 
          />
          <input
            type="number"
            value={strengthTest.pushupsCount || ''}
            onChange={(e) => updateData({ 
              strengthTest: { ...strengthTest, pushupsCount: parseInt(e.target.value) || 0 } 
            })}
            placeholder="e.g. 25"
            className="w-full max-w-xs text-center text-3xl font-bold bg-white border border-gray-200 rounded-2xl py-4"
          />
        </div>
      </div>
    </div>
  );
};
