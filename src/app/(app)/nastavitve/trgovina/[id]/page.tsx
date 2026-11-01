import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCategories, getStore, getStoreProducts } from "@/lib/data/cekar";
import StoreProducts from "@/components/cekar/StoreProducts";

// Katalog izdelkov trgovine (vir predlogov ob dodajanju). Odpre se iz
// Nastavitev ali iz menija trgovine na seznamu (?nazaj=/seznam/<id>).
export default async function StoreProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ nazaj?: string }>;
}) {
  const [{ id }, { nazaj }, supabase] = await Promise.all([
    params,
    searchParams,
    createClient(),
  ]);
  const [store, products, categories] = await Promise.all([
    getStore(supabase, id),
    getStoreProducts(supabase, id),
    getCategories(supabase),
  ]);
  if (!store) notFound();
  // samo notranje poti, da ?nazaj= ne more preusmeriti drugam
  const back = nazaj?.startsWith("/seznam/") ? nazaj : "/nastavitve";
  return (
    <StoreProducts store={store} products={products} categories={categories} back={back} />
  );
}
