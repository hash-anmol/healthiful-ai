import React from 'react';
import { OptionCards } from './OptionCards';

interface EquipmentAccessStepProps {
  data: { equipmentAccess: string };
  updateData: (data: Partial<{ equipmentAccess: string }>) => void;
}

export const EquipmentAccessStep: React.FC<EquipmentAccessStepProps> = ({ data, updateData }) => {
  return (
    <OptionCards
      value={data.equipmentAccess}
      onChange={(value) => updateData({ equipmentAccess: value })}
      options={[
        { id: 'none', label: 'No Equipment', description: 'Bodyweight only.' },
        { id: 'minimal', label: 'Minimal', description: 'Bands, dumbbells, or kettlebells.' },
        { id: 'home_gym', label: 'Home Gym', description: 'Bench, barbell, plates.' },
        { id: 'full_gym', label: 'Full Gym', description: 'Complete gym access.' },
      ]}
    />
  );
};
