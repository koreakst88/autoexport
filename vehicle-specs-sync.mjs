import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local", quiet: true });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

function normalizeText(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeFuel(value) {
  const text = normalizeText(value);
  if (!text) return "";
  if (text.includes("디젤") || text.includes("diesel")) return "diesel";
  if (text.includes("lpg") || text.includes("lpi") || text.includes("lpe")) return "lpg";
  if (text.includes("하이브리드") || text.includes("hybrid") || text.includes("hev")) return "hybrid";
  if (text.includes("가솔린+전기")) return "hybrid";
  if (text.includes("전기") || text.includes("electric")) return "electric";
  if (text.includes("가솔린") || text.includes("gasoline")) return "gasoline";
  return text;
}

function inferDriveType(value) {
  const text = normalizeText(value);
  if (text.includes("4wd") || text.includes("awd")) return "AWD";
  if (text.includes("2wd")) return "2WD";
  if (text.includes("fwd")) return "FWD";
  if (text.includes("rwd")) return "RWD";
  return null;
}

function normalizeDrive(value) {
  const text = normalizeText(value);
  if (!text) return "";
  if (text === "4wd" || text === "awd") return "awd";
  return text;
}

function specKey(spec) {
  return [
    normalizeText(spec.brand),
    normalizeText(spec.model),
    normalizeText(spec.badge_detail),
    normalizeFuel(spec.fuel_type),
    Number(spec.engine_cc) || 0,
    normalizeDrive(spec.drive_type),
    spec.year_from ?? "",
    spec.year_to ?? "",
  ].join("|");
}

const VERIFIED_SPECS = [
  // Genesis G80
  { brand: "Genesis", model: "G80", badge_detail: "Gasoline 2.5 Turbo AWD", fuel_type: "gasoline", engine_cc: 2497, drive_type: "AWD", power_hp: 304, source: "manual_specs_seed", notes: "Genesis G80 2.5T" },
  { brand: "Genesis", model: "G80", badge_detail: "Gasoline 2.5 Turbo 2WD", fuel_type: "gasoline", engine_cc: 2497, drive_type: "2WD", power_hp: 304, source: "manual_specs_seed", notes: "Genesis G80 2.5T" },
  { brand: "Genesis", model: "G80", badge_detail: "Gasoline 3.5 Turbo AWD", fuel_type: "gasoline", engine_cc: 3470, drive_type: "AWD", power_hp: 380, source: "manual_specs_seed", notes: "Genesis G80 3.5T" },
  { brand: "Genesis", model: "G80", badge_detail: "3.3 GDI AWD", fuel_type: "gasoline", engine_cc: 3342, drive_type: "AWD", power_hp: 282, source: "manual_specs_seed", notes: "Genesis G80 3.3 GDI" },

  // Genesis SUVs
  { brand: "Genesis", model: "GV70", badge_detail: "2.5T Gasoline AWD", fuel_type: "gasoline", engine_cc: 2497, drive_type: "AWD", power_hp: 304, source: "manual_specs_seed" },
  { brand: "Genesis", model: "GV70", badge_detail: "2.2 Diesel 2WD", fuel_type: "diesel", engine_cc: 2151, drive_type: "2WD", power_hp: 202, source: "manual_specs_seed" },
  { brand: "Genesis", model: "GV80", badge_detail: "3.0 Diesel 2WD", fuel_type: "diesel", engine_cc: 2996, drive_type: "2WD", power_hp: 278, source: "manual_specs_seed" },
  { brand: "Genesis", model: "GV80", badge_detail: "3.5T Gasoline AWD", fuel_type: "gasoline", engine_cc: 3470, drive_type: "AWD", power_hp: 380, source: "manual_specs_seed" },

  // Hyundai/Kia high-impact combinations from current catalog.
  { brand: "Hyundai", model: "Santa Fe", badge_detail: "Gasoline 2.5T 4WD", fuel_type: "gasoline", engine_cc: 2497, drive_type: "4WD", power_hp: 281, source: "manual_specs_seed" },
  { brand: "Hyundai", model: "Elantra", badge_detail: "Smart", fuel_type: "hybrid", engine_cc: 1580, drive_type: null, power_hp: 105, source: "manual_specs_seed", notes: "Engine hp for HEV taxation input" },
  { brand: "Hyundai", model: "Elantra", badge_detail: "2.0 N", fuel_type: "gasoline", engine_cc: 1998, drive_type: null, power_hp: 280, source: "manual_specs_seed" },
  { brand: "Hyundai", model: "Elantra", badge_detail: "1.6 LPi", fuel_type: "lpg", engine_cc: 1591, drive_type: null, power_hp: 120, source: "manual_specs_seed" },
  { brand: "Hyundai", model: "Grandeur", badge_detail: "Exclusive", fuel_type: "hybrid", engine_cc: 1598, drive_type: null, power_hp: 180, source: "manual_specs_seed" },
  { brand: "Hyundai", model: "Grandeur", badge_detail: "Premium", fuel_type: "hybrid", engine_cc: 1598, drive_type: null, power_hp: 180, source: "manual_specs_seed" },
  { brand: "Hyundai", model: "Grandeur", badge_detail: "3.5 LPG 2WD", fuel_type: "lpg", engine_cc: 3470, drive_type: "2WD", power_hp: 240, source: "manual_specs_seed" },
  { brand: "Hyundai", model: "Staria", badge_detail: "HEV 1.6 Cargo 5-Seater", fuel_type: "hybrid", engine_cc: 1598, drive_type: null, power_hp: 180, source: "manual_specs_seed" },
  { brand: "Hyundai", model: "Starex", badge_detail: "4WD Wagon 12-Seater", fuel_type: "diesel", engine_cc: 2497, drive_type: "4WD", power_hp: 175, source: "manual_specs_seed" },

  { brand: "Kia", model: "Carnival", badge_detail: "Gasoline 9-Seater Noblesse Special", fuel_type: "gasoline", engine_cc: 3342, drive_type: null, power_hp: 280, source: "manual_specs_seed" },
  { brand: "Kia", model: "Carnival", badge_detail: "Gasoline 7-Seater Limousine", fuel_type: "gasoline", engine_cc: 3342, drive_type: null, power_hp: 280, source: "manual_specs_seed" },
  { brand: "Kia", model: "Stinger", badge_detail: "2.5 Masters", fuel_type: "gasoline", engine_cc: 2497, drive_type: null, power_hp: 304, source: "manual_specs_seed" },
  { brand: "Kia", model: "Seltos", badge_detail: "HEV 1.6 2WD", fuel_type: "hybrid", engine_cc: 1580, drive_type: "2WD", power_hp: 105, source: "manual_specs_seed", notes: "Engine hp for HEV taxation input" },
  { brand: "KGM", model: "Torres", badge_detail: "HEV 1.5 2WD", fuel_type: "hybrid", engine_cc: 1498, drive_type: "2WD", power_hp: 170, source: "manual_specs_seed" },

  // Top pending coverage batch.
  { brand: "Hyundai", model: "Elantra", badge_detail: "1.6", fuel_type: "gasoline", engine_cc: 1598, drive_type: null, power_hp: 123, source: "manual_specs_seed", notes: "Avante/Elantra Smartstream Gasoline 1.6" },
  { brand: "KGM", model: "Rexton", badge_detail: "Diesel 2.2 4WD", fuel_type: "diesel", engine_cc: 2157, drive_type: "4WD", power_hp: 202, source: "manual_specs_seed" },
  { brand: "KGM", model: "Rexton", badge_detail: "Diesel 2.2 2WD", fuel_type: "diesel", engine_cc: 2157, drive_type: "2WD", power_hp: 202, source: "manual_specs_seed" },
  { brand: "Hyundai", model: "Grandeur", badge_detail: "2.5", fuel_type: "gasoline", engine_cc: 2497, drive_type: null, power_hp: 198, source: "manual_specs_seed", notes: "Smartstream G2.5 GDi" },
  { brand: "Hyundai", model: "Grandeur", badge_detail: "2,5 Gasoline 2WD", fuel_type: "gasoline", engine_cc: 2497, drive_type: "2WD", power_hp: 198, source: "manual_specs_seed", notes: "Smartstream G2.5 GDi" },
  { brand: "Hyundai", model: "Tucson", badge_detail: "Gasoline 1.6 Turbo 2WD", fuel_type: "gasoline", engine_cc: 1598, drive_type: "2WD", power_hp: 180, source: "manual_specs_seed" },
  { brand: "Kia", model: "Seltos", badge_detail: "Gasoline 1.6 Turbo 2WD", fuel_type: "gasoline", engine_cc: 1591, drive_type: "2WD", power_hp: 177, source: "manual_specs_seed", notes: "SP2 1.6 T-GDi" },
  { brand: "Kia", model: "Seltos", badge_detail: "Gasoline 1.6 Turbo 2WD", fuel_type: "gasoline", engine_cc: 1598, drive_type: "2WD", power_hp: 198, source: "manual_specs_seed", notes: "Facelift 1.6 T-GDi" },
  { brand: "Kia", model: "Seltos", badge_detail: "Diesel 1.6 2WD", fuel_type: "diesel", engine_cc: 1598, drive_type: "2WD", power_hp: 136, source: "manual_specs_seed" },
  { brand: "Kia", model: "K5", badge_detail: "2.0", fuel_type: "gasoline", engine_cc: 1999, drive_type: null, power_hp: 160, source: "manual_specs_seed" },
  { brand: "Hyundai", model: "Sonata", badge_detail: "2.0", fuel_type: "gasoline", engine_cc: 1999, drive_type: null, power_hp: 160, source: "manual_specs_seed" },
  { brand: "Kia", model: "K8", badge_detail: "2.5 Gasoline 2WD", fuel_type: "gasoline", engine_cc: 2497, drive_type: "2WD", power_hp: 198, source: "manual_specs_seed", notes: "Smartstream G2.5 GDi" },
  { brand: "Kia", model: "Carnival", badge_detail: "9-Seater Prestige", fuel_type: "diesel", engine_cc: 2151, drive_type: null, power_hp: 202, source: "manual_specs_seed" },
  { brand: "Kia", model: "Carnival", badge_detail: "9-Seater Noblesse", fuel_type: "diesel", engine_cc: 2151, drive_type: null, power_hp: 202, source: "manual_specs_seed" },
  { brand: "Kia", model: "Carnival", badge_detail: "9-Seater Signature", fuel_type: "diesel", engine_cc: 2151, drive_type: null, power_hp: 202, source: "manual_specs_seed" },
  { brand: "Kia", model: "Carnival", badge_detail: "Gasoline 9-Seater Signature", fuel_type: "gasoline", engine_cc: 3470, drive_type: null, power_hp: 294, source: "manual_specs_seed" },
  { brand: "Kia", model: "Carnival", badge_detail: "Gasoline 7-Seater Signature", fuel_type: "gasoline", engine_cc: 3470, drive_type: null, power_hp: 294, source: "manual_specs_seed" },
  { brand: "Kia", model: "Sportage", badge_detail: "Gasoline 1.6 Turbo 2WD", fuel_type: "gasoline", engine_cc: 1598, drive_type: "2WD", power_hp: 180, source: "manual_specs_seed" },
  { brand: "Kia", model: "Sportage", badge_detail: "Gasoline", fuel_type: "gasoline", engine_cc: 1999, drive_type: "2WD", power_hp: 152, source: "manual_specs_seed" },
  { brand: "Hyundai", model: "Santa Fe", badge_detail: "Diesel 2.2 2WD", fuel_type: "diesel", engine_cc: 2151, drive_type: "2WD", power_hp: 202, source: "manual_specs_seed" },
  { brand: "Hyundai", model: "Santa Fe", badge_detail: "Diesel 2.0 2WD", fuel_type: "diesel", engine_cc: 1995, drive_type: "2WD", power_hp: 186, source: "manual_specs_seed" },
  { brand: "Hyundai", model: "Santa Fe", badge_detail: "HEV 1.6 2WD", fuel_type: "hybrid", engine_cc: 1598, drive_type: "2WD", power_hp: 180, source: "manual_specs_seed", notes: "Engine hp for HEV taxation input" },
  { brand: "Hyundai", model: "Sonata", badge_detail: "1.6 Turbo", fuel_type: "gasoline", engine_cc: 1598, drive_type: null, power_hp: 180, source: "manual_specs_seed" },
  { brand: "Kia", model: "K5", badge_detail: "1.6 Turbo", fuel_type: "gasoline", engine_cc: 1598, drive_type: null, power_hp: 180, source: "manual_specs_seed" },
  { brand: "KGM", model: "Torres", badge_detail: "Gasoline 1.5 2WD", fuel_type: "gasoline", engine_cc: 1497, drive_type: "2WD", power_hp: 170, source: "manual_specs_seed" },
  { brand: "KGM", model: "Torres", badge_detail: "Gasoline 1.5 4WD", fuel_type: "gasoline", engine_cc: 1497, drive_type: "4WD", power_hp: 170, source: "manual_specs_seed" },
  { brand: "Hyundai", model: "Elantra", badge_detail: "Smart", fuel_type: "hybrid", engine_cc: 1580, drive_type: null, power_hp: 105, source: "manual_specs_seed", notes: "Engine hp for HEV taxation input" },
  { brand: "Renault Korea", model: "QM6", badge_detail: "2.0 GDe RE Signature 2WD", fuel_type: "gasoline", engine_cc: 1997, drive_type: "2WD", power_hp: 144, source: "manual_specs_seed" },
  { brand: "Renault Korea", model: "QM6", badge_detail: "2.0 LPe LE Signature 2WD", fuel_type: "lpg", engine_cc: 1998, drive_type: "2WD", power_hp: 140, source: "manual_specs_seed" },
  { brand: "Renault Korea", model: "QM6", badge_detail: "Gasoline 2WD RE Signature", fuel_type: "gasoline", engine_cc: 1997, drive_type: "2WD", power_hp: 144, source: "manual_specs_seed" },
  { brand: "Renault Korea", model: "QM6", badge_detail: "2.0 LPe LE 2WD", fuel_type: "lpg", engine_cc: 1998, drive_type: "2WD", power_hp: 140, source: "manual_specs_seed" },
  { brand: "Hyundai", model: "Venue", badge_detail: "1.6 Flux", fuel_type: "gasoline", engine_cc: 1598, drive_type: null, power_hp: 123, source: "manual_specs_seed" },
  { brand: "Kia", model: "K8", badge_detail: "Signature", fuel_type: "hybrid", engine_cc: 1598, drive_type: null, power_hp: 180, source: "manual_specs_seed", notes: "Engine hp for HEV taxation input" },
  { brand: "Kia", model: "K5", badge_detail: "Signature", fuel_type: "hybrid", engine_cc: 1999, drive_type: null, power_hp: 152, source: "manual_specs_seed", notes: "Engine hp for HEV taxation input" },
  { brand: "Hyundai", model: "Tucson", badge_detail: "Diesel 2.0 4WD", fuel_type: "diesel", engine_cc: 1998, drive_type: "4WD", power_hp: 186, source: "manual_specs_seed" },
  { brand: "Hyundai", model: "Staria", badge_detail: "L3.5 Cargo 3-Seater", fuel_type: "lpg", engine_cc: 3470, drive_type: null, power_hp: 240, source: "manual_specs_seed" },
  { brand: "Hyundai", model: "Staria", badge_detail: "Tourer 11-Seater", fuel_type: "diesel", engine_cc: 2199, drive_type: null, power_hp: 177, source: "manual_specs_seed" },
  { brand: "Genesis", model: "G70", badge_detail: "2.0T", fuel_type: "gasoline", engine_cc: 1998, drive_type: null, power_hp: 252, source: "manual_specs_seed" },
  { brand: "Kia", model: "Sportage", badge_detail: "Signature 2WD", fuel_type: "hybrid", engine_cc: 1598, drive_type: "2WD", power_hp: 180, source: "manual_specs_seed", notes: "Engine hp for HEV taxation input" },

  // Second coverage batch.
  { brand: "Hyundai", model: "Grandeur", badge_detail: "Exclusive", fuel_type: "hybrid", engine_cc: 2359, drive_type: null, power_hp: 159, source: "manual_specs_seed", notes: "2.4 HEV engine hp for taxation input" },
  { brand: "Hyundai", model: "Grandeur", badge_detail: "Calligraphy", fuel_type: "hybrid", engine_cc: 2359, drive_type: null, power_hp: 159, source: "manual_specs_seed", notes: "2.4 HEV engine hp for taxation input" },
  { brand: "Hyundai", model: "Grandeur", badge_detail: "Le Blanc", fuel_type: "hybrid", engine_cc: 2359, drive_type: null, power_hp: 159, source: "manual_specs_seed", notes: "2.4 HEV engine hp for taxation input" },
  { brand: "Hyundai", model: "Grandeur", badge_detail: "3.0 LPi", fuel_type: "lpg", engine_cc: 2999, drive_type: null, power_hp: 235, source: "manual_specs_seed" },
  { brand: "Hyundai", model: "Grandeur", badge_detail: "3.0 Premium", fuel_type: "gasoline", engine_cc: 2999, drive_type: null, power_hp: 266, source: "manual_specs_seed" },
  { brand: "Hyundai", model: "Santa Fe", badge_detail: "Gasoline 2.5T 2WD", fuel_type: "gasoline", engine_cc: 2497, drive_type: "2WD", power_hp: 281, source: "manual_specs_seed" },
  { brand: "Hyundai", model: "Santa Fe", badge_detail: "Gasoline 2.0T 2WD", fuel_type: "gasoline", engine_cc: 1998, drive_type: "2WD", power_hp: 235, source: "manual_specs_seed" },
  { brand: "Hyundai", model: "Santa Fe", badge_detail: "Diesel 2.2 4WD", fuel_type: "diesel", engine_cc: 2151, drive_type: "4WD", power_hp: 202, source: "manual_specs_seed" },
  { brand: "Hyundai", model: "Tucson", badge_detail: "Diesel 2.0 2WD", fuel_type: "diesel", engine_cc: 1998, drive_type: "2WD", power_hp: 186, source: "manual_specs_seed" },
  { brand: "Kia", model: "Sportage", badge_detail: "Diesel 2.0 2WD", fuel_type: "diesel", engine_cc: 1995, drive_type: "2WD", power_hp: 186, source: "manual_specs_seed" },
  { brand: "Kia", model: "Sportage", badge_detail: "Diesel 2.0 2WD", fuel_type: "diesel", engine_cc: 1998, drive_type: "2WD", power_hp: 186, source: "manual_specs_seed" },
  { brand: "Kia", model: "Sportage", badge_detail: "Diesel 2.0 4WD", fuel_type: "diesel", engine_cc: 1998, drive_type: "4WD", power_hp: 186, source: "manual_specs_seed" },
  { brand: "Hyundai", model: "Venue", badge_detail: "1.6 Modern Plus", fuel_type: "gasoline", engine_cc: 1598, drive_type: null, power_hp: 123, source: "manual_specs_seed" },
  { brand: "Hyundai", model: "Venue", badge_detail: "1,6 Premium", fuel_type: "gasoline", engine_cc: 1598, drive_type: null, power_hp: 123, source: "manual_specs_seed" },
  { brand: "Hyundai", model: "Venue", badge_detail: "1.6 Modern", fuel_type: "gasoline", engine_cc: 1598, drive_type: null, power_hp: 123, source: "manual_specs_seed" },
  { brand: "Hyundai", model: "Elantra", badge_detail: "Inspiration", fuel_type: "hybrid", engine_cc: 1580, drive_type: null, power_hp: 105, source: "manual_specs_seed", notes: "Engine hp for HEV taxation input" },
  { brand: "Hyundai", model: "Staria", badge_detail: "L3.5 Cargo 5-Seater", fuel_type: "lpg", engine_cc: 3470, drive_type: null, power_hp: 240, source: "manual_specs_seed" },
  { brand: "Hyundai", model: "Staria", badge_detail: "Cargo 5-Seater", fuel_type: "diesel", engine_cc: 2199, drive_type: null, power_hp: 177, source: "manual_specs_seed" },
  { brand: "Hyundai", model: "Staria", badge_detail: "L3.5 Tourer 11-Seater", fuel_type: "lpg", engine_cc: 3470, drive_type: null, power_hp: 240, source: "manual_specs_seed" },
  { brand: "Kia", model: "Carnival", badge_detail: "Gasoline 9-Seater Noblesse", fuel_type: "gasoline", engine_cc: 3470, drive_type: null, power_hp: 294, source: "manual_specs_seed" },
  { brand: "Kia", model: "Carnival", badge_detail: "Gasoline 7-Seater Noblesse", fuel_type: "gasoline", engine_cc: 3470, drive_type: null, power_hp: 294, source: "manual_specs_seed" },
  { brand: "Kia", model: "Carnival", badge_detail: "7-Seater Signature", fuel_type: "diesel", engine_cc: 2151, drive_type: null, power_hp: 202, source: "manual_specs_seed" },
  { brand: "Kia", model: "Carnival", badge_detail: "7-Seater Hi-Limousine", fuel_type: "diesel", engine_cc: 2151, drive_type: null, power_hp: 202, source: "manual_specs_seed" },
  { brand: "Genesis", model: "GV80", badge_detail: "2.5T Gasoline 2WD", fuel_type: "gasoline", engine_cc: 2497, drive_type: "2WD", power_hp: 304, source: "manual_specs_seed" },
  { brand: "Genesis", model: "GV80", badge_detail: "2.5T Gasoline AWD", fuel_type: "gasoline", engine_cc: 2497, drive_type: "4WD", power_hp: 304, source: "manual_specs_seed" },
  { brand: "Renault Korea", model: "QM6", badge_detail: "2.0 LPe Premiere 2WD", fuel_type: "lpg", engine_cc: 1998, drive_type: "2WD", power_hp: 140, source: "manual_specs_seed" },
  { brand: "Renault Korea", model: "QM6", badge_detail: "2.0 LPe RE 2WD", fuel_type: "lpg", engine_cc: 1998, drive_type: "2WD", power_hp: 140, source: "manual_specs_seed" },
  { brand: "Renault Korea", model: "QM6", badge_detail: "2.0 GDe RE 2WD", fuel_type: "gasoline", engine_cc: 1997, drive_type: "2WD", power_hp: 144, source: "manual_specs_seed" },
  { brand: "Genesis", model: "G70", badge_detail: "Gasoline 2.0T 4WD", fuel_type: "gasoline", engine_cc: 1998, drive_type: "4WD", power_hp: 252, source: "manual_specs_seed" },
  { brand: "Kia", model: "K5", badge_detail: "Prestige", fuel_type: "hybrid", engine_cc: 1999, drive_type: null, power_hp: 152, source: "manual_specs_seed", notes: "Engine hp for HEV taxation input" },
  { brand: "Kia", model: "Sportage", badge_detail: "Prestige 2WD", fuel_type: "hybrid", engine_cc: 1598, drive_type: "2WD", power_hp: 180, source: "manual_specs_seed", notes: "Engine hp for HEV taxation input" },
  { brand: "Kia", model: "Sportage", badge_detail: "Gasoline 1.6 Turbo 4WD", fuel_type: "gasoline", engine_cc: 1598, drive_type: "4WD", power_hp: 180, source: "manual_specs_seed" },
  { brand: "Kia", model: "K5", badge_detail: "2.0 LPI", fuel_type: "lpg", engine_cc: 1999, drive_type: null, power_hp: 146, source: "manual_specs_seed" },
  { brand: "Hyundai", model: "Tucson", badge_detail: "Inspiration 2WD", fuel_type: "hybrid", engine_cc: 1598, drive_type: "2WD", power_hp: 180, source: "manual_specs_seed", notes: "Engine hp for HEV taxation input" },
  { brand: "Kia", model: "Carnival", badge_detail: "HEV 9 seater Prestige", fuel_type: "hybrid", engine_cc: 1598, drive_type: null, power_hp: 180, source: "manual_specs_seed", notes: "Engine hp for HEV taxation input" },

  // Final current-catalog coverage batch.
  { brand: "Genesis", model: "G70", badge_detail: "2.0T AWD", fuel_type: "gasoline", engine_cc: 1998, drive_type: "4WD", power_hp: 252, source: "manual_specs_seed" },
  { brand: "Genesis", model: "G70", badge_detail: "3.3T Sport AWD", fuel_type: "gasoline", engine_cc: 3342, drive_type: "4WD", power_hp: 370, source: "manual_specs_seed" },
  { brand: "Hyundai", model: "Sonata", badge_detail: "2.0 LPG(Taxi)", fuel_type: "lpg", engine_cc: 1999, drive_type: null, power_hp: 146, source: "manual_specs_seed" },
  { brand: "Hyundai", model: "Sonata", badge_detail: "2.0 LPG", fuel_type: "lpg", engine_cc: 1999, drive_type: null, power_hp: 146, source: "manual_specs_seed" },
  { brand: "Hyundai", model: "Sonata", badge_detail: "2.0 Smart Spicial", fuel_type: "gasoline", engine_cc: 1999, drive_type: null, power_hp: 160, source: "manual_specs_seed" },
  { brand: "Hyundai", model: "Tucson", badge_detail: "Gasoline 1.6 turbo 2WD", fuel_type: "gasoline", engine_cc: 1591, drive_type: "2WD", power_hp: 177, source: "manual_specs_seed" },
  { brand: "Hyundai", model: "Tucson", badge_detail: "Gasoline 1.6 Turbo 4WD", fuel_type: "gasoline", engine_cc: 1598, drive_type: "4WD", power_hp: 180, source: "manual_specs_seed" },
  { brand: "Hyundai", model: "Tucson", badge_detail: "Diesel 2.0 2WD", fuel_type: "diesel", engine_cc: 1995, drive_type: "2WD", power_hp: 186, source: "manual_specs_seed" },
  { brand: "Hyundai", model: "Staria", badge_detail: "Tourer 9-Seater", fuel_type: "diesel", engine_cc: 2199, drive_type: null, power_hp: 177, source: "manual_specs_seed" },
  { brand: "Hyundai", model: "Staria", badge_detail: "2WD Camping Car", fuel_type: "diesel", engine_cc: 2199, drive_type: "2WD", power_hp: 177, source: "manual_specs_seed" },
  { brand: "Hyundai", model: "Staria", badge_detail: "L3.5 Lounge 7-Seater", fuel_type: "lpg", engine_cc: 3470, drive_type: null, power_hp: 240, source: "manual_specs_seed" },
  { brand: "Hyundai", model: "Grandeur", badge_detail: "2.4 Premium", fuel_type: "gasoline", engine_cc: 2359, drive_type: null, power_hp: 190, source: "manual_specs_seed" },
  { brand: "KGM", model: "Rexton", badge_detail: "Disel 2.2 2WD", fuel_type: "diesel", engine_cc: 2157, drive_type: "2WD", power_hp: 202, source: "manual_specs_seed" },
  { brand: "Kia", model: "Seltos", badge_detail: "Gasoline 2.0 2WD", fuel_type: "gasoline", engine_cc: 1999, drive_type: "2WD", power_hp: 149, source: "manual_specs_seed" },
  { brand: "Kia", model: "Carnival", badge_detail: "7-Seater Limousine", fuel_type: "diesel", engine_cc: 2199, drive_type: null, power_hp: 202, source: "manual_specs_seed" },
  { brand: "Kia", model: "Carnival", badge_detail: "11-Seater Prestige", fuel_type: "diesel", engine_cc: 2151, drive_type: null, power_hp: 202, source: "manual_specs_seed" },
  { brand: "Kia", model: "Carnival", badge_detail: "7-Seater Noblesse", fuel_type: "diesel", engine_cc: 2151, drive_type: null, power_hp: 202, source: "manual_specs_seed" },
  { brand: "Kia", model: "Carnival", badge_detail: "9-Seater Noblesse Special", fuel_type: "diesel", engine_cc: 2199, drive_type: null, power_hp: 202, source: "manual_specs_seed" },
  { brand: "Kia", model: "Carnival", badge_detail: "9-Seater Prstige", fuel_type: "diesel", engine_cc: 2199, drive_type: null, power_hp: 202, source: "manual_specs_seed" },
  { brand: "Kia", model: "Carnival", badge_detail: "Gasoline 7-Seater Hi Limousine", fuel_type: "gasoline", engine_cc: 3470, drive_type: null, power_hp: 294, source: "manual_specs_seed" },
  { brand: "Kia", model: "Carnival", badge_detail: "Gasoline 4-Seater Hi-Limousine", fuel_type: "gasoline", engine_cc: 3470, drive_type: null, power_hp: 294, source: "manual_specs_seed" },
  { brand: "Kia", model: "Carnival", badge_detail: "HEV 7seater Signature", fuel_type: "hybrid", engine_cc: 1598, drive_type: null, power_hp: 180, source: "manual_specs_seed", notes: "Engine hp for HEV taxation input" },
  { brand: "Kia", model: "K8", badge_detail: "Noblesse Lite", fuel_type: "hybrid", engine_cc: 1598, drive_type: null, power_hp: 180, source: "manual_specs_seed", notes: "Engine hp for HEV taxation input" },
  { brand: "Kia", model: "K8", badge_detail: "Noblesse", fuel_type: "hybrid", engine_cc: 1598, drive_type: null, power_hp: 180, source: "manual_specs_seed", notes: "Engine hp for HEV taxation input" },
  { brand: "Kia", model: "K8", badge_detail: "2.5 Gasoline 2WD", fuel_type: "hybrid", engine_cc: 2497, drive_type: "2WD", power_hp: 180, source: "manual_specs_seed", notes: "Ambiguous fuel from Encar; HEV taxation engine hp" },
  { brand: "Kia", model: "K8", badge_detail: "3.5 Gasoline 2WD", fuel_type: "gasoline", engine_cc: 3470, drive_type: "2WD", power_hp: 300, source: "manual_specs_seed" },
  { brand: "Kia", model: "Seltos", badge_detail: "Gasoline 1.6 Turbo 4WD", fuel_type: "gasoline", engine_cc: 1591, drive_type: "4WD", power_hp: 177, source: "manual_specs_seed" },
  { brand: "Kia", model: "K5", badge_detail: "2.0 LPi(Rent)", fuel_type: "lpg", engine_cc: 1999, drive_type: null, power_hp: 146, source: "manual_specs_seed" },
  { brand: "Kia", model: "Sportage", badge_detail: "LPG 2.0 2WD", fuel_type: "lpg", engine_cc: 1999, drive_type: "2WD", power_hp: 146, source: "manual_specs_seed" },
  { brand: "Renault Korea", model: "QM6", badge_detail: "2.0 LPe LE Signature 2WD", fuel_type: "gasoline", engine_cc: 1997, drive_type: "2WD", power_hp: 144, source: "manual_specs_seed", notes: "Encar fuel mismatch, badge is LPe" },
  { brand: "Renault Korea", model: "QM6", badge_detail: "2.0 LPe RE Signature 2WD", fuel_type: "lpg", engine_cc: 1998, drive_type: "2WD", power_hp: 140, source: "manual_specs_seed" },
  { brand: "Hyundai", model: "Elantra", badge_detail: "1.6 Turbo N Line", fuel_type: "gasoline", engine_cc: 1598, drive_type: null, power_hp: 204, source: "manual_specs_seed" },
];

async function fetchAllCars() {
  const rows = [];
  let from = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from("cars")
      .select("encar_id,brand,model,year,engine_cc,fuel_type,drive_type,badge_detail,power_hp,power_source")
      .eq("is_available", true)
      .range(from, from + pageSize - 1);

    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }

  return rows;
}

async function fetchSpecs() {
  const { data, error } = await supabase.from("vehicle_specs").select("*");
  if (error) throw error;
  return data ?? [];
}

async function cleanupDuplicateSpecs() {
  const specs = await fetchSpecs();
  const groups = new Map();

  for (const spec of specs) {
    const key = specKey(spec);
    const group = groups.get(key) ?? [];
    group.push(spec);
    groups.set(key, group);
  }

  let deleted = 0;
  for (const group of groups.values()) {
    if (group.length < 2) continue;

    const keep =
      group.find((spec) => spec.verification_status === "verified" && spec.power_hp) ??
      group[0];
    const duplicateIds = group
      .filter((spec) => spec.id !== keep.id)
      .map((spec) => spec.id);

    if (duplicateIds.length === 0) continue;

    const { error } = await supabase
      .from("vehicle_specs")
      .delete()
      .in("id", duplicateIds);
    if (error) throw error;
    deleted += duplicateIds.length;
  }

  return deleted;
}

async function upsertSpec(spec, existingByKey) {
  const payload = {
    brand: spec.brand,
    model: spec.model,
    generation: spec.generation ?? null,
    badge_detail: spec.badge_detail ?? "",
    badge_detail_norm: normalizeText(spec.badge_detail),
    fuel_type: spec.fuel_type ?? null,
    fuel_type_norm: normalizeFuel(spec.fuel_type),
    engine_cc: Number(spec.engine_cc),
    drive_type: spec.drive_type ?? null,
    year_from: spec.year_from ?? null,
    year_to: spec.year_to ?? null,
    power_hp: spec.power_hp ?? null,
    source: spec.source ?? "manual",
    source_url: spec.source_url ?? null,
    verification_status: spec.verification_status ?? "verified",
    confidence: spec.confidence ?? (spec.power_hp ? 100 : 0),
    observed_power_hp: spec.observed_power_hp ?? null,
    observed_power_source: spec.observed_power_source ?? null,
    matched_count: spec.matched_count ?? 0,
    sample_encar_ids: spec.sample_encar_ids ?? [],
    notes: spec.notes ?? null,
    verified_at: spec.power_hp ? new Date().toISOString() : null,
    last_seen_at: new Date().toISOString(),
  };
  const key = specKey(payload);
  const existing = existingByKey.get(key);

  if (existing) {
    const { data, error } = await supabase
      .from("vehicle_specs")
      .update(payload)
      .eq("id", existing.id)
      .select()
      .single();
    if (error) throw error;
    existingByKey.set(key, data);
    return data;
  }

  const { data, error } = await supabase
    .from("vehicle_specs")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  existingByKey.set(key, data);
  return data;
}

function findVerifiedSpec(car, specsByKey) {
  const inferredDrive = car.drive_type ?? inferDriveType(car.badge_detail);
  const candidates = [
    { ...car, fuel_type: normalizeFuel(car.fuel_type), drive_type: inferredDrive },
    { ...car, fuel_type: normalizeFuel(car.fuel_type), drive_type: null },
    { ...car, fuel_type: "", drive_type: inferredDrive },
    { ...car, fuel_type: "", drive_type: null },
  ];

  for (const candidate of candidates) {
    const spec = specsByKey.get(specKey(candidate));
    if (spec?.verification_status === "verified" && spec.power_hp) return spec;
  }

  return null;
}

async function main() {
  const cars = await fetchAllCars();
  const deletedDuplicates = await cleanupDuplicateSpecs();
  const specs = await fetchSpecs();
  const specsByKey = new Map(specs.map((spec) => [specKey(spec), spec]));

  let verifiedSeeded = 0;
  for (const spec of VERIFIED_SPECS) {
    await upsertSpec({ ...spec, verification_status: "verified", confidence: 100 }, specsByKey);
    verifiedSeeded += 1;
  }

  const grouped = new Map();
  for (const car of cars) {
    const item = {
      brand: car.brand,
      model: car.model,
      badge_detail: car.badge_detail ?? "",
      fuel_type: normalizeFuel(car.fuel_type),
      engine_cc: car.engine_cc,
      drive_type: car.drive_type ?? inferDriveType(car.badge_detail),
      observed_power_hp: car.power_hp ?? null,
      observed_power_source: car.power_source ?? null,
    };
    const key = specKey(item);
    const group = grouped.get(key) ?? { ...item, count: 0, ids: [] };
    group.count += 1;
    if (group.ids.length < 10) group.ids.push(car.encar_id);
    grouped.set(key, group);
  }

  let pendingSeeded = 0;
  for (const group of grouped.values()) {
    if (specsByKey.has(specKey(group))) continue;
    await upsertSpec(
      {
        ...group,
        power_hp: null,
        verification_status: "pending",
        confidence: 0,
        matched_count: group.count,
        sample_encar_ids: group.ids,
        notes: `Observed parser power: ${group.observed_power_hp ?? "n/a"} (${group.observed_power_source ?? "n/a"})`,
      },
      specsByKey,
    );
    pendingSeeded += 1;
  }

  const refreshedSpecs = await fetchSpecs();
  const refreshedByKey = new Map(refreshedSpecs.map((spec) => [specKey(spec), spec]));
  let updatedCars = 0;
  let unmatchedCars = 0;

  for (const car of cars) {
    const spec = findVerifiedSpec(car, refreshedByKey);
    if (!spec) {
      unmatchedCars += 1;
      continue;
    }

    const { error } = await supabase
      .from("cars")
      .update({
        vehicle_spec_id: spec.id,
        power_hp: spec.power_hp,
        power_source: "vehicle_specs",
        power_note: `vehicle_specs:${spec.id}`,
        power_verified: true,
        data_confidence: 100,
        data_warnings: [],
      })
      .eq("encar_id", car.encar_id);
    if (error) throw error;
    updatedCars += 1;
  }

  const pending = [...grouped.values()]
    .filter((group) => !findVerifiedSpec(group, refreshedByKey))
    .sort((a, b) => b.count - a.count)
    .slice(0, 30);

  console.log("vehicle_specs_sync:", {
    availableCars: cars.length,
    deletedDuplicates,
    verifiedSeeded,
    pendingSeeded,
    updatedCars,
    unmatchedCars,
  });
  console.log("top_pending_combinations:");
  console.log(JSON.stringify(pending, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
