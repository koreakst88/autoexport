import { chromium } from "playwright";

const URL = "http://localhost:3000";

const COUNTRIES = [
  { code: "RU", name: "Россия" },
  { code: "KZ", name: "Казахстан" },
  { code: "KG", name: "Кыргызстан" },
  { code: "UZ", name: "Узбекистан" },
];

async function selectCountry(page, name) {
  // Открываем селектор страны (кнопка в хедере справа) — берём первый матч, чтобы
  // не попасть на кнопки в выпадающем меню (strict-mode).
  await page
    .getByRole("button", { name: /Россия|Казахстан|Кыргызстан|Узбекистан/ })
    .first()
    .click();

  // Кликаем по пункту меню (берём последний матч, т.к. первый обычно кнопка-открывашка).
  await page
    .getByRole("button", { name: new RegExp(name) })
    .last()
    .click();
  // Даём React пересчитать цены.
  await page.waitForTimeout(500);
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 420, height: 900 } });

  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);

  // Переходим в карточку первого авто, чтобы снимки были для одной и той же машины.
  await page.locator("a[href^='/car/']").first().click();
  await page.waitForTimeout(800);

  for (const country of COUNTRIES) {
    await selectCountry(page, country.name);
    await page.screenshot({
      path: `car-${country.code}.png`,
      fullPage: true,
    });
  }

  await browser.close();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});
