import { config } from "dotenv";
import { createHash } from "crypto";
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local", quiet: true });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const htmlFile = process.env.KOREX_HTML_FILE ?? "korex-post-result.html";
const limit = Number(process.env.KOREX_IMPORT_LIMIT ?? 10);

if (!supabaseUrl || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

function parseNum(value) {
  if (!value) return null;
  const num = parseInt(String(value).replace(/[^\d]/g, ""), 10);
  return Number.isFinite(num) ? num : null;
}

function parseKorexCalcHtml(html) {
  const totalMatch = html.match(/js-calc-full-price-top[^>]*>\s*([\d\s]+)/);
  const utilMatch = html.match(/js-calc-util[^>]*>([\d\s]+)/);
  const dutyMatch = html.match(/js-calc-full-duty[^>]*>([\d\s]+)/);
  const feesMatch = html.match(/js-calc-full-fees[^>]*>([\d\s]+)/);
  const priceRuMatch = html.match(/js-calc-price-ru[^>]*>([\d\s]+)/);
  const rateMatch = html.match(/1000₩ - ([\d,]+)/);

  return {
    expected_total_rub: parseNum(totalMatch?.[1]),
    expected_util_rub: parseNum(utilMatch?.[1]),
    expected_customs_duty_rub: parseNum(dutyMatch?.[1]),
    expected_customs_fee_rub: parseNum(feesMatch?.[1]),
    expected_car_price_rub: parseNum(priceRuMatch?.[1]),
    rate_1000_krw_rub: rateMatch?.[1] ? Number(rateMatch[1].replace(",", ".")) : null,
  };
}

function getBrandModel(carName) {
  const text = String(carName ?? "").trim();
  if (!text) return { brand: null, model: null };

  const knownBrands = [
    "Mercedes-Benz",
    "Renault Korea",
    "Hyundai",
    "Genesis",
    "Kia",
    "BMW",
    "Toyota",
    "Volkswagen",
  ];

  const brand = knownBrands.find((item) => text.startsWith(item)) ?? text.split(" ")[0];
  const rest = text.replace(brand, "").trim();
  const model = rest.split(/\s+/)[0] || null;
  return { brand, model };
}

function getFuelType(params) {
  const m = params.get("m");
  if (m === "d") return "diesel";
  if (m === "e") return "electric";
  return "gasoline";
}

async function fetchKorexCalculation(params) {
  const res = await fetch(
    "https://korex-auto.com/netcat/modules/default/classes/calculator/actions/calculate.php",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Origin: "https://korex-auto.com",
        Referer: "https://korex-auto.com/korea/",
        "X-Requested-With": "XMLHttpRequest",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
      body: params.toString(),
    },
  );

  if (!res.ok) {
    throw new Error(`Korex HTTP ${res.status}`);
  }

  return res.text();
}

async function main() {
  const html = readFileSync(htmlFile, "utf-8");
  const attrs = [...html.matchAll(/data-calc="([^"]+)"/g)]
    .map((match) => match[1].replaceAll("&amp;", "&"))
    .slice(0, limit);

  if (!attrs.length) {
    console.log(`No data-calc attributes found in ${htmlFile}`);
    return;
  }

  let imported = 0;
  let updated = 0;
  let skipped = 0;

  for (const attr of attrs) {
    const params = new URLSearchParams(attr);
    const carName = params.get("car") ?? "Korex car";
    const priceKrw = parseNum(params.get("price"));
    const year = parseNum(params.get("year"));
    const month = parseNum(params.get("month")) ?? 6;
    const engineCc = parseNum(params.get("v"));
    const powerHp = parseNum(params.get("p")) ?? parseNum(params.get("powerDVS"));
    const badgeDetail = carName.replace(/\s*\d{4}.*/, "").trim();
    const { brand, model } = getBrandModel(carName);

    if (!priceKrw || !year || !engineCc || !powerHp) {
      skipped += 1;
      console.log(`SKIP ${carName}: missing input data`);
      continue;
    }

    const calcHtml = await fetchKorexCalculation(params);
    const parsed = parseKorexCalcHtml(calcHtml);

    if (!parsed.expected_total_rub) {
      skipped += 1;
      console.log(`SKIP ${carName}: total not parsed`);
      continue;
    }

    const sourceHash = createHash("sha1").update(attr).digest("hex").slice(0, 16);
    const sourceUrl = `korex:data-calc:${sourceHash}`;

    const payload = {
      source: "korex",
      source_url: sourceUrl,
      car_name: carName,
      country_code: "RU",
      importer_type: "individual",
      price_krw: priceKrw,
      year,
      month,
      engine_cc: engineCc,
      power_hp: powerHp,
      brand,
      model,
      badge_detail: badgeDetail,
      fuel_type: getFuelType(params),
      expected_car_price_rub: parsed.expected_car_price_rub,
      expected_customs_duty_rub: parsed.expected_customs_duty_rub,
      expected_customs_fee_rub: parsed.expected_customs_fee_rub,
      expected_util_rub: parsed.expected_util_rub,
      expected_total_rub: parsed.expected_total_rub,
      status: "pending",
      notes: `Imported from Korex calculator. Korex rate 1000 KRW = ${parsed.rate_1000_krw_rub ?? "unknown"} RUB`,
    };

    const { data: existing, error: existingError } = await supabase
      .from("calc_audit_cases")
      .select("id")
      .eq("source", "korex")
      .eq("source_url", sourceUrl)
      .maybeSingle();

    if (existingError) throw existingError;

    const query = existing
      ? supabase.from("calc_audit_cases").update(payload).eq("id", existing.id)
      : supabase.from("calc_audit_cases").insert(payload);

    const { error } = await query;
    if (error) throw error;

    if (existing) updated += 1;
    else imported += 1;

    console.log(
      `${existing ? "UPDATE" : "ADD"} ${carName}: total=${parsed.expected_total_rub.toLocaleString("ru-RU")} ₽ util=${parsed.expected_util_rub?.toLocaleString("ru-RU") ?? "?"} ₽ power=${powerHp}`,
    );

    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  console.log(`\nDone. imported=${imported}, updated=${updated}, skipped=${skipped}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
