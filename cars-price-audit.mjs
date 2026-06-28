import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "fs";

config({ path: ".env.local", quiet: true });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const calcApiUrl = process.env.CALC_API_URL ?? "http://localhost:3010/api/calculate";
const country = process.env.AUDIT_COUNTRY ?? "RU";
const limit = Number(process.env.AUDIT_LIMIT) || 0;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

function regMonth(value) {
  const month = Number.parseInt(String(value ?? "").split(".")[0], 10);
  return month >= 1 && month <= 12 ? month : 6;
}

function isFinitePositive(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function ageAtClearance(year, month, clearanceIso) {
  if (!year || !clearanceIso) return null;
  const release = new Date(year, month - 1, 15);
  const clearance = new Date(clearanceIso);
  if (Number.isNaN(release.getTime()) || Number.isNaN(clearance.getTime())) return null;
  return (clearance.getTime() - release.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
}

function ageGroup(age) {
  if (age === null) return "unknown";
  if (age < 3) return "under_3";
  if (age <= 5) return "3_to_5";
  return "over_5";
}

async function fetchCars() {
  const rows = [];
  let from = 0;
  const pageSize = 1000;

  while (true) {
    const to = from + pageSize - 1;
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
          "power_note",
          "fuel_type",
          "transmission",
          "badge",
          "badge_detail",
          "price_krw",
          "mileage",
          "is_available",
          "raw_url",
        ].join(","),
      )
      .eq("is_available", true)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (limit > 0) {
      query = query.limit(limit);
    }

    const { data, error } = await query;
    if (error) throw error;
    rows.push(...(data ?? []));
    if (limit > 0 || !data || data.length < pageSize) break;
    from += pageSize;
  }

  return rows;
}

async function calculate(car) {
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
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
  }

  return res.json();
}

function collectIssues(car, calc) {
  const issues = [];
  const warnings = [];

  if (!car.encar_id) issues.push("missing_encar_id");
  if (!car.brand) issues.push("missing_brand");
  if (!car.model) issues.push("missing_model");
  if (!car.year || car.year < 2010 || car.year > new Date().getFullYear() + 1) {
    issues.push("invalid_year");
  }
  if (!isFinitePositive(car.price_krw)) issues.push("missing_price_krw");
  if (!isFinitePositive(car.engine_cc)) issues.push("missing_engine_cc");
  if (!isFinitePositive(car.power_hp)) issues.push("missing_power_hp");
  if (!car.power_verified) issues.push("power_not_verified");
  if (!car.first_registration_korea) issues.push("missing_first_registration_korea");

  if (calc) {
    const total = country === "RU" ? calc.total_rub : calc.total_local;
    if (!isFinitePositive(total)) issues.push("invalid_total");
    if (country === "RU") {
      if (!isFinitePositive(calc.duty_rub)) issues.push("invalid_duty");
      if (!isFinitePositive(calc.util_rub)) issues.push("invalid_util");
      if (!isFinitePositive(calc.power_hp)) issues.push("invalid_calc_power");

      const carRub = calc.car_price_rub || 0;
      if (total > 0 && carRub > 0) {
      const ratio = total / carRub;
        if (ratio < 1.5) warnings.push("low_total_to_car_price_ratio");
        if (ratio > 8) warnings.push("high_total_to_car_price_ratio");
      }
    }
  }

  return { issues, warnings };
}

function topBy(rows, field, count = 10) {
  return [...rows]
    .sort((a, b) => (b[field] ?? 0) - (a[field] ?? 0))
    .slice(0, count)
    .map((row) => ({
      encar_id: row.encar_id,
      car: `${row.brand} ${row.model} ${row.year}`,
      price_krw: row.price_krw,
      engine_cc: row.engine_cc,
      power_hp: row.power_hp,
      total: row.total,
      util_rub: row.util_rub,
      duty_rub: row.duty_rub,
      age_group: row.age_group,
      issues: row.issues,
    }));
}

async function main() {
  console.log(`Cars price audit: ${country} via ${calcApiUrl}`);
  const cars = await fetchCars();
  console.log(`Loaded cars: ${cars.length}`);

  const results = [];
  const issueCounts = {};
  const warningCounts = {};
  const ageGroups = {};
  let checked = 0;
  let errors = 0;

  for (const car of cars) {
    try {
      const calc = await calculate(car);
      checked += 1;

      const month = regMonth(car.first_registration_korea);
      const age = ageAtClearance(car.year, month, calc.estimated_clearance_date);
      const group = ageGroup(age);
      ageGroups[group] = (ageGroups[group] ?? 0) + 1;

      const { issues, warnings } = collectIssues(car, calc);
      for (const issue of issues) issueCounts[issue] = (issueCounts[issue] ?? 0) + 1;
      for (const warning of warnings) warningCounts[warning] = (warningCounts[warning] ?? 0) + 1;

      results.push({
        id: car.id,
        encar_id: car.encar_id,
        brand: car.brand,
        model: car.model,
        year: car.year,
        month,
        first_registration_korea: car.first_registration_korea,
        price_krw: car.price_krw,
        engine_cc: car.engine_cc,
        power_hp: calc.power_hp ?? car.power_hp,
        db_power_hp: car.power_hp,
        power_verified: car.power_verified,
        power_source: car.power_source,
        fuel_type: car.fuel_type,
        badge: car.badge,
        badge_detail: car.badge_detail,
        total: country === "RU" ? calc.total_rub : calc.total_local,
        car_price_rub: calc.car_price_rub,
        duty_rub: calc.duty_rub,
        fees_rub: calc.fees_rub,
        util_rub: calc.util_rub,
        freight_rub: calc.freight_rub,
        broker_rub: calc.broker_rub,
        rate_krw_rub: calc.rate_krw_rub,
        estimated_clearance_date: calc.estimated_clearance_date,
        car_age_years: age === null ? null : Number(age.toFixed(3)),
        age_group: group,
        issues,
        warnings,
      });
    } catch (err) {
      errors += 1;
      const message = err instanceof Error ? err.message : String(err);
      issueCounts.calc_error = (issueCounts.calc_error ?? 0) + 1;
      results.push({
        id: car.id,
        encar_id: car.encar_id,
        brand: car.brand,
        model: car.model,
        year: car.year,
        issues: ["calc_error"],
        warnings: [],
        error: message,
      });
      console.log(`ERROR ${car.encar_id}: ${message}`);
    }
  }

  const clean = results.filter((row) => row.issues.length === 0).length;
  const problematic = results.filter((row) => row.issues.length > 0);
  const warned = results.filter((row) => row.warnings.length > 0);
  const verified = results.filter((row) => row.power_verified).length;
  const totals = results.map((row) => row.total).filter(isFinitePositive);
  const avgTotal = totals.length
    ? Math.round(totals.reduce((sum, value) => sum + value, 0) / totals.length)
    : 0;

  const report = {
    generated_at: new Date().toISOString(),
    country,
    calcApiUrl,
    total_cars: cars.length,
    checked,
    errors,
    clean,
    problematic: problematic.length,
    warned: warned.length,
    power_verified: verified,
    power_not_verified: results.length - verified,
    average_total: avgTotal,
    issueCounts,
    warningCounts,
    ageGroups,
    top_expensive: topBy(results.filter((row) => row.total), "total"),
    top_util: topBy(results.filter((row) => row.util_rub), "util_rub"),
    top_duty: topBy(results.filter((row) => row.duty_rub), "duty_rub"),
    problematic_cars: problematic.slice(0, 100).map((row) => ({
      encar_id: row.encar_id,
      car: `${row.brand} ${row.model} ${row.year}`,
      engine_cc: row.engine_cc,
      power_hp: row.power_hp,
      price_krw: row.price_krw,
      issues: row.issues,
      error: row.error,
    })),
    warned_cars: warned.slice(0, 100).map((row) => ({
      encar_id: row.encar_id,
      car: `${row.brand} ${row.model} ${row.year}`,
      engine_cc: row.engine_cc,
      power_hp: row.power_hp,
      price_krw: row.price_krw,
      total: row.total,
      warnings: row.warnings,
    })),
    results,
  };

  writeFileSync("cars-price-audit-results.json", JSON.stringify(report, null, 2));

  console.log("\nSummary:");
  console.log({
    total_cars: report.total_cars,
    checked: report.checked,
    errors: report.errors,
    clean: report.clean,
    problematic: report.problematic,
    warned: report.warned,
    power_verified: report.power_verified,
    power_not_verified: report.power_not_verified,
    average_total: report.average_total,
  });
  console.log("issueCounts:", issueCounts);
  console.log("warningCounts:", warningCounts);
  console.log("ageGroups:", ageGroups);
  console.log("\nTop problematic:");
  console.table(report.problematic_cars.slice(0, 20));
  console.log("\nTop warnings:");
  console.table(report.warned_cars.slice(0, 20));
  console.log("\nTop util:");
  console.table(report.top_util.slice(0, 10));
  console.log("\nSaved cars-price-audit-results.json");

  if (errors > 0 || problematic.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
