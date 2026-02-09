import React from 'react';
import { OptionCards } from './OptionCards';

interface TimelineExpectationStepProps {
  data: { timelineExpectation: string };
  updateData: (data: Partial<{ timelineExpectation: string }>) => void;
}

export const TimelineExpectationStep: React.FC<TimelineExpectationStepProps> = ({ data, updateData }) => {
  return (
    <OptionCards
      value={data.timelineExpectation}
      onChange={(value) => updateData({ timelineExpectation: value })}
      options={[
        { id: '4_weeks', label: '4 Weeks', description: 'Quick start, short-term momentum.' },
        { id: '8_weeks', label: '8 Weeks', description: 'Visible progress in ~2 months.' },
        { id: '12_weeks', label: '12 Weeks', description: 'Classic 3-month transformation.' },
        { id: '6_months', label: '6+ Months', description: 'Long-term sustainable change.' },
      ]}
    />
  );
};
