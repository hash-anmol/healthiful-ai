import React from 'react';
import { OptionCards } from './OptionCards';

interface RecoveryCapacityStepProps {
  data: { recoveryCapacity: string };
  updateData: (data: Partial<{ recoveryCapacity: string }>) => void;
}

export const RecoveryCapacityStep: React.FC<RecoveryCapacityStepProps> = ({ data, updateData }) => {
  return (
    <OptionCards
      value={data.recoveryCapacity}
      onChange={(value) => updateData({ recoveryCapacity: value })}
      options={[
        { id: 'low', label: 'Low', description: 'Need more rest between sessions.' },
        { id: 'moderate', label: 'Moderate', description: 'Average recovery pace.' },
        { id: 'high', label: 'High', description: 'Recover quickly, can train often.' },
      ]}
    />
  );
};
