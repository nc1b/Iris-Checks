"use client";

import { useAuth, useClerk, useUser } from "@clerk/nextjs";
import {
  Activity,
  ArrowRight,
  Camera,
  Check,
  ChevronDown,
  Clock,
  Home,
  Loader2,
  LogOut,
  MessageCircle,
  Settings,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ThemeToggle } from "@/components/blocks/theme-toggle";
import { Sparkline, TrendChart } from "@/components/dashboard/charts";
import { ProfileCard } from "@/components/dashboard/profile-card";
import { CHECK_VIEWS, StatusBadge, statusLabel } from "@/components/dashboard/status";
import { EyeTracker } from "@/components/ui/interactive-eye-tracker";
import { openChat } from "@/lib/chat-events";
import type { Dashboard as DashboardData, Profile, Scan } from "@/lib/dashboard-types";
import { ROADMAP } from "@/lib/roadmap";
import { cn } from "@/lib/utils";

const SCAN_STEPS = ["Getting close to your right eye", "Flash 1 of 2 · right eye", "Flash 2 of 2 · left eye", "Saving your three results"];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const dateTime = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
function relative(iso: string) {
  const diff = (new Date(iso).getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto", style: "short" });
  const steps: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, "second"],
    [3600, "minute"],
    [86400, "hour"],
    [604800, "day"],
    [2629800, "week"],
    [Infinity, "month"],
  ];
  const divisors: Record<string, number> = { second: 1, minute: 60, hour: 3600, day: 86400, week: 604800, month: 2629800 };
  for (const [limit, unit] of steps) if (Math.abs(diff) < limit) return rtf.format(Math.round(diff / divisors[unit]), unit);
  return dateTime.format(new Date(iso));
}

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? "Good evening" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export function Dashboard() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanStep, setScanStep] = useState<number | null>(null);
  const [newScanId, setNewScanId] = useState<string | null>(null);
  const [trend, setTrend] = useState(0);
  const [showAll, setShowAll] = useState(false);

  const api = useCallback(
    async <T,>(path: string, init?: RequestInit): Promise<T> => {
      const token = await getToken();
      const res = await fetch(path, {
        ...init,
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init?.headers },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { error?: string }).error || "Something went wrong.");
      return json as T;
    },
    [getToken],
  );

  const load = useCallback(async () => {
    try {
      const d = await api<DashboardData>("/api/me");
      setData(d);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load your dashboard.");
    }
  }, [api]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.replace("/sign-in");
      return;
    }
    let cancelled = false;
    api<DashboardData>("/api/me").then(
      (d) => {
        if (cancelled) return;
        setData(d);
        setError(null);
      },
      (e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Couldn't load your dashboard.");
      },
    );
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, api, router]);

  const runScan = async () => {
    if (scanStep !== null) return;
    setScanStep(0);
    setError(null);
    const ticker = window.setInterval(() => setScanStep((s) => (s === null ? s : Math.min(SCAN_STEPS.length - 1, s + 1))), 750);
    try {
      const [scan] = await Promise.all([api<Scan>("/api/scans", { method: "POST", body: "{}" }), sleep(3000)]);
      setData((d) => (d ? { ...d, scans: [scan, ...d.scans], total_scans: d.total_scans + 1 } : d));
      setNewScanId(scan.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The scan couldn't be saved.");
    } finally {
      window.clearInterval(ticker);
      setScanStep(null);
    }
  };

  const deleteScan = async (id: string) => {
    try {
      await api(`/api/scans/${id}`, { method: "DELETE" });
      setData((d) => (d ? { ...d, scans: d.scans.filter((s) => s.id !== id), total_scans: Math.max(0, d.total_scans - 1) } : d));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't delete that scan.");
    }
  };

  const saveProfile = async (form: Partial<Profile>) => {
    const profile = await api<Profile>("/api/me", { method: "PATCH", body: JSON.stringify(form) });
    setData((d) => (d ? { ...d, profile } : d));
  };

  const deleteEverything = async () => {
    await api("/api/me", { method: "DELETE" });
    setData(null);
    await load();
  };

  const firstName = user?.firstName || data?.profile.first_name || null;

  return (
    <div className="min-h-[100dvh] bg-background">
      <DashboardHeader />

      <main className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6">
        {!data ? (
          error ? (
            <ErrorState message={error} onRetry={load} />
          ) : (
            <Skeleton />
          )
        ) : (
          <>
            <section className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs text-muted-foreground">
                  <ShieldCheck className="size-3.5" /> Research prototype
                </span>
                <h1 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">
                  {greeting()}
                  {firstName ? `, ${firstName}` : ""}.
                </h1>
                <p className="mt-2 max-w-xl text-muted-foreground">
                  {data.total_scans
                    ? data.scans.some((s) => s.source === "camera")
                      ? "Here's how your three checks look over time. Camera scans are real; demo scans are simulated."
                      : "Here's how your three checks look over time. These are demo scans so far; try the eye photo check."
                    : "Start with the eye photo check, or try a demo scan to see how Iris shows your three checks."}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/dashboard/eye-check"
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-foreground px-5 text-sm font-medium text-background shadow-lg shadow-black/10 transition-all hover:opacity-90 active:scale-[0.98] dark:shadow-white/5"
                >
                  <Camera className="size-4" /> Eye photo check
                </Link>
                <Link
                  href="/dashboard/scan"
                  className="inline-flex h-11 items-center gap-2 rounded-xl border px-4 text-sm font-medium transition-colors hover:bg-accent active:scale-[0.98]"
                >
                  Pupil test <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide">Experimental</span>
                </Link>
                <button
                  type="button"
                  onClick={runScan}
                  disabled={scanStep !== null}
                  className="inline-flex h-11 items-center gap-2 rounded-xl border px-4 text-sm font-medium transition-colors hover:bg-accent active:scale-[0.98] disabled:opacity-60"
                >
                  <Activity className="size-4" /> Run demo scan
                </button>
              </div>
            </section>

            {error && (
              <p role="alert" className="mt-6 flex items-center justify-between gap-3 rounded-2xl border border-foreground/30 px-4 py-3 text-sm">
                {error}
                <button type="button" onClick={() => setError(null)} aria-label="Dismiss" className="rounded-lg p-1 hover:bg-accent">
                  <X className="size-4" />
                </button>
              </p>
            )}

            <StatTiles data={data} />

            {data.scans.length === 0 ? (
              <EmptyState onRun={runScan} busy={scanStep !== null} />
            ) : (
              <div className="mt-6 grid gap-6 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-2">
                  <LatestResults scans={data.scans} highlight={newScanId} />
                  <Trends scans={data.scans} active={trend} onChange={setTrend} />
                  <History scans={showAll ? data.scans : data.scans.slice(0, 8)} total={data.scans.length} showAll={showAll} onToggle={() => setShowAll((s) => !s)} onDelete={deleteScan} highlight={newScanId} />
                </div>
                <aside className="space-y-6">
                  <ProfileCard key={data.profile.created_at} profile={data.profile} onSave={saveProfile} />
                  <DataCard count={data.total_scans} onDeleteAll={deleteEverything} />
                  <NextUp />
                </aside>
              </div>
            )}

            {data.scans.length === 0 && (
              <div className="mt-6 grid gap-6 md:grid-cols-2">
                <ProfileCard key={data.profile.created_at} profile={data.profile} onSave={saveProfile} />
                <div className="space-y-6">
                  <DataCard count={data.total_scans} onDeleteAll={deleteEverything} />
                  <NextUp />
                </div>
              </div>
            )}

            <p className="mt-10 text-center text-xs text-muted-foreground">
              Iris is a student research prototype, not a medical device. Demo scans are simulated, and no result here can diagnose or rule out
              diabetic retinopathy, glaucoma or cataracts.
            </p>
          </>
        )}
      </main>

      {scanStep !== null && <ScanOverlay step={scanStep} />}
    </div>
  );
}

function DashboardHeader() {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 rounded-xl py-1 pr-2 transition-opacity hover:opacity-80" aria-label="Iris home">
          <Image src="/iris-logo.png" alt="" width={663} height={259} className="h-auto w-9 invert dark:invert-0" />
          <span className="text-[15px] font-semibold tracking-tight">Iris</span>
        </Link>
        <span className="text-muted-foreground/50">/</span>
        <span className="text-sm font-medium">Dashboard</span>

        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => openChat()}
            className="hidden h-9 items-center gap-2 rounded-xl border px-3 text-sm transition-colors hover:bg-accent sm:inline-flex"
          >
            <MessageCircle className="size-4" /> Ask Iris
          </button>
          <ThemeToggle className="size-9 rounded-xl" />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}

function UserMenu() {
  const { user } = useUser();
  const { signOut, openUserProfile } = useClerk();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const name = user?.firstName || user?.primaryEmailAddress?.emailAddress?.split("@")[0] || "Account";
  const email = user?.primaryEmailAddress?.emailAddress;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex h-9 items-center gap-2 rounded-xl border pl-1 pr-2 transition-colors hover:bg-accent"
      >
        {user?.hasImage ? (
          <img src={user.imageUrl} alt="" className="size-7 rounded-lg object-cover" />
        ) : (
          <span className="flex size-7 items-center justify-center rounded-lg bg-foreground text-xs font-semibold uppercase text-background">{name.slice(0, 1)}</span>
        )}
        <span className="hidden max-w-[8rem] truncate text-sm sm:block">{name}</span>
        <ChevronDown className={cn("size-3.5 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      <div
        role="menu"
        inert={!open}
        className={cn(
          "absolute right-0 top-full z-40 mt-2 w-64 origin-top-right rounded-2xl border bg-popover p-1.5 text-popover-foreground shadow-xl shadow-black/10 transition-all duration-150 dark:shadow-black/50",
          open ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0",
        )}
      >
        <div className="px-3 py-2">
          <p className="truncate text-sm font-medium">{name}</p>
          {email && <p className="truncate text-xs text-muted-foreground">{email}</p>}
        </div>
        <div className="my-1 h-px bg-border" />
        <Link href="/" role="menuitem" className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm hover:bg-accent">
          <Home className="size-4" /> Iris home
        </Link>
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            setOpen(false);
            openUserProfile();
          }}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm hover:bg-accent"
        >
          <Settings className="size-4" /> Account settings
        </button>
        <button
          type="button"
          role="menuitem"
          onClick={() => signOut({ redirectUrl: "/" })}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm hover:bg-accent"
        >
          <LogOut className="size-4" /> Sign out
        </button>
      </div>
    </div>
  );
}

function StatTiles({ data }: { data: DashboardData }) {
  const latest = data.scans[0];
  const typical = latest ? CHECK_VIEWS.filter((c) => c.statusOf(latest) === "typical").length : null;
  const tiles = [
    {
      label: "Scans saved",
      value: String(data.total_scans),
      sub: (() => {
        const camera = data.scans.filter((s) => s.source === "camera").length;
        return camera ? `${camera} camera, ${data.scans.length - camera} demo` : data.total_scans === 1 ? "demo scan" : "demo scans";
      })(),
    },
    { label: "Last scan", value: latest ? relative(latest.created_at) : "–", sub: latest ? dateTime.format(new Date(latest.created_at)) : "No scans yet" },
    { label: "Latest scan", value: typical === null ? "–" : `${typical} of 3`, sub: "checks look typical" },
    { label: "Research sharing", value: data.profile.research_consent ? "On" : "Off", sub: data.profile.research_consent ? "Numbers only, never images" : "You can turn it on below" },
  ];
  return (
    <section aria-label="Summary" className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {tiles.map((t, i) => (
        <div
          key={t.label}
          className="animate-in fade-in slide-in-from-bottom-2 rounded-2xl border bg-card p-5 [animation-fill-mode:both]"
          style={{ animationDelay: `${i * 70}ms`, animationDuration: "500ms" }}
        >
          <p className="text-sm text-muted-foreground">{t.label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">{t.value}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{t.sub}</p>
        </div>
      ))}
    </section>
  );
}

function LatestResults({ scans, highlight }: { scans: Scan[]; highlight: string | null }) {
  const latest = scans[0];
  const recent = [...scans].slice(0, 12).reverse();
  return (
    <section aria-labelledby="latest-heading" className="rounded-3xl border bg-card p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 id="latest-heading" className="font-semibold">
          Latest results
        </h2>
        <span className="text-xs text-muted-foreground">{dateTime.format(new Date(latest.created_at))}</span>
      </div>
      <div key={latest.id} className={cn("mt-4 grid gap-3 md:grid-cols-3", highlight === latest.id && "animate-in fade-in zoom-in-95 duration-500")}>
        {CHECK_VIEWS.map((c) => {
          const value = c.metric.value(latest.metrics);
          const series = recent.map((s) => c.metric.value(s.metrics)).filter((v): v is number => v !== undefined);
          return (
            <article key={c.id} className="flex flex-col rounded-2xl border p-4">
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 items-center justify-center rounded-lg bg-foreground text-background">
                  <c.icon className="size-4" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold leading-tight">{c.name}</h3>
                  <p className="truncate text-[11px] text-muted-foreground">{c.signal}</p>
                </div>
              </div>
              <div className="mt-3">
                <StatusBadge status={c.statusOf(latest)} />
              </div>
              <div className="mt-4 flex items-end justify-between gap-2">
                <div>
                  <p className="text-[11px] text-muted-foreground">{c.metric.label}</p>
                  <p className="text-2xl font-semibold tabular-nums tracking-tight">
                    {value === undefined ? "–" : value.toFixed(0)}
                    <span className="text-sm font-normal text-muted-foreground">{c.metric.unit}</span>
                  </p>
                </div>
                <Sparkline values={series} />
              </div>
              <dl className="mt-3 space-y-1 border-t pt-3 text-xs">
                {c.details(latest.metrics).map((d) => (
                  <div key={d.label} className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">{d.label}</dt>
                    <dd className="font-medium tabular-nums">{d.value}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-auto pt-3 text-[11px] text-muted-foreground">If flagged: {c.nextStep}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function Trends({ scans, active, onChange }: { scans: Scan[]; active: number; onChange: (i: number) => void }) {
  const c = CHECK_VIEWS[active];
  const points = [...scans]
    .slice(0, 20)
    .reverse()
    .map((s) => ({ t: s.created_at, v: c.metric.value(s.metrics) }))
    .filter((p): p is { t: string; v: number } => p.v !== undefined);

  return (
    <section aria-labelledby="trends-heading" className="rounded-3xl border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="trends-heading" className="font-semibold">
            {c.metric.label} over time
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {c.name} check · last {points.length} scans · {c.metric.better === "higher" ? "higher is more typical" : "lower is more typical"}
          </p>
        </div>
        <div role="tablist" aria-label="Choose a check" className="flex rounded-xl border bg-muted/50 p-1">
          {CHECK_VIEWS.map((v, i) => (
            <button
              key={v.id}
              role="tab"
              aria-selected={active === i}
              onClick={() => onChange(i)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                active === i ? "bg-background text-foreground shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {v.name}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-5">
        <TrendChart key={c.id} points={points} unit={c.metric.unit} label={c.metric.label} band={c.metric.typical} />
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">
        The shaded band is the typical range from published studies and our provisional cut-offs. Demo scan values are simulated.
      </p>
    </section>
  );
}

function History({
  scans,
  total,
  showAll,
  onToggle,
  onDelete,
  highlight,
}: {
  scans: Scan[];
  total: number;
  showAll: boolean;
  onToggle: () => void;
  onDelete: (id: string) => void;
  highlight: string | null;
}) {
  return (
    <section aria-labelledby="history-heading" className="rounded-3xl border bg-card p-6">
      <div className="flex items-center justify-between">
        <h2 id="history-heading" className="font-semibold">
          Scan history
        </h2>
        <span className="text-xs text-muted-foreground">{total} saved</span>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[34rem] text-left text-sm">
          <thead>
            <tr className="border-b text-xs text-muted-foreground">
              <th scope="col" className="pb-2 font-medium">
                Date
              </th>
              {CHECK_VIEWS.map((c) => (
                <th key={c.id} scope="col" className="pb-2 font-medium">
                  {c.name}
                </th>
              ))}
              <th scope="col" className="pb-2 font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {scans.map((s) => (
              <tr key={s.id} className={cn("border-b last:border-0", highlight === s.id && "animate-in fade-in bg-accent/40 duration-700")}>
                <td className="py-3 pr-3">
                  <span className="block whitespace-nowrap">{dateTime.format(new Date(s.created_at))}</span>
                  <span className="text-[11px] text-muted-foreground">{s.source === "demo" ? "Demo scan" : "Camera scan"}</span>
                </td>
                {CHECK_VIEWS.map((c) => {
                  const v = c.metric.value(s.metrics);
                  return (
                    <td key={c.id} className="py-3 pr-3">
                      <StatusBadge status={c.statusOf(s)} compact />
                      <span className="mt-1 block text-[11px] tabular-nums text-muted-foreground">
                        {v === undefined ? "" : `${c.metric.label}: ${v.toFixed(0)}${c.metric.unit}`}
                      </span>
                    </td>
                  );
                })}
                <td className="py-3 text-right">
                  <button
                    type="button"
                    onClick={() => onDelete(s.id)}
                    aria-label={`Delete the scan from ${dateTime.format(new Date(s.created_at))} (${CHECK_VIEWS.map((c) => `${c.name}: ${statusLabel(c.statusOf(s))}`).join(", ")})`}
                    className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {total > 8 && (
        <button type="button" onClick={onToggle} className="mt-3 text-sm font-medium underline-offset-4 hover:underline">
          {showAll ? "Show fewer" : `Show all ${total}`}
        </button>
      )}
    </section>
  );
}

function DataCard({ count, onDeleteAll }: { count: number; onDeleteAll: () => Promise<void> }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <section className="rounded-3xl border bg-card p-6">
      <h2 className="font-semibold">Your data</h2>
      <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
        <li className="flex gap-2">
          <Check className="mt-0.5 size-4 shrink-0 text-foreground" /> Scan numbers and your answers are stored in our database, linked to your account.
        </li>
        <li className="flex gap-2">
          <Check className="mt-0.5 size-4 shrink-0 text-foreground" /> No eye images are stored. Camera scans process the video on your phone.
        </li>
        <li className="flex gap-2">
          <Check className="mt-0.5 size-4 shrink-0 text-foreground" /> Delete everything anytime.{" "}
          <Link href="/privacy" className="text-foreground underline underline-offset-4">
            Privacy Policy
          </Link>
        </li>
      </ul>
      {confirming ? (
        <div className="mt-4 rounded-2xl border border-foreground/40 p-4">
          <p className="text-sm">
            Delete your answers and {count} {count === 1 ? "scan" : "scans"}? This can&apos;t be undone. Your sign-in account stays; remove it in
            Account settings.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await onDeleteAll();
                } finally {
                  setBusy(false);
                  setConfirming(false);
                }
              }}
              className="inline-flex h-9 items-center gap-2 rounded-xl bg-foreground px-3 text-sm font-medium text-background disabled:opacity-60"
            >
              {busy && <Loader2 className="size-4 animate-spin" />} Delete everything
            </button>
            <button type="button" onClick={() => setConfirming(false)} className="h-9 rounded-xl border px-3 text-sm hover:bg-accent">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="mt-4 inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-sm transition-colors hover:bg-accent"
        >
          <Trash2 className="size-4" /> Delete my data
        </button>
      )}
    </section>
  );
}

function NextUp() {
  const next = ROADMAP.find((r) => r.status === "Next") ?? ROADMAP[0];
  return (
    <section className="rounded-3xl border bg-foreground p-6 text-background">
      <p className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-widest text-background/60">
        <Clock className="size-3.5" /> Coming next · {next.title}
      </p>
      <h2 className="mt-3 text-lg font-semibold">{next.heading}</h2>
      <p className="mt-1 text-sm text-background/70">{next.body}</p>
      <Link href="/#roadmap" className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline">
        See the roadmap <ArrowRight className="size-4" />
      </Link>
    </section>
  );
}

function EmptyState({ onRun, busy }: { onRun: () => void; busy: boolean }) {
  return (
    <section className="mt-6 flex flex-col items-center rounded-3xl border border-dashed px-6 py-14 text-center">
      <EyeTracker aria-hidden shape="Circle" size={88} track="window" style={{ width: 110, height: 110 }} bodyClassName="fill-foreground stroke-foreground" eyeClassName="fill-background" />
      <h2 className="mt-2 text-xl font-semibold">No scans yet</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        The eye photo check asks a few questions, then describes one close-up photo of the eye. A demo scan saves three simulated results instead.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link
          href="/dashboard/eye-check"
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-foreground px-5 text-sm font-medium text-background transition-opacity hover:opacity-90"
        >
          <Camera className="size-4" /> Start an eye photo check
        </Link>
        <button
          type="button"
          onClick={onRun}
          disabled={busy}
          className="inline-flex h-11 items-center gap-2 rounded-xl border px-4 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-60"
        >
          <Activity className="size-4" /> Try a demo scan
        </button>
      </div>
    </section>
  );
}

function ScanOverlay({ step }: { step: number }) {
  return (
    <div role="dialog" aria-modal="true" aria-label="Running a demo scan" className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-6 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-sm rounded-3xl border bg-card p-8 shadow-2xl animate-in zoom-in-95">
        <div className="relative mx-auto flex size-28 items-center justify-center">
          <span className="absolute inset-0 rounded-full border border-foreground/20 motion-safe:animate-ping" />
          <span className="absolute inset-3 rounded-full border border-foreground/30" />
          <span className={cn("size-10 rounded-full bg-foreground transition-transform duration-500", step >= 1 ? "scale-50" : "scale-100")} />
        </div>
        <p className="mt-6 text-center text-xs font-medium uppercase tracking-widest text-muted-foreground">Demo scan</p>
        <ol className="mt-4 space-y-2.5" aria-live="polite">
          {SCAN_STEPS.map((s, i) => (
            <li key={s} className={cn("flex items-center gap-3 text-sm transition-opacity", i > step && "opacity-40")}>
              <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-full border", i < step && "border-foreground bg-foreground text-background")}>
                {i < step ? <Check className="size-3" /> : i === step ? <Loader2 className="size-3 animate-spin" /> : null}
              </span>
              {s}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div aria-busy="true" aria-label="Loading your dashboard" className="animate-pulse">
      <div className="h-6 w-48 rounded-full bg-muted" />
      <div className="mt-4 h-10 w-80 max-w-full rounded-xl bg-muted" />
      <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-muted" />
        ))}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="h-96 rounded-3xl bg-muted lg:col-span-2" />
        <div className="h-96 rounded-3xl bg-muted" />
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="mx-auto mt-16 max-w-md rounded-3xl border p-8 text-center">
      <h1 className="text-lg font-semibold">We couldn&apos;t load your dashboard</h1>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      <button type="button" onClick={onRetry} className="mt-5 h-10 rounded-xl bg-foreground px-4 text-sm font-medium text-background">
        Try again
      </button>
    </div>
  );
}
