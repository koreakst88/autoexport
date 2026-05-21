import { config } from "dotenv";
config({ path: ".env.local" });

const headers = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
  Referer: "https://www.encar.com/",
  Origin: "https://www.encar.com",
};

// Шаг 1 — берём первый авто из списка
const query = encodeURIComponent(
  "(And.Hidden.N._.CarType.Y._.Year.range(201900..)._.Mileage.range(..100000)._.Price.range(700..3000).)",
);
const listUrl = `https://api.encar.com/search/car/list/general?count=true&q=${query}&sr=%7CModifiedDate%7C0%7C1`;
const listRes = await fetch(listUrl, { headers });
const listData = await listRes.json();
const carId = listData.SearchResults?.[0]?.Id;
console.log("Car ID:", carId);

// Шаг 2 — detail endpoint
const detailUrl = `https://api.encar.com/cars/${carId}`;
console.log("Detail URL:", detailUrl);
const detailRes = await fetch(detailUrl, { headers });
console.log("Detail HTTP статус:", detailRes.status);

if (detailRes.ok) {
  const detail = await detailRes.json();
  console.log("\n=== DETAIL ПОЛЯ ===");
  console.log(JSON.stringify(detail, null, 2));
} else {
  const text = await detailRes.text();
  console.log("Ошибка:", text);

  // Пробуем альтернативный endpoint
  const altUrl = `https://api.encar.com/search/car/list/general?count=true&q=(And.Id.${carId}.)&sr=%7CModifiedDate%7C0%7C1`;
  console.log("\nПробуем альтернативный URL:", altUrl);
  const altRes = await fetch(altUrl, { headers });
  console.log("Alt HTTP статус:", altRes.status);
  if (altRes.ok) {
    const altData = await altRes.json();
    console.log(JSON.stringify(altData.SearchResults?.[0], null, 2));
  }
}

// Тест inspection на реальных ID из нашей базы
const testIds = ["42004371", "41821506", "41926370", "41676646"];

console.log("\n=== ТЕСТ INSPECTION ===");
for (const id of testIds) {
  const url = `https://api.encar.com/v1/readside/inspection/vehicle/${id}`;
  const res = await fetch(url, { headers });
  const text = await res.text();
  console.log(`${res.status} | ID ${id} | ${text.slice(0, 100)}`);
  await new Promise((r) => setTimeout(r, 300));
}
