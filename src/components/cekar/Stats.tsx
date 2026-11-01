"use client";

import { useState } from "react";
import Link from "next/link";
import StoreLogo from "@/components/cekar/StoreLogo";
import { IconArrowLeft, IconChevronDown, IconChevronRight } from "@/components/ui/icons";
import { formatEur } from "@/lib/cekar/text";
import clsx from "@/lib/utils/clsx";
import type { CekarSpentMonth } from "@/lib/types/database.types";

const CHART_MONTHS = 12;

const monthName = (key: string, month: "long" | "short" = "long") =>
  new Date(`${key}-01T12:00:00`).toLocaleDateString("sl-SI", {
    month,
    ...(month === "long" ? { year: "numeric" } : {}),
  });

// Ključ meseca ("2026-11") n mesecev pred danim.
function shiftMonth(key: string, n: number) {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 - n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Zapravljeno po mesecih: ta mesec (+ primerjava s prejšnjim), stolpci zadnjih
// 12 mesecev in seznam vseh mesecev z razčlenitvijo po trgovinah.
// current = tekoči mesec po ljubljanskem času (s strežnika, da se SSR in
// brskalnik ujemata).
export default function Stats({
  months,
  current,
}: {
  months: CekarSpentMonth[];
  current: string;
}) {
  const byMonth = new Map(months.map((m) => [m.month, m]));
  const thisTotal = byMonth.get(current)?.total ?? 0;
  const prevTotal = byMonth.get(shiftMonth(current, 1))?.total ?? 0;

  const chart = Array.from({ length: CHART_MONTHS }, (_, i) => {
    const key = shiftMonth(current, CHART_MONTHS - 1 - i);
    return { key, total: byMonth.get(key)?.total ?? 0 };
  });
  const max = Math.max(...chart.map((c) => c.total));
  const [hover, setHover] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(months[0]?.month ?? null);

  const diff = thisTotal - prevTotal;

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

      <section className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Ta mesec · {monthName(current)}
        </p>
        <p className="mt-1 text-3xl font-semibold tabular-nums">{formatEur(thisTotal)}</p>
        {prevTotal > 0 && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {diff === 0
              ? "Enako kot prejšnji mesec"
              : `${diff > 0 ? "+" : "−"}${formatEur(Math.abs(diff))} glede na prejšnji mesec (${formatEur(prevTotal)})`}
          </p>
        )}
      </section>

      {months.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
          Še ni vnesenih zneskov. Na seznamu klikni € v glavi trgovine in vpiši,
          koliko si zapravil.
        </p>
      ) : (
        <>
          <section className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
              Zadnjih 12 mesecev
            </h2>
            <div className="relative">
              <div className="flex h-40 items-end gap-1 border-b border-gray-200 dark:border-gray-700">
                {chart.map((c) => {
                  const active = hover === c.key;
                  return (
                    <button
                      key={c.key}
                      type="button"
                      aria-label={`${monthName(c.key)}: ${formatEur(c.total)}`}
                      onMouseEnter={() => setHover(c.key)}
                      onMouseLeave={() => setHover(null)}
                      onFocus={() => setHover(c.key)}
                      onBlur={() => setHover(null)}
                      onClick={() => {
                        setHover(c.key);
                        if (byMonth.has(c.key)) setExpanded(c.key);
                      }}
                      className="relative flex h-full flex-1 items-end justify-center focus:outline-none"
                    >
                      {active && (
                        <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs text-white shadow dark:bg-gray-100 dark:text-gray-900">
                          {monthName(c.key)} · <span className="font-semibold">{formatEur(c.total)}</span>
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
                          height: max > 0 && c.total > 0 ? `max(${(c.total / max) * 100}%, 2px)` : 0,
                        }}
                      />
                    </button>
                  );
                })}
              </div>
              <div className="mt-1 flex gap-1">
                {chart.map((c) => (
                  <span
                    key={c.key}
                    className={clsx(
                      "flex-1 text-center text-[10px] text-gray-500 dark:text-gray-400",
                      c.key === current && "font-semibold text-gray-800 dark:text-gray-200"
                    )}
                  >
                    {monthName(c.key, "short").replace(".", "")}
                  </span>
                ))}
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">Po mesecih</h2>
            {months.map((m) => {
              const open = expanded === m.month;
              return (
                <div
                  key={m.month}
                  className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
                >
                  <button
                    type="button"
                    onClick={() => setExpanded(open ? null : m.month)}
                    aria-expanded={open}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800/60"
                  >
                    {open ? <IconChevronDown /> : <IconChevronRight />}
                    <span className="flex-1 font-medium capitalize">{monthName(m.month)}</span>
                    <span className="font-semibold tabular-nums">{formatEur(m.total)}</span>
                  </button>
                  {open && (
                    <ul className="divide-y divide-gray-100 border-t border-gray-100 dark:divide-gray-800 dark:border-gray-800">
                      {m.stores.map(({ store, total }) => (
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
          </section>
        </>
      )}
    </div>
  );
}
