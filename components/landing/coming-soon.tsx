"use client";

import { motion } from "framer-motion";
import { Dumbbell, Heart, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";

const categories = [
  {
    icon: Dumbbell,
    title: "Men's Health",
    description:
      "Testosterone optimization, ED treatment, and performance support — all from the comfort of home.",
    color: "from-blue-500 to-blue-700",
  },
  {
    icon: Heart,
    title: "Women's Health",
    description:
      "Hormone therapy, fertility support, and wellness programs designed specifically for women.",
    color: "from-pink-500 to-pink-700",
  },
  {
    icon: Sparkles,
    title: "Peptides & Longevity",
    description:
      "Cutting-edge peptide therapies for anti-aging, recovery, and cellular health.",
    color: "from-purple-500 to-purple-700",
  },
];

export function ComingSoon() {
  return (
    <Section id="coming-soon" className="bg-white">
      <Container>
        <div className="text-center">
          <h2 className="font-heading text-3xl font-bold text-brand-navy md:text-4xl">
            More programs, coming soon
          </h2>
          <p className="mt-3 text-brand-gray-dark">
            We&apos;re expanding to serve your every health need.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {categories.map((cat, i) => (
            <motion.div
              key={cat.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="relative overflow-hidden rounded-2xl border bg-card p-8 opacity-80"
            >
              <div
                className={`mb-4 flex size-12 items-center justify-center rounded-xl bg-gradient-to-br ${cat.color} text-white`}
              >
                <cat.icon className="size-6" />
              </div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-brand-navy">
                  {cat.title}
                </h3>
                <Badge variant="secondary" className="text-xs">
                  Coming Soon
                </Badge>
              </div>
              <p className="mt-2 text-sm text-brand-gray-dark">
                {cat.description}
              </p>
            </motion.div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
