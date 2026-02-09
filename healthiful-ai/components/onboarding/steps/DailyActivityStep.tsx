import React from 'react';
import { OptionCards } from './OptionCards';

interface DailyActivityStepProps {
  data: { dailyActivity: string };
  updateData: (data: Partial<{ dailyActivity: string }>) => void;
}

export const DailyActivityStep: React.FC<DailyActivityStepProps> = ({ data, updateData }) => {
  return (
    <OptionCards
      value={data.dailyActivity}
      onChange={(value) => updateData({ dailyActivity: value })}
      options={[
        { id: 'sedentary', label: 'Sedentary', description: 'Mostly sitting, low daily movement.' },
        { id: 'light', label: 'Lightly Active', description: 'Some walking or light activity.' },
        { id: 'moderate', label: 'Moderately Active', description: 'On your feet and moving often.' },
        { id: 'high', label: 'Highly Active', description: 'Physical work or frequent activity.' },
      ]}
    />
  );
};
