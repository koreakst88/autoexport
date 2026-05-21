import { chromium } from "playwright";

const URL = "http://localhost:3000/car/42032845";

async function main() {
  const logs = [];
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 420, height: 900 } });

  page.on("console", (msg) => {
    const text = msg.text();
    if (text.includes("color raw:")) logs.push(text);
  });

  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);

  await browser.close();

  // eslint-disable-next-line no-console
  console.log("=== Detail color logs ===");
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

