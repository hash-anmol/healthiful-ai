import React from 'react';
import { OptionCards } from './OptionCards';

interface PrimaryGoalStepProps {
  data: { primaryGoal: string };
  updateData: (data: Partial<{ primaryGoal: string }>) => void;
}

export const PrimaryGoalStep: React.FC<PrimaryGoalStepProps> = ({ data, updateData }) => {
  return (
    <OptionCards
      value={data.primaryGoal}
      onChange={(value) => updateData({ primaryGoal: value })}
      options={[
        { id: 'build_muscle', label: 'Build Muscle', description: 'Increase lean mass and strength.' },
        { id: 'lose_fat', label: 'Lose Fat', description: 'Reduce body fat while preserving muscle.' },
        { id: 'improve_fitness', label: 'Improve Fitness', description: 'Better stamina and conditioning.' },
        { id: 'athletic', label: 'Athletic Performance', description: 'Explosiveness, agility, and speed.' },
      ]}
    />
  );
};
