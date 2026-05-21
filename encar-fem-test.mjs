import { config } from "dotenv";
import { writeFileSync } from "fs";

config({ path: ".env.local" });

const headers = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
  Referer: "https://www.encar.com/",
};

// Берём реальный ID из нашей базы
const vehicleId = "42051837"; // K5

const url = `https://fem.encar.com/cars/detail/${vehicleId}`;
console.log("Запрос:", url);

const res = await fetch(url, { headers });
console.log("HTTP статус:", res.status);

const html = await res.text();
console.log("Размер HTML:", html.length, "символов");

// Ищем все варианты встроенных JSON данных
const patterns = [
  {
    name: "__INITIAL_STATE__",
    regex: /window\.__INITIAL_STATE__\s*=\s*(.+?);\s*<\/script>/s,
  },
  {
    name: "__NEXT_DATA__",
    regex: /<script id="__NEXT_DATA__"[^>]*>(.+?)<\/script>/s,
  },
  {
    name: "__data__",
    regex: /window\.__data__\s*=\s*(.+?);\s*<\/script>/s,
  },
  {
    name: "pageProps",
    regex: /"pageProps"\s*:\s*(\{.+?\})\s*,\s*"__N_SSP"/s,
  },
  {
    name: "vehicleDetail",
    regex: /"vehicleDetail"\s*:\s*(\{.+?\})/s,
  },
];

for (const p of patterns) {
  const match = html.match(p.regex);
  if (match) {
    console.log(`\n✅ Найдено: ${p.name}`);
    console.log("Первые 1000 символов:");
    console.log(match[1].slice(0, 1000));
  } else {
    console.log(`❌ Не найдено: ${p.name}`);
  }
}

// Сохраняем полный HTML для анализа
writeFileSync("fem-detail.html", html);
console.log("\nПолный HTML сохранён в fem-detail.html");
console.log("Первые 3000 символов HTML:");
console.log(html.slice(0, 3000));

