import Link from "next/link";
import { IconBook, IconChevronRight } from "@/components/ui/icons";

// Zadnji opravljeni nakupi pod kartico Aktualno: nizke kartice samo z imenom,
// klik odpre arhiviran seznam. Uporabljata ListsHome in HomePreview (static =
// brez povezav, enaka višina), da stran ob nalaganju ne skoči.
export default function RecentArchived({
  lists,
  static: isStatic = false,
}: {
  lists: { id: string; name: string }[];
  static?: boolean;
}) {
  const row =
    "flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900/60 dark:text-gray-300";
  return lists.map((l) => {
    const content = (
      <>
        <IconBook className="h-4 w-4 flex-shrink-0 text-gray-400" />
        <span className="min-w-0 flex-1 truncate">{l.name}</span>
        <IconChevronRight className="h-4 w-4 flex-shrink-0 text-gray-400" />
      </>
    );
    return (
      <li key={l.id}>
        {isStatic ? (
          <div className={row}>{content}</div>
        ) : (
          <Link
            href={`/seznam/${l.id}`}
            className={`${row} hover:border-emerald-400 dark:hover:border-emerald-700`}
          >
            {content}
          </Link>
        )}
      </li>
    );
  });
}
