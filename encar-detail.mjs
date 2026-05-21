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

const carId = "41680880";

// Пробуем все известные варианты detail endpoint
const endpoints = [
  `https://api.encar.com/v1/cars/${carId}`,
  `https://api.encar.com/car/${carId}`,
  `https://api.encar.com/search/car/${carId}`,
  `https://fem.encar.com/cars/detail/${carId}`,
  `https://api.encar.com/cars/detail/${carId}`,
  `https://api.encar.com/search/car/list/general?count=true&q=(And.Hidden.N._.CarType.Y._.Id.${carId}.)&sr=%7CModifiedDate%7C0%7C1`,
  `https://api.encar.com/search/car/list/premium?count=true&q=(And.Hidden.N._.Id.${carId}.)&sr=%7CModifiedDate%7C0%7C1`,
];

for (const url of endpoints) {
  try {
    const res = await fetch(url, { headers });
    console.log(`${res.status} | ${url}`);
    if (res.ok) {
      const data = await res.json();
      console.log("  Поля:", Object.keys(data).join(", "));
      if (data.SearchResults) {
        console.log(
          "  Первый результат:",
          JSON.stringify(data.SearchResults[0], null, 2),
        );
      } else {
        console.log("  Данные:", JSON.stringify(data, null, 2).slice(0, 500));
      }
    }
  } catch (e) {
    console.log(`ERR | ${url} | ${e.message}`);
  }
  await new Promise((r) => setTimeout(r, 500));
}
