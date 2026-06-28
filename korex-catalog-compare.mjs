import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "fs";

config({ path: ".env.local", quiet: true });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const calcApiUrl = process.env.CALC_API_URL ?? "http://localhost:3010/api/calculate";
const country = process.env.COMPARE_COUNTRY ?? "RU";
const limit = Number(process.env.COMPARE_LIMIT) || 0;
const delayMs = Number(process.env.KOREX_DELAY_MS) || 80;

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

if (!supabaseUrl || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseNum(value) {
  if (!value) return null;
  const parsed = Number.parseInt(String(value).replace(/[^\d]/g, ""), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function regMonth(value) {
  const month = Number.parseInt(String(value ?? "").split(".")[0], 10);
  return month >= 1 && month <= 12 ? month : 6;
}

function fuelCode(value) {
  const text = String(value ?? "").toLowerCase();
  if (text.includes("디젤") || text.includes("diesel")) return "d";
  return "b";
}

function deltaPercent(actual, expected) {
  if (!expected) return null;
  return Number((((actual - expected) / expected) * 100).toFixed(4));
}

function statusByDelta(delta) {
  if (delta === null) return "checked";
  const abs = Math.abs(delta);
  if (abs <= 2) return "pass";
  if (abs <= 5) return "warn";
  if (abs <= 10) return "fail";
  return "critical";
}

function parseKorexHtml(html) {
  const total = parseNum(html.match(/js-calc-full-price-top[^>]*>\s*([\d\s]+)/)?.[1]);
  const priceRub = parseNum(html.match(/js-calc-price-ru[^>]*>([\d\s]+)/)?.[1]);
  const duty = parseNum(html.match(/js-calc-full-duty[^>]*>([\d\s]+)/)?.[1]);
  const fees = parseNum(html.match(/js-calc-full-fees[^>]*>([\d\s]+)/)?.[1]);
  const util = parseNum(html.match(/js-calc-util[^>]*>([\d\s]+)/)?.[1]);
  const rate1000Raw = html.match(/1000₩ - ([\d,]+)/)?.[1] ?? null;
  const rateKrwRub = rate1000Raw
    ? Number.parseFloat(rate1000Raw.replace(",", ".")) / 1000
    : null;

  const known = [priceRub, duty, fees, util].reduce(
    (sum, value) => sum + (Number.isFinite(value) ? value : 0),
    0,
  );
  const other = total && known ? total - known : null;

  return {
    total_rub: total,
    car_price_rub: priceRub,
    duty_rub: duty,
    fees_rub: fees,
    util_rub: util,
    other_rub: other,
    rate_krw_rub: rateKrwRub,
  };
}

async function fetchCars() {
  const rows = [];
  let from = 0;
  const pageSize = 1000;

  while (true) {
    let query = supabase
      .from("cars")
      .select(
        [
          "id",
          "encar_id",
          "brand",
          "model",
          "year",
          "first_registration_korea",
          "engine_cc",
          "power_hp",
          "power_verified",
          "power_source",
          "fuel_type",
          "badge",
          "badge_detail",
          "price_krw",
          "is_available",
          "raw_url",
        ].join(","),
      )
      .eq("is_available", true)
      .order("created_at", { ascending: false })
      .range(from, from + pageSize - 1);

    if (limit > 0) query = query.limit(limit);

    const { data, error } = await query;
    if (error) throw error;
    rows.push(...(data ?? []));
    if (limit > 0 || !data || data.length < pageSize) break;
    from += pageSize;
  }

  return rows;
}

async function fetchOurCalc(car) {
  const res = await fetch(calcApiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      price_krw: car.price_krw,
      year: car.year,
      month: regMonth(car.first_registration_korea),
      engine_cc: car.engine_cc,
      power_hp: car.power_hp ?? 0,
      brand: car.brand ?? "",
      model: car.model ?? "",
      badge_detail: car.badge_detail ?? "",
      fuel_type: car.fuel_type ?? "",
      country,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`our calculator HTTP ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  return {
    ...data,
    other_rub:
      (data.total_rub ?? 0) -
      (data.car_price_rub ?? 0) -
      (data.duty_rub ?? 0) -
      (data.fees_rub ?? 0) -
      (data.util_rub ?? 0),
  };
}

async function withRetry(label, fn, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < attempts) {
        await sleep(250 * attempt);
      }
    }
  }
  throw new Error(`${label}: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

async function fetchKorexCalc(car) {
  const params = new URLSearchParams({
    price: String(car.price_krw ?? 0),
    year: String(car.year ?? new Date().getFullYear()),
    month: String(regMonth(car.first_registration_korea)),
    v: String(car.engine_cc ?? 0),
    powerDVS: String(car.power_hp ?? 0),
    p: String(car.power_hp ?? 0),
    fiz: "1",
    currency: "KRW",
    sanction: "1",
    strategy: "auto_koreya",
    html: "1",
    m: fuelCode(car.fuel_type),
  });

  const res = await withRetry("Korex fetch", () =>
    fetch(KOREX_URL, {
      method: "POST",
      headers,
      body: params.toString(),
    }),
  );

  if (!res.ok) throw new Error(`Korex HTTP ${res.status}`);
  return parseKorexHtml(await res.text());
}

function componentDeltas(ours, korex) {
  return {
    total: (ours.total_rub ?? 0) - (korex.total_rub ?? 0),
    car_price: (ours.car_price_rub ?? 0) - (korex.car_price_rub ?? 0),
    duty: (ours.duty_rub ?? 0) - (korex.duty_rub ?? 0),
    fees: (ours.fees_rub ?? 0) - (korex.fees_rub ?? 0),
    util: (ours.util_rub ?? 0) - (korex.util_rub ?? 0),
    other: (ours.other_rub ?? 0) - (korex.other_rub ?? 0),
  };
}

function likelyReason(deltas) {
  const entries = Object.entries({
    duty_delta: deltas.duty,
    util_delta: deltas.util,
    other_fixed_cost_delta: deltas.other,
    car_price_rate_delta: deltas.car_price,
    fees_delta: deltas.fees,
  }).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));

  return entries[0]?.[0] ?? "unknown";
}

async function main() {
  console.log(`Korex catalog compare: ${country}`);
  console.log(`Our API: ${calcApiUrl}`);
  const cars = await fetchCars();
  console.log(`Loaded cars: ${cars.length}`);

  const rows = [];
  const statusCounts = { pass: 0, warn: 0, fail: 0, critical: 0, error: 0 };
  const reasonCounts = {};

  for (let i = 0; i < cars.length; i += 1) {
    const car = cars[i];
    try {
      const [ours, korex] = await Promise.all([fetchOurCalc(car), fetchKorexCalc(car)]);
      const deltaRub = (ours.total_rub ?? 0) - (korex.total_rub ?? 0);
      const deltaPct = deltaPercent(ours.total_rub, korex.total_rub);
      const status = statusByDelta(deltaPct);
      const deltas = componentDeltas(ours, korex);
      const reason = likelyReason(deltas);

      statusCounts[status] = (statusCounts[status] ?? 0) + 1;
      reasonCounts[reason] = (reasonCounts[reason] ?? 0) + 1;

      rows.push({
        encar_id: car.encar_id,
        car: `${car.brand} ${car.model} ${car.year}`,
        brand: car.brand,
        model: car.model,
        year: car.year,
        month: regMonth(car.first_registration_korea),
        price_krw: car.price_krw,
        engine_cc: car.engine_cc,
        power_hp: ours.power_hp ?? car.power_hp,
        db_power_hp: car.power_hp,
        power_verified: car.power_verified,
        fuel_type: car.fuel_type,
        badge_detail: car.badge_detail,
        status,
        reason,
        delta_rub: deltaRub,
        delta_percent: deltaPct,
        ours,
        korex,
        deltas,
      });
    } catch (err) {
      statusCounts.error += 1;
      rows.push({
        encar_id: car.encar_id,
        car: `${car.brand} ${car.model} ${car.year}`,
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      });
    }

    if ((i + 1) % 25 === 0 || i + 1 === cars.length) {
      console.log(`Compared ${i + 1}/${cars.length}`);
    }

    await sleep(delayMs);
  }

  const sortedByDelta = [...rows]
    .filter((row) => typeof row.delta_percent === "number")
    .sort((a, b) => Math.abs(b.delta_percent) - Math.abs(a.delta_percent));

  const report = {
    generated_at: new Date().toISOString(),
    country,
    calcApiUrl,
    total: rows.length,
    statusCounts,
    reasonCounts,
    max_abs_delta_percent: sortedByDelta[0]?.delta_percent ?? null,
    top_deltas: sortedByDelta.slice(0, 50),
    rows,
  };

  writeFileSync("korex-catalog-compare-results.json", JSON.stringify(report, null, 2));

  console.log("\nSummary:");
  console.log(statusCounts);
  console.log("reasonCounts:", reasonCounts);
  console.log("\nTop deltas:");
  console.table(
    sortedByDelta.slice(0, 20).map((row) => ({
      encar_id: row.encar_id,
      car: row.car,
      status: row.status,
      delta_percent: row.delta_percent,
      delta_rub: row.delta_rub,
      reason: row.reason,
      ours_total: row.ours.total_rub,
      korex_total: row.korex.total_rub,
      power_hp: row.power_hp,
      engine_cc: row.engine_cc,
      age: row.ours.car_age_years,
      duty_delta: row.deltas.duty,
      util_delta: row.deltas.util,
      other_delta: row.deltas.other,
    })),
  );

  console.log("\nSaved korex-catalog-compare-results.json");

  if (statusCounts.error || statusCounts.fail || statusCounts.critical) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
