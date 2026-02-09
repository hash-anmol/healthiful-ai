import React from 'react';
import { format, addDays, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface DaySelectorProps {
  selectedDate: Date;
  onSelect: (date: Date) => void;
}

export const DaySelector: React.FC<DaySelectorProps> = ({ selectedDate, onSelect }) => {
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i));

  return (
    <div className="flex gap-2 overflow-x-auto pb-4 pt-2 snap-x px-2 no-scrollbar">
      {days.map((date) => {
        const isSelected = isSameDay(date, selectedDate);
        return (
          <motion.button
            key={date.toISOString()}
            onClick={() => onSelect(date)}
            whileTap={{ scale: 0.95 }}
            className={cn(
              "flex flex-col items-center justify-center min-w-[64px] h-[80px] rounded-2xl border transition-all snap-center",
              isSelected
                ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                : "bg-card border-border text-muted-foreground hover:bg-secondary"
            )}
          >
            <span className="text-xs font-medium uppercase">{format(date, 'EEE')}</span>
            <span className="text-xl font-bold">{format(date, 'd')}</span>
          </motion.button>
        );
      })}
    </div>
  );
};
