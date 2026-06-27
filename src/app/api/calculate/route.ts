import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getPowerHp } from '@/lib/power-map'

const CUSTOMS_EUR_RATE = 87.403
const USD_RATE = 70.95

const supabase =
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
      )
    : null

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

function getCarAge(year: number, month: number = 6): number {
  const now = new Date()
  const regDate = new Date(year, month - 1, 1)
  const diffMs = now.getTime() - regDate.getTime()
  return diffMs / (1000 * 60 * 60 * 24 * 365.25)
}

function normalizeSpecText(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeFuelForSpec(value: unknown): string {
  const text = normalizeSpecText(value)
  if (!text) return ''
  if (text.includes('디젤') || text.includes('diesel')) return 'diesel'
  if (text.includes('lpg') || text.includes('lpi') || text.includes('lpe')) return 'lpg'
  if (text.includes('하이브리드') || text.includes('hybrid') || text.includes('hev')) return 'hybrid'
  if (text.includes('가솔린+전기')) return 'hybrid'
  if (text.includes('전기') || text.includes('electric')) return 'electric'
  if (text.includes('가솔린') || text.includes('gasoline')) return 'gasoline'
  return text
}

async function getVerifiedPowerHp(input: {
  brand: string
  model: string
  badgeDetail: string
  fuelType?: string
  engineCc: number
  year: number
}): Promise<number | null> {
  if (!supabase || !input.badgeDetail || !input.engineCc) return null

  const { data, error } = await supabase
    .from('vehicle_specs')
    .select('power_hp,drive_type,year_from,year_to,fuel_type_norm')
    .ilike('brand', input.brand)
    .ilike('model', input.model)
    .eq('badge_detail_norm', normalizeSpecText(input.badgeDetail))
    .eq('engine_cc', input.engineCc)
    .eq('verification_status', 'verified')
    .not('power_hp', 'is', null)

  if (error || !data?.length) return null

  const fuelNorm = normalizeFuelForSpec(input.fuelType)
  const spec = data.find((row) => {
    if (row.fuel_type_norm && row.fuel_type_norm !== fuelNorm) return false
    if (row.year_from && input.year < row.year_from) return false
    if (row.year_to && input.year > row.year_to) return false
    return true
  })

  return spec?.power_hp ?? null
}

// Утилизационный сбор 2025 для физлиц
// Зависит от мощности и возраста авто
function getUtilCoeff(powerHp: number, engineCc: number, isNew: boolean): number {
  const smallCc = engineCc <= 2000
  const midCc = engineCc <= 3000

  if (isNew) {
    if (smallCc) {
      if (powerHp <= 160) return 0.17
      if (powerHp <= 180) return 45.0
      if (powerHp <= 200) return 47.64
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
      if (powerHp <= 300) return 131.04
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
    if (powerHp <= 270) return 91.92
    if (powerHp <= 300) return 100.56
    if (powerHp <= 350) return 120.6
    if (powerHp <= 400) return 132.0
    return 144.6
  }

  if (midCc) {
    if (powerHp <= 160) return 0.26
    if (powerHp <= 180) return 172.8
    if (powerHp <= 200) return 175.08
    if (powerHp <= 250) return 177.6
    if (powerHp <= 270) return 183.0
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

function getUtilSbor(
  powerHp: number,
  engineCc: number,
  year: number,
  month: number = 6,
): number {
  const BASE = 20000
  const age = getCarAge(year, month)
  return Math.round(BASE * getUtilCoeff(powerHp, engineCc, age < 3))
}

// Таможенная пошлина РФ для физлиц (авто 3-5 лет из Кореи)
// Берём максимум из двух формул: % от стоимости или за см³
function getCustomsDuty(
  priceKrw: number,
  engineCc: number,
  krwRate: number,
  year: number,
  month: number = 6,
): { duty: number; fees: number } {
  const priceRub = priceKrw * krwRate
  const priceEur = priceRub / CUSTOMS_EUR_RATE
  const ageYears = getCarAge(year, month)

  let duty: number

  if (ageYears < 3) {
    // Новые авто: 48% но не менее X евро за см³
    const eurPerCc =
      engineCc <= 1000 ? 2.5
      : engineCc <= 1500 ? 3.5
      : engineCc <= 1800 ? 3.5
      : engineCc <= 2300 ? 3.5
      : engineCc <= 3000 ? 3.5
      : 3.5
    const dutyByVolume = engineCc * eurPerCc * CUSTOMS_EUR_RATE
    const dutyByValue = priceEur * 0.48 * CUSTOMS_EUR_RATE
    duty = Math.round(Math.max(dutyByVolume, dutyByValue))
  } else if (ageYears <= 5) {
    // 3-5 лет: по объёму
    const eurPerCc =
      engineCc <= 1000 ? 1.5
      : engineCc <= 1500 ? 1.7
      : engineCc <= 1800 ? 2.5
      : engineCc <= 2300 ? 2.7
      : engineCc <= 3000 ? 3.0
      : 3.6
    const dutyByVolume = engineCc * eurPerCc * CUSTOMS_EUR_RATE
    const dutyByValue = priceEur * 0.154 * CUSTOMS_EUR_RATE
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
    const dutyByVolume = engineCc * eurPerCc * CUSTOMS_EUR_RATE
    const dutyByValue = priceEur * 0.2 * CUSTOMS_EUR_RATE
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
    const month = Number(body.month) || 6
    const brand = body.brand ?? ''
    const model = body.model ?? ''
    const badgeDetail = body.badge_detail ?? ''
    const country = body.country ?? 'RU'

    // Получаем актуальный курс ЦБ
    const krwRate = await getKrwRate()

    const verifiedPowerHp = await getVerifiedPowerHp({
      brand,
      model,
      badgeDetail,
      fuelType: body.fuel_type ?? '',
      engineCc,
      year,
    })

    // Verified vehicle_specs overrides stale car.power_hp values.
    const powerHp =
      verifiedPowerHp ??
      (Number(body.power_hp) > 0
        ? Number(body.power_hp)
        : getPowerHp(brand, model, engineCc, badgeDetail))

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
        year,
        month,
      )
      // Утиль
      const utilRub = getUtilSbor(powerHp, engineCc, year, month)

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
