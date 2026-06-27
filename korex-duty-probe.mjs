import { writeFileSync } from "fs";

const KOREX_URL =
  "https://korex-auto.com/netcat/modules/default/classes/calculator/actions/calculate.php";

const headers = {
  "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
  Origin: "https://korex-auto.com",
  Referer: "https://korex-auto.com/korea/",
  "X-Requested-With": "XMLHttpRequest",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
};

const KRW_RATE = 0.049868;
const EUR_RATES_TO_TEST = [78.5, 86, 90, 92, 95, 100];

function parseNum(value) {
  if (!value) return null;
  const parsed = Number.parseInt(String(value).replace(/[^\d]/g, ""), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseCalcHtml(html) {
  return {
    total: parseNum(html.match(/js-calc-full-price-top[^>]*>\s*([\d\s]+)/)?.[1]),
    duty: parseNum(html.match(/js-calc-full-duty[^>]*>([\d\s]+)/)?.[1]),
    fees: parseNum(html.match(/js-calc-full-fees[^>]*>([\d\s]+)/)?.[1]),
    util: parseNum(html.match(/js-calc-util[^>]*>([\d\s]+)/)?.[1]),
    priceRub: parseNum(html.match(/js-calc-price-ru[^>]*>([\d\s]+)/)?.[1]),
    rate1000: html.match(/1000₩ - ([\d,]+)/)?.[1] ?? null,
  };
}

async function fetchKorex({ priceKrw, year, month, engineCc, powerHp, fuel = "b" }) {
  const params = new URLSearchParams({
    price: String(priceKrw),
    year: String(year),
    month: String(month),
    v: String(engineCc),
    powerDVS: String(powerHp),
    p: String(powerHp),
    fiz: "1",
    currency: "KRW",
    sanction: "1",
    strategy: "auto_koreya",
    html: "1",
    m: fuel,
  });

  const res = await fetch(KOREX_URL, {
    method: "POST",
    headers,
    body: params.toString(),
  });

  if (!res.ok) {
    throw new Error(`Korex HTTP ${res.status}`);
  }

  return parseCalcHtml(await res.text());
}

function eurPerCcByAge(engineCc, ageGroup) {
  if (ageGroup === "new") return engineCc <= 1000 ? 2.5 : 3.5;
  if (ageGroup === "old") {
    if (engineCc <= 1000) return 3.0;
    if (engineCc <= 1500) return 3.2;
    if (engineCc <= 1800) return 3.5;
    if (engineCc <= 2300) return 4.8;
    if (engineCc <= 3000) return 5.0;
    return 5.7;
  }
  if (engineCc <= 1000) return 1.5;
  if (engineCc <= 1500) return 1.7;
  if (engineCc <= 1800) return 2.5;
  if (engineCc <= 2300) return 2.7;
  if (engineCc <= 3000) return 3.0;
  return 3.6;
}

function ageGroup(year, month) {
  const now = new Date();
  const reg = new Date(year, month - 1, 1);
  const age = (now.getTime() - reg.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  if (age < 3) return "new";
  if (age <= 5) return "middle";
  return "old";
}

function fitDuty(row) {
  const group = ageGroup(row.year, row.month);
  const eurPerCc = eurPerCcByAge(row.engineCc, group);
  const byVolumeEur = row.engineCc * eurPerCc;
  const priceRub = row.priceKrw * KRW_RATE;
  const fits = EUR_RATES_TO_TEST.map((eurRate) => {
    const byVolume = Math.round(byVolumeEur * eurRate);
    const byValue = Math.round(priceRub * (group === "new" ? 0.48 : group === "old" ? 0.2 : 0.154));
    const predicted = Math.max(byVolume, byValue);
    return {
      eurRate,
      predicted,
      delta: predicted - row.korex.duty,
      byVolume,
      byValue,
      mode: byVolume >= byValue ? "volume" : "value",
    };
  }).sort((a, b) => Math.abs(a.delta) - Math.abs(b.delta));

  const impliedEurRate = row.korex.duty / byVolumeEur;
  return {
    group,
    eurPerCc,
    byVolumeEur,
    impliedEurRate: Number(impliedEurRate.toFixed(4)),
    best: fits[0],
  };
}

const cases = [
  // Current audit cases with notable duty deltas.
  { label: "Mohave 2021", priceKrw: 36210000, year: 2021, month: 1, engineCc: 2959, powerHp: 257, fuel: "d" },
  { label: "Palisade 2021", priceKrw: 28900000, year: 2021, month: 7, engineCc: 2199, powerHp: 202, fuel: "d" },
  { label: "SantaFe 2021", priceKrw: 36990000, year: 2021, month: 1, engineCc: 2151, powerHp: 198, fuel: "d" },
  { label: "Sorento 2021", priceKrw: 19900000, year: 2021, month: 1, engineCc: 1598, powerHp: 198, fuel: "b" },
  { label: "Carnival 2021", priceKrw: 44390000, year: 2021, month: 1, engineCc: 3470, powerHp: 293, fuel: "b" },
  { label: "Avante 2021", priceKrw: 16900000, year: 2021, month: 1, engineCc: 1598, powerHp: 204, fuel: "b" },

  // Controlled matrix for 3-5 years.
  { label: "matrix 1598 low", priceKrw: 16000000, year: 2021, month: 1, engineCc: 1598, powerHp: 180, fuel: "b" },
  { label: "matrix 1998 mid", priceKrw: 26000000, year: 2021, month: 1, engineCc: 1998, powerHp: 252, fuel: "b" },
  { label: "matrix 2497 mid", priceKrw: 26000000, year: 2021, month: 1, engineCc: 2497, powerHp: 304, fuel: "b" },
  { label: "matrix 3470 high", priceKrw: 26000000, year: 2021, month: 1, engineCc: 3470, powerHp: 294, fuel: "b" },
];

const rows = [];

for (const item of cases) {
  const korex = await fetchKorex(item);
  const row = { ...item, korex };
  const fit = fitDuty(row);
  rows.push({ ...row, fit });
  console.log(
    `${item.label}: duty=${korex.duty?.toLocaleString("ru-RU")} impliedEUR=${fit.impliedEurRate} best=${fit.best.eurRate} delta=${fit.best.delta}`,
  );
  await new Promise((resolve) => setTimeout(resolve, 400));
}

writeFileSync("korex-duty-probe-results.json", JSON.stringify(rows, null, 2));
console.log("\nSaved korex-duty-probe-results.json");

console.table(
  rows.map((row) => ({
    label: row.label,
    cc: row.engineCc,
    group: row.fit.group,
    duty: row.korex.duty,
    impliedEur: row.fit.impliedEurRate,
    bestRate: row.fit.best.eurRate,
    bestDelta: row.fit.best.delta,
    mode: row.fit.best.mode,
  })),
);
