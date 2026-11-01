"use client";

import { useState, useTransition } from "react";
import {
  createStoreAction,
  deleteStoreAction,
  leaveHouseholdAction,
  renameHouseholdAction,
  renameStoreAction,
  reorderStoresAction,
  setDisplayNameAction,
} from "@/actions/cekar";
import { logoutAction } from "@/actions/auth";
import Button from "@/components/ui/Button";
import PromptDialog from "@/components/ui/PromptDialog";
import ThemeToggle from "@/components/theme/ThemeToggle";
import StoreLogo from "@/components/cekar/StoreLogo";
import {
  IconArrowDown,
  IconArrowUp,
  IconCheck,
  IconCopy,
  IconLogout,
  IconPencil,
  IconPlus,
  IconTrash,
} from "@/components/ui/icons";
import type {
  CekarMember,
  CekarMembership,
  CekarStore,
} from "@/lib/types/database.types";

type Prompt = {
  title: string;
  label: string;
  initialValue?: string;
  onSubmit: (value: string) => Promise<{ error?: string }>;
};

const CARD =
  "space-y-3 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900";
const ICON_BTN =
  "rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30 dark:hover:bg-gray-800 dark:hover:text-gray-200";

export default function Settings({
  email,
  membership,
  members,
  stores,
}: {
  email: string | null;
  membership: CekarMembership;
  members: CekarMember[];
  stores: CekarStore[];
}) {
  const { household, member } = membership;
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const run = (action: () => Promise<{ error?: string }>) => {
    setError(null);
    startTransition(async () => {
      const res = await action();
      if (res.error) setError(res.error);
    });
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(household.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* odložišče ni na voljo — koda je vidna in jo lahko prepišeš */
    }
  };

  const move = (index: number, delta: number) => {
    const ids = stores.map((s) => s.id);
    const [id] = ids.splice(index, 1);
    ids.splice(index + delta, 0, id);
    run(() => reorderStoresAction(ids));
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Nastavitve</h1>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <section className={CARD}>
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Gospodinjstvo
            </p>
            <p className="truncate font-semibold">{household.name}</p>
          </div>
          <button
            type="button"
            aria-label="Preimenuj gospodinjstvo"
            className={ICON_BTN}
            onClick={() =>
              setPrompt({
                title: "Preimenuj gospodinjstvo",
                label: "Ime",
                initialValue: household.name,
                onSubmit: renameHouseholdAction,
              })
            }
          >
            <IconPencil />
          </button>
        </div>
        <div>
          <p className="mb-1 text-sm text-gray-600 dark:text-gray-300">
            Koda za povabilo — član jo vnese ob prvem zagonu Cekarja:
          </p>
          <div className="flex items-center gap-2">
            <code className="rounded-md bg-gray-100 px-3 py-1.5 font-mono text-lg tracking-widest dark:bg-gray-800">
              {household.invite_code}
            </code>
            <button
              type="button"
              onClick={copyCode}
              title={copied ? "Kopirano!" : "Kopiraj"}
              aria-label="Kopiraj kodo"
              className={
                copied
                  ? "rounded p-1.5 text-[#22c55e] outline outline-2 outline-offset-1 outline-[#22c55e] transition"
                  : `${ICON_BTN} transition`
              }
            >
              {copied ? <IconCheck /> : <IconCopy />}
            </button>
          </div>
        </div>
        <div>
          <p className="mb-1 text-sm text-gray-600 dark:text-gray-300">Člani</p>
          <ul className="space-y-1">
            {members.map((m) => (
              <li key={m.user_id} className="flex items-center gap-2 text-sm">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold uppercase text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  {(m.display_name || "?").charAt(0)}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {m.display_name || "Brez imena"}
                  {m.user_id === member.user_id && (
                    <span className="text-gray-500 dark:text-gray-400"> (ti)</span>
                  )}
                </span>
                {m.user_id === member.user_id && (
                  <button
                    type="button"
                    aria-label="Spremeni svoje ime"
                    className={ICON_BTN}
                    onClick={() =>
                      setPrompt({
                        title: "Tvoje ime",
                        label: "Ime za prikaz",
                        initialValue: m.display_name,
                        onSubmit: setDisplayNameAction,
                      })
                    }
                  >
                    <IconPencil />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className={CARD}>
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold">Trgovine</p>
          <Button
            variant="secondary"
            onClick={() =>
              setPrompt({
                title: "Nova trgovina",
                label: "Ime trgovine",
                onSubmit: (name) => createStoreAction(name),
              })
            }
          >
            <IconPlus /> Dodaj
          </Button>
        </div>
        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
          {stores.map((s, i) => (
            <li key={s.id} className="flex items-center gap-1 py-1.5">
              <StoreLogo name={s.name} className="mr-1.5 h-5 w-5" />
              <span className="min-w-0 flex-1 truncate text-sm">{s.name}</span>
              <button
                type="button"
                aria-label="Gor"
                disabled={i === 0}
                className={ICON_BTN}
                onClick={() => move(i, -1)}
              >
                <IconArrowUp />
              </button>
              <button
                type="button"
                aria-label="Dol"
                disabled={i === stores.length - 1}
                className={ICON_BTN}
                onClick={() => move(i, 1)}
              >
                <IconArrowDown />
              </button>
              <button
                type="button"
                aria-label={`Preimenuj ${s.name}`}
                className={ICON_BTN}
                onClick={() =>
                  setPrompt({
                    title: "Preimenuj trgovino",
                    label: "Ime trgovine",
                    initialValue: s.name,
                    onSubmit: (name) => renameStoreAction(s.id, name),
                  })
                }
              >
                <IconPencil />
              </button>
              <button
                type="button"
                aria-label={`Izbriši ${s.name}`}
                className={ICON_BTN}
                onClick={() => {
                  if (
                    window.confirm(
                      `Izbrišem ${s.name}? Izbrišejo se tudi njeni izdelki na vseh seznamih in v katalogu.`
                    )
                  ) {
                    run(() => deleteStoreAction(s.id));
                  }
                }}
              >
                <IconTrash />
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className={CARD}>
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold">Tema</p>
          <ThemeToggle />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
          <p className="min-w-0 truncate text-sm text-gray-500 dark:text-gray-400">{email}</p>
          <form action={logoutAction}>
            <Button type="submit" variant="secondary">
              <IconLogout /> Odjava
            </Button>
          </form>
        </div>
        <button
          type="button"
          onClick={() => {
            if (window.confirm(`Zapustim gospodinjstvo „${household.name}“?`)) {
              run(leaveHouseholdAction);
            }
          }}
          className="text-xs text-red-600 hover:underline dark:text-red-400"
        >
          Zapusti gospodinjstvo
        </button>
      </section>

      <PromptDialog
        open={prompt !== null}
        onClose={() => setPrompt(null)}
        title={prompt?.title ?? ""}
        label={prompt?.label ?? ""}
        initialValue={prompt?.initialValue ?? ""}
        onSubmit={(v) => prompt?.onSubmit(v)}
      />
    </div>
  );
}
