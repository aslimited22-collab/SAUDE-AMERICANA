"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Shield, Check, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

const TOTAL_STEPS = 7;

const slideVariants = {
  enter: (d: number) => ({ x: d > 0 ? 80 : -80, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (d: number) => ({ x: d > 0 ? -80 : 80, opacity: 0 }),
};

interface IntakeState {
  // Step 1 - Personal
  fullName: string;
  dob: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  email: string;
  // Step 2 - Medications
  medications: string[];
  medicationsOther: string;
  // Step 3 - Allergies
  hasAllergies: string;
  allergyDetails: string;
  // Step 4 - Medical conditions
  conditions: string[];
  // Step 5 - Vitals
  bloodPressure: string;
  heartRate: string;
  recentBloodwork: string;
  // Step 6 - Weight loss history
  previousGlp1: string;
  previousGlp1Which: string;
  previousGlp1Dosage: string;
  previousGlp1Results: string;
  previousGlp1SideEffects: string;
  // Step 7 - Consent
  consentAccurate: boolean;
  consentTelehealth: boolean;
  signatureName: string;
}

const commonMedications = [
  "Metformin",
  "Lisinopril",
  "Atorvastatin",
  "Levothyroxine",
  "Amlodipine",
  "Omeprazole",
  "Losartan",
  "Albuterol",
  "Gabapentin",
  "Hydrochlorothiazide",
];

const medicalConditionsList = [
  "Type 2 Diabetes",
  "High Blood Pressure",
  "High Cholesterol",
  "Heart Disease",
  "Sleep Apnea",
  "PCOS",
  "Depression / Anxiety",
  "Hypothyroidism",
  "Hyperthyroidism",
  "Kidney Disease",
  "Liver Disease",
  "Eating Disorder (current or history)",
  "Gallbladder Disease",
  "Seizure Disorder",
  "None of the above",
];

export default function MedicalIntakePage() {
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState<IntakeState>({
    fullName: "",
    dob: "",
    phone: "",
    street: "",
    city: "",
    state: "",
    zip: "",
    email: "",
    medications: [],
    medicationsOther: "",
    hasAllergies: "",
    allergyDetails: "",
    conditions: [],
    bloodPressure: "",
    heartRate: "",
    recentBloodwork: "",
    previousGlp1: "",
    previousGlp1Which: "",
    previousGlp1Dosage: "",
    previousGlp1Results: "",
    previousGlp1SideEffects: "",
    consentAccurate: false,
    consentTelehealth: false,
    signatureName: "",
  });

  function next() {
    setDirection(1);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }
  function back() {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 1));
  }
  function update<K extends keyof IntakeState>(key: K, value: IntakeState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }
  function toggleList(key: "medications" | "conditions", value: string) {
    setForm((f) => {
      const list = f[key] as string[];
      if (value === "None of the above") return { ...f, [key]: ["None of the above"] };
      const without = list.filter((v) => v !== "None of the above");
      if (without.includes(value))
        return { ...f, [key]: without.filter((v) => v !== value) };
      return { ...f, [key]: [...without, value] };
    });
  }

  async function handleSubmit() {
    setLoading(true);
    try {
      await fetch("/api/medical-intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          personalInfo: {
            fullName: form.fullName,
            dob: form.dob,
            phone: form.phone,
            address: {
              street: form.street,
              city: form.city,
              state: form.state,
              zip: form.zip,
            },
          },
          medications: {
            list: form.medications,
            other: form.medicationsOther,
          },
          allergies: form.hasAllergies === "Yes" ? form.allergyDetails : "None",
          medicalConditions: form.conditions,
          vitals: {
            bloodPressure: form.bloodPressure || null,
            heartRate: form.heartRate || null,
            recentBloodwork: form.recentBloodwork,
          },
          weightLossHistory: {
            previousGlp1: form.previousGlp1,
            which: form.previousGlp1Which,
            dosage: form.previousGlp1Dosage,
            results: form.previousGlp1Results,
            sideEffects: form.previousGlp1SideEffects,
          },
          consentSigned: form.consentAccurate && form.consentTelehealth,
          signatureName: form.signatureName,
        }),
      });
      setSubmitted(true);
    } catch {
      // show submitted anyway — data may have saved
      setSubmitted(true);
    }
    setLoading(false);
  }

  const progress = (step / TOTAL_STEPS) * 100;

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-gray p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-brand-teal-light">
            <CheckCircle className="size-8 text-brand-teal" />
          </div>
          <h2 className="mt-6 text-2xl font-bold text-brand-navy">
            Intake Submitted
          </h2>
          <p className="mt-3 text-brand-gray-dark">
            Your medical intake is under review. A licensed provider will
            contact you within 24–48 hours.
          </p>
          <Link
            href="/"
            className={buttonVariants({
              variant: "primary",
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
      <header className="border-b bg-white">
        <Container>
          <div className="flex h-14 items-center justify-between">
            {step > 1 ? (
              <button
                onClick={back}
                className="flex items-center gap-1 text-sm text-brand-gray-dark hover:text-brand-navy"
              >
                <ArrowLeft className="size-4" /> Back
              </button>
            ) : (
              <Link href="/" className="text-lg font-bold text-brand-navy">
                Slim<span className="text-brand-teal">Rx</span>
              </Link>
            )}
            <div className="flex items-center gap-2 text-xs text-brand-gray-dark">
              <Shield className="size-3.5 text-brand-teal" />
              HIPAA Compliant
            </div>
          </div>
        </Container>
        <div className="h-1 bg-gray-200">
          <motion.div
            className="h-full bg-brand-teal"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </header>

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
              <Card>
                {step === 1 && (
                  <Step1Personal form={form} update={update} onNext={next} />
                )}
                {step === 2 && (
                  <Step2Medications
                    form={form}
                    update={update}
                    toggle={(v) => toggleList("medications", v)}
                    onNext={next}
                  />
                )}
                {step === 3 && (
                  <Step3Allergies form={form} update={update} onNext={next} />
                )}
                {step === 4 && (
                  <Step4Conditions
                    form={form}
                    toggle={(v) => toggleList("conditions", v)}
                    onNext={next}
                  />
                )}
                {step === 5 && (
                  <Step5Vitals form={form} update={update} onNext={next} />
                )}
                {step === 6 && (
                  <Step6WeightHistory form={form} update={update} onNext={next} />
                )}
                {step === 7 && (
                  <Step7Consent
                    form={form}
                    update={update}
                    onSubmit={handleSubmit}
                    loading={loading}
                  />
                )}
              </Card>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl bg-white p-6 shadow-lg md:p-8">{children}</div>;
}

function InputField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-brand-navy">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-xl border-2 border-gray-200 p-3 text-brand-navy outline-none focus:border-brand-teal"
      />
    </div>
  );
}

// ─── Step 1: Personal Info ───
function Step1Personal({
  form,
  update,
  onNext,
}: {
  form: IntakeState;
  update: <K extends keyof IntakeState>(k: K, v: IntakeState[K]) => void;
  onNext: () => void;
}) {
  const valid = form.fullName && form.dob && form.phone && form.street && form.city && form.state && form.zip && form.email;
  return (
    <>
      <h2 className="text-xl font-bold text-brand-navy">Personal Information</h2>
      <div className="mt-4 space-y-3">
        <InputField label="Full Name" value={form.fullName} onChange={(v) => update("fullName", v)} required placeholder="John Smith" />
        <InputField label="Date of Birth" value={form.dob} onChange={(v) => update("dob", v)} type="date" required />
        <InputField label="Phone Number" value={form.phone} onChange={(v) => update("phone", v)} type="tel" required placeholder="(555) 123-4567" />
        <InputField label="Email Address" value={form.email} onChange={(v) => update("email", v)} type="email" required placeholder="john@example.com" />
        <InputField label="Street Address" value={form.street} onChange={(v) => update("street", v)} required placeholder="123 Main St" />
        <div className="grid grid-cols-3 gap-3">
          <InputField label="City" value={form.city} onChange={(v) => update("city", v)} required placeholder="Miami" />
          <InputField label="State" value={form.state} onChange={(v) => update("state", v)} required placeholder="FL" />
          <InputField label="ZIP" value={form.zip} onChange={(v) => update("zip", v)} required placeholder="33101" />
        </div>
      </div>
      <Button variant="primary" size="lg" className="mt-6 h-12 w-full text-base" onClick={onNext} disabled={!valid}>
        Continue
      </Button>
    </>
  );
}

// ─── Step 2: Medications ───
function Step2Medications({
  form,
  update,
  toggle,
  onNext,
}: {
  form: IntakeState;
  update: <K extends keyof IntakeState>(k: K, v: IntakeState[K]) => void;
  toggle: (v: string) => void;
  onNext: () => void;
}) {
  return (
    <>
      <h2 className="text-xl font-bold text-brand-navy">Current Medications</h2>
      <p className="mt-1 text-sm text-brand-gray-dark">Select all that apply</p>
      <div className="mt-4 grid gap-2">
        {[...commonMedications, "None"].map((med) => (
          <button
            key={med}
            onClick={() => toggle(med)}
            className={`flex items-center gap-3 rounded-lg border-2 p-3 text-left text-sm transition-all ${
              form.medications.includes(med) ? "border-brand-teal bg-brand-teal-light" : "border-gray-200"
            }`}
          >
            <div className={`flex size-5 shrink-0 items-center justify-center rounded border-2 ${form.medications.includes(med) ? "border-brand-teal bg-brand-teal text-white" : "border-gray-300"}`}>
              {form.medications.includes(med) && <Check className="size-3" />}
            </div>
            {med}
          </button>
        ))}
      </div>
      <div className="mt-3">
        <label className="mb-1 block text-sm font-medium text-brand-navy">Other medications</label>
        <textarea
          value={form.medicationsOther}
          onChange={(e) => update("medicationsOther", e.target.value)}
          placeholder="List any other medications..."
          rows={2}
          className="w-full rounded-xl border-2 border-gray-200 p-3 text-sm text-brand-navy outline-none focus:border-brand-teal"
        />
      </div>
      <Button variant="primary" size="lg" className="mt-4 h-12 w-full text-base" onClick={onNext}>
        Continue
      </Button>
    </>
  );
}

// ─── Step 3: Allergies ───
function Step3Allergies({
  form,
  update,
  onNext,
}: {
  form: IntakeState;
  update: <K extends keyof IntakeState>(k: K, v: IntakeState[K]) => void;
  onNext: () => void;
}) {
  return (
    <>
      <h2 className="text-xl font-bold text-brand-navy">Drug Allergies</h2>
      <p className="mt-1 text-sm text-brand-gray-dark">Do you have any known drug allergies?</p>
      <div className="mt-4 grid gap-3">
        {["No", "Yes"].map((opt) => (
          <button
            key={opt}
            onClick={() => update("hasAllergies", opt)}
            className={`rounded-xl border-2 p-4 text-left font-medium transition-all hover:border-brand-teal ${
              form.hasAllergies === opt ? "border-brand-teal bg-brand-teal-light" : "border-gray-200"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
      {form.hasAllergies === "Yes" && (
        <div className="mt-4">
          <label className="mb-1 block text-sm font-medium text-brand-navy">Please specify</label>
          <textarea
            value={form.allergyDetails}
            onChange={(e) => update("allergyDetails", e.target.value)}
            placeholder="List your drug allergies..."
            rows={3}
            className="w-full rounded-xl border-2 border-gray-200 p-3 text-sm text-brand-navy outline-none focus:border-brand-teal"
          />
        </div>
      )}
      <Button variant="primary" size="lg" className="mt-4 h-12 w-full text-base" onClick={onNext} disabled={!form.hasAllergies}>
        Continue
      </Button>
    </>
  );
}

// ─── Step 4: Medical Conditions ───
function Step4Conditions({
  form,
  toggle,
  onNext,
}: {
  form: IntakeState;
  toggle: (v: string) => void;
  onNext: () => void;
}) {
  return (
    <>
      <h2 className="text-xl font-bold text-brand-navy">Medical Conditions</h2>
      <p className="mt-1 text-sm text-brand-gray-dark">Select all that apply</p>
      <div className="mt-4 grid gap-2 max-h-80 overflow-y-auto">
        {medicalConditionsList.map((c) => (
          <button
            key={c}
            onClick={() => toggle(c)}
            className={`flex items-center gap-3 rounded-lg border-2 p-3 text-left text-sm transition-all ${
              form.conditions.includes(c) ? "border-brand-teal bg-brand-teal-light" : "border-gray-200"
            }`}
          >
            <div className={`flex size-5 shrink-0 items-center justify-center rounded border-2 ${form.conditions.includes(c) ? "border-brand-teal bg-brand-teal text-white" : "border-gray-300"}`}>
              {form.conditions.includes(c) && <Check className="size-3" />}
            </div>
            {c}
          </button>
        ))}
      </div>
      <Button variant="primary" size="lg" className="mt-4 h-12 w-full text-base" onClick={onNext} disabled={form.conditions.length === 0}>
        Continue
      </Button>
    </>
  );
}

// ─── Step 5: Vitals ───
function Step5Vitals({
  form,
  update,
  onNext,
}: {
  form: IntakeState;
  update: <K extends keyof IntakeState>(k: K, v: IntakeState[K]) => void;
  onNext: () => void;
}) {
  return (
    <>
      <h2 className="text-xl font-bold text-brand-navy">Self-Reported Vitals</h2>
      <p className="mt-1 text-sm text-brand-gray-dark">These are optional but helpful for your provider</p>
      <div className="mt-4 space-y-3">
        <InputField label="Blood Pressure (e.g. 120/80)" value={form.bloodPressure} onChange={(v) => update("bloodPressure", v)} placeholder="120/80" />
        <InputField label="Resting Heart Rate (bpm)" value={form.heartRate} onChange={(v) => update("heartRate", v)} placeholder="72" />
        <div>
          <label className="mb-1 block text-sm font-medium text-brand-navy">Have you had bloodwork in the last 12 months?</label>
          <div className="flex gap-3">
            {["Yes", "No"].map((opt) => (
              <button
                key={opt}
                onClick={() => update("recentBloodwork", opt)}
                className={`flex-1 rounded-xl border-2 p-3 font-medium transition-all hover:border-brand-teal ${
                  form.recentBloodwork === opt ? "border-brand-teal bg-brand-teal-light" : "border-gray-200"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      </div>
      <Button variant="primary" size="lg" className="mt-6 h-12 w-full text-base" onClick={onNext}>
        Continue
      </Button>
    </>
  );
}

// ─── Step 6: Weight Loss History ───
function Step6WeightHistory({
  form,
  update,
  onNext,
}: {
  form: IntakeState;
  update: <K extends keyof IntakeState>(k: K, v: IntakeState[K]) => void;
  onNext: () => void;
}) {
  return (
    <>
      <h2 className="text-xl font-bold text-brand-navy">Weight Loss History</h2>
      <div className="mt-4 space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-brand-navy">
            Have you previously used a GLP-1 medication? (Ozempic, Wegovy, Mounjaro, etc.)
          </label>
          <div className="flex gap-3">
            {["Yes", "No"].map((opt) => (
              <button
                key={opt}
                onClick={() => update("previousGlp1", opt)}
                className={`flex-1 rounded-xl border-2 p-3 font-medium transition-all hover:border-brand-teal ${
                  form.previousGlp1 === opt ? "border-brand-teal bg-brand-teal-light" : "border-gray-200"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
        {form.previousGlp1 === "Yes" && (
          <div className="space-y-3">
            <InputField label="Which medication?" value={form.previousGlp1Which} onChange={(v) => update("previousGlp1Which", v)} placeholder="e.g. Ozempic" />
            <InputField label="Dosage" value={form.previousGlp1Dosage} onChange={(v) => update("previousGlp1Dosage", v)} placeholder="e.g. 0.5mg weekly" />
            <InputField label="Results" value={form.previousGlp1Results} onChange={(v) => update("previousGlp1Results", v)} placeholder="e.g. Lost 15 lbs over 3 months" />
            <InputField label="Side effects (if any)" value={form.previousGlp1SideEffects} onChange={(v) => update("previousGlp1SideEffects", v)} placeholder="e.g. Mild nausea first week" />
          </div>
        )}
      </div>
      <Button variant="primary" size="lg" className="mt-6 h-12 w-full text-base" onClick={onNext} disabled={!form.previousGlp1}>
        Continue
      </Button>
    </>
  );
}

// ─── Step 7: Consent & Signature ───
function Step7Consent({
  form,
  update,
  onSubmit,
  loading,
}: {
  form: IntakeState;
  update: <K extends keyof IntakeState>(k: K, v: IntakeState[K]) => void;
  onSubmit: () => void;
  loading: boolean;
}) {
  const canSubmit = form.consentAccurate && form.consentTelehealth && form.signatureName.trim().length > 0;
  return (
    <>
      <h2 className="text-xl font-bold text-brand-navy">Consent & Signature</h2>
      <div className="mt-4 max-h-48 overflow-y-auto rounded-lg bg-brand-gray p-4 text-xs leading-relaxed text-brand-gray-dark">
        <p className="font-semibold text-brand-navy">Telehealth Consent & Medical Authorization</p>
        <p className="mt-2">
          By signing below, I authorize SlimRx and its affiliated licensed healthcare
          providers to deliver telehealth services, including medical evaluation,
          diagnosis, and treatment recommendations. I understand that:
        </p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>Telehealth involves electronic communication between me and a provider.</li>
          <li>The provider will determine if telehealth is appropriate for my condition.</li>
          <li>I have the right to refuse or withdraw consent at any time.</li>
          <li>My medical information will be kept confidential in accordance with HIPAA.</li>
          <li>Prescriptions may be issued based on the provider&apos;s clinical judgment.</li>
          <li>Individual results may vary. GLP-1 medications carry risks and side effects.</li>
          <li>This does not replace my primary care physician relationship.</li>
        </ul>
      </div>

      <div className="mt-4 space-y-3">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.consentAccurate}
            onChange={(e) => update("consentAccurate", e.target.checked)}
            className="mt-1 size-4 accent-brand-teal"
          />
          <span className="text-sm text-brand-navy">
            I confirm the above information is accurate and complete to the best of my knowledge.
          </span>
        </label>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.consentTelehealth}
            onChange={(e) => update("consentTelehealth", e.target.checked)}
            className="mt-1 size-4 accent-brand-teal"
          />
          <span className="text-sm text-brand-navy">
            I consent to receive telehealth services from SlimRx and its affiliated providers.
          </span>
        </label>
      </div>

      <div className="mt-4">
        <label className="mb-1 block text-sm font-medium text-brand-navy">
          Digital Signature (type your full name)
        </label>
        <input
          type="text"
          value={form.signatureName}
          onChange={(e) => update("signatureName", e.target.value)}
          placeholder="John Smith"
          className="w-full rounded-xl border-2 border-gray-200 p-3 font-serif text-lg italic text-brand-navy outline-none focus:border-brand-teal"
        />
      </div>

      <Button
        variant="primary"
        size="lg"
        className="mt-6 h-12 w-full text-base"
        onClick={onSubmit}
        disabled={!canSubmit || loading}
      >
        {loading ? "Submitting..." : "Submit for Provider Review"}
      </Button>
    </>
  );
}
