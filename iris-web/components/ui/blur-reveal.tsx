"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Blur Reveal (after badtzx0 / 21st.dev): content fades in from a blur and slides
 * up slightly the first time it scrolls into view.
 */
export function BlurReveal({
  className,
  children,
  delay = 0,
  duration = 1,
}: {
  className?: string;
  children: React.ReactNode;
  delay?: number;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  return (
    <motion.span
      ref={ref}
      initial={{ opacity: 0, filter: "blur(10px)", y: "20%" }}
      animate={inView ? { opacity: 1, filter: "blur(0px)", y: "0%" } : {}}
      transition={{ duration, delay }}
      className={cn("inline-block", className)}
    >
      {children}
    </motion.span>
  );
}

/** Splits text into words and reveals them one after another. */
export function BlurRevealText({
  text,
  className,
  wordClassName,
  delay = 0,
  stagger = 0.1,
  duration = 0.8,
}: {
  text: string;
  className?: string;
  wordClassName?: string;
  delay?: number;
  stagger?: number;
  duration?: number;
}) {
  const words = text.split(/\s+/).filter(Boolean);
  // The words are real text (just animated), so screen readers, copy-paste and search
  // engines read the sentence once. A hidden duplicate made it appear twice.
  return (
    <span className={className}>
      {words.map((word, i) => (
        <BlurReveal key={`${word}-${i}`} delay={delay + i * stagger} duration={duration} className={wordClassName}>
          {word}
          {/* Non-breaking: a normal trailing space is trimmed inside each inline-block word. */}
          {i < words.length - 1 ? " " : ""}
        </BlurReveal>
      ))}
    </span>
  );
}
