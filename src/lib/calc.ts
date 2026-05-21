export interface Country {
  code: string
  name: string
  flag: string
  currency: string
}

export const COUNTRIES: Country[] = [
  { code: 'RU', name: 'Россия', flag: '🇷🇺', currency: '₽' },
  { code: 'KZ', name: 'Казахстан', flag: '🇰🇿', currency: '₸' },
  { code: 'KG', name: 'Кыргызстан', flag: '🇰🇬', currency: 'с' },
  { code: 'UZ', name: 'Узбекистан', flag: '🇺🇿', currency: 'сум' },
]

// Курс — обновляется с ЦБ через API, здесь fallback
export const KRW_TO_RUB = 0.04718

const EUR_RATE = 78.5
const USD_RATE = 70.95

// Утилизационный сбор 2025 для физлиц
// Зависит от мощности и возраста авто
function getUtilSbor(powerHp: number, year: number): number {
  const BASE = 20000
  const age = new Date().getFullYear() - year

  function coeff(hp: number, isNew: boolean): number {
    if (isNew) {
      if (hp <= 90) return 5.93
      if (hp <= 150) return 17.07
      if (hp <= 200) return 44.24
      if (hp <= 300) return 140.52
      if (hp <= 400) return 149.44
      if (hp <= 500) return 347.18
      return 714.94
    }

    if (hp <= 90) return 1.67
    if (hp <= 150) return 6.31
    if (hp <= 200) return 12.98
    if (hp <= 300) return 17.57
    if (hp <= 400) return 35.14
    if (hp <= 500) return 60.75
    return 122.38
  }

  return Math.round(BASE * coeff(powerHp, age < 3))
}

function getCustomsDutyRu(
  priceKrw: number,
  engineCc: number,
  krwRate: number,
  year: number,
): number {
  const priceRub = priceKrw * krwRate
  const priceEur = priceRub / EUR_RATE
  const age = new Date().getFullYear() - year

  let eurPerCc: number
  let percentRate: number

  if (age < 3) {
    eurPerCc = 3.5
    percentRate = 0.48
  } else if (age <= 5) {
    if (engineCc <= 1000) {
      eurPerCc = 1.5
      percentRate = 0.154
    } else if (engineCc <= 1500) {
      eurPerCc = 1.7
      percentRate = 0.154
    } else if (engineCc <= 1800) {
      eurPerCc = 2.5
      percentRate = 0.154
    } else if (engineCc <= 2300) {
      eurPerCc = 2.7
      percentRate = 0.154
    } else if (engineCc <= 3000) {
      eurPerCc = 3.0
      percentRate = 0.154
    } else {
      eurPerCc = 3.6
      percentRate = 0.154
    }
  } else {
    if (engineCc <= 1000) {
      eurPerCc = 3.0
      percentRate = 0.2
    } else if (engineCc <= 1500) {
      eurPerCc = 3.2
      percentRate = 0.2
    } else if (engineCc <= 1800) {
      eurPerCc = 3.5
      percentRate = 0.2
    } else if (engineCc <= 2300) {
      eurPerCc = 4.8
      percentRate = 0.2
    } else if (engineCc <= 3000) {
      eurPerCc = 5.0
      percentRate = 0.2
    } else {
      eurPerCc = 5.7
      percentRate = 0.2
    }
  }

  const dutyByVolume = engineCc * eurPerCc * EUR_RATE
  const dutyByValue = priceEur * percentRate * EUR_RATE
  return Math.round(Math.max(dutyByVolume, dutyByValue))
}

export interface CalcResult {
  carPriceRub: number
  koreaExpensesRub: number
  customsDutyRub: number
  utilRub: number
  brokerRub: number
  freightRub: number
  totalRub: number
  totalLocal: number
  currency: string
  powerHp: number
}

export function calcFullPrice(
  priceKrw: number,
  engineCc: number,
  countryCode: string,
  year: number = 2021,
  powerHp: number = 0,
  krwRate: number = KRW_TO_RUB,
): CalcResult {
  const cc = engineCc > 0 ? engineCc : 1600
  const hp = powerHp > 0 ? powerHp : estimatePower(cc)
  const carPriceRub = Math.round(priceKrw * krwRate)

  const RUB_TO_LOCAL: Record<string, number> = {
    RU: 1,
    KZ: 6.5,
    KG: 0.862,
    UZ: 127,
  }
  const CURRENCY: Record<string, string> = {
    RU: '₽',
    KZ: '₸',
    KG: 'с',
    UZ: 'сум',
  }

  if (countryCode === 'RU') {
    const freightRub = Math.round(1200 * USD_RATE)
    const brokerRub = 90000
    const dutyRub = getCustomsDutyRu(priceKrw, cc, krwRate, year)
    const feesRub = carPriceRub / USD_RATE <= 10000 ? 6187 : 10500
    const utilRub = getUtilSbor(hp, year)
    const totalRub = carPriceRub + freightRub + brokerRub + dutyRub + feesRub + utilRub

    return {
      carPriceRub,
      koreaExpensesRub: freightRub,
      customsDutyRub: dutyRub + feesRub,
      utilRub,
      brokerRub,
      freightRub,
      totalRub,
      totalLocal: totalRub,
      currency: '₽',
      powerHp: hp,
    }
  }

  // KZ, KG, UZ
  const FREIGHT_USD: Record<string, number> = { KZ: 1560, KG: 1200, UZ: 1950 }
  const CUSTOMS_RATE: Record<string, number> = { KZ: 0.15, KG: 0.11, UZ: 0.22 }

  const freightRub = Math.round((FREIGHT_USD[countryCode] ?? 1200) * USD_RATE)
  const brokerRub = Math.round(200 * USD_RATE)
  const dutyRub = Math.round(carPriceRub * (CUSTOMS_RATE[countryCode] ?? 0.15))
  const totalRub = carPriceRub + freightRub + brokerRub + dutyRub
  const localRate = RUB_TO_LOCAL[countryCode] ?? 1
  const totalLocal = Math.round(totalRub * localRate)

  return {
    carPriceRub,
    koreaExpensesRub: freightRub,
    customsDutyRub: dutyRub,
    utilRub: 0,
    brokerRub,
    freightRub,
    totalRub,
    totalLocal,
    currency: CURRENCY[countryCode] ?? '₽',
    powerHp: hp,
  }
}

// Примерная мощность по объёму если нет данных
function estimatePower(cc: number): number {
  if (cc <= 1000) return 75
  if (cc <= 1400) return 100
  if (cc <= 1600) return 130
  if (cc <= 2000) return 150
  if (cc <= 2500) return 200
  if (cc <= 3000) return 250
  return 300
}

