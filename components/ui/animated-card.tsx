"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

type AnimatedCardProps = Omit<HTMLMotionProps<"div">, "ref"> & {
  className?: string;
  children?: React.ReactNode;
};

export function AnimatedCard({
  className,
  children,
  ...props
}: AnimatedCardProps) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={cn(
        "rounded-xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md",
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}
