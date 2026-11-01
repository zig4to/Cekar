"use client";

import { IconMinus, IconPlus } from "@/components/ui/icons";
import { MAX_QUANTITY } from "@/lib/cekar/text";
import clsx from "@/lib/utils/clsx";

// Števec količine (− 1 +). onMouseDown preventDefault: klik ne vzame fokusa
// vnosnemu polju, tipkovnica na telefonu ostane odprta.
export default function QuantityStepper({
  value,
  onChange,
  size = "sm",
}: {
  value: number;
  onChange: (value: number) => void;
  size?: "sm" | "lg";
}) {
  const btn = clsx(
    "flex flex-shrink-0 items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-800 disabled:text-gray-300 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100 dark:disabled:text-gray-600",
    size === "lg" ? "h-10 w-10" : "h-9 w-7"
  );
  return (
    <div
      className="flex flex-shrink-0 items-center overflow-hidden rounded-md border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
      role="group"
      aria-label="Količina"
    >
      <button
        type="button"
        aria-label="Manj"
        disabled={value <= 1}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onChange(Math.max(1, value - 1))}
        className={btn}
      >
        <IconMinus />
      </button>
      <span
        className={clsx(
          "text-center font-medium tabular-nums",
          size === "lg" ? "min-w-10 text-base" : "min-w-6 text-sm"
        )}
      >
        {value}
      </span>
      <button
        type="button"
        aria-label="Več"
        disabled={value >= MAX_QUANTITY}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onChange(Math.min(MAX_QUANTITY, value + 1))}
        className={btn}
      >
        <IconPlus />
      </button>
    </div>
  );
}
