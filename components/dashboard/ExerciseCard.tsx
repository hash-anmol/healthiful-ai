import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle, Check, Info, RefreshCcw, X, Play, Coins } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAction, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Skeleton } from '@/components/ui/skeleton';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ActiveExerciseTracker, type ActiveExerciseSessionState } from './ActiveExerciseTracker';
import { streamAiText } from '@/lib/streamAiText';

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
  onLog: (payload: {
    setsCompleted: number;
    repsCompleted: number;
    weightUsed: number;
    rpe?: number;
  }) => void;
  onCoinsEarned?: (amount: number) => void;
}

export const ExerciseCard: React.FC<ExerciseCardProps> = ({ 
  exercise, 
  workoutTitle, 
  workoutId,
  userId,
  onToggle,
  onLog,
  onCoinsEarned,
}) => {
  const parseReps = (value?: string) => {
    if (!value) return 0;
    const [first] = value.split('-');
    const parsed = Number(first);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const parseWeight = (value?: string) => {
    const match = value?.match(/([0-9]+(\.[0-9]+)?)/);
    return match ? Number(match[1]) : 0;
  };
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
  const [detailsStreamingText, setDetailsStreamingText] = useState('');
  const [showDetailPopup, setShowDetailPopup] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [showActiveTracker, setShowActiveTracker] = useState(false);
  const [hasStartedExercise, setHasStartedExercise] = useState(false);
  const [trackerSession, setTrackerSession] = useState<ActiveExerciseSessionState | null>(null);
  const [setsCompleted, setSetsCompleted] = useState<number>(exercise.sets);
  const [repsCompleted, setRepsCompleted] = useState<number>(() => parseReps(exercise.reps));
  const [weightUsed, setWeightUsed] = useState<number>(() => parseWeight(exercise.weight));
  const [rpe, setRpe] = useState<string>('');

  const askQuestion = useAction(api.actions.askExerciseQuestion);
  const suggestAlternative = useAction(api.actions.suggestExerciseAlternative);
  const replaceExerciseMutation = useMutation(api.workouts.replaceExercise);
  const addFeedbackMutation = useMutation(api.feedbacks.addFeedback);
  const getImagesAction = useAction(api.actions.getExerciseImages);
  const getExerciseDetailsAction = useAction(api.actions.getExerciseDetails);

  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isExpanded && images.length === 0) {
      fetchImages();
    }
  }, [isExpanded, exercise.name]);

  // Background preload: start fetching details when card expands
  useEffect(() => {
    if (isExpanded && !exerciseDetails && !isLoadingDetails) {
      fetchDetails();
    }
  }, [isExpanded, exercise.name]);

  useEffect(() => {
    setSetsCompleted(exercise.sets);
    setRepsCompleted(parseReps(exercise.reps));
    setWeightUsed(parseWeight(exercise.weight));
    setRpe('');
  }, [exercise.name, exercise.sets, exercise.reps, exercise.weight]);

  // Reset all cached data when exercise changes (e.g. after "Suggest Change")
  const prevExerciseNameRef = useRef(exercise.name);
  useEffect(() => {
    if (prevExerciseNameRef.current !== exercise.name) {
      prevExerciseNameRef.current = exercise.name;
      // Reset images, details, and guidance state
      setImages([]);
      setExerciseDetails(null);
      setDetailsStreamingText('');
      setAnswer('');
      setQuestion('');
      setSelectedImage(null);
      setHasStartedExercise(false);
      setTrackerSession(null);
      // Re-fetch images if the card is already expanded
      if (isExpanded) {
        fetchImages();
      }
      // Re-fetch details if the detail popup is open
      if (showDetailPopup) {
        fetchDetails();
      }
    }
  }, [exercise.name]);

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
    setDetailsStreamingText('');
    try {
      let streamed = '';
      await streamAiText({
        messages: [
          {
            role: "system",
            content: "You are a biomechanics assistant. Output ONLY valid JSON, no markdown fences.",
          },
          {
            role: "user",
            content: `Provide a detailed analysis of "${exercise.name}" as JSON:
{
  "why":"1-2 sentences max on why this exercise is effective",
  "affectedAreas":["primary muscle groups"],
  "benefits":["3-4 key benefits"],
  "formTips":["3-4 form cues"],
  "howTo":["step 1","step 2","step 3","...up to 6 numbered steps for performing this exercise correctly from setup to finish"]
}
No markdown fences and no additional text outside the JSON.`,
          },
        ],
        temperature: 0.3,
        onChunk: (chunk) => {
          streamed += chunk;
          setDetailsStreamingText((prev) => `${prev}${chunk}`);
        },
      });

      const jsonString = streamed.replace(/```json/g, "").replace(/```/g, "").trim();
      setExerciseDetails(JSON.parse(jsonString));
      setDetailsStreamingText('');
    } catch (err) {
      console.error(err);
      // Fallback to existing Convex action if streaming parse fails.
      try {
        const res = await getExerciseDetailsAction({ exerciseName: exercise.name });
        setExerciseDetails(res);
      } catch (fallbackError) {
        console.error(fallbackError);
      }
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleTrackerSessionChange = useCallback((session: ActiveExerciseSessionState) => {
    setTrackerSession((prev) => {
      if (!prev) return session;
      if (
        prev.elapsedSeconds === session.elapsedSeconds &&
        prev.activeSetIndex === session.activeSetIndex &&
        prev.sets.length === session.sets.length &&
        prev.sets.every((set, index) => {
          const nextSet = session.sets[index];
          return (
            set.completed === nextSet?.completed &&
            set.reps === nextSet?.reps &&
            set.weight === nextSet?.weight
          );
        })
      ) {
        return prev;
      }
      return session;
    });
    setHasStartedExercise(session.sets.some((set) => set.completed) || session.elapsedSeconds > 0);
  }, []);

  const handleAsk = async () => {
    if (!question.trim()) return;
    setIsAsking(true);
    setAnswer('');
    try {
      await streamAiText({
        messages: [
          {
            role: "system",
            content: `You are an expert trainer. Context: exercise "${exercise.name}" in workout "${workoutTitle}". Be concise and practical.`,
          },
          {
            role: "user",
            content: question,
          },
        ],
        temperature: 0.4,
        onChunk: (chunk) => {
          setAnswer((prev) => `${prev}${chunk}`);
        },
      });
    } catch (err) {
      try {
        const res = await askQuestion({
          userId,
          exerciseName: exercise.name,
          workoutTitle,
          question,
          exerciseNotes: exercise.notes
        });
        setAnswer(res);
      } catch {
        setAnswer("Sorry, I couldn't get an answer right now.");
      }
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
      try {
        await addFeedbackMutation({
          userId,
          exerciseName: exercise.name,
          feedback: question,
        });
      } catch (err) {
        console.error("Failed to save feedback", err);
      }
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
        className="flex gap-3 items-center cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Exercise info */}
        <div className="flex-grow min-w-0">
          <div className="flex justify-between items-start gap-2">
            <h3 className={cn(
              "font-extrabold text-base sm:text-xl leading-tight transition-all duration-500 line-clamp-2", 
              exercise.completed ? "text-slate-400 line-through decoration-2" : "text-slate-900"
            )}>
              {exercise.name}
            </h3>
            <div className="flex gap-0.5 items-center shrink-0" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setShowQuestionPopup(true)} className="text-slate-300 hover:text-[#FF6B00] transition-all p-1.5 hover:bg-orange-50 rounded-xl">
                <HelpCircle size={20} />
              </button>
              <div 
                className={cn("text-slate-300 transition-all duration-500 cursor-pointer", isExpanded && "rotate-180 text-orange-500")}
                onClick={() => setIsExpanded(!isExpanded)}
              >
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

        {/* Right: Start / Resume button */}
        {!exercise.completed && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowActiveTracker(true);
              setHasStartedExercise(true);
            }}
            className={cn(
              "shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-white text-xs font-extrabold shadow-lg active:scale-95 transition-transform uppercase tracking-wider",
              hasStartedExercise
                ? "bg-gradient-to-r from-slate-800 to-slate-700 shadow-slate-200/60"
                : "bg-gradient-to-r from-[#FF6B00] to-[#FF8C33] shadow-orange-200/60"
            )}
          >
            <Play size={14} fill="white" />
            {hasStartedExercise ? 'Resume' : 'Start'}
          </button>
        )}
        {exercise.completed && (
          <div className="shrink-0 flex items-center gap-1 px-3 py-2 rounded-xl bg-green-50 text-green-600 text-[10px] font-bold border border-green-100">
            <Coins size={12} />
            +10
          </div>
        )}
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
            <div className="mt-6 pt-2 space-y-5">
              {exercise.tip && (
                <div className="bg-orange-50/50 rounded-2xl p-4 flex gap-4 items-start">
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
                detailsStreamingText ? (
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">
                    {detailsStreamingText}
                  </div>
                ) : (
                  <div className="space-y-6">
                    <Skeleton className="h-48 w-full rounded-3xl" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Skeleton className="h-32 rounded-2xl" />
                      <Skeleton className="h-32 rounded-2xl" />
                    </div>
                  </div>
                )
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

                  {/* How To — Step-by-step guide */}
                  {exerciseDetails.howTo?.length > 0 && (
                    <section>
                      <h4 className="text-[10px] sm:text-xs font-black text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B00]" />
                        How To Perform
                      </h4>
                      <ol className="space-y-2">
                        {exerciseDetails.howTo.map((step: string, i: number) => (
                          <li key={i} className="flex gap-3 items-start text-xs sm:text-sm text-slate-700 font-medium">
                            <span className="shrink-0 w-6 h-6 rounded-full bg-[#FF6B00]/10 text-[#FF6B00] flex items-center justify-center text-[10px] font-black mt-0.5">{i + 1}</span>
                            <span className="leading-relaxed">{step}</span>
                          </li>
                        ))}
                      </ol>
                    </section>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                    <div className="space-y-5 sm:space-y-6">
                      <section>
                        <h4 className="text-[10px] sm:text-xs font-black text-slate-900 uppercase tracking-widest mb-2 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                          Why this works
                        </h4>
                        <p className="text-xs text-slate-600 leading-relaxed font-medium bg-slate-50 p-3 rounded-2xl border border-slate-100 line-clamp-3">
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
      {/* Active Exercise Tracker */}
      <AnimatePresence>
        {showActiveTracker && !exercise.completed && (
          <ActiveExerciseTracker
            exercise={exercise}
            coinsReward={10}
            initialSession={trackerSession}
            onSessionChange={handleTrackerSessionChange}
            onComplete={(payload) => {
              onLog(payload);
              setShowActiveTracker(false);
              setTrackerSession(null);
              onCoinsEarned?.(10);
            }}
            onClose={() => setShowActiveTracker(false)}
          />
        )}
      </AnimatePresence>

      {/* Legacy Log Modal (fallback) */}
      <AnimatePresence>
        {showLogModal && (
          <div 
            className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md"
            onClick={() => setShowLogModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-lg rounded-[2.5rem] p-6 sm:p-8 shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => setShowLogModal(false)}
                className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={22} />
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-[#FF6B00]">
                  <Check size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-xl text-slate-900">Log this set</h4>
                  <p className="text-slate-500 font-medium text-sm">{exercise.name}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Sets
                    <input
                      type="number"
                      min={0}
                      value={setsCompleted}
                      onChange={(e) => setSetsCompleted(Number(e.target.value))}
                      className="mt-2 w-full h-12 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20"
                    />
                  </label>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Reps
                    <input
                      type="number"
                      min={0}
                      value={repsCompleted}
                      onChange={(e) => setRepsCompleted(Number(e.target.value))}
                      className="mt-2 w-full h-12 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20"
                    />
                  </label>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Weight
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      value={weightUsed}
                      onChange={(e) => setWeightUsed(Number(e.target.value))}
                      className="mt-2 w-full h-12 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20"
                    />
                  </label>
                </div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  RPE (Optional)
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={rpe}
                    onChange={(e) => setRpe(e.target.value)}
                    placeholder="8"
                    className="mt-2 w-full h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20"
                  />
                </label>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowLogModal(false)}
                    className="flex-1 py-3 rounded-2xl border border-slate-200 text-slate-600 font-bold"
                  >
                    Not now
                  </button>
                  <button
                    onClick={() => {
                      onLog({
                        setsCompleted,
                        repsCompleted,
                        weightUsed,
                        rpe: rpe ? Number(rpe) : undefined,
                      });
                      setShowLogModal(false);
                    }}
                    className="flex-1 py-3 rounded-2xl bg-[#FF6B00] text-white font-bold shadow-lg shadow-orange-200"
                  >
                    Save & Check
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
