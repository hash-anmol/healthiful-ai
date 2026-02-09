import React from 'react';
import { OptionCards } from './OptionCards';

interface SexStepProps {
  data: { sex: string };
  updateData: (data: Partial<{ sex: string }>) => void;
}

export const SexStep: React.FC<SexStepProps> = ({ data, updateData }) => {
  return (
    <OptionCards
      value={data.sex}
      onChange={(value) => updateData({ sex: value })}
      options={[
        { id: 'male', label: 'Male', description: 'Standard male physiology' },
        { id: 'female', label: 'Female', description: 'Standard female physiology' },
        { id: 'non_binary', label: 'Non-binary', description: 'Personalized recommendations' },
        { id: 'prefer_not', label: 'Prefer not to say', description: 'We will generalize recommendations' },
      ]}
    />
  );
};
