'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { OnboardingShell } from './steps/OnboardingShell';
import { WelcomeStep } from './steps/WelcomeStep';
import { AgeStep } from './steps/AgeStep';
import { HeightStep } from './steps/HeightStep';
import { WeightStep } from './steps/WeightStep';
import { SexStep } from './steps/SexStep';
import { TrainingExperienceStep } from './steps/TrainingExperienceStep';
import { TrainingFrequencyStep } from './steps/TrainingFrequencyStep';
import { EquipmentAccessStep } from './steps/EquipmentAccessStep';
import { PrimaryGoalStep } from './steps/PrimaryGoalStep';
import { DietTypeStep } from './steps/DietTypeStep';
import { DailyActivityStep } from './steps/DailyActivityStep';
import { InjuryFlagsStep } from './steps/InjuryFlagsStep';
import { GoalAggressivenessStep } from './steps/GoalAggressivenessStep';
import { TimelineExpectationStep } from './steps/TimelineExpectationStep';
import { RecoveryCapacityStep } from './steps/RecoveryCapacityStep';
import { BodyTypeStep } from './steps/BodyTypeStep';
import { WorkoutRoutineStep } from './steps/WorkoutRoutineStep';
import { StrengthTestStep } from './steps/StrengthTestStep';
import { AdditionalObjectivesStep } from './steps/AdditionalObjectivesStep';
import { useAuth } from '@/components/auth/AuthProvider';

import { NameStep } from './steps/NameStep';

const DRAFT_STORAGE_KEY = "onboarding-draft-v1";

const defaultData = {
  name: '',
  age: '',
  height: '',
  weight: '',
  sex: '',
  trainingExperience: '',
  trainingFrequency: '',
  equipmentAccess: '',
  primaryGoal: '',
  dietType: '',
  dailyActivity: '',
  injuryFlags: [] as string[],
  goalAggressiveness: '',
  timelineExpectation: '',
  recoveryCapacity: '',
  bodyType: '',
  workoutRoutine: '',
  strengthTest: { bicepCurlWeight: 0, pushupsCount: 0 },
  additionalObjectives: [] as string[],
};

const getInitialDraft = () => {
  if (typeof window === "undefined") {
    return { step: 0, data: defaultData };
  }

  try {
    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) {
      return { step: 0, data: defaultData };
    }
    const parsed = JSON.parse(raw) as {
      step?: number;
      data?: Partial<typeof defaultData>;
    };
    return {
      step: typeof parsed.step === "number" ? parsed.step : 0,
      data: {
        ...defaultData,
        ...(parsed.data ?? {}),
      },
    };
  } catch {
    return { step: 0, data: defaultData };
  }
};

export default function OnboardingFlow() {
  const router = useRouter();
  const { authUser, loading } = useAuth();
  const createProfile = useMutation(api.users.createProfile);
  const initialDraft = useMemo(() => getInitialDraft(), []);
  const [step, setStep] = useState(initialDraft.step);
  const [data, setData] = useState(initialDraft.data);

  const updateData = (newData: Partial<typeof data>) => {
    setData((prev) => ({ ...prev, ...newData }));
  };

  const nextStep = () => setStep((prev) => prev + 1);
  const prevStep = () => setStep((prev) => prev - 1);

  useEffect(() => {
    if (loading) return;
    if (!authUser) {
      router.replace("/login");
      return;
    }

  }, [authUser, loading, router]);

  useEffect(() => {
    if (!authUser) return;
    window.localStorage.setItem(
      DRAFT_STORAGE_KEY,
      JSON.stringify({
        step,
        data,
      })
    );
  }, [authUser, step, data]);

  const handleFinish = async () => {
    if (!authUser?._id) {
      router.replace("/login");
      return;
    }

    try {
      await createProfile({
        ...data,
        authUserId: authUser._id,
        name: data.name,
        age: parseInt(data.age) || 0,
        height: parseInt(data.height) || 0,
        weight: parseInt(data.weight) || 0,
        strengthTest: {
          bicepCurlWeight: Number(data.strengthTest.bicepCurlWeight),
          pushupsCount: Number(data.strengthTest.pushupsCount),
        }
      });
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      router.push('/dashboard');
    } catch (error) {
      console.error('Failed to create profile:', error);
    }
  };

  const steps = [
    {
      key: "welcome",
      headerTitle: "Welcome",
      question: "Let's build your plan",
      subtitle: "It only takes a few minutes.",
      content: <WelcomeStep onNext={nextStep} />,
      showFooter: false,
      showHeader: false,
      showProgress: false,
      isComplete: true,
    },
    {
      key: "name",
      headerTitle: "Name",
      question: "What's your name?",
      subtitle: "We'll use this to personalize your experience.",
      content: <NameStep data={data} updateData={updateData} />,
      isComplete: data.name.trim().length > 0,
    },
    {
      key: "age",
      headerTitle: "Age",
      question: "How old are you?",
      subtitle: "We use this to personalize your training plan.",
      content: <AgeStep data={data} updateData={updateData} />,
      isComplete: Number(data.age) > 0,
    },
    {
      key: "height",
      headerTitle: "Height",
      question: "What's your height?",
      subtitle: "Helps us fine-tune metrics.",
      content: <HeightStep data={data} updateData={updateData} />,
      isComplete: Number(data.height) > 0,
    },
    {
      key: "weight",
      headerTitle: "Weight",
      question: "What's your current weight?",
      subtitle: "We use this to calibrate volume and load.",
      content: <WeightStep data={data} updateData={updateData} />,
      isComplete: Number(data.weight) > 0,
    },
    {
      key: "sex",
      headerTitle: "Sex",
      question: "What's your sex?",
      subtitle: "This helps calibrate baseline recommendations.",
      content: <SexStep data={data} updateData={updateData} />,
      isComplete: Boolean(data.sex),
    },
    {
      key: "trainingExperience",
      headerTitle: "Experience Level",
      question: "What is your training level?",
      subtitle: "How experienced are you with workouts?",
      content: <TrainingExperienceStep data={data} updateData={updateData} />,
      isComplete: Boolean(data.trainingExperience),
    },
    {
      key: "trainingFrequency",
      headerTitle: "Training Frequency",
      question: "How often do you train weekly?",
      subtitle: "This helps structure your program.",
      content: <TrainingFrequencyStep data={data} updateData={updateData} />,
      isComplete: Boolean(data.trainingFrequency),
    },
    {
      key: "equipmentAccess",
      headerTitle: "Equipment Access",
      question: "What equipment can you use?",
      subtitle: "We'll tailor exercises to your setup.",
      content: <EquipmentAccessStep data={data} updateData={updateData} />,
      isComplete: Boolean(data.equipmentAccess),
    },
    {
      key: "primaryGoal",
      headerTitle: "Primary Goal",
      question: "What's your top fitness goal?",
      subtitle: "Choose the main outcome you want.",
      content: <PrimaryGoalStep data={data} updateData={updateData} />,
      isComplete: Boolean(data.primaryGoal),
    },
    {
      key: "dietType",
      headerTitle: "Diet Type",
      question: "Any diet preference?",
      subtitle: "We can adapt recommendations accordingly.",
      content: <DietTypeStep data={data} updateData={updateData} />,
      isComplete: Boolean(data.dietType),
    },
    {
      key: "dailyActivity",
      headerTitle: "Daily Activity",
      question: "How active are you daily?",
      subtitle: "Outside of workouts, how much do you move?",
      content: <DailyActivityStep data={data} updateData={updateData} />,
      isComplete: Boolean(data.dailyActivity),
    },
    {
      key: "injuryFlags",
      headerTitle: "Injury Flags",
      question: "Any injuries or limitations?",
      subtitle: "We'll adjust movements for safety.",
      content: <InjuryFlagsStep data={data} updateData={updateData} />,
      isComplete: data.injuryFlags.length > 0,
    },
    {
      key: "goalAggressiveness",
      headerTitle: "Goal Aggressiveness",
      question: "How hard should we push?",
      subtitle: "Pick your preferred pace.",
      content: <GoalAggressivenessStep data={data} updateData={updateData} />,
      isComplete: Boolean(data.goalAggressiveness),
    },
    {
      key: "timelineExpectation",
      headerTitle: "Timeline",
      question: "When do you want results?",
      subtitle: "Choose an expected timeframe.",
      content: <TimelineExpectationStep data={data} updateData={updateData} />,
      isComplete: Boolean(data.timelineExpectation),
    },
    {
      key: "recoveryCapacity",
      headerTitle: "Recovery Capacity",
      question: "How well do you recover?",
      subtitle: "We will adjust intensity and frequency.",
      content: <RecoveryCapacityStep data={data} updateData={updateData} />,
      isComplete: Boolean(data.recoveryCapacity),
    },
    {
      key: "bodyType",
      headerTitle: "Body Type",
      question: "What is your body type?",
      subtitle: "This helps us understand your metabolism and frame.",
      content: <BodyTypeStep data={data} updateData={updateData} />,
      isComplete: Boolean(data.bodyType),
    },
    {
      key: "workoutRoutine",
      headerTitle: "Workout Routine",
      question: "What routine do you follow?",
      subtitle: "Choose your preferred training structure.",
      content: <WorkoutRoutineStep data={data} updateData={updateData} />,
      isComplete: Boolean(data.workoutRoutine),
    },
    {
      key: "strengthTest",
      headerTitle: "Strength Test",
      question: "Current Strength Levels",
      subtitle: "Give us your best current performance metrics.",
      content: <StrengthTestStep data={data} updateData={updateData} />,
      isComplete: data.strengthTest.bicepCurlWeight > 0 && data.strengthTest.pushupsCount > 0,
    },
    {
      key: "additionalObjectives",
      headerTitle: "Objectives",
      question: "Any specific objectives?",
      subtitle: "Select focus areas for your short-term progress.",
      content: <AdditionalObjectivesStep data={data} updateData={updateData} />,
      isComplete: data.additionalObjectives.length > 0,
      isLast: true,
    },
  ];

  const stepConfig = steps[step];
  const isFirst = step === 0;
  const isLast = step === steps.length - 1;

  return (
    <OnboardingShell
      step={step}
      totalSteps={steps.length}
      headerTitle={stepConfig.headerTitle}
      question={stepConfig.question}
      subtitle={stepConfig.subtitle}
      onBack={isFirst ? undefined : prevStep}
      onContinue={isLast ? handleFinish : nextStep}
      showFooter={stepConfig.showFooter !== false}
      showHeader={stepConfig.showHeader !== false}
      showProgress={stepConfig.showProgress !== false}
      disableContinue={!stepConfig.isComplete}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={stepConfig.key}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="w-full h-full"
        >
          {stepConfig.content}
        </motion.div>
      </AnimatePresence>
    </OnboardingShell>
  );
}
