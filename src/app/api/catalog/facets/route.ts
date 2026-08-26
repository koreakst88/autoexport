import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { translateFuel, translateTransmission } from "@/lib/translations";
import { calcFullPrice, getRegistrationMonth } from "@/lib/calc";
import { getCbrRates } from "@/lib/get-krw-rate";

type Car = {
  brand: string | null;
  model: string | null;
  year: number | null;
  body_type: string | null;
  fuel_type: string | null;
  transmission: string | null;
  drive_type: string | null;
  price_krw: number | null;
  engine_cc: number | null;
  power_hp: number | null;
  badge_detail: string | null;
  first_registration_korea: string | null;
};

const normalise = (value: string) => value.toLocaleLowerCase("ru-RU").replace(/[^a-zа-яё0-9]/gi, "");

function matchesSearch(car: Car, search: string) {
  const query = normalise(search);
  if (!query) return true;
  const text = normalise(`${car.brand ?? ""}${car.model ?? ""}`);
  return text.includes(query) || query.split(/\s+/).every((part) => text.includes(part));
}

function unique(values: Array<string | null>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value)))).sort((a, b) => a.localeCompare(b, "ru"));
}

/** Fast count + currently possible choices for the catalogue filter UI. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const search = params.get("q") ?? "";
  const brand = params.get("brand") ?? "";
  const model = params.get("model") ?? "";
  const yearFrom = Number(params.get("yearFrom") ?? 0);
  const yearTo = Number(params.get("yearTo") ?? 0);
  const bodyType = params.get("body") ?? "";
  const transmission = params.get("transmission") ?? "";
  const fuel = params.getAll("fuel");
  const drive = params.get("drive") ?? "";
  const priceFrom = Number(params.get("priceFrom") ?? 0);
  const priceTo = Number(params.get("priceTo") ?? 0);
  const country = params.get("country") ?? "RU";
  const supabase = createClient();

  const { data, error } = await supabase
    .from("cars")
    .select("brand,model,year,body_type,fuel_type,transmission,drive_type,price_krw,engine_cc,power_hp,badge_detail,first_registration_korea")
    .eq("is_available", true)
    .limit(2000);

  if (error) return NextResponse.json({ error: "Не удалось получить параметры каталога" }, { status: 500 });

  const cars = (data ?? []) as Car[];
  const rates = priceFrom || priceTo ? await getCbrRates() : null;
  const matches = (car: Car, includeBrand = true, includeModel = true) =>
    matchesSearch(car, search) &&
    (!includeBrand || !brand || car.brand === brand) &&
    (!includeModel || !model || car.model === model) &&
    (!yearFrom || (car.year ?? 0) >= yearFrom) &&
    (!yearTo || (car.year ?? 9999) <= yearTo) &&
    (!bodyType || car.body_type === bodyType) &&
    (!transmission || translateTransmission(car.transmission) === transmission) &&
    (!drive || car.drive_type === drive) &&
    (!fuel.length || fuel.includes(translateFuel(car.fuel_type))) &&
    (!rates || !priceFrom || calcFullPrice(car.price_krw ?? 0, car.engine_cc ?? 0, country, car.year ?? 2021, car.power_hp ?? 0, rates.krwRub, car.brand ?? "", car.model ?? "", car.badge_detail ?? "", getRegistrationMonth(car.first_registration_korea), 90, rates).totalLocal >= priceFrom) &&
    (!rates || !priceTo || calcFullPrice(car.price_krw ?? 0, car.engine_cc ?? 0, country, car.year ?? 2021, car.power_hp ?? 0, rates.krwRub, car.brand ?? "", car.model ?? "", car.badge_detail ?? "", getRegistrationMonth(car.first_registration_korea), 90, rates).totalLocal <= priceTo);
  const filtered = cars.filter((car) => matches(car));
  // The selector must not hide alternative values solely because that field is selected.
  const brandsForFacet = cars.filter((car) => matches(car, false, false));
  const modelsForFacet = cars.filter((car) => matches(car, true, false));

  return NextResponse.json({
    count: filtered.length,
    facets: {
      brands: unique(brandsForFacet.map((car) => car.brand)),
      models: unique(modelsForFacet.map((car) => car.model)),
      bodyTypes: unique(filtered.map((car) => car.body_type)),
      transmissions: unique(filtered.map((car) => translateTransmission(car.transmission))),
      fuels: unique(filtered.map((car) => translateFuel(car.fuel_type))),
      drives: unique(filtered.map((car) => car.drive_type)),
      years: unique(filtered.map((car) => car.year?.toString() ?? null)),
    },
  });
}
