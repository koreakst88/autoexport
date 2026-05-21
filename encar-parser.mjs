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
const ENCAR_MAX_PAGES = 5;

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

let inspectionErrorLogCount = 0;
const INSPECTION_ERROR_LOG_LIMIT = 5;

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

function parseEngineFromBadge(badge) {
  if (!badge) return 0;
  // Паттерн 1: число с точкой + единица (1.6L, 2.2L, 3.5L)
  const decimalMatch = String(badge).match(/(\d+\.\d+)\s*[Ll]?/);
  if (decimalMatch) {
    const liters = parseFloat(decimalMatch[1]);
    if (liters >= 0.8 && liters <= 6.0) return Math.round(liters * 1000);
  }

  // Паттерн 2: целое число перед типом топлива (3 가솔린, 2 디젤)
  const intWithFuelMatch = String(badge).match(/(\d+)\s*(가솔린|디젤|LPG|HEV|PHEV|Turbo|터보)/);
  if (intWithFuelMatch) {
    const val = parseInt(intWithFuelMatch[1], 10);
    if (val >= 1 && val <= 6) return val * 1000;
  }

  // Паттерн 3: объём в cc напрямую (1598cc, 2199cc)
  const ccMatch = String(badge).match(/(\d{3,4})\s*cc/i);
  if (ccMatch) {
    const cc = parseInt(ccMatch[1], 10);
    if (cc >= 800 && cc <= 6000) return cc;
  }

  return 0;
}

function normalizeEngineCc(value) {
  const cc = Number(value);
  if (!Number.isFinite(cc)) return 0;
  if (cc < 800 || cc > 6000) return 0;
  return Math.round(cc);
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

function formatInspectionDate(dateStr) {
  if (!dateStr) return null;
  if (dateStr.length === 8) {
    return `${dateStr.slice(4, 6)}.${dateStr.slice(0, 4)}`;
  }
  return dateStr;
}

async function fetchInspectionData(vehicleId) {
  try {
    const url = `https://api.encar.com/v1/readside/inspection/vehicle/${vehicleId}`;
    const res = await fetch(url, { headers: ENCAR_HEADERS });

    if (!res.ok) {
      if (inspectionErrorLogCount < INSPECTION_ERROR_LOG_LIMIT) {
        const text = await res.text();
        console.log(
          `Inspection ${res.status} | ID ${vehicleId} | ${text.slice(0, 100)}`,
        );
        inspectionErrorLogCount += 1;
      }

      return {};
    }

    const data = await res.json();
    const detail = data?.master?.detail ?? {};

    const colorRaw = detail?.colorType;
    const colorStr =
      typeof colorRaw === "object" && colorRaw !== null
        ? colorRaw.title ?? null
        : colorRaw;

    const transmissionRaw = detail?.transmissionType;
    const transmissionStr =
      typeof transmissionRaw === "object" && transmissionRaw !== null
        ? transmissionRaw.title ?? null
        : transmissionRaw;

    return {
      registeredAt: data?.master?.registrationDate ?? null,
      color: translateColorKr(colorStr),
      vin: detail?.vin ?? null,
      firstRegistrationKorea: detail?.firstRegistrationDate ?? null,
      transmission: transmissionStr ?? null,
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

async function fetchFemDetail(vehicleId) {
  try {
    const url = `https://fem.encar.com/cars/detail/${vehicleId}`;
    const res = await fetch(url, { headers: ENCAR_HEADERS });
    if (!res.ok) return {};
    const html = await res.text();

    const colorMatch = html.match(/색상:([^,<"]+)/);
    const colorKr = colorMatch?.[1]?.trim() ?? null;
    return {
      color: translateColorKr(colorKr),
    };
  } catch {
    return {};
  }
}

async function mapCar(car) {
  await sleep(300);
  const inspection = await fetchInspectionData(car.Id);
  await sleep(300);
  const options = await fetchOptions(car.Id);
  const femData = await fetchFemDetail(car.Id);
  await sleep(500);
  const listingUpdatedAt = car.Photos?.[0]?.updatedDate ?? null;
  const registeredAt =
    listingUpdatedAt ?? inspection.registeredAt ?? new Date().toISOString();

  return {
    encar_id: String(car.Id),
    brand: BRAND_MAP[car.Manufacturer] ?? car.Manufacturer,
    model: translateModel(car.Model),
    year: Number(String(car.Year).slice(0, 4)),
    body_type: getBodyType(car.Model),
    mileage: car.Mileage,
    engine_cc: normalizeEngineCc(car.Displacement) || parseEngineFromBadge(car.Badge),
    fuel_type: car.FuelType ?? "gasoline",
    transmission: inspection.transmission ?? car.Transmission ?? "auto",
    color: inspection.color ?? femData.color ?? null,
    has_accident: car.HasAccident ?? false,
    price_krw: car.Price * 10000,
    photos: buildPhotos(car),
    raw_url: `https://www.encar.com/dc/dc_cardetailview.do?carid=${car.Id}`,
    vin: inspection.vin ?? null,
    first_registration_korea: inspection.firstRegistrationKorea
      ? formatInspectionDate(inspection.firstRegistrationKorea)
      : parseKoreaRegDate(car.Year),
    power_hp: null,
    seats: null,
    options,
    drive_type: parseDriveType(car.Badge) ?? parseDriveType(car.BadgeDetail) ?? null,
    badge: car.Badge ?? null,
    badge_detail: car.BadgeDetail ?? null,
    // Для "свежести" используем дату обновления фото (если есть), иначе текущую.
    modified_at_encar: listingUpdatedAt ?? new Date().toISOString(),
    registered_at_encar: registeredAt,
    is_sng_ready: true,
    is_available: true,
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

async function fetchAllSngCars(target = 50) {
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
      await sleep(1000);
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

  return { savedCount: cars.length, errorCount: 0 };
}

async function main() {
  let receivedCount = 0;
  let filteredCount = 0;
  let savedCount = 0;
  let errorCount = 0;
  let mappedCars = [];

  try {
    const sngCars = await fetchAllSngCars(50);
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
  console.log(`\nПример первых 3 авто:`);
  console.log(
    JSON.stringify(
      sampleCars.map((c) => ({
        model: c.model,
        badge: c.badge,
        drive_type: c.drive_type,
        color: c.color,
        vin: c.vin,
        engine_cc: c.engine_cc,
        photo0: c.photos?.[0] ?? null,
        options_count: c.options?.length ?? 0,
      })),
      null,
      2,
    ),
  );
}

main();
