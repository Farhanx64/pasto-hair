"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";

interface RevealProps {
  className?: string;
  /** Stagger delay in seconds */
  delay?: number;
  children: React.ReactNode;
}

/**
 * Fades content up as it scrolls into view. Renders a plain div when the
 * user prefers reduced motion (design-system requirement).
 */
export function Reveal({ className, delay = 0, children }: RevealProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
