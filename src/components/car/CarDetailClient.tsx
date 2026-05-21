"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight, Star } from "lucide-react";
import { calcFullPrice, type CalcResult } from "@/lib/calc";
import { getFavorites, toggleFavorite } from "@/lib/favorites";
import {
  translateBadge,
  translateFuel,
  translateTransmission,
} from "@/lib/translations";
import { useTelegram } from "@/hooks/useTelegram";

export type CarDetailCar = {
  encar_id: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  body_type: string | null;
  mileage: number | null;
  engine_cc: number | null;
  power_hp?: number | null;
  fuel_type: string | null;
  transmission: string | null;
  color: string | null;
  has_accident: boolean | null;
  price_krw: number | null;
  photos: string[] | null;
  modified_at_encar: string | null;
  registered_at_encar: string | null;
  first_registration_korea: string | null;
  badge: string | null;
  badge_detail: string | null;
  drive_type: string | null;
  vin: string | null;
  options?: { name: string; price: number | null }[] | null;
  raw_url?: string | null;
  created_at?: string | null;
  is_available: boolean | null;
};

const COUNTRIES = [
  { code: "RU", name: "Россия", flag: "🇷🇺", currency: "₽" },
  { code: "KZ", name: "Казахстан", flag: "🇰🇿", currency: "₸" },
  { code: "KG", name: "Кыргызстан", flag: "🇰🇬", currency: "с" },
  { code: "UZ", name: "Узбекистан", flag: "🇺🇿", currency: "сум" },
];
type Country = (typeof COUNTRIES)[number];

const COLOR_CIRCLES: Record<string, string> = {
  Белый: "bg-white border border-gray-300",
  "Чёрный": "bg-gray-900",
  Серый: "bg-gray-400",
  Серебристый: "bg-gray-300",
  Синий: "bg-blue-500",
  Красный: "bg-red-500",
  Коричневый: "bg-amber-800",
  Зелёный: "bg-green-500",
  Бежевый: "bg-amber-100 border border-gray-300",
  Жёлтый: "bg-yellow-400",
};

type BreakdownRow = {
  label: string;
  value: string;
  bold?: boolean;
};

type RealCalc = {
  rate_krw_rub: number;
  car_price_rub: number;
  duty_rub: number;
  fees_rub: number;
  util_rub: number;
  total_rub: number;
  freight_rub: number;
  broker_rub: number;
};

function formatDateDot(dateStr: string | null): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "—";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${date.getFullYear()}`;
}

function formatAddedDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "—";
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
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function formatKoreaReg(dateStr: string | null): string {
  if (!dateStr) return "—";
  if (dateStr.length === 8) {
    return `${dateStr.slice(4, 6)}.${dateStr.slice(0, 4)}`;
  }
  return dateStr;
}

function displayColor(color: string | null): string {
  if (!color) return "—";
  if (/[가-힣]/.test(color)) return "—";
  return color;
}

function parseDriveType(badge: string | null) {
  if (!badge) return null;
  if (badge.includes("4WD") || badge.includes("AWD")) return "4WD";
  if (badge.includes("2WD")) return "2WD";
  if (badge.includes("FWD")) return "FWD";
  if (badge.includes("RWD")) return "RWD";
  return null;
}

function formatKrw(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return value.toLocaleString("ru-RU");
}

function formatNumber(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return value.toLocaleString("ru-RU");
}

function getPriceBreakdown(result: CalcResult, car: CarDetailCar, countryCode: string) {
  const cur = result.currency;
  const rateMap: Record<string, number> = {
    RU: 1,
    KZ: 6.5,
    KG: 0.862,
    UZ: 127,
  };
  const rate = rateMap[countryCode] ?? 1;
  const toLocal = (rub: number) => Math.round(rub * rate);
  const priceKrw = car.price_krw ?? 0;
  const priceOnlyKrw = `${formatKrw(priceKrw)} ₩`;

  if (countryCode === "RU") {
    return [
      { label: "Авто в Корее", value: priceOnlyKrw },
      { label: "Фрахт до Владивостока", value: `${toLocal(result.koreaExpensesRub).toLocaleString("ru-RU")} ${cur}` },
      { label: "Сбор Encar", value: `${toLocal(23540).toLocaleString("ru-RU")} ${cur}` },
      { label: "CFR Владивосток", value: `${toLocal(result.carPriceRub + result.koreaExpensesRub + 23540).toLocaleString("ru-RU")} ${cur}`, bold: true },
      { label: "Таможенная пошлина", value: `${toLocal(result.customsDutyRub).toLocaleString("ru-RU")} ${cur}` },
      { label: "Утилизационный сбор", value: `${toLocal(result.utilRub).toLocaleString("ru-RU")} ${cur}` },
      { label: "Брокер + СБКТС", value: `${toLocal(result.brokerRub).toLocaleString("ru-RU")} ${cur}` },
      { label: "Доставка до города", value: "по запросу" },
      { label: "ИТОГО", value: `${toLocal(result.totalRub).toLocaleString("ru-RU")} ${cur}`, bold: true },
    ];
  }

  if (countryCode === "KZ") {
    return [
      { label: "Авто в Корее", value: priceOnlyKrw },
      { label: "Доставка до Алматы", value: `${toLocal(result.koreaExpensesRub).toLocaleString("ru-RU")} ${cur}` },
      { label: "Сбор Encar", value: `${toLocal(23540).toLocaleString("ru-RU")} ${cur}` },
      { label: "Таможня ЕАЭС (15%)", value: `${toLocal(result.customsDutyRub).toLocaleString("ru-RU")} ${cur}` },
      { label: "Оформление", value: `${toLocal(result.brokerRub).toLocaleString("ru-RU")} ${cur}` },
      { label: "Доставка до города", value: "по запросу" },
      { label: "ИТОГО", value: `${toLocal(result.totalRub).toLocaleString("ru-RU")} ${cur}`, bold: true },
    ];
  }

  if (countryCode === "KG") {
    return [
      { label: "Авто в Корее", value: priceOnlyKrw },
      { label: "Доставка до Бишкека", value: `${toLocal(result.koreaExpensesRub).toLocaleString("ru-RU")} ${cur}` },
      { label: "Сбор Encar", value: `${toLocal(23540).toLocaleString("ru-RU")} ${cur}` },
      { label: "Таможня (11%)", value: `${toLocal(result.customsDutyRub).toLocaleString("ru-RU")} ${cur}` },
      { label: "Оформление", value: `${toLocal(result.brokerRub).toLocaleString("ru-RU")} ${cur}` },
      { label: "Доставка до города", value: "по запросу" },
      { label: "ИТОГО", value: `${toLocal(result.totalRub).toLocaleString("ru-RU")} ${cur}`, bold: true },
    ];
  }

  return [
    { label: "Авто в Корее", value: priceOnlyKrw },
    { label: "Доставка до Ташкента", value: `${toLocal(result.koreaExpensesRub).toLocaleString("ru-RU")} ${cur}` },
    { label: "Сбор Encar", value: `${toLocal(23540).toLocaleString("ru-RU")} ${cur}` },
    { label: "Таможня + акциз (22%)", value: `${toLocal(result.customsDutyRub).toLocaleString("ru-RU")} ${cur}` },
    { label: "Оформление", value: `${toLocal(result.brokerRub).toLocaleString("ru-RU")} ${cur}` },
    { label: "Доставка до города", value: "по запросу" },
    { label: "ИТОГО", value: `${toLocal(result.totalRub).toLocaleString("ru-RU")} ${cur}`, bold: true },
  ];
}

export function CarDetailClient({
  car,
  similarCars = [],
}: {
  car: CarDetailCar;
  similarCars?: CarDetailCar[];
}) {
  const router = useRouter();
  const { isInTelegram, showBackButton, hideBackButton } = useTelegram();
  const [countryCode, setCountryCode] = useState("RU");
  const [countryOpen, setCountryOpen] = useState(false);
  const [activePhoto, setActivePhoto] = useState(0);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [brokenPhoto, setBrokenPhoto] = useState(false);
  const [priceOpen, setPriceOpen] = useState(false);
  const [realCalc, setRealCalc] = useState<RealCalc | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);

  const selectedCountry: Country =
    COUNTRIES.find((item) => item.code === countryCode) ?? COUNTRIES[0];
  const photos = Array.isArray(car.photos) ? car.photos : [];
  const activeSrc = photos[activePhoto];
  const updatedAt = formatDateDot(car.modified_at_encar ?? car.created_at ?? null);
  const regKorea = formatKoreaReg(car.first_registration_korea);
  const badgeText = translateBadge(car.badge);
  const displayTransmission = translateTransmission(car.transmission);
  const engineDisplay =
    car.engine_cc && car.engine_cc > 0
      ? `${(car.engine_cc / 1000).toFixed(1)}л · ${translateFuel(car.fuel_type)}`
      : translateFuel(car.fuel_type);

  const calc =
    typeof car.price_krw === "number"
      ? calcFullPrice(car.price_krw, car.engine_cc ?? 0, selectedCountry.code)
      : null;
  const totalPrice =
    selectedCountry.code === "RU" && realCalc && realCalc.total_rub > 0
      ? realCalc.total_rub
      : calc?.totalLocal;

  // Load RU calculation from Korex proxy (fallbacks inside route).
  useEffect(() => {
    if (selectedCountry.code !== "RU") return;
    if (typeof car.price_krw !== "number" || typeof car.year !== "number") return;

    const month = parseInt(
      String(car.first_registration_korea ?? "").split(".")?.[0] ?? "1",
      10,
    );

    setCalcLoading(true);
    fetch("/api/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        price_krw: car.price_krw,
        year: car.year,
        month: Number.isFinite(month) ? month : 1,
        engine_cc: car.engine_cc ?? 0,
        power_hp: car.power_hp ?? 0,
        brand: car.brand,
        model: car.model,
        fuel_type: car.fuel_type,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        const ok =
          data &&
          !data.error &&
          typeof data.total_rub === "number" &&
          data.total_rub > 0 &&
          typeof data.rate_krw_rub === "number" &&
          data.rate_krw_rub > 0;
        setRealCalc(ok ? data : null);
      })
      .catch(() => setRealCalc(null))
      .finally(() => setCalcLoading(false));
  }, [
    car.brand,
    car.encar_id,
    car.engine_cc,
    car.first_registration_korea,
    car.fuel_type,
    car.model,
    car.power_hp,
    car.price_krw,
    car.year,
    selectedCountry.code,
  ]);

  const ruBreakdownReal: BreakdownRow[] | null =
    selectedCountry.code === "RU" && realCalc && realCalc.total_rub > 0
      ? [
          {
            label: "Авто в Корее",
            value: `${car.price_krw?.toLocaleString("ru-RU")} ₩ · ${realCalc.car_price_rub.toLocaleString("ru-RU")} ₽`,
          },
          {
            label: "Фрахт до Владивостока",
            value: `${realCalc.freight_rub.toLocaleString("ru-RU")} ₽`,
          },
          {
            label: "Брокер + СБКТС + ЭПТС",
            value: `${realCalc.broker_rub.toLocaleString("ru-RU")} ₽`,
          },
          {
            label: "CFR Владивосток",
            value: `${(realCalc.car_price_rub + realCalc.freight_rub + realCalc.broker_rub).toLocaleString("ru-RU")} ₽`,
            bold: true,
          },
          {
            label: "Таможенная пошлина",
            value: `${realCalc.duty_rub.toLocaleString("ru-RU")} ₽`,
          },
          {
            label: "Тамож. сборы",
            value: `${realCalc.fees_rub.toLocaleString("ru-RU")} ₽`,
          },
          {
            label: "Утилизационный сбор",
            value: `${realCalc.util_rub.toLocaleString("ru-RU")} ₽`,
          },
          { label: "Доставка до города", value: "по запросу" },
          { label: "ИТОГО", value: `${realCalc.total_rub.toLocaleString("ru-RU")} ₽`, bold: true },
        ]
      : null;

  useEffect(() => {
    setActivePhoto(0);
    setBrokenPhoto(false);
    setFavorites(getFavorites());
  }, [car.encar_id]);

  useEffect(() => {
    setBrokenPhoto(false);
  }, [activePhoto]);

  // Telegram Mini App: use native back button.
  useEffect(() => {
    if (!isInTelegram) return;
    showBackButton(() => {
      if (window.history.length > 1) router.back();
      else router.push("/catalog");
    });
    return () => hideBackButton();
  }, [hideBackButton, isInTelegram, router, showBackButton]);

  const prevPhoto = () => setActivePhoto((p) => Math.max(0, p - 1));
  const nextPhoto = () => setActivePhoto((p) => Math.min(photos.length - 1, p + 1));

  const similarCards = similarCars.filter((item) => item.encar_id !== car.encar_id);

  return (
    <main className="min-h-screen bg-gray-50 text-gray-950">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          {!isInTelegram ? (
            <button
              type="button"
              onClick={() => router.back()}
              className="flex items-center gap-2 text-sm font-semibold text-gray-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Назад
            </button>
          ) : (
            <div className="w-20" />
          )}
          <div className="flex-1 truncate text-center text-sm font-semibold text-gray-900">
            {car.brand} {car.model} {car.year}
          </div>
          <button
            type="button"
            onClick={() => {
              toggleFavorite(car.encar_id);
              setFavorites(getFavorites());
            }}
            className="flex items-center gap-2 text-sm font-semibold text-gray-700"
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
        <div className="flex gap-3 border-t border-gray-100 bg-white px-3 py-2">
          <span className="text-xs text-gray-400">
            Дата добавления: {formatDateDot(car.registered_at_encar ?? car.created_at ?? null)}
          </span>
          <span className="text-xs text-gray-400">Дата изменения: {updatedAt}</span>
        </div>
      </header>

      <section className="bg-gray-900">
        <div className="mx-auto max-w-6xl px-3 py-3">
          <div className="relative overflow-hidden rounded-2xl bg-gray-800">
            <div className="relative h-52 w-full bg-gray-900 sm:h-[360px] md:h-[460px]">
              {activeSrc && !brokenPhoto ? (
                <img
                  src={activeSrc}
                  alt={`${car.brand ?? ""} ${car.model ?? ""}`}
                  className="h-full w-full object-cover"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                    setBrokenPhoto(true);
                  }}
                />
              ) : null}

              {(!activeSrc || brokenPhoto) ? (
                <div className="flex h-full w-full items-center justify-center bg-gray-800 text-gray-400">
                  <div className="text-center">
                    <div className="text-5xl">🚗</div>
                    <div className="mt-2 text-sm">Фото недоступно</div>
                  </div>
                </div>
              ) : null}

              {photos.length > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={prevPhoto}
                    disabled={activePhoto === 0}
                    className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white disabled:opacity-30"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={nextPhoto}
                    disabled={activePhoto >= photos.length - 1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white disabled:opacity-30"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              ) : null}

              <div className="absolute bottom-3 right-3 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white">
                {photos.length > 0 ? `${activePhoto + 1} / ${photos.length}` : "0 / 0"}
              </div>
            </div>

            {photos.length > 0 ? (
              <div className="flex gap-2 overflow-x-auto border-t border-white/10 bg-gray-900 p-3">
                {photos.slice(0, 4).map((src, idx) => {
                  const isMore = idx === 3 && photos.length > 4;
                  const extraCount = photos.length - 4;
                  return (
                    <button
                      key={`${src}-${idx}`}
                      type="button"
                      onClick={() => setActivePhoto(idx)}
                      className={`relative h-16 w-24 flex-shrink-0 overflow-hidden rounded-lg border ${
                        idx === activePhoto ? "border-white" : "border-transparent"
                      }`}
                    >
                      <img src={src} alt="" className="h-full w-full object-cover opacity-90" />
                      {isMore ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/55 text-xs font-semibold text-white">
                          +{extraCount} фото
                        </div>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-0 py-0">
        <div className="mx-3 mt-3">
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="flex items-start justify-between gap-4 px-4 py-4">
              <div>
                <p className="mb-1 text-xs uppercase tracking-wide text-gray-400">
                  Цена под ключ
                </p>
                <p className="text-2xl font-bold text-gray-900 whitespace-nowrap">
                  {typeof totalPrice === "number"
                    ? `${totalPrice.toLocaleString("ru-RU")} ${selectedCountry.currency}`
                    : "—"}
                </p>
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setCountryOpen(!countryOpen)}
                  className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2"
                >
                  <span>{selectedCountry.flag}</span>
                  <span className="text-sm font-medium text-gray-700">
                    {selectedCountry.name}
                  </span>
                  <span className="text-xs text-gray-400">▼</span>
                </button>

                {countryOpen ? (
                  <div className="absolute right-0 top-full z-50 mt-1 min-w-40 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg">
                    {COUNTRIES.map((item) => (
                      <button
                        key={item.code}
                        type="button"
                        onClick={() => {
                          setCountryCode(item.code);
                          setCountryOpen(false);
                        }}
                        className={`flex w-full items-center gap-2 px-4 py-3 text-sm hover:bg-gray-50 ${
                          selectedCountry.code === item.code
                            ? "font-semibold text-gray-900"
                            : "text-gray-700"
                        }`}
                      >
                        <span>{item.flag}</span>
                        <span>{item.name}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setPriceOpen((v) => !v)}
              className="flex w-full items-center justify-between border-t border-gray-100 px-4 py-3 text-left transition-colors hover:bg-gray-50"
            >
              <span className="text-sm font-medium text-gray-700">
                {priceOpen ? "Скрыть разбивку" : "Показать разбивку"}
              </span>
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-sm text-gray-500">
                {priceOpen ? "▲" : "▼"}
              </span>
            </button>

            {priceOpen && calc ? (
              <div className="border-t border-gray-100 bg-gray-50">
                {((selectedCountry.code === "RU" && ruBreakdownReal
                  ? ruBreakdownReal
                  : (getPriceBreakdown(calc, car, selectedCountry.code) as BreakdownRow[])) as BreakdownRow[]
                ).map((row, idx, arr) => (
                  <div
                    key={`${row.label}-${idx}`}
                    className={`flex justify-between items-center px-3 py-2 ${
                      idx < arr.length - 1 ? "border-b border-gray-100" : ""
                    } ${row.bold ? "bg-white" : ""}`}
                  >
                    <span
                      className={`text-sm flex-shrink-0 mr-2 ${row.bold ? "font-semibold text-gray-900" : "text-gray-500"}`}
                    >
                      {row.label}
                    </span>
                    <span
                      className={`text-sm text-right whitespace-nowrap ${
                        row.bold ? "font-bold text-gray-900" : "text-gray-900"
                      }`}
                    >
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="border-t border-gray-100 px-3 py-2">
              <p className="text-center text-xs text-gray-400">
                {selectedCountry.code === "RU" && realCalc
                  ? `Курс ЦБ: 1000₩ = ${(realCalc.rate_krw_rub * 1000).toFixed(2)}₽ · Расчёт актуален`
                  : "Расчёт приблизительный ±15%"}
              </p>
              {selectedCountry.code === "RU" && calcLoading ? (
                <p className="mt-1 text-center text-xs text-gray-400">
                  Обновляем точный расчёт...
                </p>
              ) : null}
            </div>
          </div>

          <a
            href={car.raw_url ?? `https://www.encar.com/dc/dc_cardetailview.do?carid=${car.encar_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
          >
            🔗 Посмотреть на Encar
          </a>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-0">
        <div className="mx-3 mt-3 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center px-3 py-2 border-b border-gray-100 last:border-0">
            <span className="text-xs text-gray-500">Статус:</span>
            <span className="text-xs font-medium text-gray-900 text-right">
              {car.is_available ? "В продаже ✅" : "Недоступно"}
            </span>
          </div>
          <div className="flex justify-between items-center px-3 py-2 border-b border-gray-100 last:border-0">
            <span className="text-xs text-gray-500">Цвет:</span>
            <span className="text-xs font-medium text-gray-900 text-right">
              {displayColor(car.color)}
              <span
                className={`ml-1 inline-block h-3.5 w-3.5 rounded-full align-middle ${
                  COLOR_CIRCLES[displayColor(car.color)] ?? "bg-gray-200"
                }`}
              />
            </span>
          </div>
          <div className="flex justify-between items-center px-3 py-2 border-b border-gray-100 last:border-0">
            <span className="text-xs text-gray-500">Дата рег. в Корее:</span>
            <span className="text-xs font-medium text-gray-900 text-right">{regKorea}</span>
          </div>
          <div className="flex justify-between items-center px-3 py-2 border-b border-gray-100 last:border-0">
            <span className="text-xs text-gray-500">Поколение:</span>
            <span className="text-xs font-medium text-gray-900 text-right">{car.model ?? "—"}</span>
          </div>
          {car.badge ? (
            <div className="flex justify-between items-center px-3 py-2 border-b border-gray-100 last:border-0">
              <span className="text-xs text-gray-500">Комплектация:</span>
              <span className="text-xs font-medium text-gray-900 text-right">{badgeText || "—"}</span>
            </div>
          ) : null}
          <div className="flex justify-between items-center px-3 py-2 border-b border-gray-100 last:border-0">
            <span className="text-xs text-gray-500">Пробег:</span>
            <span className="text-xs font-medium text-gray-900 text-right">{formatNumber(car.mileage)} км</span>
          </div>
          <div className="flex justify-between items-center px-3 py-2 border-b border-gray-100 last:border-0">
            <span className="text-xs text-gray-500">Двигатель:</span>
            <span className="text-xs font-medium text-gray-900 text-right">{engineDisplay}</span>
          </div>
          <div className="flex justify-between items-center px-3 py-2 border-b border-gray-100 last:border-0">
            <span className="text-xs text-gray-500">КПП:</span>
            <span className="text-xs font-medium text-gray-900 text-right">{displayTransmission}</span>
          </div>
          <div className="flex justify-between items-center px-3 py-2 border-b border-gray-100 last:border-0">
            <span className="text-xs text-gray-500">Привод:</span>
            <span className="text-xs font-medium text-gray-900 text-right">
              {car.drive_type ?? parseDriveType(car.badge) ?? parseDriveType(car.badge_detail) ?? "—"}
            </span>
          </div>
          <div className="flex justify-between items-center px-3 py-2 border-b border-gray-100 last:border-0">
            <span className="text-xs text-gray-500">Аварии:</span>
            <span className="text-xs font-medium text-gray-900 text-right">
              {car.has_accident ? "Были ⚠️" : "Нет ✅"}
            </span>
          </div>
          <div className="flex justify-between items-center px-3 py-2 border-b border-gray-100 last:border-0">
            <span className="text-xs text-gray-500">Дата на Encar:</span>
            <span className="text-xs font-medium text-gray-900 text-right">
              {formatAddedDate(car.registered_at_encar ?? car.created_at ?? null)}
            </span>
          </div>
          <div className="flex justify-between items-center px-3 py-2 border-b border-gray-100 last:border-0">
            <span className="text-xs text-gray-500">Лот Encar:</span>
            <span className="text-xs font-medium text-gray-900 text-right">{car.encar_id}</span>
          </div>
          <div className="flex justify-between items-center px-3 py-2 border-b border-gray-100 last:border-0">
            <span className="text-xs text-gray-500">Стоимость в Корее:</span>
            <span className="text-xs font-medium text-gray-900 text-right whitespace-nowrap">
              {typeof car.price_krw === "number" ? `${formatKrw(car.price_krw)} ₩` : "—"}
            </span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-2">
        <div className="mx-0 my-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="font-semibold text-gray-900">
            Проконсультируйтесь{" "}
            <span className="rounded bg-orange-400 px-2 py-0.5 text-sm text-white">
              Бесплатно
            </span>
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Напишите в Telegram или WhatsApp — подберём варианты под ваш бюджет
          </p>
        </div>
      </section>

      {similarCards.length > 0 ? (
        <section className="mx-auto max-w-6xl px-4 pb-24">
          <p className="mb-3 text-sm font-semibold text-gray-900">Похожие авто</p>
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
            {similarCards.map((item) => {
              const firstPhoto = item.photos?.[0];
              const itemCalc =
                typeof item.price_krw === "number"
                  ? calcFullPrice(item.price_krw, item.engine_cc ?? 0, selectedCountry.code)
                  : null;

              return (
                <Link
                  key={item.encar_id}
                  href={`/car/${item.encar_id}`}
                  className="w-48 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
                >
                  <div className="h-28 bg-gray-100">
                    {firstPhoto ? (
                      <img src={firstPhoto} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-2xl">
                        🚗
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="text-sm font-semibold text-gray-900">
                      {item.brand} {item.model} {item.year}
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      {itemCalc
                        ? `${itemCalc.totalLocal.toLocaleString("ru-RU")} ${itemCalc.currency}`
                        : "Цена по запросу"}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      <div className="h-28" />

      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-100 bg-white p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-6xl gap-3">
          <button
            type="button"
            onClick={() => window.open("https://t.me/YOUR_USERNAME", "_blank")}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-500 py-3 font-medium text-white"
          >
            ✈️ Telegram
          </button>
          <button
            type="button"
            onClick={() => window.open("https://wa.me/YOUR_PHONE", "_blank")}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-500 py-3 font-medium text-white"
          >
            💬 WhatsApp
          </button>
        </div>
      </div>
    </main>
  );
}
