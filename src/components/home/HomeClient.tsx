"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { calcFullPrice, COUNTRIES } from "@/lib/calc";
import { BottomNav } from "@/components/shared/BottomNav";
import type { CatalogCar } from "@/components/catalog/CatalogClient";

const BANNERS = [
  {
    id: 1,
    title: "Авто из Кореи",
    subtitle: "Под ключ в СНГ",
    cta: "Смотреть каталог",
    ctaLink: "/catalog",
    bg: "from-gray-900 to-gray-800",
    image: null,
  },
  {
    id: 2,
    title: "Цена под ключ",
    subtitle: "С растаможкой и доставкой",
    cta: "Рассчитать стоимость",
    ctaLink: "/catalog",
    bg: "from-blue-900 to-blue-800",
    image: null,
  },
  {
    id: 3,
    title: "Без ДТП",
    subtitle: "Только проверенные авто",
    cta: "Подобрать авто",
    ctaLink: "/quiz",
    bg: "from-green-900 to-green-800",
    image: null,
  },
];

const BRANDS = [
  { name: "Hyundai", logoSrc: "/brand-logos/hyundai.svg" },
  { name: "Kia", logoSrc: "/brand-logos/kia.svg" },
  // Genesis car logo SVG is not in repo yet; keep a neutral placeholder.
  { name: "Genesis", logoSrc: null },
  { name: "KGM", logoSrc: "/brand-logos/kgm.svg" },
  { name: "Renault Korea", logoSrc: "/brand-logos/renault.svg" },
  { name: "Toyota", logoSrc: "/brand-logos/toyota.svg" },
] as const;

const FEATURES = [
  {
    icon: "🚗",
    title: "Реальные авто с Encar",
    desc: "Актуальный каталог крупнейшей площадки Кореи",
  },
  {
    icon: "💰",
    title: "Цена под ключ",
    desc: "С растаможкой и доставкой — без скрытых расходов",
  },
  {
    icon: "✅",
    title: "Проверенные авто",
    desc: "Только объявления без ДТП и с реальными фото",
  },
] as const;

function formatCarDate(dateStr: string | null | undefined) {
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

function getBadgeColor(dateStr: string | null | undefined) {
  if (!dateStr) return "bg-gray-100 text-gray-500";
  return "bg-green-100 text-green-800";
}

function SectionHeader({
  title,
  link,
  linkText,
}: {
  title: string;
  link?: string;
  linkText?: string;
}) {
  return (
    <div className="mt-6 mb-3 flex items-center justify-between px-4">
      <h2 className="text-base font-bold text-gray-900">{title}</h2>
      {link && linkText ? (
        <Link href={link} className="text-sm font-medium text-blue-500">
          {linkText}
        </Link>
      ) : null}
    </div>
  );
}

function BrandLogo({ brand }: { brand: (typeof BRANDS)[number] }) {
  if (brand.logoSrc) {
    return (
      <img
        src={brand.logoSrc}
        alt={brand.name}
        className="h-5 w-full object-contain"
      />
    );
  }

  return (
    <span className="text-[11px] font-black tracking-[0.12em] text-gray-800">
      {brand.name.toUpperCase()}
    </span>
  );
}

export function HomeClient({
  freshCars,
  krwRate,
}: {
  freshCars: CatalogCar[];
  krwRate: number;
}) {
  const [activeBanner, setActiveBanner] = useState(0);
  const [countryCode, setCountryCode] = useState("RU");
  const [countryOpen, setCountryOpen] = useState(false);

  const selectedCountry =
    COUNTRIES.find((country) => country.code === countryCode) ?? COUNTRIES[0];

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveBanner((prev) => (prev + 1) % BANNERS.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    console.log(
      "Страна:",
      selectedCountry.name,
      "пример цены:",
      calcFullPrice(25_000_000, 1600, selectedCountry.code, 2021, 0, krwRate).totalLocal.toLocaleString("ru-RU"),
      selectedCountry.currency,
    );
  }, [selectedCountry]);

  return (
    <main className="min-h-screen bg-gray-50 pb-24 text-gray-950">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex w-full max-w-md items-center justify-between gap-3">
          <Link href="/" className="text-xl font-semibold tracking-tight">
            AutoExport
          </Link>

          <div className="relative">
            <button
              type="button"
              onClick={() => setCountryOpen((value) => !value)}
              className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 text-sm font-medium shadow-sm"
            >
              <span>{selectedCountry.flag}</span>
              <span>{selectedCountry.name}</span>
              <ChevronDown className="h-4 w-4 text-gray-500" />
            </button>

            {countryOpen ? (
              <div className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
                {COUNTRIES.map((country) => (
                  <button
                    key={country.code}
                    type="button"
                    onClick={() => {
                      setCountryCode(country.code);
                      setCountryOpen(false);
                    }}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
                  >
                    <span className="flex items-center gap-2">
                      <span>{country.flag}</span>
                      <span>{country.name}</span>
                    </span>
                    {country.code === selectedCountry.code ? (
                      <span>✓</span>
                    ) : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-md px-4 pt-4">
        <div className="relative h-48 overflow-hidden rounded-2xl bg-gray-900">
          {BANNERS.map((banner, index) => {
            const active = index === activeBanner;
            return (
              <div
                key={banner.id}
                className={`absolute inset-0 bg-gradient-to-r ${banner.bg} transition-opacity duration-500 ${
                  active ? "opacity-100" : "pointer-events-none opacity-0"
                }`}
              >
                <div className="absolute inset-0 flex items-center justify-end pr-6 opacity-20">
                  <span className="text-8xl">🚗</span>
                </div>
                <div className="absolute inset-0 flex flex-col justify-center px-6">
                  <p className="mb-1 text-sm font-medium uppercase tracking-widest text-white/70">
                    AutoExport
                  </p>
                  <h2 className="mb-1 text-2xl font-bold leading-tight text-white">
                    {banner.title}
                  </h2>
                  <p className="mb-4 text-sm text-white/80">{banner.subtitle}</p>
                  <Link
                    href={banner.ctaLink}
                    className="inline-flex w-fit items-center gap-1 rounded-full bg-white px-4 py-2 text-sm font-semibold text-gray-900"
                  >
                    {banner.cta} →
                  </Link>
                </div>
              </div>
            );
          })}
          <div className="absolute bottom-3 left-6 flex gap-1.5">
            {BANNERS.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActiveBanner(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === activeBanner ? "w-6 bg-white" : "w-1.5 bg-white/40"
                }`}
              />
            ))}
          </div>
          {activeBanner > 0 ? (
            <button
              type="button"
              onClick={() =>
                setActiveBanner((prev) => (prev - 1 + BANNERS.length) % BANNERS.length)
              }
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={() =>
              setActiveBanner((prev) => (prev + 1) % BANNERS.length)
            }
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </section>

      <section className="mx-auto w-full max-w-md">
        <SectionHeader title="Свежие поступления" link="/catalog" linkText="Все авто →" />
        <div className="grid grid-cols-2 gap-3 px-4">
          {freshCars.map((car) => {
            const price = calcFullPrice(
              car.price_krw ?? 0,
              car.engine_cc ?? 0,
              selectedCountry.code,
              car.year ?? 2021,
              (car as any).power_hp ?? 0,
              krwRate,
              car.brand ?? "",
              car.model ?? "",
              (car as any).badge_detail ?? "",
            );
            return (
              <Link key={car.encar_id} href={`/car/${car.encar_id}`}>
                <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md">
                  <div className="relative aspect-[4/3] bg-gray-100">
                    {car.photos?.[0] ? (
                      <img
                        src={car.photos[0]}
                        alt={`${car.brand} ${car.model}`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-3xl text-gray-300">
                        🚗
                      </div>
                    )}
                    <div className="absolute left-2 top-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          getBadgeColor(car.registered_at_encar ?? car.created_at)
                        }`}
                      >
                        {formatCarDate(car.registered_at_encar ?? car.created_at)}
                      </span>
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="truncate text-sm font-bold text-gray-900">
                      {car.brand} {car.model}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {car.year} · {((car.mileage ?? 0) / 1000).toFixed(0)}к км
                    </p>
                    <p className="mt-2 text-base font-bold text-gray-900">
                      {price.totalLocal.toLocaleString("ru-RU")} {selectedCountry.currency}
                    </p>
                    <p className="text-xs text-gray-400">под ключ</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        <SectionHeader title="Популярные марки" />
        <div className="grid grid-cols-3 gap-2 px-4">
          {BRANDS.map((brand) => (
            <Link
              key={brand.name}
              href={`/catalog?brand=${brand.name}`}
              title={brand.name}
              aria-label={brand.name}
              className="flex h-14 items-center justify-center rounded-2xl border border-gray-100 bg-white p-3 shadow-sm"
            >
              <BrandLogo brand={brand} />
              <span className="sr-only">{brand.name}</span>
            </Link>
          ))}
        </div>

        <SectionHeader title="Почему AutoExport" />
        <div className="flex flex-col gap-3 px-4">
          {FEATURES.map((feature, index) => (
            <div
              key={index}
              className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
            >
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gray-50 text-2xl">
                {feature.icon}
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">{feature.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-gray-500">
                  {feature.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="h-24" />

      <BottomNav active="home" />
    </main>
  );
}
