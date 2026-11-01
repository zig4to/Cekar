import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/auth";
import { getCategories, getMembers, getMembership, getStores } from "@/lib/data/cekar";
import Settings from "@/components/cekar/Settings";

export default async function SettingsPage() {
  const supabase = await createClient();
  const user = await getAuthUser(supabase);
  const membership = user ? await getMembership(supabase, user.id) : null;
  if (!membership) return null;

  const [members, stores, categories] = await Promise.all([
    getMembers(supabase, membership.household.id),
    getStores(supabase),
    getCategories(supabase),
  ]);
  return (
    <Settings
      email={user?.email ?? null}
      membership={membership}
      members={members}
      stores={stores}
      categories={categories}
    />
  );
}
