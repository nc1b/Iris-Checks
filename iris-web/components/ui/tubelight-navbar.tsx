"use client"

import React from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { SectionLink } from "@/components/blocks/section-link"

export interface NavItem {
  name: string
  icon: LucideIcon
  section?: string
  url?: string
}

interface NavBarProps {
  items: NavItem[]
  activeName: string | null
  onSelect?: (name: string) => void
  className?: string
}

export function NavBar({ items, activeName, onSelect, className }: NavBarProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-0.5 rounded-full sm:gap-1 border border-border bg-background/70 p-1 shadow-lg shadow-black/5 backdrop-blur-lg dark:shadow-black/40",
        className,
      )}>
      {items.map((item) => {
        const Icon = item.icon
        const isActive = activeName === item.name
        const classes = cn(
          "relative cursor-pointer rounded-full px-2.5 py-2 text-sm font-semibold transition-colors sm:px-4 lg:px-5",
          "text-foreground/70 hover:text-foreground",
          isActive && "bg-muted text-foreground",
        )
        const content = (
          <>
            <span className="hidden md:inline">{item.name}</span>
            <span className="md:hidden">
              <Icon size={18} strokeWidth={2.5} />
            </span>
            {isActive && (
              <motion.div
                layoutId="lamp"
                className="absolute inset-0 -z-10 w-full rounded-full bg-primary/5"
                initial={false}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}>
                <div className="absolute -top-2 left-1/2 h-1 w-8 -translate-x-1/2 rounded-t-full bg-primary">
                  <div className="absolute -left-2 -top-2 h-6 w-12 rounded-full bg-primary/20 blur-md" />
                  <div className="absolute -top-1 h-6 w-8 rounded-full bg-primary/20 blur-md" />
                  <div className="absolute left-2 top-0 h-4 w-4 rounded-full bg-primary/20 blur-sm" />
                </div>
              </motion.div>
            )}
          </>
        )

        return item.section ? (
          <SectionLink
            key={item.name}
            section={item.section}
            onNavigate={() => onSelect?.(item.name)}
            aria-label={item.name}
            aria-current={isActive ? "true" : undefined}
            className={classes}>
            {content}
          </SectionLink>
        ) : (
          <Link
            key={item.name}
            href={item.url ?? "/"}
            onClick={() => onSelect?.(item.name)}
            aria-label={item.name}
            aria-current={isActive ? "page" : undefined}
            className={classes}>
            {content}
          </Link>
        )
      })}
    </div>
  )
}
