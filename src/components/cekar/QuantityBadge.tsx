import clsx from "@/lib/utils/clsx";

// Količina ob imenu izdelka ("2×"); pri 1 se ne prikaže.
export default function QuantityBadge({
  quantity,
  checked,
}: {
  quantity: number;
  checked: boolean;
}) {
  if (quantity <= 1) return null;
  return (
    <span
      className={clsx(
        "flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
        checked
          ? "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500"
          : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
      )}
    >
      {quantity}×
    </span>
  );
}
