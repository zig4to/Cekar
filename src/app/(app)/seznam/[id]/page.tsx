import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getListDetail, getShoppingListNames } from "@/lib/data/cekar";
import { collapsedCookie, parseCollapsed } from "@/lib/cekar/collapsed";
import ListView from "@/components/cekar/ListView";

// Članstvo preveri layout (nečlan vidi Onboarding), RLS pa seznam drugega
// gospodinjstva skrije — zato tu samo en krog poizvedb. Zložene trgovine
// pridejo iz piškotka, da se ob osvežitvi ne odprejo in zaprejo.
export default async function ListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [supabase, jar] = await Promise.all([createClient(), cookies()]);
  // imena seznamov rabi samo stalni seznam ("Zapiši na seznam"), poizvedba
  // pa je majhna in gre v istem krogu
  const [detail, shoppingLists] = await Promise.all([
    getListDetail(supabase, id),
    getShoppingListNames(supabase),
  ]);
  if (!detail) notFound();
  const collapsed = parseCollapsed(jar.get(collapsedCookie(id))?.value);
  return (
    <ListView detail={detail} collapsedStoreIds={collapsed} shoppingLists={shoppingLists} />
  );
}
