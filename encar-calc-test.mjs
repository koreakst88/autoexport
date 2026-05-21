import { config } from 'dotenv'

config({ path: '.env.local' })

// Тестовые данные — Hyundai Palisade 2021
const params = new URLSearchParams({
  price: '28900000', // цена в вонах
  year: '2021', // год
  month: '7', // месяц
  v: '2199', // объём cc
  powerDVS: '202', // мощность л.с.
  p: '202',
  fiz: '1', // физлицо
  currency: 'KRW',
  sanction: '1',
  strategy: 'auto_koreya',
  html: '1',
  m: 'b', // бензин
})

const res = await fetch(
  'https://korex-auto.com/netcat/modules/default/classes/calculator/actions/calculate.php',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      Origin: 'https://korex-auto.com',
      Referer: 'https://korex-auto.com/korea/',
      'X-Requested-With': 'XMLHttpRequest',
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    },
    body: params.toString(),
  },
)

console.log('HTTP статус:', res.status)

if (res.ok) {
  const html = await res.text()

  // Парсим ключевые цифры из HTML
  const totalMatch = html.match(/js-calc-full-price-top[^>]*>\s*([\d\s]+)/)
  const utilMatch = html.match(/js-calc-util[^>]*>([\d\s]+)/)
  const dutyMatch = html.match(/js-calc-full-duty[^>]*>([\d\s]+)/)
  const rateMatch = html.match(/1000₩ - ([\d,]+)/)
  const priceRuMatch = html.match(/js-calc-price-ru[^>]*>([\d\s]+)/)

  console.log('\n✅ Результат:')
  console.log('Курс 1000₩:', rateMatch?.[1], '₽')
  console.log('Авто в рублях:', priceRuMatch?.[1]?.trim(), '₽')
  console.log('Таможенная пошлина:', dutyMatch?.[1]?.trim(), '₽')
  console.log('Утилизационный сбор:', utilMatch?.[1]?.trim(), '₽')
  console.log('ИТОГО:', totalMatch?.[1]?.trim(), '₽')
} else {
  console.log('❌ Ошибка:', res.status)
}
