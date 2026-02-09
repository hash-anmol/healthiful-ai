import React from 'react';
import { OptionCards } from './OptionCards';
import { ArcGauge } from './ArcGauge';

interface TrainingExperienceStepProps {
  data: { trainingExperience: string };
  updateData: (data: Partial<{ trainingExperience: string }>) => void;
}

export const TrainingExperienceStep: React.FC<TrainingExperienceStepProps> = ({ data, updateData }) => {
  const experienceMap: Record<string, { value: number; label: string; caption: string }>
    = {
      beginner: { value: 1, label: 'Beginner', caption: 'Just getting started' },
      intermediate: { value: 2, label: 'Intermediate', caption: 'Moderate intensity' },
      advanced: { value: 3, label: 'Advanced', caption: 'High training load' },
    };

  const selected = data.trainingExperience;
  const gauge = experienceMap[selected] || { value: '--', label: 'Select', caption: 'Choose your level' };

  return (
    <div className="space-y-6">
      <ArcGauge value={gauge.value} label={gauge.label} caption={gauge.caption} activePercent={45} />
      <OptionCards
        value={selected}
        onChange={(value) => updateData({ trainingExperience: value })}
        options={[
          { id: 'beginner', label: 'Beginner', description: '0-6 months of consistent training.' },
          { id: 'intermediate', label: 'Intermediate', description: '6-24 months of training.' },
          { id: 'advanced', label: 'Advanced', description: '2+ years of training experience.' },
        ]}
      />
    </div>
  );
};
