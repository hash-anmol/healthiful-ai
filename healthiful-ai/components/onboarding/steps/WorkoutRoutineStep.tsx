import React from 'react';
import { OptionCards } from './OptionCards';

interface WorkoutRoutineStepProps {
  data: { workoutRoutine: string };
  updateData: (data: Partial<{ workoutRoutine: string }>) => void;
}

export const WorkoutRoutineStep: React.FC<WorkoutRoutineStepProps> = ({ data, updateData }) => {
  return (
    <OptionCards
      value={data.workoutRoutine}
      onChange={(value) => updateData({ workoutRoutine: value })}
      options={[
        { id: 'ppl', label: 'Push-Pull-Legs', description: 'Splits training by movement pattern. Great for frequency and recovery.' },
        { id: 'bro_split', label: 'Bro Split', description: 'One muscle group per day. High volume and deep isolation focus.' },
        { id: 'upper_lower', label: 'Upper / Lower', description: 'Alternates upper and lower body. Balanced for strength and mass.' },
        { id: 'full_body', label: 'Full Body', description: 'Every muscle trained each session. Efficient for low weekly frequency.' },
        { id: 'arnold_split', label: 'Arnold Split', description: 'Chest/Back, Shoulders/Arms, Legs. High volume for aesthetic focus.' },
      ]}
    />
  );
};
