export async function getKrwRate(): Promise<number> {
  try {
    const res = await fetch("https://www.cbr.ru/scripts/XML_daily.asp", {
      next: { revalidate: 3600 },
    });
    const xml = await res.text();
    const match = xml.match(
      /<CharCode>KRW<\/CharCode>[\s\S]*?<Nominal>(\d+)<\/Nominal>[\s\S]*?<Value>([\d,]+)<\/Value>/,
    );
    if (match) {
      return (
        parseFloat(match[2].replace(",", ".")) / parseInt(match[1], 10)
      );
    }
  } catch {}
  return 0.04718;
}

