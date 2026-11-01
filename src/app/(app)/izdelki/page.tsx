import { createClient } from "@/lib/supabase/server";
import { getCategories, getProducts, getStores } from "@/lib/data/cekar";
import ProductsCatalog from "@/components/cekar/ProductsCatalog";

// Skupni seznam izdelkov: vsak izdelek z vsemi trgovinami, kjer ga dobiš.
export default async function ProductsPage() {
  const supabase = await createClient();
  const [products, stores, categories] = await Promise.all([
    getProducts(supabase),
    getStores(supabase),
    getCategories(supabase),
  ]);
  return <ProductsCatalog products={products} stores={stores} categories={categories} />;
}
