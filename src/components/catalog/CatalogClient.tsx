"use client";

import { useEffect, useMemo, useState, type MouseEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, Check, ChevronDown, Search, SlidersHorizontal, Star, X } from "lucide-react";
import { calcFullPrice, COUNTRIES, getRegistrationMonth } from "@/lib/calc";
import type { CalculationRates } from "@/lib/calculator/types";
import { getFavorites, toggleFavorite } from "@/lib/favorites";
import { BottomNav } from "@/components/shared/BottomNav";
import { translateBadge, translateFuel, translateTransmission } from "@/lib/translations";

export type CatalogCar = { encar_id: string; brand: string | null; model: string | null; year: number | null; body_type: string | null; mileage: number | null; engine_cc: number | null; power_hp?: number | null; fuel_type: string | null; transmission: string | null; price_krw: number | null; photos: string[] | null; registered_at_encar: string | null; first_registration_korea: string | null; badge: string | null; badge_detail: string | null; drive_type: string | null; color: string | null; created_at?: string | null; is_sng_ready: boolean | null };
export type CatalogFilters = { q: string; brand: string; model: string; yearFrom: string; yearTo: string; priceFrom: string; priceTo: string; body: string; fuel: string[]; transmission: string; drive: string; sort: string };
type Facets = { brands: string[]; models: string[]; bodyTypes: string[]; transmissions: string[]; fuels: string[]; drives: string[]; years: string[] };
type Props = { cars: CatalogCar[]; initialFilters: CatalogFilters; krwRate: number; calculationRates: CalculationRates };

const EMPTY: CatalogFilters = { q: "", brand: "", model: "", yearFrom: "", yearTo: "", priceFrom: "", priceTo: "", body: "", fuel: [], transmission: "", drive: "", sort: "newest" };
const compact = (value: string) => value.toLocaleLowerCase("ru-RU").replace(/[^a-zа-яё0-9]/gi, "");
const carTitle = (car: CatalogCar) => [car.brand, car.model, car.year].filter(Boolean).join(" ");

function filterParams(filters: CatalogFilters) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (Array.isArray(value)) value.forEach((item) => params.append(key, item));
    else if (value && !(key === "sort" && value === "newest")) params.set(key, value);
  }
  return params;
}

function price(car: CatalogCar, country: string, krwRate: number, rates: CalculationRates) {
  return calcFullPrice(car.price_krw ?? 0, car.engine_cc ?? 0, country, car.year ?? 2021, car.power_hp ?? 0, krwRate, car.brand ?? "", car.model ?? "", car.badge_detail ?? "", getRegistrationMonth(car.first_registration_korea), 90, rates);
}

export function CatalogClient({ cars, initialFilters, krwRate, calculationRates }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [filters, setFilters] = useState(initialFilters);
  const [sheet, setSheet] = useState<"filters" | "brand" | "price" | "sort" | null>(null);
  const [facets, setFacets] = useState<Facets>({ brands: [], models: [], bodyTypes: [], transmissions: [], fuels: [], drives: [], years: [] });
  const [facetCount, setFacetCount] = useState(cars.length);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [country, setCountry] = useState(COUNTRIES[0].code);
  const [countryOpen, setCountryOpen] = useState(false);
  const selectedCountry = COUNTRIES.find((item) => item.code === country) ?? COUNTRIES[0];
  const update = (patch: Partial<CatalogFilters>) => setFilters((current) => ({ ...current, ...patch }));
  const selectBrand = (brand: string) => update({ brand, model: brand === filters.brand ? filters.model : "" });

  useEffect(() => setFavorites(getFavorites()), []);
  useEffect(() => {
    const timer = window.setTimeout(async () => {
      const params = filterParams(filters);
      router.replace(params.size ? pathname + "?" + params.toString() : pathname, { scroll: false });
      const facetParams = new URLSearchParams(params);
      facetParams.set("country", country);
      const response = await fetch("/api/catalog/facets?" + facetParams.toString());
      if (!response.ok) return;
      const data = await response.json();
      setFacetCount(data.count);
      setFacets(data.facets);
    }, 180);
    return () => window.clearTimeout(timer);
  }, [country, filters, pathname, router]);

  const visibleCars = useMemo(() => cars.filter((car) => {
    if (filters.q && !compact((car.brand ?? "") + (car.model ?? "")).includes(compact(filters.q))) return false;
    if (filters.brand && car.brand !== filters.brand) return false;
    if (filters.model && car.model !== filters.model) return false;
    if (filters.yearFrom && (car.year ?? 0) < Number(filters.yearFrom)) return false;
    if (filters.yearTo && (car.year ?? 9999) > Number(filters.yearTo)) return false;
    if (filters.body && car.body_type !== filters.body) return false;
    if (filters.transmission && translateTransmission(car.transmission) !== filters.transmission) return false;
    if (filters.drive && car.drive_type !== filters.drive) return false;
    if (filters.fuel.length && !filters.fuel.includes(translateFuel(car.fuel_type))) return false;
    const total = price(car, country, krwRate, calculationRates).totalLocal;
    if (filters.priceFrom && total < Number(filters.priceFrom)) return false;
    if (filters.priceTo && total > Number(filters.priceTo)) return false;
    return true;
  }).sort((a, b) => filters.sort === "priceAsc" ? (a.price_krw ?? 0) - (b.price_krw ?? 0) : filters.sort === "priceDesc" ? (b.price_krw ?? 0) - (a.price_krw ?? 0) : filters.sort === "yearDesc" ? (b.year ?? 0) - (a.year ?? 0) : 0), [cars, filters, country, krwRate, calculationRates]);
  const suggestions = useMemo(() => filters.q ? Array.from(new Set(cars.filter((car) => compact((car.brand ?? "") + (car.model ?? "")).includes(compact(filters.q))).map(carTitle))).slice(0, 6) : [], [cars, filters.q]);
  const activeCount = Object.entries(filters).filter(([key, value]) => key !== "q" && key !== "sort" && (Array.isArray(value) ? value.length : Boolean(value))).length;

  return <main className="min-h-screen bg-white pb-20 text-gray-950 lg:pb-8">
    <header className="border-b bg-white"><div className="mx-auto max-w-7xl px-4 py-3">
      <div className="flex items-center justify-between"><button type="button" onClick={() => history.length > 1 ? router.back() : router.push("/")} className="lg:hidden" aria-label="Назад"><ArrowLeft /></button><Link href="/" className="hidden text-lg font-semibold lg:block">TL Auto</Link><div className="relative"><button type="button" onClick={() => setCountryOpen(!countryOpen)} className="flex items-center gap-1 text-sm">{selectedCountry.flag} {selectedCountry.name}<ChevronDown className="h-4 w-4" /></button>{countryOpen && <div className="absolute right-0 z-30 mt-2 w-44 border bg-white shadow-lg">{COUNTRIES.map((item) => <button key={item.code} type="button" onClick={() => { setCountry(item.code); setCountryOpen(false); }} className="flex w-full justify-between px-3 py-2 text-sm hover:bg-gray-50">{item.flag} {item.name}{item.code === country && <Check className="h-4 w-4" />}</button>)}</div>}</div></div>
      <div className="relative mt-3"><Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" /><input value={filters.q} onChange={(event) => update({ q: event.target.value })} placeholder="Марка или модель" className="w-full border border-gray-300 py-2.5 pl-10 pr-10 outline-none focus:border-gray-950" />{filters.q && <button type="button" onClick={() => update({ q: "" })} className="absolute right-3 top-3" aria-label="Очистить"><X className="h-5 w-5" /></button>}{suggestions.length > 0 && <div className="absolute z-40 mt-1 w-full border bg-white shadow-lg">{suggestions.map((item) => <button key={item} type="button" onClick={() => update({ q: item })} className="block w-full px-4 py-3 text-left text-sm hover:bg-gray-50">{item}</button>)}</div>}</div>
    </div></header>
    <div className="mx-auto max-w-7xl px-4"><div className="py-4 lg:hidden"><h1 className="text-2xl font-semibold">Автомобили из Кореи</h1><p className="mt-1 text-sm text-gray-500">{visibleCars.length} объявлений</p></div><div className="flex gap-2 overflow-x-auto py-3"><Quick label={filters.brand ? "Марка: " + filters.brand : "Марка"} active={Boolean(filters.brand)} onClick={() => setSheet("brand")} /><Quick label="Цена" active={Boolean(filters.priceFrom || filters.priceTo)} onClick={() => setSheet("price")} /><Quick label="Год" active={Boolean(filters.yearFrom || filters.yearTo)} onClick={() => setSheet("filters")} /><Quick label="Кузов" active={Boolean(filters.body)} onClick={() => setSheet("filters")} /><Quick label="КПП" active={Boolean(filters.transmission)} onClick={() => setSheet("filters")} /></div>
      <div className="flex justify-between border-y py-3 text-sm lg:hidden"><button type="button" onClick={() => setSheet("filters")} className="flex items-center gap-2 font-medium"><SlidersHorizontal className="h-4 w-4" />Фильтры{activeCount ? " · " + activeCount : ""}</button><button type="button" onClick={() => setSheet("sort")} className="font-medium">Сортировка</button></div>
      <div className="grid gap-8 lg:grid-cols-[238px_minmax(0,1fr)] lg:py-7"><aside className="sticky top-4 hidden h-fit border-r pr-5 lg:block"><div className="mb-5 flex justify-between"><b>Фильтры</b><button type="button" onClick={() => setFilters(EMPTY)} className="text-sm text-gray-500">Сбросить</button></div><FilterFields filters={filters} facets={facets} update={update} selectBrand={selectBrand} /></aside>
        <section><div className="flex justify-between gap-4"><div className="hidden lg:block"><h1 className="text-2xl font-semibold">Автомобили из Кореи</h1><p className="mt-1 text-sm text-gray-500">{visibleCars.length} объявлений</p></div><button type="button" onClick={() => setSheet("sort")} className="hidden h-fit border px-3 py-2 text-sm lg:block">Сортировка</button></div><div className="mt-5 hidden flex-wrap gap-x-4 gap-y-2 border-b pb-5 text-sm lg:flex">{facets.brands.slice(0, 16).map((brand) => <button key={brand} type="button" onClick={() => selectBrand(brand)} className={filters.brand === brand ? "font-semibold underline" : "hover:underline"}>{brand}</button>)}</div><div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{visibleCars.map((car) => <CarCard key={car.encar_id} car={car} favorite={favorites.includes(car.encar_id)} country={country} krwRate={krwRate} calculationRates={calculationRates} onFavorite={(event: MouseEvent) => { event.preventDefault(); event.stopPropagation(); toggleFavorite(car.encar_id); setFavorites(getFavorites()); }} />)}</div>{!visibleCars.length && <p className="border py-12 text-center text-gray-500">По этим параметрам автомобили не найдены.</p>}</section>
      </div></div><BottomNav active="catalog" />
    {sheet && <Sheet title={sheet === "brand" ? "Марка" : sheet === "price" ? "Цена" : sheet === "sort" ? "Сортировка" : "Фильтры"} onClose={() => setSheet(null)} onReset={() => setFilters(EMPTY)} footer={sheet !== "sort" ? <button type="button" onClick={() => setSheet(null)} className="w-full bg-gray-950 py-3.5 text-sm font-semibold text-white">Показать {facetCount} объявлений</button> : undefined}>{sheet === "brand" ? <BrandList brands={facets.brands} selected={filters.brand} select={(brand) => { selectBrand(brand); setSheet(null); }} /> : sheet === "price" ? <PriceFields filters={filters} update={update} currency={selectedCountry.currency} /> : sheet === "sort" ? <SortList selected={filters.sort} select={(sort) => { update({ sort }); setSheet(null); }} /> : <FilterFields filters={filters} facets={facets} update={update} selectBrand={selectBrand} />}</Sheet>}
  </main>;
}

function Quick({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) { return <button type="button" onClick={onClick} className={"whitespace-nowrap border px-3 py-2 text-sm " + (active ? "border-gray-950 bg-gray-950 text-white" : "border-gray-300")}>{label}</button>; }
function Sheet({ title, onClose, onReset, children, footer }: { title: string; onClose: () => void; onReset: () => void; children: React.ReactNode; footer?: React.ReactNode }) { return <div className="fixed inset-0 z-50 bg-black/40"><div className="absolute bottom-0 left-0 right-0 mx-auto flex max-h-[92vh] max-w-xl flex-col bg-white shadow-2xl sm:bottom-6 sm:rounded-2xl"><div className="mx-auto mt-2 h-1 w-10 rounded bg-gray-200" /><div className="flex items-center justify-between border-b px-5 py-4"><button type="button" onClick={onClose}><X /></button><b>{title}</b><button type="button" onClick={onReset} className="text-sm text-gray-500">Сбросить</button></div><div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>{footer && <div className="border-t bg-white p-4">{footer}</div>}</div></div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <section><h3 className="mb-2 text-sm font-semibold">{label}</h3>{children}</section>; }
function PriceFields({ filters, update, currency }: { filters: CatalogFilters; update: (patch: Partial<CatalogFilters>) => void; currency: string }) { return <Field label={"Цена под ключ (" + currency + ")"}><div className="grid grid-cols-2 gap-3"><input value={filters.priceFrom} onChange={(event) => update({ priceFrom: event.target.value })} placeholder="От" inputMode="numeric" className="border px-3 py-3" /><input value={filters.priceTo} onChange={(event) => update({ priceTo: event.target.value })} placeholder="До" inputMode="numeric" className="border px-3 py-3" /></div></Field>; }
function BrandList({ brands, selected, select }: { brands: string[]; selected: string; select: (brand: string) => void }) {
  const [query, setQuery] = useState("");
  return <><div className="relative mb-5"><Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти марку" className="w-full border py-2.5 pl-10" /></div><div className="divide-y">{brands.filter((brand) => compact(brand).includes(compact(query))).map((brand) => <button key={brand} type="button" onClick={() => select(brand === selected ? "" : brand)} className="flex w-full justify-between py-3 text-left">{brand}{brand === selected && <Check className="h-5 w-5" />}</button>)}</div></>;
}
function SortList({ selected, select }: { selected: string; select: (sort: string) => void }) {
  const values = [["newest", "Сначала новые"], ["priceAsc", "Сначала дешевле"], ["priceDesc", "Сначала дороже"], ["yearDesc", "Новее год выпуска"]];
  return <div className="divide-y">{values.map(([value, label]) => <button key={value} type="button" onClick={() => select(value)} className="flex w-full justify-between py-4 text-left">{label}{selected === value && <Check className="h-5 w-5" />}</button>)}</div>;
}
function FilterFields({ filters, facets, update, selectBrand }: { filters: CatalogFilters; facets: Facets; update: (patch: Partial<CatalogFilters>) => void; selectBrand: (brand: string) => void }) {
  const button = (value: string, selected: string, onClick: () => void) => <button key={value} type="button" onClick={onClick} className={"border px-3 py-2 text-sm " + (value === selected ? "border-gray-950 bg-gray-950 text-white" : "")}>{value}</button>;
  return <div className="space-y-6"><Field label="Марка"><select value={filters.brand} onChange={(event) => selectBrand(event.target.value)} className="w-full border bg-white px-3 py-2.5"><option value="">Все марки</option>{facets.brands.map((item) => <option key={item}>{item}</option>)}</select></Field>{filters.brand && <Field label="Модель"><select value={filters.model} onChange={(event) => update({ model: event.target.value })} className="w-full border bg-white px-3 py-2.5"><option value="">Все модели</option>{facets.models.map((item) => <option key={item}>{item}</option>)}</select></Field>}<PriceFields filters={filters} update={update} currency="₽" /><Field label="Год выпуска"><div className="grid grid-cols-2 gap-3"><input value={filters.yearFrom} onChange={(event) => update({ yearFrom: event.target.value })} placeholder="От" className="border px-3 py-2.5" /><input value={filters.yearTo} onChange={(event) => update({ yearTo: event.target.value })} placeholder="До" className="border px-3 py-2.5" /></div></Field><Field label="Кузов"><div className="flex flex-wrap gap-2">{facets.bodyTypes.map((item) => button(item, filters.body, () => update({ body: filters.body === item ? "" : item })))}</div></Field><Field label="Коробка передач"><div className="flex flex-wrap gap-2">{facets.transmissions.map((item) => button(item, filters.transmission, () => update({ transmission: filters.transmission === item ? "" : item })))}</div></Field><Field label="Тип топлива"><div className="flex flex-wrap gap-2">{facets.fuels.map((item) => <button key={item} type="button" onClick={() => update({ fuel: filters.fuel.includes(item) ? filters.fuel.filter((value) => value !== item) : [...filters.fuel, item] })} className={"border px-3 py-2 text-sm " + (filters.fuel.includes(item) ? "border-gray-950 bg-gray-950 text-white" : "")}>{item}</button>)}</div></Field></div>;
}
function CarCard({ car, favorite, onFavorite, country, krwRate, calculationRates }: { car: CatalogCar; favorite: boolean; onFavorite: (event: MouseEvent) => void; country: string; krwRate: number; calculationRates: CalculationRates }) {
  const result = price(car, country, krwRate, calculationRates);
  return <Link href={"/car/" + car.encar_id} className="overflow-hidden border border-gray-200 bg-white hover:border-gray-500"><article><div className="relative aspect-[4/3] bg-gray-100">{car.photos?.[0] ? <img src={car.photos[0]} alt={carTitle(car)} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-sm text-gray-400">Фото недоступно</div>}<button type="button" onClick={onFavorite} className="absolute right-3 top-3 bg-white p-2" aria-label="Избранное"><Star className={"h-5 w-5 " + (favorite ? "fill-yellow-400 text-yellow-500" : "text-gray-600")} /></button></div><div className="p-4"><h2 className="font-semibold">{carTitle(car)}</h2><p className="mt-1 text-sm text-gray-600">{translateBadge(car.badge)}</p><p className="mt-3 text-sm">{car.engine_cc ? (car.engine_cc / 1000).toFixed(1) + " л" : "—"} · {translateFuel(car.fuel_type)} · {translateTransmission(car.transmission)}</p><p className="mt-1 text-sm text-gray-600">{(car.mileage ?? 0).toLocaleString("ru-RU")} км</p><p className="mt-4 text-sm text-gray-500">Цена под ключ</p><p className="text-lg font-semibold">{result.totalLocal.toLocaleString("ru-RU")} {result.currency}</p></div></article></Link>;
}
