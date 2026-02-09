import React from 'react';
import { OptionCards } from './OptionCards';

interface GoalAggressivenessStepProps {
  data: { goalAggressiveness: string };
  updateData: (data: Partial<{ goalAggressiveness: string }>) => void;
}

export const GoalAggressivenessStep: React.FC<GoalAggressivenessStepProps> = ({ data, updateData }) => {
  return (
    <OptionCards
      value={data.goalAggressiveness}
      onChange={(value) => updateData({ goalAggressiveness: value })}
      options={[
        { id: 'conservative', label: 'Conservative', description: 'Slow, steady progress with extra recovery.' },
        { id: 'balanced', label: 'Balanced', description: 'Sustainable pace with moderate intensity.' },
        { id: 'aggressive', label: 'Aggressive', description: 'Push harder for faster results.' },
      ]}
    />
  );
};
