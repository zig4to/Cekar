# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Kaj je Cekar

Skupni nakupovalni seznami po trgovinah. Uporabnik ustvari poimenovan seznam,
nanj doda trgovine (Lidl, Hofer, Mercator, Spar …), pod vsako pa izdelke kot
checklisto. **Vsak izdelek je vezan na trgovino**: ob dodajanju v npr. Lidl se
pod poljem pokažejo predlogi izdelkov, ki so bili v Lidl že kdaj dodani.
Seznami so deljeni prek **gospodinjstva** (člani se pridružijo s kodo).

Ogrodje je kopija aplikacije **Vzlet** (prijava, SSO iz huba TomsStudios, tema,
PWA/service worker, UI primitivi) — isti Supabase projekt kot Pisi/Posel/Vzlet,
tabele imajo predpono `cekar_`.

Stack: Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 ·
`@supabase/ssr`. Deploy: Vercel.

## Ukazi

```bash
npm install
npm run dev      # http://localhost:3006
npm run lint
npm run build
```

Testov v projektu ni.

## Okoljske spremenljivke (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Baza (Supabase) — migracije se poganjajo ROČNO

Ni Supabase CLI toka: vsako `supabase/migrations/000N_*.sql` prilepi v
**Supabase Dashboard → SQL Editor** in poženi. Commit `.sql` datoteke ne
pomeni, da je izvedena. `src/lib/types/database.types.ts` je **ročno
napisan** — ob novi migraciji ga posodobi.

Supabase MCP ni na voljo; migracijo lahko poženeš prek Claude in Chrome v SQL
Editorju projekta **ProjektiBaze** (`abjnxhfxjolwwxlckkje`, URL
`supabase.com/dashboard/project/abjnxhfxjolwwxlckkje/sql/new`). Vpiši SQL kot
eno vrstico (Monaco samodejno zapira oklepaje) in raje `if not exists` /
`on conflict do nothing`. Izvedene so vse do vključno `0013`.

Tabele (`0001_init.sql`):
- `cekar_households` (`invite_code`), `cekar_members` (PK `user_id` → en
  uporabnik = največ eno gospodinjstvo).
- `cekar_stores` — trgovine gospodinjstva; ob ustvarjanju gospodinjstva seed
  Lidl/Hofer/Mercator/Spar.
- `cekar_products` — katalog izdelkov **na trgovino** (unique
  `(store_id, lower(name))`, `use_count`, `last_used_at`) = vir predlogov.
- `cekar_lists`, `cekar_list_stores` (trgovine na seznamu, `position`),
  `cekar_items` (izdelek na seznamu: `store_id`, `product_id`, `checked`).

RLS: `cekar_my_household()` (security definer) — vse tabele so omejene na
gospodinjstvo prijavljenega; `cekar_list_stores`/`cekar_items` prek
`list_id` → `cekar_lists`. Vstop v gospodinjstvo samo prek RPC
`cekar_create_household` / `cekar_join_household` (security definer).
Dodajanje izdelka gre prek RPC **`cekar_add_item`** (security invoker), ki v
enem koraku upserta katalog (`use_count + 1`) in vstavi vrstico na seznam —
ne vstavljaj v `cekar_items` mimo njega, sicer katalog ne raste.
Realtime publikacija: `cekar_items`, `cekar_list_stores`.

`0004_store_default_items.sql`: `cekar_stores.default_items text[]` — ko
trgovino dodaš na seznam, `addStoreToListAction` te izdelke doda sam
(Mlekarica → Domače mleko). Urejanje zaenkrat samo v bazi.

`0009_receipts.sql`: `cekar_receipts` + zasebni bucket **`cekar-racuni`** (pot
`<household_id>/<list_id>/<uuid>.jpg`, storage politike samo za mapo lastnega
gospodinjstva). V glavi trgovine `ReceiptButtons`: kamera (`capture="environment"`)
→ `uploadReceipt` (`src/lib/cekar/receipts.ts`, pomanjša na 1800 px JPEG, nalaga
naravnost iz brskalnika — mimo omejitve velikosti server action) →
`addReceiptAction`; ikona računa odpre `ReceiptsDialog` (začasne povezave,
brisanje). Ob brisanju seznama ostanejo datoteke v bucketu (vrstice gredo s cascade).

`0010_store_spent.sql`: `cekar_list_stores.spent numeric(10,2)` — znesek, zapravljen v
trgovini na seznamu. `SpentButton` v glavi trgovine (levo od kamere): ikona € ali
znesek, dialog (`parseAmount` sprejme „23,45“, prazno pobriše) →
`setStoreSpentAction`. Vsota je v podnaslovu `ListView`.
`0011_spent_at.sql`: `spent_at` (trigger ob prvem vnosu; popravek ga ne premakne)
→ `/statistika` (`Stats`, ikona v zgornji vrstici): ta mesec, stolpci zadnjih 12
mesecev, meseci z razčlenitvijo po trgovinah. Združevanje `getSpentByMonth` po
ljubljanskem času (`monthKey`), tekoči mesec pride s strežnika.

`0008_single_item_stores.sql`: `cekar_stores.single_item` — trgovina z enim
izdelkom (Mlekarica → Domače mleko, Domača Jajca → Domača jajca) je na seznamu
ena vrstica (`SingleItemStore`: logo, ime izdelka, kljukica, − / +) namesto
sekcije. Izdelek = `default_items[1]`. Nastavlja se zaenkrat samo v bazi.
`0012_store_unit_price.sql`: `cekar_stores.unit_price` — cena za kos, nastavi se
v meniju ⋯ vrstice `SingleItemStore` (`setStoreUnitPriceAction`). Ob odkljukanju
`toggleItemAction` (`syncUnitPriceSpent`) zapiše `cekar_list_stores.spent` =
količina × cena, ob odznačitvi ga pobriše; sprememba cene preračuna samo
trenutni seznam.

`0007_template_list.sql`: `cekar_lists.is_template` — **stalni seznam** (en na
gospodinjstvo, partial unique index), na dnu `ListsHome` (pod seznami). Ureja se kot
navaden seznam (`ListView`/`StoreSection` s `template` = brez odkljukanja, brez
brisanja). „Zapiši na seznam“ (`WriteToListDialog` → `copyTemplateAction`)
izbrane izdelke prepiše na obstoječi ali nov seznam (preskoči že neodkljukane,
trgovine doda brez `default_items`) in preusmeri nanj.

`0006_categories.sql`: `cekar_categories` (`position` = vrstni red skupin,
`keywords` = začetki besed brez šumnikov) in `cekar_products.category_id`.
Kategorija je na izdelku v **katalogu** (ne na vrstici seznama). Ob novem
izdelku jo `addItemAction` ugane (`guessCategory` v `src/lib/cekar/categories.ts`,
najdaljša ujemajoča ključna beseda; ista logika kot backfill v SQL) in jo
pošlje v `cekar_add_item(p_category_id)`, ki obstoječe kategorije ne povozi.
Ročna sprememba v `ItemEditDialog` zapiše na izdelek. `StoreSection` in
`ListPreview` neodkljukane razvrstita z `groupByCategory` (brez kategorije →
„Ostalo“ na koncu; naslovov ni, če je vse „Ostalo“). Novo gospodinjstvo dobi
privzeti nabor prek `cekar_seed_categories` (samo interno, brez EXECUTE).

`0003_item_quantity.sql`: `cekar_items.quantity` (1–999, privzeto 1), RPC
`cekar_add_item(..., p_quantity default 1)`. Količino nastaviš s
`QuantityStepper` ob vnosu ali jo vpišeš v ime ("2 mleko", "mleko x2" —
`parseQuantity` v `src/lib/cekar/text.ts`); urejanje v `ItemEditDialog`
(svinčnik), prikaz `2×` (`QuantityBadge`) samo pri količini nad 1.

Logotipi trgovin: `public/logos/*`, `StoreLogo` jih prepozna po imenu (regex v
`LOGOS`, nad `norm()` imenom); neznana trgovina dobi prvo črko. Prikazani so
kvadratni (20 px, na telefonu v glavi trgovine 28 px) — logotip naj zapolni
kvadrat brez belega roba (`lidl.svg` je imel bel okvir, odstranjen; `hofer.png`
je ikona z Brandfetcha, obrezana na 128 px). Mlekarica, Domača jajca in Domače
meso imajo lastne SVG v enakem slogu (modro nebo, zelen travnik). Nov logotip
pred commitom izriši (headless Chrome `--screenshot`) v 96 in 20 px ob ostalih.
`0013_domace_meso.sql` doda navadno trgovino „Domače meso“.
Barve trgovin: `storeColor` (`COLORS` v `StoreLogo.tsx`, ista prepoznava po
imenu) = obroba polja `AddItemInput` (in v `ListPreview`); neznana → zelena.

## Arhitektura

Enako kot Vzlet: server `src/app/(app)/*/page.tsx` → branje prek
`src/lib/data/cekar.ts` → `"use client"` komponente v `src/components/cekar/`.
Mutacije: `"use server"` akcije v `src/actions/cekar.ts` (helper `ctx()` vrne
klienta + `householdId`, vsaka konča z `revalidatePath("/", "layout")`).

- `(app)/layout.tsx` — zgornja vrstica: logo → `/`, „Vsi izdelki“
  (`/izdelki`), Statistika (na telefonu samo ikona), nastavitve. Uporabnik brez
  članstva vidi `Onboarding` namesto vsebine strani. Podstrani (statistika,
  izdelki, arhiv, katalog trgovine) imajo levo od naslova puščico nazaj.
- `/` `ListsHome`: najnovejši seznam (`created_at` padajoče, prvi) je večja
  kartica z oznako „Aktualno“ na zgornjem robu (kartica brez `overflow-hidden`);
  kartice nimajo števca izdelkov. Na telefonu sta stalni seznam in povezava
  „Arhiv nakupov“ na dnu zaslona (vsebnik `max-sm:min-h-[calc(100dvh-5.5rem)]`,
  skupina `max-sm:mt-auto`).
- `/seznam/[id]` `ListView` → `StoreSection` → `AddItemInput` (vedno na vrhu
  sekcije, takoj pod glavo trgovine — tudi v `ListPreview`; predlogi: katalog
  te trgovine, brez šumnikov/velikih črk, brez izdelkov, ki so že neodkljukani).
  Glava trgovine: logo, ime, € (`SpentButton`), oko (kategorije), kamera/računi,
  števec, meni ⋯ (Uredi izdelke trgovine, Odstrani s seznama — potrditev v
  meniju, ne `window.confirm`). Na telefonu je glava višja, logo in ime večja.
- Arhiv: „Nakup opravljen“ pod „Dodaj trgovino“ (`FinishShopping` v `ListView`,
  potrditev na mestu) → `archiveListAction` nastavi `cekar_lists.archived_at`
  (stolpec iz 0001). `/arhiv` `ArchiveList` (`getArchivedLists`): kartica z
  datumom in vsoto, pod njo trgovine nakupa z `SpentButton` in `ReceiptButtons`
  (znesek in račun se dodajata tudi po nakupu). Arhiviran seznam ima pas
  „Vrni med sezname“, nazaj vodi na `/arhiv` in ne gre v predpomnilnik domače strani.
- `/izdelki` `ProductsCatalog` — skupni seznam izdelkov: vrstice
  `cekar_products` z istim `lower(name)` so en izdelek, trgovine pri njem =
  vrstice. Dodaš trgovino → nova vrstica (`use_count` 0), zato se izdelek
  takoj pokaže med predlogi te trgovine. Zadnje trgovine ni mogoče odznačiti.
  Gumb Filter: trgovina in kategorija (zložljiva skupina); na seznamu so samo
  logotipi trgovin, kategorija se ureja ob razširitvi.
- `/nastavitve/trgovina/[id]` `StoreProducts` — urejanje kataloga trgovine
  (`cekar_products`: dodaj, preimenuj, kategorija, izbriši); vrstic na
  seznamih ne spreminja. Odpre se iz Nastavitev (ime trgovine) ali iz menija
  ⋯ trgovine na seznamu (`?nazaj=/seznam/<id>` za gumb nazaj).
- Imena v katalogu se urejajo s klikom (`InlineName`: Enter/klik drugam shrani,
  Esc prekliče) — brez svinčnika in okna.
- `/nastavitve` `Settings` (koda za povabilo, člani, trgovine z vrstnim
  redom, kategorije, tema, odjava).
- Plavajoči gumb „Hitro dodaj“ v `ListView` in gumb + na vsaki kartici v
  `ListsHome` odpreta `QuickAddDialog`: predlogi
  iz kataloga **vseh** trgovin z oznako trgovine (npr. „Malinovec · Lidl“),
  za nov izdelek gumbi trgovin. `addItemAction` trgovino, ki še ni na
  seznamu, doda sama. `norm()` (brez šumnikov) je v `src/lib/cekar/text.ts`.
- `ListView` uporablja `useOptimistic` (takojšnje odkljukanje/dodajanje;
  začasni id `temp-N`, na katerem so akcije onemogočene) in Supabase realtime
  kanal, ki ob spremembi drugega člana pokliče `router.refresh()`.

### Hitrost odpiranja

- Branje v `cekar.ts` se zanaša na RLS (brez `household_id` filtra), zato
  strani vse poizvedbe poženejo v **enem vzporednem krogu** (`Promise.all`),
  ne v verigi članstvo → gospodinjstvo → podatki. `seznam/[id]` članstva ne
  preverja (to naredi layout).
- `loading.tsx` (`(app)/` in `seznam/[id]/`) takoj nariše `HomePreview` /
  `ListPreview` iz predpomnilnika `src/lib/cekar/preview.ts`, ki ga polnita
  `ListsHome` in `ListView` (useEffect). Brez predpomnilnika → okostje.
  **`HomePreview`/`ListPreview` posnemata postavitev `ListsHome`/`StoreSection`**
  (kartica Aktualno, stalni seznam na dnu, višine glav, skrite kategorije) — ob
  spremembi videza popravi oba, sicer stran ob nalaganju skoči.
- `vercel.json` `regions: ["dub1"]` — Supabase je v eu-west-1 (Irska).
- Zložene trgovine: piškotek `cekar-zlozeno-<listId>` (`src/lib/cekar/collapsed.ts`),
  ki ga `seznam/[id]/page.tsx` prebere na strežniku — ob osvežitvi brez
  utripa odpri → zapri. (Ne v localStorage, ta je dosegljiv šele po hidraciji.)
- Oko v glavi trgovine (`StoreSection`) skrije skupine po kategorijah; piškotek
  `cekar-brez-kategorij` (id-ji trgovin, velja na vseh seznamih) bere strežnik.

### PWA / middleware past

`src/proxy.ts` matcher **mora** izključevati statične `.js` (`sw.js`,
`install-promo.js`), sicer neprijavljen uporabnik dobi HTML prijave namesto
skripte in SW se pokvari. `public/sw.js` je network-first; ob spremembi
povečaj `VERZIJA`.
