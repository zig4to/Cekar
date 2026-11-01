import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/auth";
import { getListSummaries, getMembership } from "@/lib/data/cekar";
import ListsHome from "@/components/cekar/ListsHome";

export default async function HomePage() {
  const supabase = await createClient();
  const user = await getAuthUser(supabase);
  const membership = user ? await getMembership(supabase, user.id) : null;
  if (!membership) return null; // layout pokaže Onboarding

  const lists = await getListSummaries(supabase, membership.household.id);
  return <ListsHome lists={lists} householdName={membership.household.name} />;
}
