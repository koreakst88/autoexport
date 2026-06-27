import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local", quiet: true });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const calcApiUrl =
  process.env.CALC_API_URL ??
  `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/calculate`;
const auditSource = process.env.AUDIT_SOURCE;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

function deltaPercent(actual, expected) {
  if (!expected) return null;
  return Number((((actual - expected) / expected) * 100).toFixed(4));
}

function auditStatus(delta) {
  if (delta === null) return "checked";
  const abs = Math.abs(delta);
  if (abs <= 1) return "pass";
  if (abs <= 3) return "warn";
  return "fail";
}

async function calculate(testCase) {
  const res = await fetch(calcApiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      price_krw: testCase.price_krw,
      year: testCase.year,
      month: testCase.month,
      engine_cc: testCase.engine_cc,
      power_hp: testCase.power_hp ?? 0,
      brand: testCase.brand ?? "",
      model: testCase.model ?? "",
      badge_detail: testCase.badge_detail ?? "",
      fuel_type: testCase.fuel_type ?? "",
      country: testCase.country_code,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Calculator HTTP ${res.status}: ${text.slice(0, 200)}`);
  }

  return res.json();
}

async function main() {
  console.log(`Calculator API: ${calcApiUrl}`);

  let query = supabase
    .from("calc_audit_cases")
    .select("*")
    .order("id", { ascending: true });

  if (auditSource) {
    query = query.eq("source", auditSource);
  }

  const { data: cases, error } = await query;

  if (error) throw error;
  if (!cases?.length) {
    console.log("No calc_audit_cases found. Add reference cases first.");
    return;
  }

  let passed = 0;
  let warned = 0;
  let failed = 0;

  for (const testCase of cases) {
    try {
      const result = await calculate(testCase);
      const actualTotal = Number(
        testCase.country_code === "RU" ? result.total_rub : result.total_local,
      );
      const expectedTotal = Number(testCase.expected_total_rub);
      const deltaRub = actualTotal - expectedTotal;
      const delta = deltaPercent(actualTotal, expectedTotal);
      const status = auditStatus(delta);

      if (status === "pass") passed += 1;
      else if (status === "warn") warned += 1;
      else if (status === "fail") failed += 1;

      const { error: updateError } = await supabase
        .from("calc_audit_cases")
        .update({
          actual_total_rub: actualTotal,
          actual_result: result,
          delta_rub: deltaRub,
          delta_percent: delta,
          status,
          checked_at: new Date().toISOString(),
        })
        .eq("id", testCase.id);

      if (updateError) throw updateError;

      console.log(
        `${status.toUpperCase()} #${testCase.id} ${testCase.car_name}: expected=${expectedTotal.toLocaleString("ru-RU")} actual=${actualTotal.toLocaleString("ru-RU")} delta=${delta}%`,
      );
    } catch (err) {
      failed += 1;
      const message = err instanceof Error ? err.message : String(err);
      await supabase
        .from("calc_audit_cases")
        .update({
          status: "error",
          notes: message,
          checked_at: new Date().toISOString(),
        })
        .eq("id", testCase.id);
      console.log(`ERROR #${testCase.id} ${testCase.car_name}: ${message}`);
    }
  }

  console.log(`\nDone. pass=${passed}, warn=${warned}, fail/error=${failed}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
