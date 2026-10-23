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

/**
 * Headings used to blur in word by word. The words stayed invisible until they scrolled
 * into view, which looked broken, so the text now shows straight away. The props are kept
 * so existing headings don't need changing.
 */
export function BlurRevealText({
  text,
  className,
}: {
  text: string;
  className?: string;
  wordClassName?: string;
  delay?: number;
  stagger?: number;
  duration?: number;
}) {
  return <span className={className}>{text}</span>;
}
