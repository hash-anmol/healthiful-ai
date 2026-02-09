import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

interface WelcomeStepProps {
  onNext: () => void;
}

export const WelcomeStep: React.FC<WelcomeStepProps> = ({ onNext }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 text-center">
      <div className="relative w-full max-w-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-white shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)] rounded-[2rem] p-10 border border-gray-100"
        >
          <h1 className="text-3xl font-extrabold text-[var(--foreground)] leading-tight">
            Build your
            <span className="text-[var(--primary)]"> custom</span> training plan
          </h1>
          <p className="mt-6 text-[var(--muted-foreground)] leading-relaxed">
            Personalized workouts based on your goals, recovery, and lifestyle.
          </p>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="w-full max-w-sm mt-12"
      >
        <Button 
          onClick={onNext} 
          size="lg" 
          className="w-full text-lg font-bold rounded-2xl bg-[var(--primary)] text-white shadow-[0_0_20px_rgba(255,107,0,0.3)] hover:bg-[var(--primary-dark)] active:scale-[0.98] transition-all duration-200"
        >
          Get Started
        </Button>
      </motion.div>
    </div>
  );
};
