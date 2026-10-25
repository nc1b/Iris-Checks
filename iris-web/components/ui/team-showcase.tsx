"use client";

import { UserRound } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export type TeamMember = {
  id: string;
  name: string;
  role: string;
  image?: string;
  href?: string;
};

function PhotoCard({ member, className, hoveredId, onHover }: { member: TeamMember; className: string; hoveredId: string | null; onHover: (id: string | null) => void }) {
  const active = hoveredId === member.id;
  const dimmed = hoveredId !== null && !active;
  return (
    <div
      className={cn("shrink-0 cursor-pointer overflow-hidden rounded-xl transition-opacity duration-500", className, dimmed ? "opacity-60" : "opacity-100")}
      onMouseEnter={() => onHover(member.id)}
      onMouseLeave={() => onHover(null)}
    >
      {member.image ? (
        <img
          src={member.image}
          alt={member.name}
          className="h-full w-full object-cover transition-[filter] duration-500"
          style={{ filter: active ? "grayscale(0) brightness(1)" : "grayscale(1) brightness(0.77)" }}
        />
      ) : (
        <div
          className={cn(
            "flex h-full w-full items-end justify-center bg-gradient-to-b from-muted to-foreground/15 transition-colors duration-500",
            active && "from-foreground/10 to-foreground/30",
          )}
        >
          <UserRound aria-hidden strokeWidth={1.25} className={cn("size-3/4 translate-y-[12%] text-foreground/20 transition-colors duration-500", active && "text-foreground/40")} />
        </div>
      )}
    </div>
  );
}

function MemberRow({ member, hoveredId, onHover }: { member: TeamMember; hoveredId: string | null; onHover: (id: string | null) => void }) {
  const active = hoveredId === member.id;
  const dimmed = hoveredId !== null && !active;
  const Name = member.href ? "a" : "span";
  return (
    <div
      className={cn("cursor-pointer transition-opacity duration-300", dimmed ? "opacity-50" : "opacity-100")}
      onMouseEnter={() => onHover(member.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(member.id)}
      onBlur={() => onHover(null)}
    >
      <div className="flex items-center gap-2.5">
        <span className={cn("h-3 shrink-0 rounded-[5px] transition-all duration-300", active ? "w-5 bg-foreground" : "w-4 bg-foreground/25")} />
        <Name
          {...(member.href ? { href: member.href } : {})}
          className={cn("text-base font-semibold leading-none tracking-tight transition-colors duration-300 md:text-[18px]", active ? "text-foreground" : "text-foreground/80")}
        >
          {member.name}
        </Name>
      </div>
      <p className="mt-1.5 pl-[27px] text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">{member.role}</p>
    </div>
  );
}

export function TeamShowcase({ members, className }: { members: TeamMember[]; className?: string }) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const col1 = members.filter((_, i) => i % 3 === 0);
  const col2 = members.filter((_, i) => i % 3 === 1);
  const col3 = members.filter((_, i) => i % 3 === 2);

  return (
    <div className={cn("mx-auto flex w-full max-w-5xl select-none flex-col items-start gap-8 md:flex-row md:gap-10 lg:gap-14", className)}>
      <div className="flex max-w-full shrink-0 gap-2 overflow-x-auto pb-1 md:gap-3 md:pb-0">
        <div className="flex flex-col gap-2 md:gap-3">
          {col1.map((m) => (
            <PhotoCard key={m.id} member={m} className="h-[120px] w-[110px] sm:h-[140px] sm:w-[130px] md:h-[165px] md:w-[155px]" hoveredId={hoveredId} onHover={setHoveredId} />
          ))}
        </div>
        <div className="mt-[48px] flex flex-col gap-2 sm:mt-[56px] md:mt-[68px] md:gap-3">
          {col2.map((m) => (
            <PhotoCard key={m.id} member={m} className="h-[132px] w-[122px] sm:h-[155px] sm:w-[145px] md:h-[182px] md:w-[172px]" hoveredId={hoveredId} onHover={setHoveredId} />
          ))}
        </div>
        <div className="mt-[22px] flex flex-col gap-2 sm:mt-[26px] md:mt-[32px] md:gap-3">
          {col3.map((m) => (
            <PhotoCard key={m.id} member={m} className="h-[125px] w-[115px] sm:h-[146px] sm:w-[136px] md:h-[172px] md:w-[162px]" hoveredId={hoveredId} onHover={setHoveredId} />
          ))}
        </div>
      </div>

      <div className="flex w-full flex-1 flex-col gap-4 pt-0 sm:grid sm:grid-cols-2 md:flex md:flex-col md:gap-5 md:pt-2">
        {members.map((m) => (
          <MemberRow key={m.id} member={m} hoveredId={hoveredId} onHover={setHoveredId} />
        ))}
      </div>
    </div>
  );
}
