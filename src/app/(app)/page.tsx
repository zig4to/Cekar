import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/auth";
import {
  getCategories,
  getListSummaries,
  getMembership,
  getProducts,
  getStores,
} from "@/lib/data/cekar";
import ListsHome from "@/components/cekar/ListsHome";

export default async function HomePage() {
  const supabase = await createClient();
  const user = await getAuthUser(supabase);
  if (!user) return null;

  const [membership, lists, stores, products, categories] = await Promise.all([
    getMembership(supabase, user.id),
    getListSummaries(supabase),
    getStores(supabase),
    getProducts(supabase),
    getCategories(supabase),
  ]);
  if (!membership) return null; // layout pokaže Onboarding
  return (
    <ListsHome
      lists={lists}
      householdName={membership.household.name}
      stores={stores}
      products={products}
      categories={categories}
    />
  );
}
