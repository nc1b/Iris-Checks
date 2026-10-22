"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUpRight, BookOpen, ChevronDown, Link2, Search, X } from "lucide-react";
import type { ResearchNoteSummary, ResearchSource } from "@/lib/research-types";
import { cn } from "@/lib/utils";

type Props = {
  notes: ResearchNoteSummary[];
  sources: ResearchSource[];
  content: ReactNode[];
};

export function ResearchLibrary({ notes, sources, content }: Props) {
  const [view, setView] = useState<"notes" | "sources">("notes");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All topics");
  const [sourceLimit, setSourceLimit] = useState(24);
  const categories = useMemo(() => ["All topics", ...new Set(notes.map(note => note.category))], [notes]);
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const matchingNotes = notes.map(note => (category === "All topics" || note.category === category) && terms.every(term => note.searchText.includes(term)));
  const filteredSources = sources.filter(source => (category === "All topics" || source.categories.includes(category)) && terms.every(term => `${source.title} ${source.domain} ${source.kind} ${source.categories.join(" ")}`.toLowerCase().includes(term)));
  const noteCount = matchingNotes.filter(Boolean).length;

  // Notebook links can open a specific entry, including links from other notes.
  useEffect(() => {
    let frame = 0;
    const openLinkedNote = () => {
      const id = window.location.hash.slice(1);
      if (!notes.some(note => `note-${note.id}` === id)) return;
      setView("notes");
      setQuery("");
      setCategory("All topics");
      frame = requestAnimationFrame(() => {
        const entry = document.getElementById(id);
        if (entry instanceof HTMLDetailsElement) {
          entry.open = true;
          entry.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
        }
      });
    };
    openLinkedNote();
    window.addEventListener("hashchange", openLinkedNote);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", openLinkedNote);
    };
  }, [notes]);

  const reset = () => {
    setQuery("");
    setCategory("All topics");
    setSourceLimit(24);
  };

  return (
    <div>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div role="group" aria-label="Research view" className="inline-flex w-fit rounded-xl border bg-muted/70 p-1">
          {([
            { id: "notes", label: "Research notes", count: notes.length, icon: BookOpen },
            { id: "sources", label: "Source links", count: sources.length, icon: Link2 },
          ] as const).map(({ id, label, count, icon: Icon }) => (
            <button key={id} type="button" aria-pressed={view === id} onClick={() => setView(id)} className={cn("inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:px-4 sm:text-sm", view === id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              <Icon aria-hidden="true" className="hidden size-4 min-[375px]:block" />
              {label} <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] tabular-nums text-muted-foreground">{count}</span>
            </button>
          ))}
        </div>
        <a href="/research/iris-research-notebook.md" download className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowDown aria-hidden="true" className="size-4" /> Download the notebook
        </a>
      </div>

      <div className="relative mt-6">
        <label htmlFor="research-search" className="sr-only">Search research notes and source links</label>
        <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
        <input id="research-search" type="search" value={query} onChange={event => { setQuery(event.target.value); setSourceLimit(24); }} placeholder="Search a study, condition, dataset, or device…" className="h-14 w-full rounded-xl border bg-background pl-12 pr-12 text-sm outline-none transition-shadow placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring" />
        {query ? <button type="button" aria-label="Clear research search" onClick={() => setQuery("")} className="absolute right-1 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground"><X className="size-4" /></button> : null}
      </div>

      <div role="group" aria-label="Research topics" className="mt-4 flex flex-wrap gap-2">
        {categories.map(topic => (
          <button key={topic} type="button" aria-pressed={category === topic} onClick={() => { setCategory(topic); setSourceLimit(24); }} className={cn("min-h-10 rounded-full border px-3.5 py-2 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring", category === topic ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground")}>
            {topic}
          </button>
        ))}
      </div>

      <div className="mb-5 mt-7 flex flex-wrap items-center justify-between gap-2 border-t pt-5">
        <p role="status" aria-live="polite" className="text-xs text-muted-foreground">{view === "notes" ? `${noteCount} ${noteCount === 1 ? "note" : "notes"}` : `${filteredSources.length} ${filteredSources.length === 1 ? "source" : "sources"}`} {query || category !== "All topics" ? "match your filters" : "in the collection"}</p>
        <span className="text-xs text-muted-foreground">Source findings describe their original studies.</span>
      </div>

      <div hidden={view !== "notes"}>
        <div className="space-y-3">
          {notes.map((note, index) => (
            <details key={note.id} id={`note-${note.id}`} hidden={!matchingNotes[index]} className="group min-w-0 scroll-mt-24 rounded-2xl border bg-card open:shadow-sm">
              <summary className="flex cursor-pointer list-none items-start gap-4 rounded-2xl p-5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring [&::-webkit-details-marker]:hidden sm:gap-5 sm:p-6">
                <span aria-hidden="true" className="hidden pt-1 font-mono text-xs text-muted-foreground sm:block">{String(index + 1).padStart(2, "0")}</span>
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    <span>{note.category}</span>
                    {note.archived ? <span className="rounded-full border px-2 py-0.5 normal-case tracking-normal">Earlier exploration</span> : null}
                  </div>
                  <h3 className="text-base font-semibold leading-snug text-foreground sm:text-lg">{note.title}</h3>
                  <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">{note.description}</p>
                </div>
                <ChevronDown aria-hidden="true" className="mt-1 size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180 motion-reduce:transition-none" />
              </summary>
              <div className="min-w-0 border-t px-5 pb-6 pt-2 sm:px-6 sm:pb-8 sm:pl-14">
                <p className="mt-3 text-[11px] text-muted-foreground">Working research notes · Recorded {note.updated}</p>
                {content[index]}
              </div>
            </details>
          ))}
        </div>
        {noteCount === 0 ? <EmptyResults reset={reset} /> : null}
      </div>

      <div hidden={view !== "sources"}>
        <p className="mb-5 text-sm leading-relaxed text-muted-foreground">Papers, preprints, datasets, patents, project pages, and background reading collected during the research. A source link is not a claim that its method is validated for Iris.</p>
        <ul className="grid gap-3 sm:grid-cols-2">
          {filteredSources.slice(0, sourceLimit).map(source => (
            <li key={source.id} className="min-w-0">
              <a href={source.url} target="_blank" rel="noreferrer" className="group flex h-full min-w-0 flex-col rounded-xl border bg-card p-5 transition-colors hover:border-foreground/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                <span className="mb-3 w-fit rounded-full border px-2 py-0.5 text-[10px] text-muted-foreground">{source.kind}</span>
                <span className="flex items-start justify-between gap-3 text-sm font-medium leading-relaxed text-foreground">
                  <span className="min-w-0 [overflow-wrap:anywhere]">{source.title}</span><ArrowUpRight aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
                </span>
                <span className="mt-auto break-all pt-4 text-xs text-muted-foreground">{source.domain}</span>
              </a>
            </li>
          ))}
        </ul>
        {filteredSources.length === 0 ? <EmptyResults reset={reset} /> : null}
        {filteredSources.length > sourceLimit ? (
          <div className="mt-7 text-center">
            <button type="button" onClick={() => setSourceLimit(filteredSources.length)} className="min-h-11 rounded-full border px-6 py-3 text-sm font-medium transition-colors hover:bg-muted">Show all {filteredSources.length} sources</button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function EmptyResults({ reset }: { reset: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed px-6 py-14 text-center">
      <Search aria-hidden="true" className="mx-auto mb-4 size-6 text-muted-foreground" />
      <p className="font-medium">No matching research yet</p>
      <p className="mt-2 text-sm text-muted-foreground">Try another keyword or browse all topics.</p>
      <button type="button" onClick={reset} className="mt-5 min-h-11 rounded-full border px-5 py-2 text-sm font-medium hover:bg-muted">Reset filters</button>
    </div>
  );
}
