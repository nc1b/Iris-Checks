"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { cn } from "@/lib/utils";

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
