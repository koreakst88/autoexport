"use client";

import { useEffect, useMemo, useState, type MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Star } from "lucide-react";
import { calcFullPrice, COUNTRIES } from "@/lib/calc";
import {
  getFavorites,
  toggleFavorite as toggleStoredFavorite,
} from "@/lib/favorites";
import { BottomNav } from "@/components/shared/BottomNav";
import {
  translateBadge,
  translateFuel,
  translateTransmission,
} from "@/lib/translations";

export type CatalogCar = {
  encar_id: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  body_type: string | null;
  mileage: number | null;
  engine_cc: number | null;
  fuel_type: string | null;
  transmission: string | null;
  price_krw: number | null;
  photos: string[] | null;
  modified_at_encar: string | null;
  registered_at_encar: string | null;
  first_registration_korea: string | null;
  badge: string | null;
  badge_detail: string | null;
  drive_type: string | null;
  color: string | null;
  vin: string | null;
  options?: { name: string; price: number | null }[] | null;
  created_at?: string | null;
  is_sng_ready: boolean | null;
};

const BRANDS_WITH_LOGOS = [
  { name: "Hyundai", logoSrc: "/brand-logos/hyundai.svg" },
  { name: "Kia", logoSrc: "/brand-logos/kia.svg" },
  // Genesis car logo SVG is not in repo yet; keep a neutral placeholder.
  { name: "Genesis", logoSrc: null },
  { name: "KGM", logoSrc: "/brand-logos/kgm.svg" },
  { name: "Renault Korea", logoSrc: "/brand-logos/renault.svg" },
  { name: "SsangYong", logoSrc: "/brand-logos/ssangyong.svg" },
] as const;

function formatNumber(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "—";
  }

  return value.toLocaleString("ru-RU");
}

function formatKoreaReg(dateStr: string | null): string {
  if (!dateStr) return "—";
  if (dateStr.length === 8) {
    return `${dateStr.slice(4, 6)}.${dateStr.slice(0, 4)}`;
  }
  return dateStr;
}

function formatCarPriceRub(priceKrw: number | null): number {
  if (typeof priceKrw !== "number") return 0;
  return Math.round(priceKrw * 0.0535);
}

function formatAddedDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "";
  const months = [
    "янв",
    "фев",
    "мар",
    "апр",
    "мая",
    "июн",
    "июл",
    "авг",
    "сен",
    "окт",
    "ноя",
    "дек",
  ];
  return `${date.getDate()} ${months[date.getMonth()]}`;
}

function displayColor(color: string | null): string {
  if (!color) return "—";
  if (/[가-힣]/.test(color)) return "—";
  return color;
}

function getFirstPhoto(photos: string[] | null) {
  return Array.isArray(photos) ? photos[0] : undefined;
}

type CatalogClientProps = {
  cars: CatalogCar[];
  initialBrand?: string;
};

export function CatalogClient({ cars, initialBrand }: CatalogClientProps) {
  const router = useRouter();
  type CountryCode = (typeof COUNTRIES)[number]["code"];
  const [countryCode, setCountryCode] = useState<CountryCode>(COUNTRIES[0].code);
  const [isCountryOpen, setIsCountryOpen] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    brand: initialBrand ?? "",
    model: "",
    yearFrom: "",
    yearTo: "",
    priceFrom: "",
    priceTo: "",
    fuelType: [] as string[],
    transmission: "",
    driveType: "",
  });
  const [searchQuery, setSearchQuery] = useState("");

  const selectedCountry =
    COUNTRIES.find((country) => country.code === countryCode) ?? COUNTRIES[0];

  useEffect(() => {
    setFavorites(getFavorites());
  }, []);

  useEffect(() => {
    console.log(
      "Фото:",
      cars.slice(0, 3).map((car) => ({
        model: car.model,
        photo: car.photos?.[0],
      })),
    );
  }, [cars]);

  useEffect(() => {
    console.log("Расчёт:", {
      priceKrw: 20000000,
      countryCode: selectedCountry.code,
      result: calcFullPrice(20000000, 1600, selectedCountry.code),
    });
  }, [selectedCountry.code]);

  const availableModels = useMemo(() => {
    if (!filters.brand) return [];
    const models = cars
      .filter((car) => car.brand === filters.brand)
      .map((car) => car.model)
      .filter(Boolean) as string[];
  return Array.from(new Set(models)).sort();
}, [cars, filters.brand]);

  const filteredCars = useMemo(() => {
    return cars.filter((car) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!`${car.brand ?? ""} ${car.model ?? ""}`.toLowerCase().includes(q)) {
          return false;
        }
      }

      if (filters.brand && car.brand !== filters.brand) return false;
      if (filters.model && car.model !== filters.model) return false;

      if (filters.yearFrom) {
        const y = parseInt(filters.yearFrom, 10);
        if (Number.isFinite(y) && (car.year ?? 0) < y) return false;
      }
      if (filters.yearTo) {
        const y = parseInt(filters.yearTo, 10);
        if (Number.isFinite(y) && (car.year ?? 9999) > y) return false;
      }

      if (filters.fuelType.length > 0) {
        const carFuel = translateFuel(car.fuel_type);
        if (!filters.fuelType.includes(carFuel)) return false;
      }

      if (filters.transmission) {
        if (translateTransmission(car.transmission) !== filters.transmission) {
          return false;
        }
      }

      if (filters.driveType && car.drive_type !== filters.driveType) return false;

      const hasPriceFilter = Boolean(filters.priceFrom || filters.priceTo);
      if (hasPriceFilter) {
        const priceKrw = typeof car.price_krw === "number" ? car.price_krw : 0;
        const calc = calcFullPrice(priceKrw, car.engine_cc ?? 0, selectedCountry.code);
        const price = calc.totalLocal;
        if (filters.priceFrom) {
          const min = parseInt(filters.priceFrom, 10);
          if (Number.isFinite(min) && price < min) return false;
        }
        if (filters.priceTo) {
          const max = parseInt(filters.priceTo, 10);
          if (Number.isFinite(max) && price > max) return false;
        }
      }

      return true;
    });
  }, [cars, filters, searchQuery, selectedCountry.code]);

  const hasActiveFilters =
    Boolean(
      filters.brand ||
        filters.model ||
        filters.yearFrom ||
        filters.yearTo ||
        filters.priceFrom ||
        filters.priceTo ||
        filters.transmission ||
        filters.driveType,
    ) || filters.fuelType.length > 0;

  const activeFiltersCount = useMemo(() => {
    return [
      filters.brand,
      filters.model,
      filters.yearFrom,
      filters.yearTo,
      filters.priceFrom,
      filters.priceTo,
      ...filters.fuelType,
      filters.transmission,
      filters.driveType,
    ].filter(Boolean).length;
  }, [filters]);

  function handleFavorite(e: MouseEvent, encarId: string) {
    e.preventDefault();
    e.stopPropagation();
    toggleStoredFavorite(encarId);
    setFavorites(getFavorites());
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-24 text-gray-950">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div className="text-xl font-semibold tracking-tight">AutoExport</div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setIsCountryOpen((value) => !value)}
              className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 text-sm font-medium shadow-sm"
            >
              <span>{selectedCountry.flag}</span>
              <span>{selectedCountry.name}</span>
              <ChevronDown className="h-4 w-4 text-gray-500" />
            </button>

            {isCountryOpen ? (
              <div className="absolute right-0 mt-2 w-48 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
                {COUNTRIES.map((country) => (
                  <button
                    key={country.code}
                    type="button"
            onClick={() => {
              setCountryCode(country.code);
              setIsCountryOpen(false);
              const preview = calcFullPrice(25_000_000, 1600, country.code);
              console.log(
                `Страна: ${country.name}, курс: ${country.rate}, пример цены: ${preview.totalLocal.toLocaleString("ru-RU")} ${country.currency}`,
              );
            }}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
                  >
                    <span className="flex items-center gap-2">
                      <span>{country.flag}</span>
                      <span>{country.name}</span>
                    </span>
                    {country.code === selectedCountry.code ? (
                      <Check className="h-4 w-4" />
                    ) : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-3 flex items-center gap-3 border-t border-gray-100 pt-3">
          <div className="flex flex-1 items-center gap-2 rounded-xl bg-gray-100 px-3 py-2.5">
            <span className="text-sm text-gray-400">🔍</span>
            <input
              type="text"
              placeholder="Марка, модель..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="flex-1 bg-transparent text-sm text-gray-900 outline-none"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-xs text-gray-400"
              >
                ✕
              </button>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => setFilterOpen(true)}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              hasActiveFilters ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700"
            }`}
          >
            ⚙️ Фильтр
            {hasActiveFilters ? (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white text-xs font-bold text-gray-900">
                {activeFiltersCount}
              </span>
            ) : null}
          </button>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredCars.map((car) => {
          const photo = getFirstPhoto(car.photos);
          const priceKrw = typeof car.price_krw === "number" ? car.price_krw : 0;
          const carPriceRub = formatCarPriceRub(car.price_krw);
          const result =
            typeof car.price_krw === "number"
              ? calcFullPrice(car.price_krw, car.engine_cc ?? 0, selectedCountry.code)
              : null;
          const specs = [
            car.engine_cc && car.engine_cc > 0 ? `${(car.engine_cc / 1000).toFixed(1)}л` : null,
            translateFuel(car.fuel_type),
            car.drive_type ?? translateTransmission(car.transmission) ?? null,
          ]
            .filter(Boolean)
            .join(" · ");
          const badgeText = translateBadge(car.badge);
          const addedDate = formatAddedDate(
            car.registered_at_encar ?? car.created_at ?? null,
          );

          return (
            <Link
              key={car.encar_id}
              href={`/car/${car.encar_id}`}
              className="block overflow-hidden rounded-xl bg-white shadow-sm transition-shadow hover:shadow-md"
            >
              <article>
                <div className="relative h-48 bg-gray-100">
                  {photo ? (
                    <img
                      src={car.photos?.[0] ?? ""}
                      alt={`${car.brand ?? ""} ${car.model ?? ""}`}
                      className="h-full w-full object-cover"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                        event.currentTarget.nextElementSibling?.classList.remove(
                          "hidden",
                        );
                      }}
                    />
                  ) : (
                    null
                  )}
                  <div
                    className={`absolute inset-0 flex flex-col items-center justify-center bg-gray-100 ${
                      photo ? "hidden" : ""
                    }`}
                  >
                    <span className="text-4xl">🚗</span>
                    <span className="mt-1 text-xs text-gray-400">
                      Фото недоступно
                    </span>
                  </div>

                  <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                    <span className="rounded bg-green-500 px-2 py-1 text-xs font-bold text-white">
                      В ПРОДАЖЕ
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(event) => handleFavorite(event, car.encar_id)}
                    className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-sm"
                    aria-label="Избранное"
                  >
                    <Star
                      className={`h-5 w-5 ${
                        favorites.includes(car.encar_id)
                          ? "fill-yellow-400 text-yellow-500"
                          : "text-gray-400"
                      }`}
                    />
                  </button>
                </div>

                <div className="border-t border-gray-100 p-4">
                  <h2 className="text-lg font-semibold leading-tight text-gray-900">
                    {car.brand} {car.model} {car.year}
                  </h2>
                  <p className="mt-1 text-sm text-gray-700">
                    {badgeText || "Комплектация не указана"}
                  </p>
                </div>

                <div className="border-t border-gray-100 px-4 py-3 text-sm text-gray-700">
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <span>📅</span>
                      <span>Рег. в Корее: {formatKoreaReg(car.first_registration_korea)}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span>🔧</span>
                      <span>{specs || "—"}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span>📍</span>
                      <span>{formatNumber(car.mileage)} км</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span>🎨</span>
                      <span>{displayColor(car.color)}</span>
                    </div>
                    <p className="text-xs text-gray-400">
                      Добавлено: {addedDate}
                    </p>
                  </div>
                </div>

                <div className="border-t border-gray-100 px-4 py-3">
                  <p className="text-sm text-gray-500">Стоимость в Корее:</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    {priceKrw.toLocaleString("ru-RU")} ₩ (
                    {carPriceRub.toLocaleString("ru-RU")} ₽)
                  </p>
                </div>

                <div className="border-t border-gray-100 p-4">
                  <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                    Цена под ключ
                  </p>
                  <button
                    type="button"
                    className="mt-2 flex w-full items-center justify-between rounded-lg bg-gray-50 px-3 py-3 text-left"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      router.push(`/car/${car.encar_id}`);
                    }}
                  >
                    <span className="text-xl font-bold text-gray-900">
                      {result
                        ? `${result.totalLocal.toLocaleString("ru-RU")} ${result.currency}`
                        : "Цена по запросу"}
                    </span>
                  </button>
                </div>
              </article>
            </Link>
          );
        })}

        {filteredCars.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-500 sm:col-span-2 lg:col-span-3">
            Авто по выбранным фильтрам не найдены.
          </div>
        ) : null}
      </section>

      <BottomNav active="catalog" />

      {filterOpen ? (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setFilterOpen(false)}
          />

          <div className="absolute bottom-0 left-0 right-0 max-h-[90vh] overflow-y-auto rounded-t-2xl bg-white">
            <div className="flex justify-center pb-2 pt-3">
              <div className="h-1 w-10 rounded-full bg-gray-300" />
            </div>

            <div className="flex items-center justify-between border-b border-gray-100 px-4 pb-4">
              <h3 className="text-base font-bold text-gray-900">Фильтры</h3>
              <button
                type="button"
                onClick={() => {
                  setFilters({
                    brand: "",
                    model: "",
                    yearFrom: "",
                    yearTo: "",
                    priceFrom: "",
                    priceTo: "",
                    fuelType: [],
                    transmission: "",
                    driveType: "",
                  });
                  setSearchQuery("");
                }}
                className="text-sm font-medium text-blue-500"
              >
                Сбросить
              </button>
            </div>

            <div className="flex flex-col gap-5 px-4 py-4">
              <div>
                <p className="mb-2 text-sm font-semibold text-gray-900">Марка</p>
                <div className="grid grid-cols-3 gap-2">
                  {BRANDS_WITH_LOGOS.map((brand) => (
                    <button
                      key={brand.name}
                      type="button"
                      onClick={() =>
                        setFilters((current) => ({
                          ...current,
                          brand: current.brand === brand.name ? "" : brand.name,
                          model: "",
                        }))
                      }
                      title={brand.name}
                      aria-label={brand.name}
                      className={`flex items-center justify-center rounded-xl border p-3 text-xs font-medium transition-all ${
                        filters.brand === brand.name
                          ? "border-gray-900 bg-gray-900 text-white"
                          : "border-gray-200 bg-white text-gray-700"
                      }`}
                    >
                      <div className="flex h-10 w-full items-center justify-center overflow-hidden px-2">
                        {brand.logoSrc ? (
                          <img
                            src={brand.logoSrc}
                            alt={brand.name}
                            className="h-5 w-full object-contain"
                          />
                        ) : (
                          <span className="text-[11px] font-black tracking-[0.12em]">
                            {brand.name.toUpperCase()}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {filters.brand && availableModels.length > 0 ? (
                <div>
                  <p className="mb-2 text-sm font-semibold text-gray-900">Модель</p>
                  <div className="flex flex-wrap gap-2">
                    {availableModels.map((model) => (
                      <button
                        key={model}
                        type="button"
                        onClick={() =>
                          setFilters((current) => ({
                            ...current,
                            model: current.model === model ? "" : model,
                          }))
                        }
                        className={`rounded-full border px-3 py-1.5 text-sm transition-all ${
                          filters.model === model
                            ? "border-gray-900 bg-gray-900 text-white"
                            : "border-gray-200 bg-white text-gray-700"
                        }`}
                      >
                        {model}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div>
                <p className="mb-2 text-sm font-semibold text-gray-900">Год выпуска</p>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    placeholder="От (2019)"
                    value={filters.yearFrom}
                    onChange={(event) =>
                      setFilters((current) => ({
                        ...current,
                        yearFrom: event.target.value,
                      }))
                    }
                    className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-900"
                  />
                  <input
                    type="number"
                    placeholder="До (2024)"
                    value={filters.yearTo}
                    onChange={(event) =>
                      setFilters((current) => ({
                        ...current,
                        yearTo: event.target.value,
                      }))
                    }
                    className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-900"
                  />
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold text-gray-900">
                  Цена под ключ ({selectedCountry.currency})
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    placeholder="От"
                    value={filters.priceFrom}
                    onChange={(event) =>
                      setFilters((current) => ({
                        ...current,
                        priceFrom: event.target.value,
                      }))
                    }
                    className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-900"
                  />
                  <input
                    type="number"
                    placeholder="До"
                    value={filters.priceTo}
                    onChange={(event) =>
                      setFilters((current) => ({
                        ...current,
                        priceTo: event.target.value,
                      }))
                    }
                    className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-900"
                  />
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold text-gray-900">Тип топлива</p>
                <div className="flex flex-wrap gap-2">
                  {["Бензин", "Дизель", "Гибрид", "LPG", "Электро"].map((fuel) => (
                    <button
                      key={fuel}
                      type="button"
                      onClick={() =>
                        setFilters((current) => ({
                          ...current,
                          fuelType: current.fuelType.includes(fuel)
                            ? current.fuelType.filter((x) => x !== fuel)
                            : [...current.fuelType, fuel],
                        }))
                      }
                      className={`rounded-full border px-3 py-1.5 text-sm transition-all ${
                        filters.fuelType.includes(fuel)
                          ? "border-gray-900 bg-gray-900 text-white"
                          : "border-gray-200 bg-white text-gray-700"
                      }`}
                    >
                      {fuel}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold text-gray-900">
                  Коробка передач
                </p>
                <div className="flex gap-2">
                  {["Автомат", "Механика"].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() =>
                        setFilters((current) => ({
                          ...current,
                          transmission: current.transmission === t ? "" : t,
                        }))
                      }
                      className={`flex-1 rounded-xl border py-2.5 text-sm font-medium transition-all ${
                        filters.transmission === t
                          ? "border-gray-900 bg-gray-900 text-white"
                          : "border-gray-200 bg-white text-gray-700"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold text-gray-900">Привод</p>
                <div className="flex gap-2">
                  {["2WD", "4WD"].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() =>
                        setFilters((current) => ({
                          ...current,
                          driveType: current.driveType === d ? "" : d,
                        }))
                      }
                      className={`flex-1 rounded-xl border py-2.5 text-sm font-medium transition-all ${
                        filters.driveType === d
                          ? "border-gray-900 bg-gray-900 text-white"
                          : "border-gray-200 bg-white text-gray-700"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 border-t border-gray-100 bg-white p-4">
              <button
                type="button"
                onClick={() => setFilterOpen(false)}
                className="w-full rounded-xl bg-gray-900 py-3.5 text-sm font-semibold text-white"
              >
                Показать {filteredCars.length} авто
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
