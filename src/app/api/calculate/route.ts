import { NextRequest, NextResponse } from 'next/server'
import { getPowerHp } from '@/lib/power-map'

// Получаем курс KRW с ЦБ РФ
async function getKrwRate(): Promise<number> {
  try {
    const res = await fetch('https://www.cbr.ru/scripts/XML_daily.asp', {
      next: { revalidate: 3600 },
    })
    const xml = await res.text()
    // KRW идёт как 1000 единиц в XML ЦБ
    const match = xml.match(
      /<CharCode>KRW<\/CharCode>[\s\S]*?<Nominal>(\d+)<\/Nominal>[\s\S]*?<Value>([\d,]+)<\/Value>/,
    )
    if (match) {
      const nominal = parseInt(match[1])
      const value = parseFloat(match[2].replace(',', '.'))
      return value / nominal
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('CBR rate error:', e)
  }
  return 0.0472 // fallback на случай недоступности ЦБ
}

// Утилизационный сбор 2025 для физлиц
// Зависит от мощности и возраста авто
function getUtilSbor(powerHp: number, year: number): number {
  const BASE = 20000
  const currentYear = new Date().getFullYear()
  const age = currentYear - year

  // Коэффициенты для авто до 3 лет (новые)
  const COEFF_NEW: Record<string, number> = {
    '0-90': 5.93,
    '91-150': 17.07,
    '151-200': 44.24,
    '201-300': 140.52,
    '301-400': 149.44,
    '401-500': 347.18,
    '500+': 714.94,
  }

  // Коэффициенты для авто 3-5 лет
  const COEFF_35: Record<string, number> = {
    '0-90': 1.67,
    '91-150': 6.31,
    '151-200': 12.98,
    '201-300': 17.57,
    '301-400': 35.14,
    '401-500': 60.75,
    '500+': 122.38,
  }

  // Коэффициенты для авто старше 5 лет
  const COEFF_OLD: Record<string, number> = {
    '0-90': 1.67,
    '91-150': 6.31,
    '151-200': 12.98,
    '201-300': 17.57,
    '301-400': 35.14,
    '401-500': 60.75,
    '500+': 122.38,
  }

  function getCoeff(coeffMap: Record<string, number>, hp: number): number {
    if (hp <= 90) return coeffMap['0-90']
    if (hp <= 150) return coeffMap['91-150']
    if (hp <= 200) return coeffMap['151-200']
    if (hp <= 300) return coeffMap['201-300']
    if (hp <= 400) return coeffMap['301-400']
    if (hp <= 500) return coeffMap['401-500']
    return coeffMap['500+']
  }

  let coeff: number
  if (age < 3) {
    coeff = getCoeff(COEFF_NEW, powerHp)
  } else if (age <= 5) {
    coeff = getCoeff(COEFF_35, powerHp)
  } else {
    coeff = getCoeff(COEFF_OLD, powerHp)
  }

  return Math.round(BASE * coeff)
}

// Таможенная пошлина РФ для физлиц (авто 3-5 лет из Кореи)
// Берём максимум из двух формул: % от стоимости или за см³
function getCustomsDuty(
  priceKrw: number,
  engineCc: number,
  krwRate: number,
  year: number,
): { duty: number; fees: number } {
  const EUR_RATE = 78.5
  const USD_RATE = 70.95
  const priceRub = priceKrw * krwRate
  const priceEur = priceRub / EUR_RATE
  const currentYear = new Date().getFullYear()
  const age = currentYear - year

  let duty: number

  if (age < 3) {
    // Новые авто: 48% но не менее X евро за см³
    const eurPerCc =
      engineCc <= 1000 ? 2.5
      : engineCc <= 1500 ? 3.5
      : engineCc <= 1800 ? 3.5
      : engineCc <= 2300 ? 3.5
      : engineCc <= 3000 ? 3.5
      : 3.5
    const dutyByVolume = engineCc * eurPerCc * EUR_RATE
    const dutyByValue = priceEur * 0.48 * EUR_RATE
    duty = Math.round(Math.max(dutyByVolume, dutyByValue))
  } else if (age <= 5) {
    // 3-5 лет: по объёму
    const eurPerCc =
      engineCc <= 1000 ? 1.5
      : engineCc <= 1500 ? 1.7
      : engineCc <= 1800 ? 2.5
      : engineCc <= 2300 ? 2.7
      : engineCc <= 3000 ? 3.0
      : 3.6
    const dutyByVolume = engineCc * eurPerCc * EUR_RATE
    const dutyByValue = priceEur * 0.154 * EUR_RATE
    duty = Math.round(Math.max(dutyByVolume, dutyByValue))
  } else {
    // Старше 5 лет: повышенные ставки
    const eurPerCc =
      engineCc <= 1000 ? 3.0
      : engineCc <= 1500 ? 3.2
      : engineCc <= 1800 ? 3.5
      : engineCc <= 2300 ? 4.8
      : engineCc <= 3000 ? 5.0
      : 5.7
    const dutyByVolume = engineCc * eurPerCc * EUR_RATE
    const dutyByValue = priceEur * 0.2 * EUR_RATE
    duty = Math.round(Math.max(dutyByVolume, dutyByValue))
  }

  // Таможенные сборы
  const priceUsd = priceRub / USD_RATE
  let fees = 10500
  if (priceUsd <= 10000) fees = 6187
  else if (priceUsd <= 20000) fees = 10500
  else if (priceUsd <= 40000) fees = 14256
  else fees = 20608

  return { duty, fees }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const priceKrw = Number(body.price_krw) || 0
    const engineCc = Number(body.engine_cc) || 1600
    const year = Number(body.year) || new Date().getFullYear()
    const brand = body.brand ?? ''
    const model = body.model ?? ''
    const country = body.country ?? 'RU'

    // Получаем актуальный курс ЦБ
    const krwRate = await getKrwRate()

    // Получаем мощность из маппинга
    const powerHp =
      Number(body.power_hp) > 0
        ? Number(body.power_hp)
        : getPowerHp(brand, model, engineCc)

    const carPriceRub = Math.round(priceKrw * krwRate)

    if (country === 'RU') {
      // Расходы в Корее + фрахт до Владивостока
      const freightRub = Math.round(1200 * 70.95) // $1200 × курс USD
      // Брокер + СБКТС + ЭПТС + хранение
      const brokerRub = 90000
      // Таможня
      const { duty: dutyRub, fees: feesRub } = getCustomsDuty(priceKrw, engineCc, krwRate, year)
      // Утиль
      const utilRub = getUtilSbor(powerHp, year)

      const totalRub =
        carPriceRub + freightRub + brokerRub + dutyRub + feesRub + utilRub

      return NextResponse.json({
        country: 'RU',
        rate_krw_rub: krwRate,
        car_price_rub: carPriceRub,
        freight_rub: freightRub,
        broker_rub: brokerRub,
        duty_rub: dutyRub,
        fees_rub: feesRub,
        util_rub: utilRub,
        total_rub: totalRub,
        power_hp: powerHp,
        currency: '₽',
      })
    }

    // Для КЗ, КГ, УЗ — упрощённый расчёт
    const RUB_TO_LOCAL: Record<string, number> = {
      KZ: 6.5,
      KG: 0.862,
      UZ: 127,
    }
    const CURRENCY: Record<string, string> = {
      KZ: '₸',
      KG: 'с',
      UZ: 'сум',
    }
    const FREIGHT_USD: Record<string, number> = {
      KZ: 1560,
      KG: 1200,
      UZ: 1950,
    }
    const CUSTOMS_RATE: Record<string, number> = {
      KZ: 0.15,
      KG: 0.11,
      UZ: 0.22,
    }

    const freightRub = Math.round((FREIGHT_USD[country] ?? 1200) * 70.95)
    const brokerRub = Math.round(200 * 70.95)
    const dutyRub = Math.round(carPriceRub * (CUSTOMS_RATE[country] ?? 0.15))
    const totalRub = carPriceRub + freightRub + brokerRub + dutyRub
    const localRate = RUB_TO_LOCAL[country] ?? 1
    const totalLocal = Math.round(totalRub * localRate)

    return NextResponse.json({
      country,
      rate_krw_rub: krwRate,
      car_price_rub: carPriceRub,
      freight_rub: freightRub,
      broker_rub: brokerRub,
      duty_rub: dutyRub,
      fees_rub: 0,
      util_rub: 0,
      total_rub: totalRub,
      total_local: totalLocal,
      power_hp: powerHp,
      currency: CURRENCY[country] ?? '₽',
    })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Calculate error:', err)
    return NextResponse.json({ error: 'Calculation failed' }, { status: 500 })
  }
}
