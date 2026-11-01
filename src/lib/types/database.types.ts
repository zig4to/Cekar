// Ročno napisani tipi za tabele Cekarja v Supabase (predpona `cekar_`).
// Ustrezajo supabase/migrations/0001_init.sql. Ob vsaki novi migraciji, ki
// doda stolpec/tabelo, jih je treba ročno posodobiti.

type Table<Row, Required extends keyof Row> = {
  Relationships: [];
  Row: Row;
  Insert: Partial<Row> & Pick<Row, Required>;
  Update: Partial<Row>;
};

export type CekarHousehold = {
  id: string;
  name: string;
  invite_code: string;
  created_at: string;
};

export type CekarMember = {
  user_id: string;
  household_id: string;
  display_name: string;
  joined_at: string;
};

export type CekarStore = {
  id: string;
  household_id: string;
  name: string;
  position: number;
  default_items: string[]; // dodajo se sami, ko trgovino dodaš na seznam
  created_at: string;
};

export type CekarProduct = {
  id: string;
  household_id: string;
  store_id: string;
  name: string;
  category_id: string | null; // kategorija izdelka (cekar_categories)
  use_count: number;
  last_used_at: string;
  created_at: string;
};

export type CekarCategory = {
  id: string;
  household_id: string;
  name: string;
  position: number;
  keywords: string[]; // začetki besed brez šumnikov za samodejno ugibanje
  created_at: string;
};

export type CekarList = {
  id: string;
  household_id: string;
  name: string;
  created_by: string | null;
  archived_at: string | null;
  is_template: boolean; // stalni seznam (en na gospodinjstvo)
  created_at: string;
};

export type CekarListStore = {
  id: string;
  list_id: string;
  store_id: string;
  position: number;
  created_at: string;
};

export type CekarItem = {
  id: string;
  list_id: string;
  store_id: string;
  product_id: string | null;
  name: string;
  note: string | null;
  checked: boolean;
  checked_at: string | null;
  position: number;
  quantity: number;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      cekar_households: Table<CekarHousehold, "name">;
      cekar_members: Table<CekarMember, "user_id" | "household_id">;
      cekar_stores: Table<CekarStore, "household_id" | "name">;
      cekar_products: Table<CekarProduct, "household_id" | "store_id" | "name">;
      cekar_categories: Table<CekarCategory, "household_id" | "name">;
      cekar_lists: Table<CekarList, "household_id" | "name">;
      cekar_list_stores: Table<CekarListStore, "list_id" | "store_id">;
      cekar_items: Table<CekarItem, "list_id" | "store_id" | "name">;
    };
    Views: Record<string, never>;
    Functions: {
      cekar_my_household: { Args: Record<string, never>; Returns: string };
      cekar_create_household: {
        Args: { p_name: string; p_display_name: string };
        Returns: string;
      };
      cekar_join_household: {
        Args: { p_code: string; p_display_name: string };
        Returns: string;
      };
      cekar_add_item: {
        Args: {
          p_list_id: string;
          p_store_id: string;
          p_name: string;
          p_quantity?: number;
          p_category_id?: string | null;
        };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

// Članstvo prijavljenega uporabnika skupaj z gospodinjstvom.
export type CekarMembership = {
  member: CekarMember;
  household: CekarHousehold;
};

// Kartica seznama na domači strani.
export type CekarListSummary = {
  id: string;
  name: string;
  isTemplate: boolean;
  storeNames: string[];
  storeIds: string[]; // za hitro dodajanje (trgovine na seznamu najprej)
  items: CekarItemBrief[]; // za hitro dodajanje (brez podvajanja predlogov)
  total: number;
  checked: number;
};

// Kar hitro dodajanje potrebuje o izdelkih, ki so že na seznamu.
export type CekarItemBrief = Pick<
  CekarItem,
  "id" | "store_id" | "product_id" | "name" | "checked" | "quantity"
>;

// Vse, kar potrebuje pogled enega seznama.
export type CekarListDetail = {
  list: CekarList;
  stores: CekarStore[]; // trgovine na seznamu, v vrstnem redu seznama
  items: CekarItem[];
  allStores: CekarStore[]; // vse trgovine gospodinjstva (za "Dodaj trgovino")
  products: CekarProduct[]; // katalog za predloge (vse trgovine)
  categories: CekarCategory[]; // v vrstnem redu (= vrstni red skupin)
};
