import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local", quiet: true });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const calcApiUrl =
  process.env.CALC_API_URL ??
  `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/calculate`;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

function getMonth(firstRegistrationKorea) {
  if (!firstRegistrationKorea) return 6;
  const month = parseInt(String(firstRegistrationKorea).split(".")[0], 10);
  return month >= 1 && month <= 12 ? month : 6;
}

async function calculate(car) {
  const res = await fetch(calcApiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      price_krw: car.price_krw,
      year: car.year,
      month: getMonth(car.first_registration_korea),
      engine_cc: car.engine_cc,
      power_hp: car.power_hp ?? 0,
      brand: car.brand ?? "",
      model: car.model ?? "",
      badge_detail: car.badge_detail ?? "",
      fuel_type: car.fuel_type ?? "",
      country: "RU",
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

  const { data: cars, error } = await supabase
    .from("cars")
    .select(
      "encar_id, brand, model, year, first_registration_korea, engine_cc, power_hp, fuel_type, badge_detail, price_krw",
    )
    .eq("is_available", true)
    .not("price_krw", "is", null)
    .not("engine_cc", "is", null)
    .not("year", "is", null)
    .limit(5);

  if (error) throw error;
  if (!cars?.length) {
    console.log("No suitable cars found.");
    return;
  }

  let inserted = 0;
  let skipped = 0;

  for (const car of cars) {
    const { data: existing, error: existingError } = await supabase
      .from("calc_audit_cases")
      .select("id")
      .eq("source", "autoexport-baseline")
      .eq("car_encar_id", car.encar_id)
      .maybeSingle();

    if (existingError) throw existingError;
    const result = await calculate(car);
    const expectedTotal = Number(result.total_rub);
    const month = getMonth(car.first_registration_korea);
    const payload = {
      source: "autoexport-baseline",
      source_url: car.encar_id
        ? `https://www.encar.com/dc/dc_cardetailview.do?carid=${car.encar_id}`
        : null,
      car_name: `${car.brand ?? ""} ${car.model ?? ""} ${car.year ?? ""}`.trim(),
      car_encar_id: car.encar_id,
      country_code: "RU",
      importer_type: "individual",
      price_krw: car.price_krw,
      year: car.year,
      month,
      engine_cc: car.engine_cc,
      power_hp: result.power_hp ?? car.power_hp,
      brand: car.brand,
      model: car.model,
      badge_detail: car.badge_detail,
      fuel_type: car.fuel_type,
      expected_car_price_rub: result.car_price_rub,
      expected_customs_duty_rub: result.duty_rub,
      expected_customs_fee_rub: result.fees_rub,
      expected_util_rub: result.util_rub,
      expected_freight_rub: result.freight_rub,
      expected_broker_rub: result.broker_rub,
      expected_total_rub: expectedTotal,
      status: "baseline",
      notes: "Generated from current AutoExport calculator. Replace expected values with Korex/broker reference when available.",
    };

    const query = existing
      ? supabase.from("calc_audit_cases").update(payload).eq("id", existing.id)
      : supabase.from("calc_audit_cases").insert(payload);

    const { error: writeError } = await query;

    if (writeError) throw writeError;
    if (existing) skipped += 1;
    else inserted += 1;
    console.log(
      `${existing ? "REFRESH" : "ADD"} ${car.encar_id} ${car.brand} ${car.model}: total=${expectedTotal.toLocaleString("ru-RU")} ₽ power=${result.power_hp}`,
    );
  }

  console.log(`\nDone. inserted=${inserted}, refreshed=${skipped}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
