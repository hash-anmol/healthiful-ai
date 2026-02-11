import React from 'react';

interface MedicalConditionsStepProps {
  data: { medicalConditions: string };
  updateData: (data: Partial<{ medicalConditions: string }>) => void;
}

export const MedicalConditionsStep: React.FC<MedicalConditionsStepProps> = ({ data, updateData }) => {
  return (
    <div className="space-y-6">
      <div className="relative">
        <textarea
          autoFocus
          value={data.medicalConditions}
          onChange={(e) => updateData({ medicalConditions: e.target.value })}
          placeholder="e.g., Mild asthma, history of hypertension, or any other condition we should know about..."
          className="w-full min-h-[160px] p-6 text-lg bg-[var(--surface)] border-2 border-[var(--border)] rounded-[24px] focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] outline-none transition-all resize-none placeholder:text-[var(--muted-foreground)]"
        />
        <div className="absolute top-4 right-4 text-[var(--muted-foreground)] opacity-50">
          <span className="material-icons-round">edit</span>
        </div>
      </div>

      <p className="text-sm text-[var(--muted-foreground)] px-2 bg-[var(--secondary)] p-4 rounded-xl border border-[var(--border)]">
        <strong>Why we ask:</strong> This information helps our AI to avoid exercises that might aggravate existing conditions and ensures your workout is as safe as possible.
      </p>
    </div>
  );
};
