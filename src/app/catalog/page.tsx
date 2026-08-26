import { CatalogClient, type CatalogCar, type CatalogFilters } from "@/components/catalog/CatalogClient";
import { createClient } from "@/lib/supabase/server";
import { getCbrRates } from "@/lib/get-krw-rate";
import { translateFuel, translateTransmission } from "@/lib/translations";

export default async function CatalogPage(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = await props.searchParams;
  const supabase = createClient();
  const calculationRates = await getCbrRates();

  const { data: cars, error } = await supabase
    .from("cars")
    .select("*")
    .eq("is_available", true)
    .order("registered_at_encar", { ascending: false })
    .limit(1000);

  if (error) {
    console.error("Supabase cars query error:", error.message);
  }

  const catalogCars = (cars ?? []) as CatalogCar[];
  const value = (key: string) => typeof searchParams?.[key] === "string" ? searchParams[key] as string : "";
  const fuel = searchParams?.fuel;
  const initialFilters: CatalogFilters = {
    q: value("q"), brand: value("brand"), model: value("model"),
    yearFrom: value("yearFrom"), yearTo: value("yearTo"),
    priceFrom: value("priceFrom"), priceTo: value("priceTo"),
    body: value("body"), fuel: Array.isArray(fuel) ? fuel : fuel ? [fuel] : [],
    transmission: value("transmission"), drive: value("drive"), sort: value("sort") || "newest",
  };
  const normalize = (input: string) => input.toLocaleLowerCase("ru-RU").replace(/[^a-zа-яё0-9]/gi, "");
  const serverCars = catalogCars.filter((car) => {
    if (initialFilters.q && !normalize((car.brand ?? "") + (car.model ?? "")).includes(normalize(initialFilters.q))) return false;
    if (initialFilters.brand && car.brand !== initialFilters.brand) return false;
    if (initialFilters.model && car.model !== initialFilters.model) return false;
    if (initialFilters.yearFrom && (car.year ?? 0) < Number(initialFilters.yearFrom)) return false;
    if (initialFilters.yearTo && (car.year ?? 9999) > Number(initialFilters.yearTo)) return false;
    if (initialFilters.body && car.body_type !== initialFilters.body) return false;
    if (initialFilters.transmission && translateTransmission(car.transmission) !== initialFilters.transmission) return false;
    if (initialFilters.drive && car.drive_type !== initialFilters.drive) return false;
    if (initialFilters.fuel.length && !initialFilters.fuel.includes(translateFuel(car.fuel_type))) return false;
    return true;
  });
  console.log(`Supabase cars returned: ${catalogCars.length}`);

  return (
    <CatalogClient
      cars={serverCars}
      initialFilters={initialFilters}
      krwRate={calculationRates.krwRub}
      calculationRates={calculationRates}
    />
  );
}
