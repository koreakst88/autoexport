import { chromium } from "playwright";

const URL = "http://localhost:3000";

const COUNTRIES = [
  { code: "RU", name: "Россия" },
  { code: "KZ", name: "Казахстан" },
  { code: "KG", name: "Кыргызстан" },
  { code: "UZ", name: "Узбекистан" },
];

async function openCountryMenu(page) {
  await page
    .getByRole("button", { name: /Россия|Казахстан|Кыргызстан|Узбекистан/ })
    .first()
    .click();
}

async function selectCountry(page, name) {
  await openCountryMenu(page);
  const menu = page.locator("header").locator("div.absolute.right-0");
  await menu.getByRole("button", { name: new RegExp(name) }).first().click();
  await page.waitForTimeout(800);
}

async function main() {
  const logs = [];
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 420, height: 900 } });

  page.on("console", (msg) => {
    const text = msg.text();
    if (text.includes("Расчёт:")) logs.push(text);
  });

  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);

  for (const country of COUNTRIES) {
    await selectCountry(page, country.name);
  }

  await browser.close();

  // eslint-disable-next-line no-console
  console.log("=== Console logs (filtered) ===");
  for (const line of logs) {
    // eslint-disable-next-line no-console
    console.log(line);
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});

