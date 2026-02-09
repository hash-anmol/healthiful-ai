import React from 'react';
import { OptionCards } from './OptionCards';

interface TrainingFrequencyStepProps {
  data: { trainingFrequency: string };
  updateData: (data: Partial<{ trainingFrequency: string }>) => void;
}

export const TrainingFrequencyStep: React.FC<TrainingFrequencyStepProps> = ({ data, updateData }) => {
  return (
    <OptionCards
      value={data.trainingFrequency}
      onChange={(value) => updateData({ trainingFrequency: value })}
      options={[
        { id: '1_2', label: '1-2 days/week', description: 'Light weekly training schedule.' },
        { id: '3_4', label: '3-4 days/week', description: 'Balanced training frequency.' },
        { id: '5_6', label: '5-6 days/week', description: 'High frequency training.' },
        { id: 'daily', label: 'Daily', description: 'Train nearly every day.' },
      ]}
    />
  );
};
