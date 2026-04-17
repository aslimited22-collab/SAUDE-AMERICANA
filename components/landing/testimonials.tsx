"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";

const testimonials = [
  {
    name: "Sarah M.",
    quote:
      "I lost 30 lbs in 3 months. My doctor was amazing and checked in on me every two weeks. This is the real deal.",
  },
  {
    name: "James R.",
    quote:
      "After years of failed diets, GLP-1 through SlimRx changed everything. The process was so easy — I wish I started sooner.",
  },
  {
    name: "Maria L.",
    quote:
      "The medication arrived in 4 days and I started seeing results within the first two weeks. Incredible service.",
  },
  {
    name: "David K.",
    quote:
      "I was skeptical at first, but my provider answered all my questions. Down 22 lbs and counting. Best investment in myself.",
  },
  {
    name: "Jennifer T.",
    quote:
      "No waiting room, no judgment. Just a caring doctor and a plan that actually works. Already recommended to three friends.",
  },
  {
    name: "Michael B.",
    quote:
      "The 24/7 support is no joke — I had a question at midnight and got a response within 30 minutes. Top-notch care.",
  },
];

export function Testimonials() {
  return (
    <Section className="bg-brand-gray">
      <Container>
        <div className="text-center">
          <span className="inline-block rounded-full bg-brand-teal-light px-4 py-1.5 text-sm font-semibold text-brand-teal-dark">
            Those who chose SlimRx
          </span>
          <h2 className="mt-4 font-heading text-3xl font-bold text-brand-navy md:text-4xl">
            There&apos;s a reason people are raving about us.
          </h2>
        </div>

        {/* Testimonial grid */}
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="rounded-xl border bg-white p-6 shadow-sm"
            >
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, s) => (
                  <Star
                    key={s}
                    className="size-4 fill-yellow-400 text-yellow-400"
                  />
                ))}
              </div>
              <p className="mt-4 text-sm leading-relaxed text-brand-gray-dark">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="mt-4 flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-full bg-brand-teal-light text-sm font-bold text-brand-teal-dark">
                  {t.name.charAt(0)}
                </div>
                <span className="text-sm font-semibold text-brand-navy">
                  {t.name}
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Review aggregate badges */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-6">
          <div className="flex items-center gap-2 rounded-full border bg-white px-5 py-2.5 shadow-sm">
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, s) => (
                <Star
                  key={s}
                  className="size-3.5 fill-yellow-400 text-yellow-400"
                />
              ))}
            </div>
            <span className="text-sm font-semibold text-brand-navy">
              4.9/5 on Trustpilot
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-full border bg-white px-5 py-2.5 shadow-sm">
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, s) => (
                <Star
                  key={s}
                  className="size-3.5 fill-yellow-400 text-yellow-400"
                />
              ))}
            </div>
            <span className="text-sm font-semibold text-brand-navy">
              4.8/5 on Google
            </span>
          </div>
        </div>
      </Container>
    </Section>
  );
}
