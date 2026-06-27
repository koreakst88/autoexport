const POWERS = [90, 150, 200, 300, 400]
const TESTS = [
  { year: 2024, month: 1, label: 'НОВЫЕ (<3 лет)' },
  { year: 2021, month: 1, label: 'СРЕДНИЕ (3-5 лет)' },
  { year: 2019, month: 1, label: 'СТАРЫЕ (5+ лет)' },
]

const headers = {
  'Origin': 'https://korex-auto.com',
  'Referer': 'https://korex-auto.com/korea/',
  'X-Requested-With': 'XMLHttpRequest',
  'Content-Type': 'application/x-www-form-urlencoded',
}

for (const test of TESTS) {
  console.log(`\n=== ${test.label} (${test.year}) ===`)
  for (const power of POWERS) {
    const params = new URLSearchParams({
      price: '20000000', year: String(test.year), month: String(test.month),
      v: '2000', powerDVS: String(power), p: String(power),
      fiz: '1', currency: 'KRW', sanction: '1',
      strategy: 'auto_koreya', html: '1', m: 'b'
    })
    const res = await fetch('https://korex-auto.com/netcat/modules/default/classes/calculator/actions/calculate.php', {
      method: 'POST', headers, body: params.toString()
    })
    const html = await res.text()
    const match = html.match(/20000 руб\. x ([\d.]+)/)
    const util = html.match(/js-calc-util[^>]*>([\d\s]+)/)
    console.log(`  ${power} л.с. → коэф: ${match?.[1] ?? '?'} → утиль: ${util?.[1]?.trim() ?? '?'} ₽`)
    await new Promise(r => setTimeout(r, 800))
  }
}
