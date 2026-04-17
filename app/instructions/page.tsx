import type { Metadata } from "next";
import Link from "next/link";
import {
  Syringe,
  Thermometer,
  AlertTriangle,
  Phone,
  CheckCircle2,
  Clock,
  Droplet,
  ShieldCheck,
} from "lucide-react";
import { NavBar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";

export const metadata: Metadata = {
  title: "How to Take Your GLP-1 Medication",
  description:
    "Step-by-step guide for your first dose: storage, injection technique, timing, common side effects, and when to contact your provider.",
  robots: { index: false, follow: false }, // patient-only content
};

export default function InstructionsPage() {
  return (
    <>
      <NavBar />
      <main className="flex-1">
        {/* Hero */}
        <Section className="bg-gradient-to-b from-brand-navy to-[#0f2440] py-16 text-white">
          <Container>
            <div className="mx-auto max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-brand-teal-light/20 px-4 py-1.5 text-sm font-medium text-brand-teal-light">
                <Syringe className="size-4" />
                Medication guide
              </div>
              <h1 className="mt-4 font-heading text-4xl font-bold md:text-5xl">
                Your first GLP-1 dose
              </h1>
              <p className="mt-4 text-lg text-brand-gray">
                A short, clear guide to starting your weekly injection safely.
                Read this before your first dose. Keep it handy — you&apos;ll
                refer back to it.
              </p>
            </div>
          </Container>
        </Section>

        {/* Important: not medical advice banner */}
        <Section className="py-8">
          <Container>
            <div className="mx-auto max-w-3xl rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex gap-3">
                <AlertTriangle className="size-5 shrink-0 text-amber-600" />
                <p className="text-sm text-amber-900">
                  <strong>Important:</strong> This guide supplements — it does
                  not replace — the instructions from your prescribing provider
                  and the pharmacy&apos;s package insert. If the two ever
                  conflict, follow your provider&apos;s instructions and contact
                  us at{" "}
                  <a
                    href={`tel:${process.env.SUPPORT_SMS_NUMBER ?? "+18005550100"}`}
                    className="underline"
                  >
                    {process.env.SUPPORT_SMS_NUMBER ?? "(800) 555-0100"}
                  </a>
                  .
                </p>
              </div>
            </div>
          </Container>
        </Section>

        {/* Steps */}
        <Section>
          <Container>
            <div className="mx-auto max-w-3xl space-y-10">
              <Step
                number={1}
                icon={<Thermometer className="size-5" />}
                title="Store your medication correctly"
              >
                <ul className="list-disc pl-5 text-brand-gray-dark">
                  <li>Refrigerate between 36°F and 46°F (2°C–8°C).</li>
                  <li>Do not freeze — discard if the vial has been frozen.</li>
                  <li>
                    Protect from light. Keep it in the original box until
                    you&apos;re ready to inject.
                  </li>
                </ul>
              </Step>

              <Step
                number={2}
                icon={<Clock className="size-5" />}
                title="Pick your weekly injection day"
              >
                <p className="text-brand-gray-dark">
                  Choose a day that&apos;s easy to remember and inject on the
                  same day every week. You can inject at any time of day, with
                  or without meals. If you need to change days, make sure
                  there&apos;s at least <strong>48 hours</strong> between doses.
                </p>
              </Step>

              <Step
                number={3}
                icon={<Droplet className="size-5" />}
                title="Prepare the injection"
              >
                <ol className="list-decimal space-y-2 pl-5 text-brand-gray-dark">
                  <li>Wash your hands with soap and water.</li>
                  <li>
                    Remove a vial/pre-filled pen from the fridge — let it sit at
                    room temperature for 15 minutes.
                  </li>
                  <li>
                    Inspect the solution: it should be clear and colorless.
                    Don&apos;t use if cloudy, discolored, or contains particles.
                  </li>
                  <li>Attach a new, sterile needle for every injection.</li>
                </ol>
              </Step>

              <Step
                number={4}
                icon={<Syringe className="size-5" />}
                title="Inject subcutaneously (under the skin)"
              >
                <p className="text-brand-gray-dark">
                  Rotate between three sites:
                </p>
                <ul className="mt-2 list-disc pl-5 text-brand-gray-dark">
                  <li>Front of your thigh</li>
                  <li>Abdomen (at least 2 inches from the navel)</li>
                  <li>Back of your upper arm</li>
                </ul>
                <p className="mt-3 text-brand-gray-dark">
                  Clean the site with an alcohol swab, pinch the skin, insert
                  the needle at a 90° angle, and press the plunger fully. Hold
                  for 5 seconds before removing. Dispose of used needles in a
                  sharps container.
                </p>
              </Step>

              <Step
                number={5}
                icon={<CheckCircle2 className="size-5" />}
                title="Track how you feel"
              >
                <p className="text-brand-gray-dark">
                  Mild side effects in the first 4–8 weeks are common as your
                  body adjusts: nausea, fatigue, constipation, or mild headache.
                  These usually improve. Eat smaller, lower-fat meals and
                  hydrate well.
                </p>
                <p className="mt-3 text-brand-gray-dark">
                  Your provider may adjust your dose every 4 weeks based on
                  tolerance and results.
                </p>
              </Step>
            </div>
          </Container>
        </Section>

        {/* When to call */}
        <Section className="bg-red-50 py-12">
          <Container>
            <div className="mx-auto max-w-3xl">
              <div className="flex items-center gap-3 text-red-700">
                <Phone className="size-6" />
                <h2 className="font-heading text-2xl font-bold">
                  When to seek immediate medical attention
                </h2>
              </div>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-red-900">
                <li>
                  Severe abdominal pain that doesn&apos;t go away (possible
                  pancreatitis)
                </li>
                <li>Signs of an allergic reaction — swelling, rash, trouble breathing</li>
                <li>Severe vomiting or dehydration</li>
                <li>Vision changes</li>
                <li>
                  Symptoms of low blood sugar: sweating, shakiness, confusion
                  (especially if you take insulin or sulfonylureas)
                </li>
              </ul>
              <p className="mt-4 text-sm text-red-900">
                Call{" "}
                <strong>911</strong> for emergencies. For urgent but non-911
                questions, text us at{" "}
                <a
                  href={`sms:${process.env.SUPPORT_SMS_NUMBER ?? "+18005550100"}`}
                  className="underline"
                >
                  {process.env.SUPPORT_SMS_NUMBER ?? "(800) 555-0100"}
                </a>
                .
              </p>
            </div>
          </Container>
        </Section>

        {/* Footer CTA */}
        <Section>
          <Container>
            <div className="mx-auto max-w-3xl rounded-2xl bg-brand-navy p-8 text-center text-white">
              <ShieldCheck className="mx-auto size-10 text-brand-teal-light" />
              <h2 className="mt-3 font-heading text-2xl font-bold">
                Questions? Your care team is here.
              </h2>
              <p className="mt-2 text-brand-gray">
                Text us any time — a licensed provider reviews every message.
              </p>
              <Link
                href="/dashboard"
                className="mt-5 inline-block rounded-xl bg-brand-teal px-6 py-3 font-semibold text-brand-navy hover:bg-brand-teal-dark"
              >
                Back to my dashboard
              </Link>
            </div>
          </Container>
        </Section>
      </main>
      <Footer />
    </>
  );
}

function Step({
  number,
  icon,
  title,
  children,
}: {
  number: number;
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-teal-light text-brand-teal-dark">
          {icon}
        </div>
        <span className="mt-2 text-xs font-semibold text-brand-gray-dark">
          STEP {number}
        </span>
      </div>
      <div className="flex-1">
        <h3 className="font-heading text-xl font-bold text-brand-navy">
          {title}
        </h3>
        <div className="mt-2 text-sm leading-relaxed">{children}</div>
      </div>
    </div>
  );
}
