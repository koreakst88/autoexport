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
// Базовая ставка 20 000 ₽ × коэффициент по мощности
function getUtilSbor(powerHp: number): number {
  const BASE = 20000
  let coeff: number

  if (powerHp <= 90) coeff = 1.67
  else if (powerHp <= 150) coeff = 6.31
  else if (powerHp <= 200) coeff = 12.98
  else if (powerHp <= 300) coeff = 17.57
  else if (powerHp <= 400) coeff = 35.14
  else if (powerHp <= 500) coeff = 60.75
  else coeff = 122.38

  return Math.round(BASE * coeff)
}

// Таможенная пошлина РФ для физлиц (авто 3-5 лет из Кореи)
// Берём максимум из двух формул: % от стоимости или за см³
function getCustomsDuty(
  priceKrw: number,
  engineCc: number,
  krwRate: number,
): { duty: number; fees: number } {
  const USD_RATE = 70.95
  const EUR_RATE = 78.5
  const priceRub = priceKrw * krwRate
  const priceEur = priceRub / EUR_RATE

  // Ставки таможенной пошлины по объёму двигателя
  // для авто 3-5 лет (основная часть нашего каталога)
  let eurPerCc: number
  let percentRate: number

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

  const dutyByVolume = engineCc * eurPerCc * EUR_RATE
  const dutyByValue = priceEur * percentRate * EUR_RATE
  const duty = Math.round(Math.max(dutyByVolume, dutyByValue))

  // Таможенные сборы (фиксированные по стоимости авто)
  let fees = 10500
  const priceUsd = priceRub / USD_RATE
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
      const { duty: dutyRub, fees: feesRub } = getCustomsDuty(
        priceKrw,
        engineCc,
        krwRate,
      )
      // Утиль
      const utilRub = getUtilSbor(powerHp)

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

