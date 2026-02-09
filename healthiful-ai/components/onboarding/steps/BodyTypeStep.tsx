import React from 'react';
import { OptionCards } from './OptionCards';

interface BodyTypeStepProps {
  data: { bodyType: string };
  updateData: (data: Partial<{ bodyType: string }>) => void;
}

export const BodyTypeStep: React.FC<BodyTypeStepProps> = ({ data, updateData }) => {
  return (
    <OptionCards
      value={data.bodyType}
      onChange={(value) => updateData({ bodyType: value })}
      options={[
        { id: 'ectomorph', label: 'Ectomorph', description: 'Lean build, fast metabolism, finds it harder to gain muscle.' },
        { id: 'mesomorph', label: 'Mesomorph', description: 'Athletic, naturally muscular build, responds well to training.' },
        { id: 'endomorph', label: 'Endomorph', description: 'Broad build, naturally strong, prone to storing body fat.' },
      ]}
    />
  );
};
