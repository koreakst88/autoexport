import { chromium } from "playwright";

const BASE = "http://localhost:3000";

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 420, height: 900 } });

  await page.goto(`${BASE}/quiz`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);

  // Step 1 screenshot
  await page.screenshot({ path: "quiz-step1.png", fullPage: true });

  // Step 1 select body type
  await page.getByRole("button", { name: /Кроссовер|Седан|Минивэн/ }).first().click();
  await page.waitForTimeout(250);

  // Step 2 select budget (pick first)
  // На шаге 2 проще кликнуть по первой доступной опции бюджета.
  await page.getByRole("button", { name: /\$10|\$15|\$20|до/ }).first().click();
  await page.waitForTimeout(250);

  // Step 3 select country (pick RU)
  await page.getByRole("button", { name: /Россия|Казахстан|Кыргызстан|Узбекистан/ }).first().click();
  await page.waitForTimeout(250);

  // Step 4 screenshot
  await page.screenshot({ path: "quiz-step4.png", fullPage: true });

  // Fill name
  await page.getByPlaceholder("Ваше имя").fill("Тестовый Лид");
  await page.getByRole("button", { name: "Отправить заявку" }).click();

  await page.waitForTimeout(1000);
  await page.screenshot({ path: "quiz-success.png", fullPage: true });

  await browser.close();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});
