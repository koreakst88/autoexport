import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local", quiet: true });

const ENCAR_BASE_URL = "https://api.encar.com/search/car/list/general";
const ninetyDaysAgo = new Date();
ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
const dateFrom = ninetyDaysAgo.toISOString().slice(0, 10).replace(/-/g, "");

const ENCAR_FILTER =
  "(And.Hidden.N._.CarType.Y._.Year.range(201900..)._.Mileage.range(..100000)._.Price.range(700..3000).)";
const ENCAR_PAGE_SIZE = 50;
const DEFAULT_TARGET_COUNT = 50;
const DEFAULT_MAX_PAGES = 7;
const TARGET_COUNT = parsePositiveInt(process.env.ENCAR_TARGET, DEFAULT_TARGET_COUNT);
const ENCAR_MAX_PAGES = parsePositiveInt(process.env.ENCAR_MAX_PAGES, DEFAULT_MAX_PAGES);
const SYNC_AVAILABILITY = process.env.SYNC_AVAILABILITY !== "false";
const DETAIL_DELAY_MS = parsePositiveInt(process.env.ENCAR_DETAIL_DELAY_MS, 300);
const PAGE_DELAY_MS = parsePositiveInt(process.env.ENCAR_PAGE_DELAY_MS, 1000);

const ENCAR_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
  Referer: "https://www.encar.com/",
  Origin: "https://www.encar.com",
};

const BRAND_MAP = {
  "현대": "Hyundai",
  "기아": "Kia",
  "제네시스": "Genesis",
  "쉐보레": "Chevrolet",
  "르노코리아(삼성)": "Renault Korea",
  "르노코리아": "Renault Korea",
  "쌍용": "SsangYong",
  "KG모빌리티": "KGM",
  "KG모빌리티(쌍용)": "KGM",
  BMW: "BMW",
  "벤츠": "Mercedes-Benz",
  "아우디": "Audi",
  "폭스바겐": "Volkswagen",
  "볼보": "Volvo",
  "토요타": "Toyota",
  "렉서스": "Lexus",
  "닛산": "Nissan",
  "혼다": "Honda",
};

const KR_COLOR_MAP = {
  "흰색": "Белый",
  "백색": "Белый",
  "화이트": "Белый",
  "검정색": "Чёрный",
  "검은색": "Чёрный",
  "블랙": "Чёрный",
  "회색": "Серый",
  "그레이": "Серый",
  "은색": "Серебристый",
  "실버": "Серебристый",
  "은회색": "Серебристый",
  "파란색": "Синий",
  "청색": "Синий",
  "블루": "Синий",
  "빨간색": "Красный",
  "적색": "Красный",
  "레드": "Красный",
  "갈색": "Коричневый",
  "브라운": "Коричневый",
  "황색": "Жёлтый",
  "노란색": "Жёлтый",
  "녹색": "Зелёный",
  "초록색": "Зелёный",
  "주황색": "Оранжевый",
  "보라색": "Фиолетовый",
  "분홍색": "Розовый",
  "핑크": "Розовый",
  "하늘색": "Голубой",
  "금색": "Золотой",
  "베이지": "Бежевый",
  "진주": "Жемчужный",
  "무채색": "Серый",
  "유채색": "Цветной",
  "쥐색": "Серый",
  "쥐회색": "Тёмно-серый",
  "진회색": "Тёмно-серый",
  "명은색": "Серебристый",
  "밝은은색": "Светло-серебристый",
  "어두운은색": "Тёмно-серебристый",
  "진주색": "Жемчужный",
  "크림색": "Кремовый",
  "샴페인": "Шампань",
  "카키": "Хаки",
  "청록색": "Бирюзовый",
  "네이비": "Тёмно-синий",
  "와인": "Бордовый",
  "버건디": "Бургунди",
};

const BODY_TYPE_MAP = {
  "투싼": "crossover",
  Tucson: "crossover",
  "스포티지": "crossover",
  Sportage: "crossover",
  "싼타페": "crossover",
  "Santa Fe": "crossover",
  "소렌토": "crossover",
  Sorento: "crossover",
  "셀토스": "crossover",
  Seltos: "crossover",
  "베뉴": "crossover",
  Venue: "crossover",
  GV70: "crossover",
  GV80: "crossover",
  "렉스턴": "crossover",
  Rexton: "crossover",
  "토레스": "crossover",
  Torres: "crossover",
  QM6: "crossover",
  QM5: "crossover",
  "쏘나타": "sedan",
  Sonata: "sedan",
  K5: "sedan",
  K8: "sedan",
  G80: "sedan",
  G70: "sedan",
  G90: "sedan",
  "그랜저": "sedan",
  Grandeur: "sedan",
  "아반떼": "sedan",
  Elantra: "sedan",
  "스팅어": "sedan",
  Stinger: "sedan",
  "카니발": "minivan",
  Carnival: "minivan",
  "스타리아": "minivan",
  Staria: "minivan",
  "스타렉스": "minivan",
  Starex: "minivan",
};

const MODEL_MAP = {
  "투싼": "Tucson",
  "더 뉴 투싼": "Tucson",
  "스포티지": "Sportage",
  "더 뉴 스포티지": "Sportage",
  "싼타페": "Santa Fe",
  "더 뉴 싼타페": "Santa Fe",
  "소렌토": "Sorento",
  "더 뉴 소렌토": "Sorento",
  "셀토스": "Seltos",
  "더 뉴 셀토스": "Seltos",
  "베뉴": "Venue",
  "팰리세이드": "Palisade",
  "코나": "Kona",
  GV70: "GV70",
  GV80: "GV80",
  GV60: "GV60",
  "렉스턴": "Rexton",
  "더 뉴 렉스턴": "Rexton",
  "토레스": "Torres",
  QM6: "QM6",
  "더 뉴 QM6": "QM6",
  QM5: "QM5",
  "쏘나타": "Sonata",
  "더 뉴 쏘나타": "Sonata",
  K5: "K5",
  "더 뉴 K5": "K5",
  K8: "K8",
  K3: "K3",
  G80: "G80",
  "더 뉴 G80": "G80",
  G70: "G70",
  G90: "G90",
  "그랜저": "Grandeur",
  "더 뉴 그랜저": "Grandeur",
  "아반떼": "Elantra",
  "스팅어": "Stinger",
  "카니발": "Carnival",
  "더 뉴 카니발": "Carnival",
  "스타리아": "Staria",
  "스타렉스": "Starex",
};

const SNG_MODELS = [
  "투싼",
  "스포티지",
  "싼타페",
  "소렌토",
  "셀토스",
  "베뉴",
  "GV70",
  "GV80",
  "렉스턴",
  "토레스",
  "QM6",
  "쏘나타",
  "K5",
  "K8",
  "G80",
  "G70",
  "그랜저",
  "아반떼",
  "스팅어",
  "카니발",
  "스타리아",
  "스타렉스",
];

const EXCLUDE_KEYWORDS = [
  "어린이보호차",
  "렌터카",
  "택시",
  "앰뷸런스",
  "화물",
  "밴",
];

const requiredEnv = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
const missingEnv = requiredEnv.filter((name) => !process.env[name]);

if (missingEnv.length > 0) {
  console.error(
    `Не найдены переменные окружения в .env.local: ${missingEnv.join(", ")}`,
  );
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

let verifiedVehicleSpecs = [];

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeSpecText(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeFuelForSpec(value) {
  const text = normalizeSpecText(value);
  if (!text) return "";
  if (text.includes("디젤") || text.includes("diesel")) return "diesel";
  if (text.includes("lpg") || text.includes("lpi") || text.includes("lpe")) return "lpg";
  if (text.includes("하이브리드") || text.includes("hybrid") || text.includes("hev")) return "hybrid";
  if (text.includes("가솔린+전기")) return "hybrid";
  if (text.includes("전기") || text.includes("electric")) return "electric";
  if (text.includes("가솔린") || text.includes("gasoline")) return "gasoline";
  return text;
}

async function loadVerifiedVehicleSpecs() {
  const { data, error } = await supabase
    .from("vehicle_specs")
    .select("id,brand,model,badge_detail_norm,fuel_type_norm,engine_cc,drive_type,year_from,year_to,power_hp")
    .eq("verification_status", "verified")
    .not("power_hp", "is", null);

  if (error) {
    console.warn("vehicle_specs недоступна, используем локальные карты мощности:", error.message);
    verifiedVehicleSpecs = [];
    return;
  }

  verifiedVehicleSpecs = data ?? [];
}

function resolvePowerFromVehicleSpecs({ brand, model, engineCc, badgeDetail, fuelType, driveType, year }) {
  const brandNorm = normalizeSpecText(brand);
  const modelNorm = normalizeSpecText(model);
  const badgeNorm = normalizeSpecText(badgeDetail);
  const fuelNorm = normalizeFuelForSpec(fuelType);
  const driveNorm = normalizeSpecText(normalizeDriveForSpec(driveType));
  const cc = Number(engineCc) || 0;
  const carYear = Number(year) || 0;

  const spec = verifiedVehicleSpecs.find((item) => {
    if (normalizeSpecText(item.brand) !== brandNorm) return false;
    if (normalizeSpecText(item.model) !== modelNorm) return false;
    if (item.badge_detail_norm !== badgeNorm) return false;
    if (Number(item.engine_cc) !== cc) return false;
    if (item.fuel_type_norm && item.fuel_type_norm !== fuelNorm) return false;
    if (item.drive_type && normalizeSpecText(item.drive_type) !== driveNorm) return false;
    if (item.year_from && carYear && carYear < item.year_from) return false;
    if (item.year_to && carYear && carYear > item.year_to) return false;
    return true;
  });

  if (!spec) return null;

  return {
    power: spec.power_hp,
    source: "vehicle_specs",
    note: `vehicle_specs:${spec.id}`,
    specId: spec.id,
  };
}

function buildEncarUrl(offset) {
  const query = encodeURIComponent(ENCAR_FILTER);
  // В API Encar валидное имя сортировки для "самые новые" — CreatedDate.
  const sort = encodeURIComponent(`|CreatedDate|${offset}|${ENCAR_PAGE_SIZE}`);
  return `${ENCAR_BASE_URL}?count=true&q=${query}&sr=${sort}`;
}

function buildPhotos(car) {
  if (Array.isArray(car.Photos) && car.Photos.length > 0) {
    return [...car.Photos]
      .sort((a, b) => {
        // type "001" всегда первым
        if (a.type === "001") return -1;
        if (b.type === "001") return 1;
        return (a.ordering ?? 0) - (b.ordering ?? 0);
      })
      .map((photo) => `https://ci.encar.com${photo.location}`);
  }

  if (car.Photo) {
    return [`https://ci.encar.com${car.Photo}001.jpg`];
  }

  return [];
}

function getBodyType(model) {
  const modelName = String(model ?? "");

  for (const [key, type] of Object.entries(BODY_TYPE_MAP)) {
    if (modelName.includes(key)) {
      return type;
    }
  }

  return "crossover";
}

function translateModel(koreanModel) {
  const modelName = String(koreanModel ?? "");

  for (const [kor, eng] of Object.entries(MODEL_MAP)) {
    if (modelName.includes(kor)) {
      return eng;
    }
  }

  return modelName;
}

function translateColorKr(color) {
  if (!color) return null;
  const trimmed = String(color).trim();
  return KR_COLOR_MAP[trimmed] ?? trimmed;
}

function parseDriveType(badge) {
  if (!badge) return null;
  const text = String(badge);
  if (text.includes("4WD") || text.includes("AWD")) return "4WD";
  if (text.includes("2WD")) return "2WD";
  if (text.includes("FWD")) return "FWD";
  if (text.includes("RWD")) return "RWD";
  return null;
}

function normalizeDriveForSpec(driveType) {
  if (!driveType) return null;
  if (driveType === "4WD") return "AWD";
  return driveType;
}

// Маппинг модель → объём по умолчанию
// Когда Badge не содержит объём (например "9인승 시그니처")
const MODEL_ENGINE_DEFAULTS = {
  // Carnival — три варианта двигателя
  Carnival: { default: 2199, byFuel: { 가솔린: 3497, 디젤: 2199, LPG: 2199 } },
  Starex: { default: 2359, byFuel: { 디젤: 2359 } },
  Staria: { default: 2199, byFuel: { 디젤: 2199, 가솔린: 3497 } },
  Grandeur: { default: 2497, byFuel: { 가솔린: 2497, LPG: 2497 } },
  Sonata: { default: 1999, byFuel: { 가솔린: 1999, LPG: 1999 } },
  K8: { default: 2497, byFuel: { 가솔린: 2497, LPG: 2497 } },
  Palisade: { default: 2199, byFuel: { 디젤: 2199, 가솔린: 3778 } },
  Rexton: { default: 1998, byFuel: { 디젤: 1998 } },
};

function getDefaultEngine(modelName, fuelType) {
  if (!modelName) return 0;
  const modelText = String(modelName);
  const fuelText = fuelType ? String(fuelType) : "";

  for (const [model, data] of Object.entries(MODEL_ENGINE_DEFAULTS)) {
    if (modelText.includes(model)) {
      if (fuelText && data.byFuel) {
        for (const [fuel, cc] of Object.entries(data.byFuel)) {
          if (fuelText.includes(fuel)) return cc;
        }
      }
      return data.default;
    }
  }
  return 0;
}

function parseEngineFromBadge(badge, modelName, fuelType) {
  if (!badge) {
    // Если Badge пустой — берём из маппинга модели
    return getDefaultEngine(modelName, fuelType);
  }

  const text = String(badge);

  // Паттерн 1: число с точкой (1.6, 2.0, 2.2, 3.5)
  const decimalMatch = text.match(/(\d+\.\d+)/);
  if (decimalMatch) {
    const liters = parseFloat(decimalMatch[1]);
    if (liters >= 0.8 && liters <= 6.0) return Math.round(liters * 1000);
  }

  // Паттерн 2: целое число перед типом топлива
  const intFuelMatch = text.match(/(\d+)\s*(가솔린|디젤|LPG|HEV|PHEV|터보)/);
  if (intFuelMatch) {
    const val = parseInt(intFuelMatch[1], 10);
    if (val >= 1 && val <= 6) return val * 1000;
  }

  // Паттерн 3: объём в cc
  const ccMatch = text.match(/(\d{3,4})\s*cc/i);
  if (ccMatch) {
    const cc = parseInt(ccMatch[1], 10);
    if (cc >= 800 && cc <= 6000) return cc;
  }

  // Если ничего не нашли — берём из маппинга модели
  return getDefaultEngine(modelName, fuelType);
}

function normalizeEngineCc(value) {
  const cc = Number(value);
  if (!Number.isFinite(cc)) return 0;
  if (cc < 800 || cc > 6000) return 0;
  return Math.round(cc);
}

const PARSER_BADGE_POWER_MAP = {
  "gasoline 1.6 turbo 2wd_1598": 180,
  "gasoline 1.6 turbo 2wd_1591": 177,
  "gasoline 2.0t 2wd_1998": 252,
  "gasoline 2.0t 4wd_1998": 252,
  "gasoline 2.5t 2wd_2497": 290,
  "diesel 2.0 2wd_1998": 186,
  "diesel 2.0 2wd_1995": 186,
  "diesel 2.2 2wd_2157": 202,
  "diesel 2.2 2wd_2151": 202,
  "diesel 2.2 4wd_2157": 202,
  "diesel 2.2 4wd_2151": 202,
  "2.5_2497": 202,
  "2.5 awd masters_2497": 202,
  "2.0_1999": 160,
  "2.0 lpi_1999": 152,
  "2.0 lpe re 2wd_1998": 152,
  "2.0 lpi(rent)_1999": 152,
  "1.6_1598": 180,
  "1.6 turbo_1598": 180,
  "7-seater limousine_2199": 202,
  "9-seater noblesse_2151": 202,
  "9-seater noblesse_2199": 202,
  "9-seater prstige_2199": 202,
  "cargo 5-seater_2199": 202,
  "hev 9seater nobless_1598": 180,
  "premium plus_1999": 180,
  "prestige_1999": 180,
  "inspiration_1580": 180,
  "inspiration 2wd_1598": 180,
  "modern_1999": 180,
  "2.0 gde le signature 2wd_1997": 160,
  "gasoline_1999": 160,
  "gasoline 3.5 turbo awd_3470": 380,
  "2.5t gasoline awd_2497": 304,
  "2.2 diesel 2wd_2151": 202,
  "3.0 diesel 2wd_2996": 278,
  "3.5t gasoline awd_3470": 380,
  "3.3 gdi awd_3342": 282,
  "gasoline 2.5t 4wd_2497": 281,
  "4wd wagon 12-seater_2497": 175,
  "smart_1580": 105,
  "2.0 n_1998": 280,
  "1.6 lpi_1591": 120,
  "exclusive_1598": 180,
  "premium_1598": 180,
  "3.5 lpg 2wd_3470": 240,
  "hev 1.6 cargo 5-seater_1598": 180,
  "hev 1.5 2wd_1498": 170,
  "hev 1.6 2wd_1580": 105,
  "gasoline 9-seater noblesse special_3342": 280,
  "gasoline 7-seater limousine_3342": 280,
  "2.5 masters_2497": 304,
};

const PARSER_MODEL_POWER_MAP = {
  "hyundai_tucson_1598": 150,
  "hyundai_tucson_1998": 186,
  "hyundai_tucson_1999": 186,
  "hyundai_tucson_2151": 186,
  "hyundai_tucson_2199": 186,
  "hyundai_santafe_2151": 202,
  "hyundai_santafe_2157": 202,
  "hyundai_santafe_2199": 202,
  "hyundai_santafe_1598": 180,
  "hyundai_grandeur_2497": 202,
  "hyundai_grandeur_2999": 248,
  "hyundai_grandeur_2359": 180,
  "hyundai_grandeur_2398": 180,
  "hyundai_sonata_1598": 180,
  "hyundai_sonata_1999": 160,
  "hyundai_staria_2199": 177,
  "hyundai_staria_3470": 294,
  "hyundai_staria_3497": 272,
  "hyundai_elantra_1598": 123,
  "hyundai_elantra_1999": 158,
  "hyundai_venue_1598": 123,
  "hyundai_venue_1591": 123,
  "kia_carnival_2199": 202,
  "kia_carnival_2151": 202,
  "kia_carnival_3470": 294,
  "kia_carnival_3497": 272,
  "kia_carnival_1598": 180,
  "kia_sportage_1598": 180,
  "kia_sportage_1591": 177,
  "kia_sportage_1999": 150,
  "kia_sportage_1998": 150,
  "kia_sportage_2151": 202,
  "kia_sportage_2199": 202,
  "kia_k5_1598": 180,
  "kia_k5_1999": 160,
  "kia_k5_1998": 160,
  "kia_k5_2497": 202,
  "kia_k8_2497": 202,
  "kia_k8_2999": 248,
  "kia_k8_3470": 300,
  "kia_k8_1598": 180,
  "kia_k8_1591": 180,
  "kia_seltos_1598": 177,
  "kia_seltos_1591": 177,
  "kia_seltos_1999": 150,
  "kia_seltos_1998": 150,
  "kia_stinger_1998": 252,
  "kia_stinger_3342": 370,
  "genesis_g70_1998": 252,
  "genesis_g70_3342": 370,
  "genesis_g80_2497": 202,
  "genesis_g80_2999": 278,
  "genesis_g80_3470": 380,
  "genesis_g80_3497": 380,
  "genesis_gv70_1998": 252,
  "genesis_gv70_2151": 202,
  "genesis_gv70_2497": 304,
  "genesis_gv80_2497": 277,
  "genesis_gv80_2996": 278,
  "genesis_gv80_3470": 380,
  "genesis_gv80_2999": 380,
  "kgm_rexton_1998": 177,
  "kgm_rexton_2157": 181,
  "kgm_torres_1497": 170,
  "renaultkorea_qm6_1998": 144,
  "renaultkorea_qm6_1997": 144,
  "renaultkorea_qm6_1461": 160,
};

function estimatePowerByEngine(engineCc) {
  if (engineCc <= 1000) return 75;
  if (engineCc <= 1400) return 100;
  if (engineCc <= 1600) return 130;
  if (engineCc <= 2000) return 150;
  if (engineCc <= 2500) return 200;
  if (engineCc <= 3000) return 250;
  return 300;
}

function getPowerHpForParser(brand, model, engineCc, badgeDetail) {
  const cc = Number(engineCc) || 0;

  if (badgeDetail) {
    const badge = String(badgeDetail).toLowerCase().trim();
    const badgeKey = `${badge}_${cc}`;
    if (PARSER_BADGE_POWER_MAP[badgeKey]) {
      return { power: PARSER_BADGE_POWER_MAP[badgeKey], source: "badge_detail" };
    }
    if (PARSER_BADGE_POWER_MAP[badge]) {
      return { power: PARSER_BADGE_POWER_MAP[badge], source: "badge_detail" };
    }
  }

  const brandKey = String(brand ?? "").toLowerCase().replace(/\s+/g, "").replace(/-/g, "");
  const modelKey = String(model ?? "").toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9]/g, "");
  const exactKey = `${brandKey}_${modelKey}_${cc}`;
  if (PARSER_MODEL_POWER_MAP[exactKey]) {
    return { power: PARSER_MODEL_POWER_MAP[exactKey], source: "brand_model_engine" };
  }

  return { power: estimatePowerByEngine(cc), source: "engine_fallback" };
}

function detectUsage(car) {
  const text = `${car.Badge ?? ""} ${car.BadgeDetail ?? ""}`.toLowerCase();
  const isRental = text.includes("렌터카") || text.includes("rent");
  const isTaxi = text.includes("택시") || text.includes("taxi");
  const isCommercial =
    text.includes("화물") ||
    text.includes("cargo") ||
    text.includes("밴") ||
    text.includes("어린이보호차") ||
    text.includes("앰뷸런스");

  let usageType = "private";
  if (isTaxi) usageType = "taxi";
  else if (isRental) usageType = "rental";
  else if (isCommercial) usageType = "commercial";

  return { usageType, isRental, isTaxi, isCommercial };
}

function buildDataQuality(mappedCar) {
  const warnings = [];
  let score = 100;

  if (!mappedCar.engine_cc) {
    score -= 20;
    warnings.push("missing_engine_cc");
  }
  if (!mappedCar.power_hp || mappedCar.power_source === "engine_fallback") {
    score -= 15;
    warnings.push("estimated_power_hp");
  }
  if (!mappedCar.color) {
    score -= 8;
    warnings.push("missing_color");
  }
  if (!mappedCar.first_registration_korea) {
    score -= 12;
    warnings.push("missing_first_registration_korea");
  }
  if (!mappedCar.badge_detail) {
    score -= 10;
    warnings.push("missing_badge_detail");
  }
  if (!Array.isArray(mappedCar.photos) || mappedCar.photos.length === 0) {
    score -= 15;
    warnings.push("missing_photos");
  }
  if (mappedCar.usage_type !== "private") {
    score -= 20;
    warnings.push(`usage_${mappedCar.usage_type}`);
  }
  if (mappedCar.has_accident) {
    score -= 15;
    warnings.push("has_accident");
  }

  return {
    data_confidence: Math.max(0, Math.min(100, score)),
    data_warnings: warnings,
  };
}

function isSngReady(car) {
  const modelName = String(car.Model ?? "");
  const badge = String(car.Badge ?? "");
  const badgeDetail = String(car.BadgeDetail ?? "");
  const modelOk = SNG_MODELS.some((model) => modelName.includes(model));
  const badgeOk = !EXCLUDE_KEYWORDS.some(
    (keyword) => badge.includes(keyword) || badgeDetail.includes(keyword),
  );
  const hasPhotos = Array.isArray(car.Photos) && car.Photos.length > 0;
  return modelOk && badgeOk && hasPhotos;
}

function isFreshListing(car) {
  const updated = car?.Photos?.[0]?.updatedDate;
  if (!updated) return true;
  const ts = new Date(updated).getTime();
  if (Number.isNaN(ts)) return true;
  return ts >= ninetyDaysAgo.getTime();
}

function getTopBrands(cars) {
  return cars.reduce((brands, car) => {
    brands[car.brand] = (brands[car.brand] ?? 0) + 1;
    return brands;
  }, {});
}

function getModelCounts(cars) {
  return cars.reduce((models, car) => {
    models[car.model] = (models[car.model] ?? 0) + 1;
    return models;
  }, {});
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseKoreaRegDate(yearField) {
  if (!yearField) return null;
  const str = String(yearField);
  if (str.length === 6) {
    const year = str.slice(0, 4);
    const month = str.slice(4, 6);
    return `${month}.${year}`;
  }
  if (str.length === 4) {
    return str;
  }
  return null;
}
async function fetchVehicleDetail(vehicleId) {
  try {
    const url = `https://api.encar.com/v1/readside/vehicle/${vehicleId}`;
    const res = await fetch(url, { headers: ENCAR_HEADERS });
    if (!res.ok) return {};
    const data = await res.json();

    const spec = data?.spec ?? {};
    const manage = data?.manage ?? {};
    const category = data?.category ?? {};

    return {
      displacement: spec.displacement ?? null,
      color: translateColorKr(spec.colorName ?? null),
      seats: spec.seatCount ?? null,
      body_type_kr: spec.bodyName ?? null,
      grade_english: category.gradeEnglishName ?? null,
      registered_at_encar: manage.registDateTime ?? null,
      vehicle_no: data.vehicleNo ?? null,
      vin: spec.vin ?? data.vin ?? null,
      transmission: spec.transmissionName ?? null,
      raw: {
        vehicleId,
        vehicleNo: data.vehicleNo ?? null,
        spec,
        manage,
        category,
      },
    };
  } catch {
    return {};
  }
}

async function fetchOptions(vehicleId) {
  try {
    const url = `https://api.encar.com/v1/readside/vehicles/car/${vehicleId}/options/choice`;
    const res = await fetch(url, { headers: ENCAR_HEADERS });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data)
      ? data.map((o) => ({ name: o.optionName, price: o.price }))
      : [];
  } catch {
    return [];
  }
}

async function mapCar(car) {
  await sleep(DETAIL_DELAY_MS);
  const detail = await fetchVehicleDetail(car.Id);
  await sleep(DETAIL_DELAY_MS);
  const options = await fetchOptions(car.Id);
  await sleep(DETAIL_DELAY_MS);
  const brand = BRAND_MAP[car.Manufacturer] ?? car.Manufacturer;
  const model = translateModel(car.Model);
  const badgeDetail = detail.grade_english ?? car.BadgeDetail ?? null;
  const engineCc =
    normalizeEngineCc(detail.displacement) ||
    (car.Displacement && car.Displacement > 0 ? car.Displacement : 0) ||
    parseEngineFromBadge(car.Badge, model, car.FuelType);
  const driveType = parseDriveType(car.Badge) ?? parseDriveType(car.BadgeDetail) ?? null;
  const power =
    resolvePowerFromVehicleSpecs({
      brand,
      model,
      engineCc,
      badgeDetail,
      fuelType: car.FuelType,
      driveType,
      year: Number(String(car.Year).slice(0, 4)),
    }) ?? getPowerHpForParser(brand, model, engineCc, badgeDetail);
  const usage = detectUsage(car);
  const listingUpdatedAt = car.Photos?.[0]?.updatedDate ?? null;
  const registeredAt =
    detail.registered_at_encar ?? listingUpdatedAt ?? new Date().toISOString();

  const mappedCar = {
    encar_id: String(car.Id),
    brand,
    model,
    year: Number(String(car.Year).slice(0, 4)),
    body_type: getBodyType(car.Model),
    mileage: car.Mileage,
    engine_cc: engineCc,
    fuel_type: car.FuelType ?? "gasoline",
    transmission: detail.transmission ?? car.Transmission ?? null,
    color: detail.color ?? null,
    has_accident: car.HasAccident ?? false,
    price_krw: car.Price * 10000,
    photos: buildPhotos(car),
    raw_url: `https://www.encar.com/dc/dc_cardetailview.do?carid=${car.Id}`,
    vin: detail.vin ?? null,
    first_registration_korea: parseKoreaRegDate(car.Year),
    power_hp: power.power,
    power_source: power.source,
    power_note: power.note ?? (badgeDetail ? `${badgeDetail}_${engineCc}` : `${brand}_${model}_${engineCc}`),
    vehicle_spec_id: power.specId ?? null,
    power_verified: power.source === "vehicle_specs",
    seats: detail.seats ?? null,
    options,
    drive_type: driveType,
    badge: car.Badge ?? null,
    badge_detail: badgeDetail,
    hybrid_type:
      String(car.FuelType ?? "").includes("전기") || String(car.Badge ?? "").toUpperCase().includes("HEV")
        ? "hybrid"
        : null,
    usage_type: usage.usageType,
    is_rental: usage.isRental,
    is_taxi: usage.isTaxi,
    is_commercial: usage.isCommercial,
    accident_history: {
      has_accident: car.HasAccident ?? false,
    },
    insurance_history: {},
    insurance_payout_count: null,
    insurance_payout_total_krw: null,
    owners_count: null,
    inspection_status: detail.raw ? "vehicle_detail_ok" : "vehicle_detail_missing",
    vehicle_no: detail.vehicle_no ?? null,
    source_detail_payload: {
      list: {
        id: car.Id,
        manufacturer: car.Manufacturer ?? null,
        model: car.Model ?? null,
        badge: car.Badge ?? null,
        badgeDetail: car.BadgeDetail ?? null,
        year: car.Year ?? null,
        mileage: car.Mileage ?? null,
        price: car.Price ?? null,
        fuelType: car.FuelType ?? null,
        transmission: car.Transmission ?? null,
        displacement: car.Displacement ?? null,
        hasAccident: car.HasAccident ?? null,
        photosCount: Array.isArray(car.Photos) ? car.Photos.length : 0,
      },
      detail: detail.raw ?? null,
      options_count: Array.isArray(options) ? options.length : 0,
      fetched_at: new Date().toISOString(),
    },
    // Для "свежести" используем дату обновления фото (если есть), иначе текущую.
    modified_at_encar: listingUpdatedAt ?? new Date().toISOString(),
    registered_at_encar: registeredAt,
    is_sng_ready: true,
    is_available: true,
  };

  const quality = buildDataQuality(mappedCar);
  return {
    ...mappedCar,
    ...quality,
  };
}

async function fetchEncarPage(offset) {
  const response = await fetch(buildEncarUrl(offset), {
    headers: ENCAR_HEADERS,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Encar API вернул HTTP ${response.status}: ${errorText || "empty response"}`,
    );
  }

  const data = await response.json();
  const results = Array.isArray(data.SearchResults) ? data.SearchResults : [];

  return results;
}

async function fetchAllSngCars(target = TARGET_COUNT) {
  const result = [];
  const seenIds = new Set();
  let receivedCount = 0;
  let offset = 0;

  while (
    result.length < target &&
    offset < ENCAR_MAX_PAGES * ENCAR_PAGE_SIZE
  ) {
    console.log(`Запрос offset=${offset}...`);

    const cars = await fetchEncarPage(offset);
    receivedCount += cars.length;

    if (!cars.length) {
      break;
    }

    const filtered = cars.filter((car) => isSngReady(car) && isFreshListing(car));
    const newFiltered = filtered.filter((car) => {
      const id = String(car.Id);

      if (seenIds.has(id)) {
        return false;
      }

      seenIds.add(id);
      return true;
    });

    result.push(...newFiltered);
    console.log(
      `  Получено: ${cars.length}, подходит(СНГ+90д): ${filtered.length}, новых: ${newFiltered.length}, итого: ${result.length}`,
    );

    offset += ENCAR_PAGE_SIZE;

    if (
      result.length < target &&
      offset < ENCAR_MAX_PAGES * ENCAR_PAGE_SIZE
    ) {
      await sleep(PAGE_DELAY_MS);
    }
  }

  return {
    cars: result.slice(0, target),
    receivedCount,
    filteredCount: Math.min(result.length, target),
  };
}

async function saveCarsToSupabase(cars) {
  if (cars.length === 0) {
    return { savedCount: 0, errorCount: 0 };
  }

  const { error } = await supabase.from("cars").upsert(cars, {
    onConflict: "encar_id",
  });

  if (error) {
    console.error("Ошибка Supabase:", error.message);
    return { savedCount: 0, errorCount: cars.length };
  }

  if (SYNC_AVAILABILITY) {
    const ids = cars.map((car) => String(car.encar_id).replaceAll('"', '\\"'));
    const idFilter = `(${ids.map((id) => `"${id}"`).join(",")})`;
    const { error: availabilityError } = await supabase
      .from("cars")
      .update({ is_available: false })
      .eq("is_available", true)
      .not("encar_id", "in", idFilter);

    if (availabilityError) {
      console.error("Ошибка обновления доступности:", availabilityError.message);
      return { savedCount: cars.length, errorCount: cars.length };
    }
  }

  return { savedCount: cars.length, errorCount: 0 };
}

async function main() {
  let receivedCount = 0;
  let filteredCount = 0;
  let savedCount = 0;
  let errorCount = 0;
  let mappedCars = [];

  try {
    console.log("Настройки парсера:", {
      target: TARGET_COUNT,
      maxPages: ENCAR_MAX_PAGES,
      pageSize: ENCAR_PAGE_SIZE,
      syncAvailability: SYNC_AVAILABILITY,
      detailDelayMs: DETAIL_DELAY_MS,
      pageDelayMs: PAGE_DELAY_MS,
    });

    await loadVerifiedVehicleSpecs();
    console.log(`Загружено проверенных спецификаций: ${verifiedVehicleSpecs.length}`);

    const sngCars = await fetchAllSngCars(TARGET_COUNT);
    receivedCount = sngCars.receivedCount;
    filteredCount = sngCars.filteredCount;

    for (const car of sngCars.cars) {
      mappedCars.push(await mapCar(car));
    }

    const result = await saveCarsToSupabase(mappedCars);
    savedCount = result.savedCount;
    errorCount = result.errorCount;
  } catch (error) {
    errorCount = receivedCount || 1;
    console.error(
      "Ошибка парсинга:",
      error instanceof Error ? error.message : String(error),
    );
  }

  const brandStats = getTopBrands(mappedCars);
  const modelStats = getModelCounts(mappedCars);
  const sampleCars = mappedCars.slice(0, 3);

  console.log(`\n✅ Готово:`);
  console.log(`   Получено с Encar: ${receivedCount} авто`);
  console.log(`   Прошло СНГ фильтр: ${filteredCount} авто`);
  console.log(`   Сохранено в Supabase: ${savedCount} авто`);
  console.log(`   Ошибок: ${errorCount}`);
  console.log(`\nТоп брендов:`, brandStats);
  console.log(`Модели:`, modelStats);
  console.log(`\nПример данных:`);
  console.log(
    JSON.stringify(
      sampleCars.map((c) => ({
        model: c.model,
        engine_cc: c.engine_cc,
        color: c.color,
        seats: c.seats,
        registered_at_encar: c.registered_at_encar,
        badge_detail: c.badge_detail,
      })),
      null,
      2,
    ),
  );

  const carnivalSample = mappedCars
    .filter((c) => String(c.model ?? "").includes("Carnival"))
    .slice(0, 3)
    .map((c) => ({
      model: c.model,
      engine_cc: c.engine_cc,
      fuel_type: c.fuel_type,
      badge: c.badge,
    }));

  console.log(`\nПример первых 3 Carnival:`);
  console.log(JSON.stringify(carnivalSample, null, 2));
}

main();
