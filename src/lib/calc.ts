export const USD_TO_RUB = 90;
export const KRW_TO_USD = 0.000746; // 1 KRW = 0.000746 USD (май 2026)
export const KRW_TO_RUB = 0.0535;

export const COUNTRIES = [
  { code: "RU", name: "Россия", flag: "🇷🇺", currency: "₽", rate: 0.0535 },
  { code: "KZ", name: "Казахстан", flag: "🇰🇿", currency: "₸", rate: 0.348 },
  { code: "KG", name: "Кыргызстан", flag: "🇰🇬", currency: "с", rate: 0.462 },
  { code: "UZ", name: "Узбекистан", flag: "🇺🇿", currency: "сум", rate: 68.5 },
] as const;

// Курс отображения в валюте страны (от рублей)
export const RUB_TO_LOCAL: Record<string, number> = {
  RU: 1,
  KZ: 6.5, // 1 RUB = 6.5 KZT
  KG: 0.862, // 1 RUB = 0.862 KGS
  UZ: 127, // 1 RUB = 127 UZS
};

export interface CalcResult {
  carPriceRub: number;
  koreaExpensesRub: number;
  customsDutyRub: number;
  utilRub: number;
  brokerRub: number;
  freightRub: number;
  totalRub: number;
  totalLocal: number;
  currency: string;
}

function dutyPerCc(value: number): number {
  if (value <= 1000) return 1.5;
  if (value <= 1500) return 1.7;
  if (value <= 1800) return 2.5;
  if (value <= 2300) return 2.7;
  if (value <= 3000) return 3.0;
  return 3.6;
}

export function calcFullPrice(
  priceKrw: number,
  engineCc: number,
  countryCode: string,
): CalcResult {
  const cc = engineCc > 0 ? engineCc : 1600;
  const priceUsd = priceKrw * KRW_TO_USD;
  const priceRub = priceKrw * KRW_TO_RUB;
  const priceEur = priceUsd * 0.92;

  // Фиксированные расходы в Корее (одинаковы для всех стран)
  const encarFeeRub = 23540;
  const koreaExpensesRub = encarFeeRub;

  let customsDutyRub = 0;
  let utilRub = 0;
  let brokerRub = 0;
  let freightRub = 0;
  let currency = "₽";

  if (countryCode === "RU") {
    currency = "₽";
    freightRub = 139100; // фрахт до Владивостока

    const dutyByVolume = cc * dutyPerCc(cc) * USD_TO_RUB;
    const dutyByPrice = priceEur * 0.154 * USD_TO_RUB * 0.92;
    customsDutyRub = Math.max(dutyByVolume, dutyByPrice);

    if (cc <= 1000) utilRub = 686000;
    else if (cc <= 2000) utilRub = 1492800;
    else if (cc <= 3000) utilRub = 2807400;
    else utilRub = 4204500;

    brokerRub = 100000; // брокер + СБКТС + ЭПТС
  } else if (countryCode === "KZ") {
    currency = "₸";
    freightRub = 900 * USD_TO_RUB; // фрахт до Алматы
    customsDutyRub = priceRub * 0.15; // Таможня КЗ: 15%
    brokerRub = 200 * USD_TO_RUB; // оформление
  } else if (countryCode === "KG") {
    currency = "с";
    freightRub = 950 * USD_TO_RUB;
    customsDutyRub = priceRub * 0.11;
    brokerRub = 200 * USD_TO_RUB;
  } else if (countryCode === "UZ") {
    currency = "сум";
    freightRub = 1000 * USD_TO_RUB;
    customsDutyRub = priceRub * 0.22;
    brokerRub = 300 * USD_TO_RUB;
  }

  const totalRub =
    priceRub +
    koreaExpensesRub +
    freightRub +
    customsDutyRub +
    utilRub +
    brokerRub;

  const totalLocal = Math.round(totalRub * (RUB_TO_LOCAL[countryCode] ?? 1));

  return {
    carPriceRub: Math.round(priceRub),
    koreaExpensesRub: Math.round(koreaExpensesRub + freightRub),
    customsDutyRub: Math.round(customsDutyRub),
    utilRub: Math.round(utilRub),
    brokerRub: Math.round(brokerRub),
    freightRub: Math.round(freightRub),
    totalRub: Math.round(totalRub),
    totalLocal,
    currency,
  };
}
