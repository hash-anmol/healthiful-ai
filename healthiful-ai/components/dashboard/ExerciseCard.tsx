import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle, Check, Info, RefreshCcw, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAction, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Skeleton } from '@/components/ui/skeleton';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ExerciseCardProps {
  exercise: {
    name: string;
    sets: number;
    reps: string;
    weight?: string;
    notes?: string;
    completed: boolean;
    type?: string;
    tip?: string;
    visualization_prompt?: string;
  };
  workoutTitle: string;
  workoutId: any;
  userId: any;
  onToggle: () => void;
}

export const ExerciseCard: React.FC<ExerciseCardProps> = ({ 
  exercise, 
  workoutTitle, 
  workoutId,
  userId,
  onToggle 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showQuestionPopup, setShowQuestionPopup] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [isChanging, setIsChanging] = useState(false);
  const [images, setImages] = useState<any[]>([]);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const askQuestion = useAction(api.actions.askExerciseQuestion);
  const suggestAlternative = useAction(api.actions.suggestExerciseAlternative);
  const replaceExerciseMutation = useMutation(api.workouts.replaceExercise);
  const getImagesAction = useAction(api.actions.getExerciseImages);

  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isExpanded && images.length === 0) {
      fetchImages();
    }
  }, [isExpanded]);

  const fetchImages = async () => {
    setIsLoadingImages(true);
    try {
      const res = await getImagesAction({ query: exercise.name });
      setImages(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingImages(false);
    }
  };

  const handleAsk = async () => {
    if (!question.trim()) return;
    setIsAsking(true);
    setAnswer('');
    try {
      const res = await askQuestion({
        userId,
        exerciseName: exercise.name,
        workoutTitle,
        question,
        exerciseNotes: exercise.notes
      });
      setAnswer(res);
    } catch (err) {
      setAnswer("Sorry, I couldn't get an answer right now.");
    } finally {
      setIsAsking(false);
    }
  };

  const handleChangeExercise = async () => {
    if (!question.trim()) {
      setAnswer("Please describe why you want to change this exercise so I can suggest a better one.");
      return;
    }
    setIsChanging(true);
    try {
      const newEx = await suggestAlternative({
        userId,
        exerciseName: exercise.name,
        reason: question,
        workoutTitle
      });
      await replaceExerciseMutation({
        workoutId,
        oldExerciseName: exercise.name,
        newExercise: { ...newEx, completed: false }
      });
      setShowQuestionPopup(false);
      setQuestion('');
      setAnswer('');
    } catch (err) {
      setAnswer("Failed to find an alternative. Try again.");
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-4 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] border border-slate-50 mb-4 overflow-hidden">
      <div className="flex gap-4 items-center">
        <button 
          onClick={onToggle}
          className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 relative overflow-hidden",
            exercise.completed ? "bg-[#FF6B00]" : "bg-slate-100"
          )}
        >
          <AnimatePresence mode="wait">
            {exercise.completed ? (
              <motion.div key="checked" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="text-white">
                <Check size={28} strokeWidth={3} />
              </motion.div>
            ) : (
              <motion.div key="unchecked" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-4 h-4 rounded-full border-2 border-slate-300" />
            )}
          </AnimatePresence>
        </button>

        <div className="flex-grow">
          <div className="flex justify-between items-start">
            <h3 className={cn("font-bold text-lg leading-tight transition-all", exercise.completed ? "text-slate-400 line-through" : "text-slate-900")}>
              {exercise.name}
            </h3>
            <div className="flex gap-1">
              <button onClick={() => setShowQuestionPopup(true)} className="text-slate-400 hover:text-[#FF6B00] transition-colors p-1">
                <HelpCircle size={20} />
              </button>
              <button onClick={() => setIsExpanded(!isExpanded)} className={cn("text-slate-400 hover:text-slate-600 transition-all p-1", isExpanded && "rotate-180")}>
                <ChevronDown size={20} />
              </button>
            </div>
          </div>
          
          <div className="flex gap-3 text-sm font-semibold mt-2">
            {exercise.type && (
              <span className={cn(
                "px-2 py-1 rounded-lg uppercase text-[10px] tracking-wider",
                exercise.type === 'warmup' ? "bg-blue-50 text-blue-600" :
                exercise.type === 'abs' ? "bg-purple-50 text-purple-600" :
                "bg-slate-100 text-slate-600"
              )}>
                {exercise.type}
              </span>
            )}
            <span className="bg-orange-50 text-[#FF6B00] px-2 py-1 rounded-lg">{exercise.sets} Sets</span>
            <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-lg">{exercise.reps} Reps</span>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mt-4 pt-4 border-t border-slate-50 space-y-4">
            {exercise.tip && (
              <div className="bg-slate-50 rounded-2xl p-3 flex gap-3">
                <Info size={18} className="text-[#FF6B00] shrink-0 mt-0.5" />
                <p className="text-sm text-slate-600 leading-relaxed">
                  <span className="font-bold text-slate-900">Coach's Tip:</span> {exercise.tip}
                </p>
              </div>
            )}
            
            <div className="space-y-2">
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider px-1">Visual Reference & Biomechanics</p>
              <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
                {isLoadingImages ? (
                  [1, 2, 3].map(i => <Skeleton key={i} className="w-40 aspect-square rounded-2xl shrink-0" />)
                ) : images.length > 0 ? (
                  images.map((img, i) => (
                    <motion.div 
                      key={i} 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedImage(img.url)}
                      className="w-44 aspect-square bg-slate-100 rounded-2xl overflow-hidden shrink-0 shadow-sm border border-slate-100 relative group cursor-zoom-in"
                    >
                      <img 
                        src={img.thumbnail} 
                        alt={img.title} 
                        className="w-full h-full object-cover" 
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=200&h=200&fit=crop';
                        }}
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                        <p className="text-[8px] text-white leading-tight line-clamp-2">{img.title}</p>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="w-full h-24 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 text-xs italic">
                    No reference images found
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image Zoom Modal */}
      <AnimatePresence>
        {selectedImage && (
          <div 
            className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md"
            onClick={() => setSelectedImage(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative max-w-5xl w-full rounded-[2.5rem] overflow-hidden shadow-2xl bg-white"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => setSelectedImage(null)}
                className="absolute top-8 right-8 z-10 p-2 bg-slate-900/10 hover:bg-slate-900/20 backdrop-blur-md rounded-full text-slate-900 transition-all shadow-sm"
              >
                <X size={24} />
              </button>
              <div className="flex items-center justify-center bg-slate-50 min-h-[40vh]">
                <img 
                  src={selectedImage} 
                  alt="Exercise Detail" 
                  className="max-w-full max-h-[80vh] object-contain" 
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      <AnimatePresence>
        {showQuestionPopup && (
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md"
            onClick={() => setShowQuestionPopup(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
              ref={popupRef}
            >
              <button 
                onClick={() => setShowQuestionPopup(false)}
                className="absolute top-8 right-8 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={24} />
              </button>

              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center text-[#FF6B00]">
                  <HelpCircle size={32} />
                </div>
                <div>
                  <h4 className="font-bold text-2xl text-slate-900">Expert Guidance</h4>
                  <p className="text-slate-500 font-medium">{exercise.name}</p>
                </div>
              </div>

              <div className="space-y-5">
                <div className="relative">
                  <textarea 
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Ask about form, or why you need to change this..."
                    className="w-full h-36 bg-slate-50 rounded-[2rem] p-6 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-[#FF6B00]/10 border border-slate-100 resize-none transition-all"
                  />
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={handleAsk}
                    disabled={isAsking || isChanging || !question.trim()}
                    className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-bold active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isAsking ? <RefreshCcw className="animate-spin" size={20} /> : null}
                    {isAsking ? 'Analyzing...' : 'Ask Question'}
                  </button>
                  <button 
                    onClick={handleChangeExercise}
                    disabled={isAsking || isChanging || !question.trim()}
                    className="flex-1 py-4 bg-orange-50 text-[#FF6B00] border border-orange-100 rounded-2xl font-bold active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isChanging ? <RefreshCcw className="animate-spin" size={20} /> : <RefreshCcw size={20} />}
                    {isChanging ? 'Finding Alt...' : 'Suggest Change'}
                  </button>
                </div>

                {(isAsking || isChanging) && !answer && (
                  <div className="space-y-3 py-2 px-2">
                    <Skeleton className="h-4 w-full rounded-full" />
                    <Skeleton className="h-4 w-5/6 rounded-full" />
                    <Skeleton className="h-4 w-4/6 rounded-full" />
                  </div>
                )}

                {answer && !isAsking && !isChanging && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-slate-50 rounded-[2rem] p-6 border border-slate-100 max-h-[40vh] overflow-y-auto custom-scrollbar"
                  >
                    <div className="text-slate-700 font-medium leading-relaxed">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({node, ...props}) => <p className="mb-3 last:mb-0" {...props} />,
                          ul: ({node, ...props}) => <ul className="list-disc ml-4 mb-3 space-y-1" {...props} />,
                          ol: ({node, ...props}) => <ol className="list-decimal ml-4 mb-3 space-y-1" {...props} />,
                          li: ({node, ...props}) => <li className="text-sm" {...props} />,
                          strong: ({node, ...props}) => <strong className="font-bold text-slate-900" {...props} />,
                          code: ({node, ...props}) => <code className="bg-slate-200 px-1 rounded text-xs font-mono" {...props} />,
                        }}
                      >
                        {answer}
                      </ReactMarkdown>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
