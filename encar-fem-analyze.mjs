import { readFileSync } from "fs";

const html = readFileSync("fem-detail.html", "utf-8");

// Ищем ключевые корейские слова для характеристик
const searches = [
  { name: "Мощность (마력/ps)", regex: /(\d+)\s*(마력|ps|kw|квт)/gi },
  { name: "Места (인승)", regex: /(\d+)\s*인승/g },
  { name: "Привод (구동)", regex: /(2WD|4WD|AWD|FWD|RWD)/gi },
  { name: "Цвет из meta", regex: /색상:([^,<"]+)/g },
  { name: "Год из meta", regex: /연식:([^,<"]+)/g },
  { name: "Топливо из meta", regex: /연료:([^,<"]+)/g },
  { name: "Пробег из meta", regex: /주행거리:([^,<"]+)/g },
  { name: "Регион", regex: /지역:([^,<"]+)/g },
  { name: "Объём двигателя", regex: /배기량[^>]*>([^<]+)/g },
  { name: "Класс авто", regex: /차종[^>]*>([^<]+)/g },
  { name: "Число мест", regex: /승차인원[^>]*>([^<]+)/g },
];

for (const s of searches) {
  const matches = [...html.matchAll(s.regex)];
  if (matches.length > 0) {
    console.log(`\n✅ ${s.name}:`);
    matches.slice(0, 5).forEach((m) => console.log(`   ${m[0]}`));
  } else {
    console.log(`❌ ${s.name}: не найдено`);
  }
}

// Ищем таблицу характеристик
const tableMatch = html.match(/<table[^>]*>(.{100,3000}?)<\/table>/gs);
if (tableMatch) {
  console.log(`\n✅ Найдено таблиц: ${tableMatch.length}`);
  tableMatch.slice(0, 2).forEach((t, i) => {
    console.log(`\nТаблица ${i + 1} (первые 500 символов):`);
    console.log(
      t.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 500),
    );
  });
}

// Ищем блоки с характеристиками
const specBlocks = html.match(/class="[^"]*spec[^"]*"[^>]*>(.{20,200}?)</gs);
if (specBlocks) {
  console.log(`\n✅ Spec блоки (первые 5):`);
  specBlocks.slice(0, 5).forEach((b) => {
    console.log(" ", b.replace(/<[^>]+>/g, "").trim().slice(0, 100));
  });
}

