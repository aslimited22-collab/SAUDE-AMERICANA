"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Shield,
  Activity,
  Dumbbell,
  Heart,
  Zap,
  Check,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

// ────────────────────────────────────
// Types
// ────────────────────────────────────
interface QuizState {
  goal: string;
  gender: string;
  age: string;
  currentWeight: string;
  weightUnit: "lbs" | "kg";
  targetWeight: string;
  heightFeet: string;
  heightInches: string;
  medicalConditions: string[];
  previousAttempts: string;
  firstName: string;
  email: string;
}

const TOTAL_STEPS = 10;

// ────────────────────────────────────
// Animation variants
// ────────────────────────────────────
const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({
    x: direction > 0 ? -80 : 80,
    opacity: 0,
  }),
};

// ────────────────────────────────────
// Main Component
// ────────────────────────────────────
export default function IntakePage() {
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [disqualified, setDisqualified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [quiz, setQuiz] = useState<QuizState>({
    goal: "",
    gender: "",
    age: "",
    currentWeight: "",
    weightUnit: "lbs",
    targetWeight: "",
    heightFeet: "",
    heightInches: "",
    medicalConditions: [],
    previousAttempts: "",
    firstName: "",
    email: "",
  });

  function next() {
    setDirection(1);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }
  function back() {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 1));
  }
  function select(field: keyof QuizState, value: string) {
    setQuiz((q) => ({ ...q, [field]: value }));
    // Auto-advance for selection steps
    setTimeout(() => {
      setDirection(1);
      setStep((s) => Math.min(s + 1, TOTAL_STEPS));
    }, 300);
  }

  function toggleCondition(condition: string) {
    setQuiz((q) => {
      if (condition === "None of the above") {
        return { ...q, medicalConditions: ["None of the above"] };
      }
      const without = q.medicalConditions.filter(
        (c) => c !== "None of the above"
      );
      if (without.includes(condition)) {
        return {
          ...q,
          medicalConditions: without.filter((c) => c !== condition),
        };
      }
      return { ...q, medicalConditions: [...without, condition] };
    });
  }

  async function submitLead() {
    setLoading(true);
    try {
      await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: quiz.firstName,
          email: quiz.email,
          quizAnswers: {
            goal: quiz.goal,
            gender: quiz.gender,
            age: quiz.age,
            currentWeight: `${quiz.currentWeight} ${quiz.weightUnit}`,
            targetWeight: `${quiz.targetWeight} ${quiz.weightUnit}`,
            height: `${quiz.heightFeet}'${quiz.heightInches}"`,
            medicalConditions: quiz.medicalConditions,
            previousAttempts: quiz.previousAttempts,
          },
        }),
      });
    } catch {
      // continue even if API fails
    }
    setLoading(false);
    next();
  }

  function handleMedicalNext() {
    if (
      quiz.medicalConditions.length > 0 &&
      !quiz.medicalConditions.includes("None of the above")
    ) {
      setDisqualified(true);
    } else {
      next();
    }
  }

  // Estimated weight loss calculation
  const currentW = parseFloat(quiz.currentWeight) || 200;
  const targetW = parseFloat(quiz.targetWeight) || 170;
  const weightToLose = Math.max(currentW - targetW, 0);
  const estimatedWeeks = Math.max(Math.round(weightToLose / 2.5), 4);

  // Progress bar
  const progress = (step / TOTAL_STEPS) * 100;

  // ─── Disqualifier Screen ───
  if (disqualified) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-gray p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-yellow-100">
            <Shield className="size-8 text-yellow-600" />
          </div>
          <h2 className="mt-6 text-xl font-bold text-brand-navy">
            We want to keep you safe
          </h2>
          <p className="mt-3 text-brand-gray-dark">
            Based on your answers, GLP-1 medication may not be appropriate for
            you. We recommend speaking with your primary care physician for
            personalized guidance.
          </p>
          <Link
            href="/"
            className={buttonVariants({
              variant: "secondary",
              size: "lg",
              className: "mt-6",
            })}
          >
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-brand-gray">
      {/* Header */}
      <header className="border-b bg-white">
        <Container>
          <div className="flex h-14 items-center justify-between">
            {step > 1 && step < 10 ? (
              <button
                onClick={back}
                className="flex items-center gap-1 text-sm text-brand-gray-dark hover:text-brand-navy"
              >
                <ArrowLeft className="size-4" />
                Back
              </button>
            ) : (
              <Link href="/" className="text-lg font-bold text-brand-navy">
                Slim<span className="text-brand-teal">Rx</span>
              </Link>
            )}
            <div className="flex items-center gap-2 text-xs text-brand-gray-dark">
              <Shield className="size-3.5 text-brand-teal" />
              Secure & Confidential
            </div>
          </div>
        </Container>
        {/* Progress bar */}
        <div className="h-1 bg-gray-200">
          <motion.div
            className="h-full bg-brand-teal"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </header>

      {/* Content */}
      <main className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25 }}
            >
              {step === 1 && <StepGoal quiz={quiz} onSelect={(v) => select("goal", v)} />}
              {step === 2 && <StepGender quiz={quiz} onSelect={(v) => select("gender", v)} />}
              {step === 3 && <StepAge quiz={quiz} onSelect={(v) => select("age", v)} />}
              {step === 4 && <StepCurrentWeight quiz={quiz} setQuiz={setQuiz} onNext={next} />}
              {step === 5 && <StepTargetWeight quiz={quiz} setQuiz={setQuiz} onNext={next} />}
              {step === 6 && <StepHeight quiz={quiz} setQuiz={setQuiz} onNext={next} />}
              {step === 7 && (
                <StepMedical
                  quiz={quiz}
                  toggleCondition={toggleCondition}
                  onNext={handleMedicalNext}
                />
              )}
              {step === 8 && (
                <StepPreviousAttempts quiz={quiz} onSelect={(v) => select("previousAttempts", v)} />
              )}
              {step === 9 && (
                <StepEmail
                  quiz={quiz}
                  setQuiz={setQuiz}
                  onSubmit={submitLead}
                  loading={loading}
                />
              )}
              {step === 10 && (
                <StepPlan
                  firstName={quiz.firstName}
                  currentWeight={currentW}
                  targetWeight={targetW}
                  weightToLose={weightToLose}
                  estimatedWeeks={estimatedWeeks}
                  unit={quiz.weightUnit}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

// ────────────────────────────────────
// Step Components
// ────────────────────────────────────

function QuestionCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-lg md:p-8">{children}</div>
  );
}

function StepGoal({
  quiz,
  onSelect,
}: {
  quiz: QuizState;
  onSelect: (v: string) => void;
}) {
  const options = [
    { icon: Activity, label: "Lose Weight", value: "lose_weight" },
    { icon: Dumbbell, label: "Build Muscle & Lose Fat", value: "build_muscle" },
    { icon: Heart, label: "Improve Overall Health", value: "improve_health" },
    { icon: Zap, label: "Boost Energy & Metabolism", value: "boost_energy" },
  ];
  return (
    <QuestionCard>
      <h2 className="text-center text-xl font-bold text-brand-navy md:text-2xl">
        What is your primary goal?
      </h2>
      <div className="mt-6 grid gap-3">
        {options.map((o) => (
          <button
            key={o.value}
            onClick={() => onSelect(o.value)}
            className={`flex items-center gap-4 rounded-xl border-2 p-4 text-left transition-all hover:border-brand-teal ${
              quiz.goal === o.value
                ? "border-brand-teal bg-brand-teal-light"
                : "border-gray-200"
            }`}
          >
            <o.icon className="size-6 text-brand-teal" />
            <span className="font-medium text-brand-navy">{o.label}</span>
          </button>
        ))}
      </div>
    </QuestionCard>
  );
}

function StepGender({
  quiz,
  onSelect,
}: {
  quiz: QuizState;
  onSelect: (v: string) => void;
}) {
  const options = ["Male", "Female", "Prefer not to say"];
  return (
    <QuestionCard>
      <h2 className="text-center text-xl font-bold text-brand-navy md:text-2xl">
        What is your biological sex?
      </h2>
      <div className="mt-6 grid gap-3">
        {options.map((o) => (
          <button
            key={o}
            onClick={() => onSelect(o)}
            className={`rounded-xl border-2 p-4 text-left font-medium transition-all hover:border-brand-teal ${
              quiz.gender === o
                ? "border-brand-teal bg-brand-teal-light text-brand-navy"
                : "border-gray-200 text-brand-navy"
            }`}
          >
            {o}
          </button>
        ))}
      </div>
    </QuestionCard>
  );
}

function StepAge({
  quiz,
  onSelect,
}: {
  quiz: QuizState;
  onSelect: (v: string) => void;
}) {
  const options = ["18–29", "30–39", "40–49", "50–59", "60+"];
  return (
    <QuestionCard>
      <h2 className="text-center text-xl font-bold text-brand-navy md:text-2xl">
        How old are you?
      </h2>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {options.map((o) => (
          <button
            key={o}
            onClick={() => onSelect(o)}
            className={`rounded-xl border-2 p-4 font-medium transition-all hover:border-brand-teal ${
              quiz.age === o
                ? "border-brand-teal bg-brand-teal-light text-brand-navy"
                : "border-gray-200 text-brand-navy"
            }`}
          >
            {o}
          </button>
        ))}
      </div>
    </QuestionCard>
  );
}

function StepCurrentWeight({
  quiz,
  setQuiz,
  onNext,
}: {
  quiz: QuizState;
  setQuiz: React.Dispatch<React.SetStateAction<QuizState>>;
  onNext: () => void;
}) {
  return (
    <QuestionCard>
      <h2 className="text-center text-xl font-bold text-brand-navy md:text-2xl">
        What is your current weight?
      </h2>
      <p className="mt-2 text-center text-sm text-brand-gray-dark">
        This helps us personalize your plan
      </p>
      <div className="mt-6">
        <div className="flex items-center gap-3">
          <input
            type="number"
            value={quiz.currentWeight}
            onChange={(e) =>
              setQuiz((q) => ({ ...q, currentWeight: e.target.value }))
            }
            placeholder="e.g. 200"
            className="w-full rounded-xl border-2 border-gray-200 p-4 text-center text-2xl font-bold text-brand-navy outline-none focus:border-brand-teal"
          />
          <select
            value={quiz.weightUnit}
            onChange={(e) =>
              setQuiz((q) => ({
                ...q,
                weightUnit: e.target.value as "lbs" | "kg",
              }))
            }
            className="rounded-xl border-2 border-gray-200 p-4 text-brand-navy outline-none focus:border-brand-teal"
          >
            <option value="lbs">lbs</option>
            <option value="kg">kg</option>
          </select>
        </div>
        <Button
          variant="primary"
          size="lg"
          className="mt-6 h-12 w-full text-base"
          onClick={onNext}
          disabled={!quiz.currentWeight}
        >
          Continue
        </Button>
      </div>
    </QuestionCard>
  );
}

function StepTargetWeight({
  quiz,
  setQuiz,
  onNext,
}: {
  quiz: QuizState;
  setQuiz: React.Dispatch<React.SetStateAction<QuizState>>;
  onNext: () => void;
}) {
  return (
    <QuestionCard>
      <h2 className="text-center text-xl font-bold text-brand-navy md:text-2xl">
        What is your goal weight?
      </h2>
      <div className="mt-6">
        <div className="flex items-center gap-3">
          <input
            type="number"
            value={quiz.targetWeight}
            onChange={(e) =>
              setQuiz((q) => ({ ...q, targetWeight: e.target.value }))
            }
            placeholder="e.g. 170"
            className="w-full rounded-xl border-2 border-gray-200 p-4 text-center text-2xl font-bold text-brand-navy outline-none focus:border-brand-teal"
          />
          <span className="text-lg font-medium text-brand-gray-dark">
            {quiz.weightUnit}
          </span>
        </div>
        <Button
          variant="primary"
          size="lg"
          className="mt-6 h-12 w-full text-base"
          onClick={onNext}
          disabled={!quiz.targetWeight}
        >
          Continue
        </Button>
      </div>
    </QuestionCard>
  );
}

function StepHeight({
  quiz,
  setQuiz,
  onNext,
}: {
  quiz: QuizState;
  setQuiz: React.Dispatch<React.SetStateAction<QuizState>>;
  onNext: () => void;
}) {
  return (
    <QuestionCard>
      <h2 className="text-center text-xl font-bold text-brand-navy md:text-2xl">
        What is your height?
      </h2>
      <div className="mt-6 flex items-center justify-center gap-3">
        <div className="text-center">
          <input
            type="number"
            value={quiz.heightFeet}
            onChange={(e) =>
              setQuiz((q) => ({ ...q, heightFeet: e.target.value }))
            }
            placeholder="5"
            min={3}
            max={8}
            className="w-20 rounded-xl border-2 border-gray-200 p-4 text-center text-2xl font-bold text-brand-navy outline-none focus:border-brand-teal"
          />
          <p className="mt-1 text-xs text-brand-gray-dark">feet</p>
        </div>
        <div className="text-center">
          <input
            type="number"
            value={quiz.heightInches}
            onChange={(e) =>
              setQuiz((q) => ({ ...q, heightInches: e.target.value }))
            }
            placeholder="8"
            min={0}
            max={11}
            className="w-20 rounded-xl border-2 border-gray-200 p-4 text-center text-2xl font-bold text-brand-navy outline-none focus:border-brand-teal"
          />
          <p className="mt-1 text-xs text-brand-gray-dark">inches</p>
        </div>
      </div>
      <Button
        variant="primary"
        size="lg"
        className="mt-6 h-12 w-full text-base"
        onClick={onNext}
        disabled={!quiz.heightFeet}
      >
        Continue
      </Button>
    </QuestionCard>
  );
}

function StepMedical({
  quiz,
  toggleCondition,
  onNext,
}: {
  quiz: QuizState;
  toggleCondition: (c: string) => void;
  onNext: () => void;
}) {
  const conditions = [
    "Type 1 Diabetes",
    "History of pancreatitis",
    "Thyroid cancer (personal or family)",
    "Multiple Endocrine Neoplasia (MEN 2)",
    "None of the above",
  ];
  return (
    <QuestionCard>
      <h2 className="text-center text-xl font-bold text-brand-navy md:text-2xl">
        Have you been diagnosed with any of the following?
      </h2>
      <div className="mt-6 grid gap-3">
        {conditions.map((c) => (
          <button
            key={c}
            onClick={() => toggleCondition(c)}
            className={`flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all ${
              quiz.medicalConditions.includes(c)
                ? c === "None of the above"
                  ? "border-brand-teal bg-brand-teal-light"
                  : "border-red-400 bg-red-50"
                : "border-gray-200 hover:border-brand-teal"
            }`}
          >
            <div
              className={`flex size-5 shrink-0 items-center justify-center rounded border-2 ${
                quiz.medicalConditions.includes(c)
                  ? "border-brand-teal bg-brand-teal text-white"
                  : "border-gray-300"
              }`}
            >
              {quiz.medicalConditions.includes(c) && (
                <Check className="size-3" />
              )}
            </div>
            <span className="text-sm font-medium text-brand-navy">{c}</span>
          </button>
        ))}
      </div>
      <Button
        variant="primary"
        size="lg"
        className="mt-6 h-12 w-full text-base"
        onClick={onNext}
        disabled={quiz.medicalConditions.length === 0}
      >
        Continue
      </Button>
    </QuestionCard>
  );
}

function StepPreviousAttempts({
  quiz,
  onSelect,
}: {
  quiz: QuizState;
  onSelect: (v: string) => void;
}) {
  const options = [
    "Yes, diet and exercise alone",
    "Yes, with medication or surgery",
    "No, this is my first attempt",
  ];
  return (
    <QuestionCard>
      <h2 className="text-center text-xl font-bold text-brand-navy md:text-2xl">
        Have you tried losing weight before?
      </h2>
      <div className="mt-6 grid gap-3">
        {options.map((o) => (
          <button
            key={o}
            onClick={() => onSelect(o)}
            className={`rounded-xl border-2 p-4 text-left font-medium transition-all hover:border-brand-teal ${
              quiz.previousAttempts === o
                ? "border-brand-teal bg-brand-teal-light text-brand-navy"
                : "border-gray-200 text-brand-navy"
            }`}
          >
            {o}
          </button>
        ))}
      </div>
    </QuestionCard>
  );
}

function StepEmail({
  quiz,
  setQuiz,
  onSubmit,
  loading,
}: {
  quiz: QuizState;
  setQuiz: React.Dispatch<React.SetStateAction<QuizState>>;
  onSubmit: () => void;
  loading: boolean;
}) {
  const valid = quiz.firstName.trim().length > 0 && quiz.email.includes("@");
  return (
    <QuestionCard>
      <h2 className="text-center text-xl font-bold text-brand-navy md:text-2xl">
        Where should we send your personalized plan?
      </h2>
      <div className="mt-6 space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-brand-navy">
            First Name
          </label>
          <input
            type="text"
            value={quiz.firstName}
            onChange={(e) =>
              setQuiz((q) => ({ ...q, firstName: e.target.value }))
            }
            placeholder="John"
            className="w-full rounded-xl border-2 border-gray-200 p-3 text-brand-navy outline-none focus:border-brand-teal"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-brand-navy">
            Email Address
          </label>
          <input
            type="email"
            value={quiz.email}
            onChange={(e) =>
              setQuiz((q) => ({ ...q, email: e.target.value }))
            }
            placeholder="john@example.com"
            className="w-full rounded-xl border-2 border-gray-200 p-3 text-brand-navy outline-none focus:border-brand-teal"
          />
        </div>
        <p className="flex items-center gap-1.5 text-xs text-brand-gray-dark">
          <Shield className="size-3.5 text-brand-teal" />
          Your information is secure and never shared.
        </p>
        <Button
          variant="primary"
          size="lg"
          className="h-12 w-full text-base"
          onClick={onSubmit}
          disabled={!valid || loading}
        >
          {loading ? "Saving..." : "See My Plan"}
        </Button>
      </div>
    </QuestionCard>
  );
}

// ────────────────────────────────────
// Step 10 — Plan & Pricing
// ────────────────────────────────────
function StepPlan({
  firstName,
  currentWeight,
  targetWeight,
  weightToLose,
  estimatedWeeks,
  unit,
}: {
  firstName: string;
  currentWeight: number;
  targetWeight: number;
  weightToLose: number;
  estimatedWeeks: number;
  unit: string;
}) {
  const plans = [
    {
      name: "Starter",
      price: 197,
      slug: "starter",
      badge: false,
      features: [
        "GLP-1 medication included",
        "Monthly provider check-in",
        "Email support",
      ],
    },
    {
      name: "Most Popular",
      price: 297,
      slug: "popular",
      badge: true,
      features: [
        "GLP-1 medication included",
        "Bi-weekly provider check-in",
        "Priority 24/7 support",
        "Patient portal access",
        "Weight loss guarantee",
      ],
    },
    {
      name: "Premium",
      price: 397,
      slug: "premium",
      badge: false,
      features: [
        "GLP-1 medication included",
        "Weekly provider check-in",
        "Priority 24/7 support",
        "Patient portal access",
        "Dedicated care coach",
        "Nutrition guidance",
        "Weight loss guarantee",
      ],
    },
  ];

  return (
    <div className="max-w-3xl">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-brand-navy md:text-3xl">
          Great news, {firstName}! You qualify.
        </h2>
        {/* Stats card */}
        <div className="mx-auto mt-6 flex max-w-sm items-center justify-center gap-4 rounded-xl bg-white p-5 shadow-md">
          <div className="text-center">
            <p className="text-2xl font-bold text-brand-navy">
              {currentWeight}
              <span className="text-sm font-normal"> {unit}</span>
            </p>
            <p className="text-xs text-brand-gray-dark">Current</p>
          </div>
          <div className="text-brand-teal">→</div>
          <div className="text-center">
            <p className="text-2xl font-bold text-brand-teal">
              {targetWeight}
              <span className="text-sm font-normal"> {unit}</span>
            </p>
            <p className="text-xs text-brand-gray-dark">Goal</p>
          </div>
        </div>
        <p className="mt-3 text-sm text-brand-gray-dark">
          Estimated timeline: <strong>~{estimatedWeeks} weeks</strong> to lose{" "}
          <strong>
            {weightToLose} {unit}
          </strong>
        </p>
        <p className="mt-1 text-sm font-semibold text-brand-teal">
          Doctor-Guided GLP-1 Program
        </p>
      </div>

      {/* Pricing cards */}
      <div className="mt-8 grid gap-4 md:grid-cols-3" id="pricing">
        {plans.map((plan) => (
          <div
            key={plan.slug}
            className={`relative rounded-2xl bg-white p-6 shadow-md ${
              plan.badge
                ? "ring-2 ring-brand-teal"
                : "border border-gray-200"
            }`}
          >
            {plan.badge && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-teal px-4 py-1 text-xs font-bold text-brand-navy">
                Most Popular
              </span>
            )}
            <h3 className="text-lg font-bold text-brand-navy">{plan.name}</h3>
            <p className="mt-1">
              <span className="text-3xl font-bold text-brand-navy">
                ${plan.price}
              </span>
              <span className="text-sm text-brand-gray-dark">/month</span>
            </p>
            <ul className="mt-4 space-y-2">
              {plan.features.map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-2 text-sm text-brand-gray-dark"
                >
                  <Check className="mt-0.5 size-4 shrink-0 text-brand-teal" />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href={`/checkout?plan=${plan.slug}`}
              className={buttonVariants({
                variant: plan.badge ? "primary" : "secondary",
                size: "lg",
                className: "mt-6 h-11 w-full text-sm",
              })}
            >
              {plan.badge ? "Get Started — Most Popular" : "Get Started"}
            </Link>
          </div>
        ))}
      </div>

      {/* Trust row */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-brand-gray-dark">
        <span className="flex items-center gap-1">
          <Shield className="size-3.5 text-brand-teal" /> Secure checkout
        </span>
        <span>•</span>
        <span>30-day money-back guarantee</span>
        <span>•</span>
        <span>Cancel anytime</span>
      </div>
    </div>
  );
}
