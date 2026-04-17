"use client";

import { motion } from "framer-motion";
import { ClipboardList, UserCheck, Truck } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";

const steps = [
  {
    icon: ClipboardList,
    title: "Complete your health assessment",
    description:
      "Answer a few simple questions about your health — it only takes 2 minutes.",
  },
  {
    icon: UserCheck,
    title: "Get matched with a licensed provider",
    description:
      "A doctor reviews your case and creates a personalized treatment plan.",
  },
  {
    icon: Truck,
    title: "Receive your medication, shipped to your door",
    description:
      "Fast, free, and discreet delivery right to your doorstep.",
  },
];

export function HowItWorks() {
  return (
    <Section id="how-it-works" className="bg-brand-gray">
      <Container>
        <div className="text-center">
          <span className="inline-block rounded-full bg-brand-teal-light px-4 py-1.5 text-sm font-semibold text-brand-teal-dark">
            Simple Process
          </span>
          <h2 className="mt-4 font-heading text-3xl font-bold text-brand-navy md:text-4xl">
            How it works
          </h2>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className="relative flex flex-col items-center text-center"
            >
              {/* Step number */}
              <div className="flex size-16 items-center justify-center rounded-2xl bg-brand-teal text-brand-navy shadow-lg">
                <step.icon className="size-7" />
              </div>
              <span className="mt-2 text-xs font-bold uppercase tracking-wider text-brand-gray-dark">
                Step {i + 1}
              </span>
              <h3 className="mt-3 text-lg font-semibold text-brand-navy">
                {step.title}
              </h3>
              <p className="mt-2 text-sm text-brand-gray-dark">
                {step.description}
              </p>

              {/* Connector line (desktop only) */}
              {i < steps.length - 1 && (
                <div className="absolute right-0 top-8 hidden w-full translate-x-1/2 md:block">
                  <div className="mx-auto h-px w-full bg-gradient-to-r from-brand-teal/40 to-brand-teal/10" />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
