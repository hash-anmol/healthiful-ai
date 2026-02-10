import React from 'react';
import { OptionCards } from './OptionCards';

interface DietTypeStepProps {
  data: { dietType: string };
  updateData: (data: Partial<{ dietType: string }>) => void;
}

export const DietTypeStep: React.FC<DietTypeStepProps> = ({ data, updateData }) => {
  return (
    <OptionCards
      value={data.dietType}
      onChange={(value) => updateData({ dietType: value })}
      options={[
        { id: 'standard', label: 'Standard', description: 'Balanced diet with all foods.' },
        { id: 'vegetarian', label: 'Vegetarian', description: 'No meat or eggs, includes dairy.' },
        { id: 'vegan', label: 'Vegan', description: 'Plant-based only.' },
        { id: 'keto', label: 'Keto', description: 'High fat, low carb.' },
        { id: 'paleo', label: 'Paleo', description: 'Whole foods and lean proteins.' },
      ]}
    />
  );
}
