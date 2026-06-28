import { getPowerHp } from '@/lib/power-map'

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

const CUSTOMS_EUR_RATE = 87.403
const USD_RATE = 70.95
const DEFAULT_CLEARANCE_DAYS = 90

function getEstimatedClearanceDate(days = DEFAULT_CLEARANCE_DAYS): Date {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date
}

export function formatCalcDate(dateStr: string): string {
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return '—'
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  return `${dd}.${mm}.${date.getFullYear()}`
}

function getCarAge(
  year: number,
  month: number = 6,
  clearanceDate: Date = getEstimatedClearanceDate(),
): number {
  const releaseDate = new Date(year, month - 1, 15)
  return (clearanceDate.getTime() - releaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
}

function getAgeState(year: number, month: number, clearanceDate: Date) {
  const clearanceAge = getCarAge(year, month, clearanceDate)
  const currentAge = getCarAge(year, month, new Date())

  return {
    clearanceAge,
    currentAge,
    isNew: clearanceAge < 3,
    isOld: currentAge > 5,
  }
}

export function getRegistrationMonth(dateStr: string | null | undefined): number {
  if (!dateStr) return 6
  const month = parseInt(dateStr.split('.')[0], 10)
  return month >= 1 && month <= 12 ? month : 6
}

function getUtilCoeff(powerHp: number, engineCc: number, isNew: boolean): number {
  const smallCc = engineCc <= 2000
  const midCc = engineCc <= 3000

  if (isNew) {
    if (smallCc) {
      if (powerHp <= 160) return 0.17
      if (powerHp <= 180) return 45.0
      if (powerHp <= 200) return 45.0
      if (powerHp <= 250) return 50.52
      if (powerHp <= 270) return 57.12
      if (powerHp <= 300) return 64.56
      if (powerHp <= 350) return 83.16
      if (powerHp <= 400) return 94.8
      return 108.0
    }

    if (midCc) {
      if (powerHp <= 160) return 0.17
      if (powerHp <= 180) return 115.34
      if (powerHp <= 200) return 118.2
      if (powerHp <= 250) return 120.12
      if (powerHp <= 270) return 126.0
      if (powerHp <= 309) return 131.04
      if (powerHp <= 350) return 141.72
      if (powerHp <= 400) return 147.48
      return 153.36
    }

    if (powerHp <= 160) return 129.2
    if (powerHp <= 180) return 131.76
    if (powerHp <= 200) return 134.4
    if (powerHp <= 250) return 137.16
    if (powerHp <= 270) return 140.52
    if (powerHp <= 300) return 144.0
    if (powerHp <= 350) return 160.32
    if (powerHp <= 400) return 169.2
    return 178.44
  }

  if (smallCc) {
    if (powerHp <= 160) return 0.26
    if (powerHp <= 190) return 74.64
    if (powerHp <= 220) return 79.2
    if (powerHp <= 250) return 83.88
    if (powerHp <= 300) return 91.92
    if (powerHp <= 350) return 120.6
    if (powerHp <= 400) return 132.0
    return 144.6
  }

  if (midCc) {
    if (powerHp <= 160) return 0.26
    if (powerHp <= 190) return 172.8
    if (powerHp <= 220) return 175.08
    if (powerHp <= 250) return 177.6
    if (powerHp <= 300) return 183.0
    if (powerHp <= 309) return 188.52
    if (powerHp <= 340) return 193.68
    if (powerHp <= 369) return 199.08
    if (powerHp <= 400) return 204.72
    return 210.48
  }

  if (powerHp <= 160) return 197.81
  if (powerHp <= 180) return 200.04
  if (powerHp <= 200) return 202.2
  if (powerHp <= 250) return 204.36
  if (powerHp <= 270) return 207.24
  if (powerHp <= 300) return 212.4
  if (powerHp <= 350) return 224.28
  if (powerHp <= 400) return 231.0
  return 237.96
}

// Утилизационный сбор по матрице, сверенной с Korex calculator.
function getUtilSbor(
  powerHp: number,
  engineCc: number,
  year: number,
  month: number = 6,
  clearanceDate: Date = getEstimatedClearanceDate(),
): number {
  const BASE = 20000
  const ageState = getAgeState(year, month, clearanceDate)
  return Math.round(BASE * getUtilCoeff(powerHp, engineCc, ageState.isNew))
}

function getCustomsDutyRu(
  priceKrw: number,
  engineCc: number,
  krwRate: number,
  year: number,
  month: number = 6,
  clearanceDate: Date = getEstimatedClearanceDate(),
): number {
  const priceRub = priceKrw * krwRate
  const priceEur = priceRub / CUSTOMS_EUR_RATE
  const ageState = getAgeState(year, month, clearanceDate)

  let eurPerCc: number
  let percentRate: number

  if (ageState.isNew) {
    if (priceEur <= 8500) {
      eurPerCc = 2.5
      percentRate = 0.54
    } else if (priceEur <= 16700) {
      eurPerCc = 3.5
      percentRate = 0.48
    } else if (priceEur <= 42300) {
      eurPerCc = 5.5
      percentRate = 0.48
    } else if (priceEur <= 84500) {
      eurPerCc = 7.5
      percentRate = 0.48
    } else if (priceEur <= 169000) {
      eurPerCc = 15.0
      percentRate = 0.48
    } else {
      eurPerCc = 20.0
      percentRate = 0.48
    }
  } else if (!ageState.isOld) {
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

  const dutyByVolume = engineCc * eurPerCc * CUSTOMS_EUR_RATE
  const dutyByValue = priceEur * percentRate * CUSTOMS_EUR_RATE
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
  estimatedClearanceDate: string
  carAgeYears: number
}

export function calcFullPrice(
  priceKrw: number,
  engineCc: number,
  countryCode: string,
  year: number = 2021,
  powerHp: number = 0,
  krwRate: number = KRW_TO_RUB,
  brand: string = '',
  model: string = '',
  badgeDetail: string = '',
  month: number = 6,
  clearanceDays: number = DEFAULT_CLEARANCE_DAYS,
): CalcResult {
  const cc = engineCc > 0 ? engineCc : 1600
  const hp = powerHp > 0 ? powerHp : getPowerHp(brand, model, cc, badgeDetail)
  const carPriceRub = Math.round(priceKrw * krwRate)
  const clearanceDate = getEstimatedClearanceDate(clearanceDays)
  const estimatedClearanceDate = clearanceDate.toISOString()
  const carAgeYears = getAgeState(year, month, clearanceDate).clearanceAge

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
    const dutyRub = getCustomsDutyRu(priceKrw, cc, krwRate, year, month, clearanceDate)
    const feesRub = carPriceRub / USD_RATE <= 10000 ? 6187 : 10500
    const utilRub = getUtilSbor(hp, cc, year, month, clearanceDate)
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
      estimatedClearanceDate,
      carAgeYears,
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
    estimatedClearanceDate,
    carAgeYears,
  }
}
