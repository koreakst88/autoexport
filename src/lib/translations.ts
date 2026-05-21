export function translateBadge(badge: string | null): string {
  if (!badge) return "—";
  return badge
    .replace(/가솔린/g, "Бензин")
    .replace(/디젤/g, "Дизель")
    .replace(/하이브리드/g, "Гибрид")
    .replace(/HEV/g, "Гибрид")
    .replace(/PHEV/g, "Plug-in Гибрид")
    .replace(/LPG/g, "LPG")
    .replace(/LPe/g, "LPG")
    .replace(/바이퓨얼/g, "Bi-Fuel")
    .replace(/전기/g, "Электро")
    .replace(/터보/g, "Турбо")
    .replace(/프레스티지/g, "Prestige")
    .replace(/익스클루시브/g, "Exclusive")
    .replace(/시그니처/g, "Signature")
    .replace(/노블레스/g, "Noblesse")
    .replace(/르블랑/g, "Le Blanc")
    .replace(/인승/g, "мест")
    .replace(/스마트/g, "Smart")
    .replace(/모던/g, "Modern")
    .replace(/어드밴스드/g, "Advanced")
    .replace(/캘리그래피/g, "Calligraphy")
    .replace(/프리미엄/g, "Premium")
    .replace(/스탠다드/g, "Standard")
    .replace(/베이직/g, "Basic")
    .replace(/플래티넘/g, "Platinum")
    .replace(/인스퍼레이션/g, "Inspiration")
    .replace(/그래비티/g, "Gravity")
    .replace(/어반/g, "Urban")
    .replace(/액티브/g, "Active")
    .replace(/스포츠/g, "Sport")
    .trim();
}

export function translateTransmission(t: string | null): string {
  if (!t) return "—";
  const map: Record<string, string> = {
    auto: "Автомат",
    manual: "Механика",
    오토: "Автомат",
    수동: "Механика",
  };
  return map[t.toLowerCase()] ?? map[t] ?? t;
}

export function translateFuel(fuel: string | null): string {
  if (!fuel) return "—";
  const map: Record<string, string> = {
    가솔린: "Бензин",
    디젤: "Дизель",
    "가솔린+전기": "Гибрид",
    전기: "Электро",
    LPG: "LPG",
    "LPG(일반인 구입)": "LPG",
    gasoline: "Бензин",
    diesel: "Дизель",
    hybrid: "Гибрид",
    electric: "Электро",
  };
  return map[fuel] ?? fuel;
}
