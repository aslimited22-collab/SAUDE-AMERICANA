"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";

const benefits = [
  "Prescription to fast, effective GLP-1",
  "1:1 physician guidance",
  "24/7 support",
  "Weight loss guarantee",
  "Fast & discreet shipping",
];

export function WeightLoss() {
  return (
    <Section id="weight-loss" className="bg-white">
      <Container>
        <div className="grid items-center gap-12 md:grid-cols-2">
          {/* Left content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block rounded-full bg-brand-teal-light px-4 py-1.5 text-sm font-semibold text-brand-teal-dark">
              Doctor-guided GLP-1 care
            </span>
            <h2 className="mt-4 font-heading text-3xl font-bold text-brand-navy md:text-4xl">
              Weight loss made easy with personalized care
            </h2>
            <ul className="mt-8 space-y-4">
              {benefits.map((b) => (
                <li key={b} className="flex items-start gap-3">
                  <Check className="mt-0.5 size-5 shrink-0 text-brand-teal" />
                  <span className="text-brand-gray-dark">{b}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/intake"
              className={buttonVariants({
                variant: "primary",
                size: "lg",
                className: "mt-8 h-12 px-8 text-base",
              })}
            >
              Get Started
            </Link>
          </motion.div>

          {/* Right placeholder — gradient card mockup */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex items-center justify-center"
          >
            <div className="relative h-[420px] w-full max-w-sm overflow-hidden rounded-3xl bg-gradient-to-br from-brand-teal via-brand-teal-dark to-brand-navy p-8 shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              <div className="relative z-10 flex h-full flex-col justify-between text-white">
                <div>
                  <p className="text-sm font-medium opacity-80">Your Program</p>
                  <h3 className="mt-2 text-2xl font-bold">GLP-1 Weight Loss</h3>
                  <p className="mt-1 text-sm opacity-80">
                    Personalized by your provider
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="rounded-xl bg-white/20 p-3 backdrop-blur-sm">
                    <p className="text-xs opacity-80">Weekly Check-in</p>
                    <p className="font-semibold">Next: Tuesday, 10 AM</p>
                  </div>
                  <div className="rounded-xl bg-white/20 p-3 backdrop-blur-sm">
                    <p className="text-xs opacity-80">Progress</p>
                    <p className="font-semibold">-12 lbs in 8 weeks</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </Container>
    </Section>
  );
}
