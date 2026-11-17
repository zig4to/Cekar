import { IconCamera } from "@/components/ui/icons";

// Opozorilo na seznamu pod trgovinami (ListView in ListPreview — enaka višina,
// da stran ob nalaganju ne skoči). Ne na stalnem in ne na arhiviranem seznamu.
export default function ReceiptReminder() {
  return (
    <p className="flex items-center gap-2 rounded-lg border border-pink-200 bg-pink-50 px-3 py-2 text-sm text-pink-800 dark:border-pink-900 dark:bg-pink-950/40 dark:text-pink-300">
      <IconCamera className="h-4 w-4 flex-shrink-0" />
      Prosimo, če slikate račune.
    </p>
  );
}

// Črta pod kartico Aktualno — vedno, tudi brez kartic pod njo.
export function HomeDivider() {
  return (
    <li aria-hidden className="py-1">
      <hr className="border-gray-300 dark:border-gray-700" />
    </li>
  );
}
