import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/auth";
import { getMembership } from "@/lib/data/cekar";
import SsoHashCleanup from "@/components/auth/SsoHashCleanup";
import Onboarding from "@/components/cekar/Onboarding";
import { IconBasket, IconChart, IconList, IconSettings } from "@/components/ui/icons";

// Ogrodje aplikacije Cekar: zgornja vrstica (logo → domov, izdelki, statistika, nastavitve), pod
// njo drseča vsebina. Uporabnik brez gospodinjstva namesto vsebine vidi
// Onboarding (ustvari gospodinjstvo / pridruži se s kodo).
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const user = await getAuthUser(supabase);
  const membership = user ? await getMembership(supabase, user.id) : null;

  return (
    <div className="flex h-screen w-full flex-col">
      <SsoHashCleanup />
      <header className="flex min-h-12 items-center justify-between gap-2 border-b border-gray-200 bg-white px-3 dark:border-gray-800 dark:bg-gray-900">
        <Link
          href="/"
          className="flex items-center gap-2 text-base font-semibold text-emerald-700 dark:text-emerald-400"
        >
          <IconBasket className="h-5 w-5" />
          Cekar
        </Link>
        {membership && (
          <nav className="flex items-center gap-1">
            <Link
              href="/izdelki"
              className="flex items-center gap-1.5 rounded-md p-2 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            >
              <IconList className="h-5 w-5" />
              Vsi izdelki
            </Link>
            <Link
              href="/statistika"
              aria-label="Statistika"
              className="flex items-center gap-1.5 rounded-md p-2 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            >
              <IconChart className="h-5 w-5" />
              <span className="hidden sm:inline">Statistika</span>
            </Link>
            <Link
              href="/nastavitve"
              aria-label="Nastavitve"
              className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            >
              <IconSettings className="h-5 w-5" />
            </Link>
          </nav>
        )}
      </header>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <main className="mx-auto w-full max-w-xl px-4 py-5">
          {membership ? children : <Onboarding email={user?.email ?? null} />}
        </main>
      </div>
    </div>
  );
}
