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
  const [exerciseDetails, setExerciseDetails] = useState<any>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [showDetailPopup, setShowDetailPopup] = useState(false);

  const askQuestion = useAction(api.actions.askExerciseQuestion);
  const suggestAlternative = useAction(api.actions.suggestExerciseAlternative);
  const replaceExerciseMutation = useMutation(api.workouts.replaceExercise);
  const getImagesAction = useAction(api.actions.getExerciseImages);
  const getExerciseDetailsAction = useAction(api.actions.getExerciseDetails);

  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isExpanded && images.length === 0) {
      fetchImages();
    }
  }, [isExpanded]);

  useEffect(() => {
    if (showDetailPopup && !exerciseDetails) {
      fetchDetails();
    }
  }, [showDetailPopup]);

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

  const fetchDetails = async () => {
    setIsLoadingDetails(true);
    try {
      const res = await getExerciseDetailsAction({ exerciseName: exercise.name });
      setExerciseDetails(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingDetails(false);
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
    <div className={cn(
      "bg-white rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 mb-4 transition-all duration-500 relative",
      isExpanded && "shadow-[0_20px_50px_rgba(0,0,0,0.1)] border-orange-100",
      (showDetailPopup || showQuestionPopup || selectedImage) && "z-[100]"
    )}>
      <div 
        className="flex gap-4 items-center cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className={cn(
            "w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center transition-all duration-500 relative group shrink-0",
            exercise.completed 
              ? "bg-gradient-to-br from-[#FF6B00] to-[#FF8C33] shadow-[0_10px_20px_-5px_rgba(255,107,0,0.4)]" 
              : "bg-slate-50 hover:bg-orange-50 border border-slate-100"
          )}
        >
          <AnimatePresence mode="wait">
            {exercise.completed ? (
              <motion.div 
                key="checked" 
                initial={{ scale: 0, rotate: -45 }} 
                animate={{ scale: 1, rotate: 0 }} 
                exit={{ scale: 0, rotate: 45 }} 
                className="text-white"
              >
                <Check className="w-6 h-6 sm:w-8 sm:h-8" strokeWidth={3.5} />
              </motion.div>
            ) : (
              <motion.div 
                key="unchecked" 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                className="w-4 h-4 sm:w-5 sm:h-5 rounded-full border-[2.5px] border-slate-300 group-hover:border-[#FF6B00] transition-colors" 
              />
            )}
          </AnimatePresence>
        </button>

        <div className="flex-grow min-w-0">
          <div className="flex justify-between items-start gap-2">
            <h3 className={cn(
              "font-extrabold text-lg sm:text-xl leading-tight transition-all duration-500 truncate", 
              exercise.completed ? "text-slate-400 line-through decoration-2" : "text-slate-900"
            )}>
              {exercise.name}
            </h3>
            <div className="flex gap-0.5 items-center shrink-0" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setShowQuestionPopup(true)} className="text-slate-300 hover:text-[#FF6B00] transition-all p-1.5 hover:bg-orange-50 rounded-xl">
                <HelpCircle size={20} />
              </button>
              <div className={cn("text-slate-300 transition-all duration-500", isExpanded && "rotate-180 text-orange-500")}>
                <ChevronDown size={22} />
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 text-[10px] sm:text-xs font-bold mt-2">
            {exercise.type && (
              <span className={cn(
                "px-2 py-1 rounded-lg uppercase tracking-wider shadow-sm",
                exercise.type === 'warmup' ? "bg-blue-50 text-blue-600 border border-blue-100" :
                exercise.type === 'abs' ? "bg-purple-50 text-purple-600 border border-purple-100" :
                "bg-slate-50 text-slate-500 border border-slate-100"
              )}>
                {exercise.type}
              </span>
            )}
            <span className="bg-orange-50 text-[#FF6B00] px-2 py-1 rounded-lg border border-orange-100 shadow-sm">{exercise.sets} Sets</span>
            <span className="bg-slate-50 text-slate-600 px-2 py-1 rounded-lg border border-slate-100 shadow-sm">{exercise.reps} Reps</span>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }} 
            animate={{ height: 'auto', opacity: 1 }} 
            exit={{ height: 0, opacity: 0 }} 
            transition={{ duration: 0.4, ease: "circOut" }}
            className="overflow-hidden"
          >
            <div className="mt-5 pt-5 border-t border-slate-100 space-y-5">
              {exercise.tip && (
                <div className="bg-orange-50/50 rounded-2xl p-4 flex gap-4 border border-orange-100/50 items-start">
                  <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center text-[#FF6B00] shrink-0 mt-0.5">
                    <Info size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-orange-900 uppercase tracking-widest mb-1">Coach's Tip</p>
                    <p className="text-sm text-slate-600 leading-relaxed font-medium">
                      {exercise.tip}
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Visual Reference</p>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDetailPopup(true);
                    }}
                    className="flex items-center gap-1.5 text-[#FF6B00] text-[10px] font-black uppercase tracking-wider hover:opacity-80 transition-opacity bg-orange-50 px-2.5 py-1.5 rounded-lg border border-orange-100"
                  >
                    <span className="material-icons-round text-sm">analytics</span>
                    Detailed Analysis
                  </button>
                </div>
                
                <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar -mx-1 px-1">
                  {isLoadingImages ? (
                    [1, 2, 3].map(i => <Skeleton key={i} className="w-32 sm:w-40 aspect-square rounded-2xl shrink-0" />)
                  ) : images.length > 0 ? (
                    images.map((img, i) => (
                      <motion.div 
                        key={i} 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedImage(img.url)}
                        className="w-32 sm:w-40 aspect-square bg-white rounded-2xl overflow-hidden shrink-0 shadow-md border border-slate-100 relative group cursor-zoom-in"
                      >
                        <img 
                          src={img.thumbnail} 
                          alt={img.title} 
                          className="w-full h-full object-cover" 
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=200&h=200&fit=crop';
                          }}
                        />
                      </motion.div>
                    ))
                  ) : (
                    <div className="w-full h-20 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 text-[10px] italic border border-dashed border-slate-200">
                      No reference images found
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detailed Analysis Modal */}
      <AnimatePresence>
        {showDetailPopup && (
          <div 
            className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md"
            onClick={() => setShowDetailPopup(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-3xl p-5 sm:p-8 shadow-2xl relative max-h-[85vh] overflow-y-auto custom-scrollbar"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => setShowDetailPopup(false)}
                className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors z-[160] p-2 bg-slate-50 rounded-full hover:bg-slate-100"
              >
                <X size={24} />
              </button>

              <div className="flex items-center gap-4 mb-8 pr-12">
                <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center text-[#FF6B00] shrink-0">
                  <span className="material-icons-round text-3xl">analytics</span>
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-2xl text-slate-900 leading-tight">Detailed Analysis</h4>
                  <p className="text-slate-500 font-medium truncate">{exercise.name}</p>
                </div>
              </div>

              {isLoadingDetails ? (
                <div className="space-y-6">
                  <Skeleton className="h-48 w-full rounded-3xl" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Skeleton className="h-32 rounded-2xl" />
                    <Skeleton className="h-32 rounded-2xl" />
                  </div>
                </div>
              ) : exerciseDetails ? (
                <div className="space-y-6 sm:space-y-8">
                  {/* Hero Image in Modal */}
                  {images.length > 0 && (
                    <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden aspect-video bg-slate-100 border border-slate-200 shadow-inner">
                      <img 
                        src={images[0].url} 
                        alt={exercise.name} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                    <div className="space-y-5 sm:space-y-6">
                      <section>
                        <h4 className="text-[10px] sm:text-xs font-black text-slate-900 uppercase tracking-widest mb-2.5 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                          Why this works
                        </h4>
                        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium bg-slate-50 p-4 rounded-2xl border border-slate-100">
                          {exerciseDetails.why}
                        </p>
                      </section>

                      <section>
                        <h4 className="text-[10px] sm:text-xs font-black text-slate-900 uppercase tracking-widest mb-2.5 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          Target Areas
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {exerciseDetails.affectedAreas.map((area: string, i: number) => (
                            <span key={i} className="px-2.5 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold border border-blue-100">
                              {area}
                            </span>
                          ))}
                        </div>
                      </section>
                    </div>

                    <div className="space-y-5 sm:space-y-6">
                      <section>
                        <h4 className="text-[10px] sm:text-xs font-black text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          Key Benefits
                        </h4>
                        <ul className="space-y-3">
                          {exerciseDetails.benefits.map((benefit: string, i: number) => (
                            <li key={i} className="flex gap-3 items-start text-xs sm:text-sm text-slate-600 font-medium bg-green-50/30 p-3 rounded-xl border border-green-100/50">
                              <Check size={16} className="text-green-500 shrink-0 mt-0.5" />
                              <span className="leading-relaxed">{benefit}</span>
                            </li>
                          ))}
                        </ul>
                      </section>

                      <section>
                        <h4 className="text-[10px] sm:text-xs font-black text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                          Coach Form Tips
                        </h4>
                        <div className="bg-purple-50/50 p-4 rounded-2xl border border-purple-100 space-y-3">
                          {exerciseDetails.formTips.map((tip: string, i: number) => (
                            <p key={i} className="text-xs sm:text-sm text-purple-700 font-medium leading-relaxed flex gap-3">
                              <span className="text-purple-400 shrink-0">•</span> 
                              <span>{tip}</span>
                            </p>
                          ))}
                        </div>
                      </section>
                    </div>
                  </div>
                </div>
              ) : null}
            </motion.div>
          </div>
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
