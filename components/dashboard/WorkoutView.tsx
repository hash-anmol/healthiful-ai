import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface Exercise {
  name: string;
  sets: number;
  reps: string;
  weight?: string;
  notes?: string;
  completed: boolean;
}

interface WorkoutPlan {
  _id: string;
  title: string;
  exercises: Exercise[];
}

interface WorkoutViewProps {
  workout: WorkoutPlan;
  onToggleComplete: (exerciseName: string, completed: boolean) => void;
}

export const WorkoutView: React.FC<WorkoutViewProps> = ({ workout, onToggleComplete }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">{workout.title}</h2>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="w-5 h-5" />
        </Button>
      </div>

      <div className="space-y-4">
        {workout.exercises.map((exercise, index) => (
          <motion.div
            key={exercise.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className={cn("transition-all", exercise.completed && "opacity-60 bg-muted/50")}>
              <CardContent className="p-4 flex items-center gap-4">
                <button
                  onClick={() => onToggleComplete(exercise.name, !exercise.completed)}
                  className="focus:outline-none"
                >
                  {exercise.completed ? (
                    <CheckCircle2 className="w-8 h-8 text-primary" />
                  ) : (
                    <Circle className="w-8 h-8 text-muted-foreground hover:text-primary transition-colors" />
                  )}
                </button>
                <div className="flex-1">
                  <h3 className={cn("font-semibold text-lg", exercise.completed && "line-through text-muted-foreground")}>
                    {exercise.name}
                  </h3>
                  <div className="flex gap-3 text-sm text-muted-foreground mt-1">
                    <span className="bg-secondary px-2 py-0.5 rounded-md text-secondary-foreground font-medium">
                      {exercise.sets} sets
                    </span>
                    <span className="bg-secondary px-2 py-0.5 rounded-md text-secondary-foreground font-medium">
                      {exercise.reps} reps
                    </span>
                    {exercise.weight && (
                      <span className="bg-secondary px-2 py-0.5 rounded-md text-secondary-foreground font-medium">
                        {exercise.weight}
                      </span>
                    )}
                  </div>
                  {exercise.notes && !exercise.completed && (
                    <p className="text-xs text-muted-foreground mt-2 italic">
                      Tip: {exercise.notes}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
