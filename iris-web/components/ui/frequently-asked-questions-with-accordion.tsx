"use client";

import Link from "next/link";
import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { IRIS_FAQS, type FAQItem } from "@/lib/faq";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/frequently-asked-questions-with-accordion-utils/accordion";

interface FrequentlyAskedQuestionsProps {
  id?: string;
  title?: string;
  description?: string;
  data?: FAQItem[];
  className?: string;
  supportEmail?: string;
}

export default function FrequentlyAskedQuestions({
  id = "faq",
  title = "Frequently asked questions",
  description = "The three planned checks, how they'll work, and what the results could tell you.",
  data = IRIS_FAQS,
  className,
  supportEmail,
}: FrequentlyAskedQuestionsProps) {
  const headingId = useId();
  const reduceMotion = useReducedMotion();
  const words = title.trim().split(/\s+/);

  return (
    <section id={id} aria-labelledby={headingId} className={cn("relative w-full scroll-mt-24 overflow-hidden border-t py-24", className)}>
      <div className="mx-auto max-w-3xl px-6">
        <p className="text-center text-sm font-medium uppercase tracking-widest text-muted-foreground">FAQ</p>
        <h2 id={headingId} className="relative z-10 mx-auto mt-3 text-balance text-center text-3xl font-bold tracking-tight text-foreground md:text-5xl">
          {words.map((word, index) => (
            <motion.span
              key={`${word}-${index}`}
              initial={reduceMotion ? false : { opacity: 0, filter: "blur(6px)", y: 12 }}
              whileInView={{ opacity: 1, filter: "blur(0px)", y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: reduceMotion ? 0 : 0.4, delay: reduceMotion ? 0 : index * 0.08, ease: "easeInOut" }}
              className="inline-block"
            >
              {word}{index < words.length - 1 ? "\u00a0" : ""}
            </motion.span>
          ))}
        </h2>

        <motion.p
          initial={reduceMotion ? false : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: reduceMotion ? 0 : 0.5, delay: reduceMotion ? 0 : 0.2 }}
          className="relative z-10 mx-auto mt-6 max-w-xl text-center text-base leading-relaxed text-muted-foreground md:text-lg"
        >
          {description}
          {supportEmail ? (
            <> <a href={`mailto:${supportEmail}`} className="text-foreground underline underline-offset-4 transition-opacity hover:opacity-80">{supportEmail}</a></>
          ) : null}
        </motion.p>

        <div className="mt-12 border-t">
          <Accordion type="single" collapsible className="w-full">
            {data.map((item, index) => (
              <motion.div
                key={item.question}
                initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: reduceMotion ? 0 : 0.35, delay: reduceMotion ? 0 : Math.min(index * 0.04, 0.2), ease: "easeOut" }}
              >
                <AccordionItem value={`item-${index}`}>
                  <AccordionTrigger>{item.question}</AccordionTrigger>
                  <AccordionContent>{item.answer}</AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </Accordion>
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Curious about the evidence?{" "}
          <Link href="/research" className="inline-flex items-center gap-1 font-medium text-foreground underline underline-offset-4 transition-opacity hover:opacity-70">
            Explore the research <ArrowUpRight aria-hidden="true" className="size-3.5" />
          </Link>
        </p>
      </div>
    </section>
  );
}
