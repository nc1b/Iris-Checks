"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Timeline (after manuarora700 / Aceternity UI on 21st.dev): each entry's title sticks
 * while you read it, and a beam down the line fills in as you scroll.
 * Black-and-white version; the line re-measures when the content changes size.
 */

export type TimelineEntry = {
  title: string;
  /** Small line under the sticky title, e.g. a status. */
  label?: React.ReactNode;
  content: React.ReactNode;
};

export function Timeline({ data, heading, intro, className }: { data: TimelineEntry[]; heading?: React.ReactNode; intro?: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHeight(el.getBoundingClientRect().height));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 10%", "end 50%"],
  });

  const heightTransform = useTransform(scrollYProgress, [0, 1], [0, height]);
  const opacityTransform = useTransform(scrollYProgress, [0, 0.1], [0, 1]);

  return (
    <div className={cn("w-full font-sans md:px-10", className)} ref={containerRef}>
      {(heading || intro) && (
        <div className="mx-auto max-w-5xl px-4 pt-24 md:px-8 lg:px-10">
          {heading}
          {intro}
        </div>
      )}

      <div ref={ref} className="relative mx-auto max-w-5xl pb-20">
        {data.map((item) => (
          <div key={item.title} className="flex justify-start pt-10 md:gap-10 md:pt-32">
            <div className="sticky top-32 z-20 flex max-w-xs flex-col items-center self-start md:w-full md:flex-row lg:max-w-sm">
              <div className="absolute left-3 flex h-10 w-10 items-center justify-center rounded-full bg-background">
                <div className="h-4 w-4 rounded-full border border-foreground/30 bg-muted p-2" />
              </div>
              <div className="hidden md:block md:pl-20">
                <h3 className="text-3xl font-bold text-muted-foreground lg:text-4xl">{item.title}</h3>
                {item.label && <div className="mt-3">{item.label}</div>}
              </div>
            </div>

            <div className="relative w-full pl-20 pr-4 md:pl-4">
              <div className="mb-4 md:hidden">
                <h3 className="text-2xl font-bold text-muted-foreground">{item.title}</h3>
                {item.label && <div className="mt-2">{item.label}</div>}
              </div>
              {item.content}
            </div>
          </div>
        ))}
        <div
          style={{ height: height + "px" }}
          className="absolute left-8 top-0 w-[2px] overflow-hidden bg-[linear-gradient(to_bottom,var(--tw-gradient-stops))] from-transparent from-[0%] via-border to-transparent to-[99%] [mask-image:linear-gradient(to_bottom,transparent_0%,black_10%,black_90%,transparent_100%)]"
        >
          <motion.div
            style={{ height: heightTransform, opacity: opacityTransform }}
            className="absolute inset-x-0 top-0 w-[2px] rounded-full bg-gradient-to-t from-foreground from-[0%] via-foreground/60 via-[10%] to-transparent"
          />
        </div>
      </div>
    </div>
  );
}
