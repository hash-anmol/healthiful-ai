import React from 'react';
import { cn } from '@/lib/utils';

interface Option {
  id: string;
  label: string;
  description?: string;
}

interface OptionCardsProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
}

export const OptionCards: React.FC<OptionCardsProps> = ({ options, value, onChange }) => {
  return (
    <div className="space-y-4">
      {options.map((option) => {
        const selected = value === option.id;
        return (
          <div
            key={option.id}
            onClick={() => onChange(option.id)}
            className={cn(
              "relative flex items-start gap-4 p-5 rounded-2xl border-2 transition-all cursor-pointer",
              selected
                ? "border-[var(--primary)] bg-[var(--secondary)] shadow-sm ring-1 ring-[var(--primary)]"
                : "border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--secondary)]"
            )}
          >
            <div
              className={cn(
                "mt-1 h-5 w-5 rounded-full border-2",
                selected
                  ? "border-[var(--primary)] bg-[var(--primary)]"
                  : "border-[var(--muted)]"
              )}
            />
            <div className="flex-1">
              <h3 className="text-lg font-semibold">{option.label}</h3>
              {option.description && (
                <p className="text-sm text-[var(--muted-foreground)] mt-1">
                  {option.description}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
