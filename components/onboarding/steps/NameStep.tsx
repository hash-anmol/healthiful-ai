import React from 'react';

interface NameStepProps {
  data: { name: string };
  updateData: (data: Partial<{ name: string }>) => void;
}

export const NameStep: React.FC<NameStepProps> = ({ data, updateData }) => {
  const name = data.name || '';

  return (
    <div className="flex flex-col items-center w-full max-w-sm mx-auto">
      <div className="w-full px-6 mt-8">
        <input
          type="text"
          value={name}
          onChange={(e) => {
            updateData({ name: e.target.value });
          }}
          placeholder="Enter your name"
          className="w-full text-center text-3xl font-bold bg-white border-2 border-[var(--border)] focus:border-[var(--primary)] focus:ring-4 focus:ring-orange-100 rounded-3xl py-6 transition-all outline-none shadow-sm"
          autoFocus
        />
      </div>
    </div>
  );
};
