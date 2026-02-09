import React from 'react';
import { cn } from '@/lib/utils';

interface AdditionalObjectivesStepProps {
  data: { additionalObjectives: string[] };
  updateData: (data: Partial<{ additionalObjectives: string[] }>) => void;
}

const OBJECTIVES = [
  { id: 'abs', label: 'Build Abs Fast', description: 'Priority on core definition and fat loss.' },
  { id: 'biceps', label: 'Bicep Peak', description: 'Extra focus on arm volume and isolation.' },
  { id: 'bulk', label: 'More Bulked Physique', description: 'Maximize overall size and mass.' },
  { id: 'v_taper', label: 'V-Taper Look', description: 'Wider shoulders and a smaller waist.' },
  { id: 'legs', label: 'Leg Thickness', description: 'Heavier focus on quad and hamstring mass.' },
  { id: 'strength', label: 'Max Strength', description: 'Prioritize heavy compound lifts.' },
];

export const AdditionalObjectivesStep: React.FC<AdditionalObjectivesStepProps> = ({ data, updateData }) => {
  const selected = data.additionalObjectives || [];

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      updateData({ additionalObjectives: selected.filter((item) => item !== id) });
    } else {
      updateData({ additionalObjectives: [...selected, id] });
    }
  };

  return (
    <div className="space-y-4">
      {OBJECTIVES.map((obj) => {
        const isSelected = selected.includes(obj.id);
        return (
          <button
            key={obj.id}
            onClick={() => toggle(obj.id)}
            className={cn(
              "w-full text-left flex items-start gap-4 p-5 rounded-2xl border-2 transition-all",
              isSelected
                ? "border-[var(--primary)] bg-[var(--secondary)] shadow-sm ring-1 ring-[var(--primary)]"
                : "border-gray-200 bg-white hover:bg-gray-50"
            )}
          >
            <div
              className={cn(
                "mt-1 h-5 w-5 rounded-md border-2",
                isSelected
                  ? "border-[var(--primary)] bg-[var(--primary)]"
                  : "border-gray-300"
              )}
            />
            <div>
              <h3 className="text-lg font-semibold">{obj.label}</h3>
              <p className="text-sm text-[var(--muted-foreground)] mt-1">{obj.description}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
};
