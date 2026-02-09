import React from 'react';
import { cn } from '@/lib/utils';

interface InjuryFlagsStepProps {
  data: { injuryFlags: string[] };
  updateData: (data: Partial<{ injuryFlags: string[] }>) => void;
}

const FLAGS = [
  { id: 'none', label: 'No Injuries', description: 'No current limitations.' },
  { id: 'lower_back', label: 'Lower Back', description: 'Back pain or history of strain.' },
  { id: 'shoulder', label: 'Shoulder', description: 'Shoulder pain or instability.' },
  { id: 'knee', label: 'Knee', description: 'Knee pain or instability.' },
  { id: 'wrist', label: 'Wrist/Elbow', description: 'Upper limb discomfort.' },
  { id: 'ankle', label: 'Ankle', description: 'Ankle pain or instability.' },
];

export const InjuryFlagsStep: React.FC<InjuryFlagsStepProps> = ({ data, updateData }) => {
  const selected = data.injuryFlags || [];

  const toggle = (id: string) => {
    if (id === 'none') {
      updateData({ injuryFlags: ['none'] });
      return;
    }
    const filtered = selected.filter((item) => item !== 'none');
    if (filtered.includes(id)) {
      updateData({ injuryFlags: filtered.filter((item) => item !== id) });
    } else {
      updateData({ injuryFlags: [...filtered, id] });
    }
  };

  return (
    <div className="space-y-4">
      {FLAGS.map((flag) => {
        const isSelected = selected.includes(flag.id);
        return (
          <button
            key={flag.id}
            onClick={() => toggle(flag.id)}
            className={cn(
              "w-full text-left flex items-start gap-4 p-5 rounded-2xl border-2 transition-all",
              isSelected
                ? "border-[var(--primary)] bg-[var(--secondary)] shadow-sm ring-1 ring-[var(--primary)]"
                : "border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--secondary)]"
            )}
          >
            <div
              className={cn(
                "mt-1 h-5 w-5 rounded-md border-2",
                isSelected
                  ? "border-[var(--primary)] bg-[var(--primary)]"
                  : "border-[var(--muted)]"
              )}
            />
            <div>
              <h3 className="text-lg font-semibold">{flag.label}</h3>
              <p className="text-sm text-[var(--muted-foreground)] mt-1">{flag.description}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
};
