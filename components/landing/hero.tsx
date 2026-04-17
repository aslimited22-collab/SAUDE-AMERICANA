"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Activity, Dumbbell, Heart, Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";

const categories = [
  { icon: Activity, label: "Weight Loss", href: "#weight-loss", color: "text-brand-teal" },
  { icon: Dumbbell, label: "Men's Health", href: "#coming-soon", color: "text-blue-500" },
  { icon: Heart, label: "Women's Health", href: "#coming-soon", color: "text-pink-500" },
  { icon: Sparkles, label: "Peptides & Longevity", href: "#coming-soon", color: "text-purple-500" },
];

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

export function Hero() {
  return (
    <Section className="relative overflow-hidden bg-gradient-to-b from-brand-gray to-white pt-12 md:pt-20">
      <Container>
        <motion.div
          initial="hidden"
          animate="visible"
          transition={{ staggerChildren: 0.15 }}
          className="flex flex-col items-center text-center"
        >
          <motion.h1
            variants={fadeInUp}
            transition={{ duration: 0.6 }}
            className="font-heading text-4xl font-bold leading-tight text-brand-navy md:text-6xl md:leading-tight"
          >
            Healthcare, redefined
            <br />
            for real life.
          </motion.h1>

          <motion.p
            variants={fadeInUp}
            transition={{ duration: 0.6 }}
            className="mt-6 max-w-2xl text-lg text-brand-gray-dark md:text-xl"
          >
            We provide medical care online — simple, direct, and led by licensed
            providers. No waiting rooms. No unnecessary steps. Just care that
            works.
          </motion.p>

          <motion.div variants={fadeInUp} transition={{ duration: 0.6 }}>
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

          <motion.p
            variants={fadeInUp}
            transition={{ duration: 0.6 }}
            className="mt-4 text-sm text-brand-gray-dark"
          >
            Licensed US providers. Prescribed online. Delivered discreetly.
          </motion.p>

          {/* Category cards */}
          <motion.div
            variants={fadeInUp}
            transition={{ duration: 0.6 }}
            className="mt-12 grid w-full max-w-3xl grid-cols-2 gap-4 md:grid-cols-4"
          >
            {categories.map((cat) => (
              <Link
                key={cat.label}
                href={cat.href}
                className="group flex flex-col items-center gap-3 rounded-xl border bg-white p-5 shadow-sm transition-transform hover:-translate-y-1"
              >
                <cat.icon className={`size-8 ${cat.color}`} />
                <span className="text-sm font-semibold text-brand-navy">
                  {cat.label}
                </span>
              </Link>
            ))}
          </motion.div>
        </motion.div>
      </Container>
    </Section>
  );
}
