"use client";

import { useState } from "react";
import Link from "next/link";
import StoreLogo from "@/components/cekar/StoreLogo";
import { IconArrowLeft, IconChevronDown, IconChevronRight } from "@/components/ui/icons";
import { formatEur } from "@/lib/cekar/text";
import clsx from "@/lib/utils/clsx";
import type { CekarSpentPeriod } from "@/lib/types/database.types";

const CHART_BARS = 12;

// ===== Meseci ("2026-11") =====

const monthName = (key: string, month: "long" | "short" = "long") =>
  new Date(`${key}-01T12:00:00`).toLocaleDateString("sl-SI", {
    month,
    ...(month === "long" ? { year: "numeric" } : {}),
  });

// Ključ meseca n mesecev pred danim.
function shiftMonth(key: string, n: number) {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 - n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const MONTHS = {
  sparse: false,
  showLists: false,
  shift: shiftMonth,
  label: (key: string) => monthName(key),
  short: (key: string) => monthName(key, "short").replace(".", ""),
};

// ===== Tedni (ponedeljek "2026-11-16") =====

const weekStart = (key: string) => new Date(`${key}T12:00:00Z`);

// Ključ tedna n tednov pred danim.
function shiftWeek(key: string, n: number) {
  const d = weekStart(key);
  d.setUTCDate(d.getUTCDate() - 7 * n);
  return d.toISOString().slice(0, 10);
}

// "16.–22. november 2026" ali "27. oktober – 2. november 2026"
function weekLabel(key: string) {
  const from = weekStart(key);
  const to = weekStart(shiftWeek(key, -1));
  to.setUTCDate(to.getUTCDate() - 1);
  const month = (d: Date) => d.toLocaleDateString("sl-SI", { month: "long", timeZone: "UTC" });
  const year = to.getUTCFullYear();
  return from.getUTCMonth() === to.getUTCMonth()
    ? `${from.getUTCDate()}.–${to.getUTCDate()}. ${month(to)} ${year}`
    : `${from.getUTCDate()}. ${month(from)} – ${to.getUTCDate()}. ${month(to)} ${year}`;
}

const WEEKS = {
  sparse: true, // na telefonu je oznaka "16.11." preširoka za vsak stolpec
  showLists: true, // v stolpcu: kateri nakup (seznam) je v tem tednu
  shift: shiftWeek,
  label: weekLabel,
  short: (key: string) => {
    const d = weekStart(key);
    return `${d.getUTCDate()}.${d.getUTCMonth() + 1}.`;
  },
};

// Kratko ime nakupa za stolpec: "Trgovina November #1" → "November 1".
const barName = (name: string) =>
  name.replace(/trgovina/gi, "").replace(/#/g, "").replace(/s+/g, " ").trim() || name;

type PeriodKind = typeof MONTHS | typeof WEEKS;

// Zapravljeno: ta mesec in ta teden (+ primerjava s prejšnjim), nato zložljiva
// razdelka Po mesecih / Po tednih — vsak s stolpci zadnjih 12 obdobij in
// seznamom obdobij z razčlenitvijo po trgovinah. Tekoči mesec in teden prideta
// s strežnika (ljubljanski čas), da se SSR in brskalnik ujemata.
export default function Stats({
  months,
  weeks,
  currentMonth,
  currentWeek,
}: {
  months: CekarSpentPeriod[];
  weeks: CekarSpentPeriod[];
  currentMonth: string;
  currentWeek: string;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Link
          href="/"
          aria-label="Nazaj na seznam"
          className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
        >
          <IconArrowLeft />
        </Link>
        <h1 className="text-xl font-semibold">Statistika</h1>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <CurrentCard
          title={`Ta mesec · ${monthName(currentMonth)}`}
          periods={months}
          current={currentMonth}
          prevKey={shiftMonth(currentMonth, 1)}
          prevLabel="prejšnji mesec"
        />
        <CurrentCard
          title={`Ta teden · ${weekLabel(currentWeek)}`}
          periods={weeks}
          current={currentWeek}
          prevKey={shiftWeek(currentWeek, 1)}
          prevLabel="prejšnji teden"
        />
      </div>

      {months.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
          Še ni vnesenih zneskov. Na seznamu klikni € v glavi trgovine in vpiši,
          koliko si zapravil.
        </p>
      ) : (
        <>
          <PeriodSection
            title="Po mesecih"
            chartTitle="Zadnjih 12 mesecev"
            periods={months}
            current={currentMonth}
            kind={MONTHS}
            defaultOpen
          />
          <PeriodSection
            title="Po tednih"
            chartTitle="Zadnjih 12 tednov"
            periods={weeks}
            current={currentWeek}
            kind={WEEKS}
          />
        </>
      )}
    </div>
  );
}

function CurrentCard({
  title,
  periods,
  current,
  prevKey,
  prevLabel,
}: {
  title: string;
  periods: CekarSpentPeriod[];
  current: string;
  prevKey: string;
  prevLabel: string;
}) {
  const total = periods.find((p) => p.key === current)?.total ?? 0;
  const prev = periods.find((p) => p.key === prevKey)?.total ?? 0;
  const diff = total - prev;
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums">{formatEur(total)}</p>
      {prev > 0 && (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {diff === 0
            ? `Enako kot ${prevLabel}`
            : `${diff > 0 ? "+" : "−"}${formatEur(Math.abs(diff))} glede na ${prevLabel} (${formatEur(prev)})`}
        </p>
      )}
    </section>
  );
}

// Zložljiv razdelek: stolpci zadnjih 12 obdobij + seznam obdobij (vsako se
// razširi v zneske po trgovinah). Klik na stolpec razširi to obdobje.
function PeriodSection({
  title,
  chartTitle,
  periods,
  current,
  kind,
  defaultOpen = false,
}: {
  title: string;
  chartTitle: string;
  periods: CekarSpentPeriod[];
  current: string;
  kind: PeriodKind;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [hover, setHover] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(periods[0]?.key ?? null);

  const byKey = new Map(periods.map((p) => [p.key, p]));
  const chart = Array.from({ length: CHART_BARS }, (_, i) => {
    const key = kind.shift(current, CHART_BARS - 1 - i);
    const p = byKey.get(key);
    return { key, total: p?.total ?? 0, lists: p?.lists ?? [] };
  });
  const max = Math.max(...chart.map((c) => c.total));

  return (
    <section className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/60"
      >
        {open ? <IconChevronDown /> : <IconChevronRight />}
        <h2 className="flex-1 font-semibold">{title}</h2>
        <span className="text-xs text-gray-500 dark:text-gray-400">{periods.length}</span>
      </button>

      {open && (
        <div className="space-y-4 border-t border-gray-100 p-4 dark:border-gray-800">
          <div>
            <h3 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
              {chartTitle}
            </h3>
            <div className="relative">
              <div className="flex h-40 items-end gap-1 border-b border-gray-200 dark:border-gray-700">
                {chart.map((c) => {
                  const active = hover === c.key;
                  return (
                    <button
                      key={c.key}
                      type="button"
                      aria-label={`${kind.label(c.key)}: ${formatEur(c.total)}`}
                      onMouseEnter={() => setHover(c.key)}
                      onMouseLeave={() => setHover(null)}
                      onFocus={() => setHover(c.key)}
                      onBlur={() => setHover(null)}
                      onClick={() => {
                        setHover(c.key);
                        if (byKey.has(c.key)) setExpanded(c.key);
                      }}
                      className="relative flex h-full flex-1 items-end justify-center focus:outline-none"
                    >
                      {active && (
                        <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs text-white shadow dark:bg-gray-100 dark:text-gray-900">
                          {kind.label(c.key)} ·{" "}
                          <span className="font-semibold">{formatEur(c.total)}</span>
                          {kind.showLists && c.lists.length > 0 && (
                            <span className="block opacity-80">{c.lists.join(", ")}</span>
                          )}
                        </span>
                      )}
                      <span
                        className={clsx(
                          "w-full max-w-6 rounded-t transition-colors",
                          c.key === current
                            ? "bg-emerald-600 dark:bg-emerald-400"
                            : "bg-emerald-400/70 dark:bg-emerald-600/80",
                          active && "bg-emerald-700 dark:bg-emerald-300"
                        )}
                        style={{
                          height:
                            max > 0 && c.total > 0 ? `max(${(c.total / max) * 100}%, 2px)` : 0,
                        }}
                      >
                        {/* ime nakupa navpično v stolpcu (od spodaj navzgor) */}
                        {kind.showLists && c.lists.length > 0 && (
                          <span className="flex h-full w-full rotate-180 items-center justify-end overflow-hidden px-0.5 pt-1 [writing-mode:vertical-rl]">
                            <span className="truncate text-[10px] font-medium leading-none text-white dark:text-gray-900">
                              {c.lists.map(barName).join(", ")}
                            </span>
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-1 flex gap-1">
                {chart.map((c, i) => (
                  <span
                    key={c.key}
                    className={clsx(
                      "flex-1 text-center text-[10px] text-gray-500 dark:text-gray-400",
                      c.key === current && "font-semibold text-gray-800 dark:text-gray-200"
                    )}
                  >
                    {/* redke oznake: vsaka druga, vedno tudi tekoče obdobje (zadnji stolpec) */}
                    {kind.sparse && (CHART_BARS - 1 - i) % 2 === 1 ? "" : kind.short(c.key)}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {periods.map((p) => {
              const isOpen = expanded === p.key;
              return (
                <div
                  key={p.key}
                  className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800"
                >
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : p.key)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800/60"
                  >
                    {isOpen ? <IconChevronDown /> : <IconChevronRight />}
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium capitalize">{kind.label(p.key)}</span>
                      {kind.showLists && p.lists.length > 0 && (
                        <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
                          {p.lists.join(", ")}
                        </span>
                      )}
                    </span>
                    <span className="text-sm font-semibold tabular-nums">{formatEur(p.total)}</span>
                  </button>
                  {isOpen && (
                    <ul className="divide-y divide-gray-100 border-t border-gray-100 dark:divide-gray-800 dark:border-gray-800">
                      {p.stores.map(({ store, total }) => (
                        <li key={store.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                          <StoreLogo name={store.name} />
                          <span className="flex-1 truncate">{store.name}</span>
                          <span className="tabular-nums text-gray-700 dark:text-gray-300">
                            {formatEur(total)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
