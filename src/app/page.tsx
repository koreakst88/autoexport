import { HomeClient } from "@/components/home/HomeClient";
import type { CatalogCar } from "@/components/catalog/CatalogClient";
import { createClient } from "@/lib/supabase/server";

async function getKrwRateRub(): Promise<number | null> {
  try {
    const res = await fetch("https://www.cbr.ru/scripts/XML_daily.asp", {
      next: { revalidate: 3600 },
    });
    const xml = await res.text();
    const match = xml.match(
      /<CharCode>KRW<\/CharCode>[\s\S]*?<Nominal>(\d+)<\/Nominal>[\s\S]*?<Value>([\d,]+)<\/Value>/,
    );
    if (match) {
      const nominal = parseInt(match[1], 10);
      const value = parseFloat(match[2].replace(",", "."));
      if (Number.isFinite(nominal) && Number.isFinite(value) && nominal > 0) {
        return value / nominal;
      }
    }
  } catch {}
  return null;
}

export default async function Home() {
  const supabase = createClient();
  const krwRateRub = await getKrwRateRub();

  const { data: freshCars, error } = await supabase
    .from("cars")
    .select("*")
    .eq("is_available", true)
    .order("registered_at_encar", { ascending: false })
    .limit(6);

  if (error) {
    console.error("Supabase fresh cars query error:", error.message);
  }

  return (
    <HomeClient
      freshCars={(freshCars ?? []) as CatalogCar[]}
      krwRateRub={krwRateRub ?? undefined}
    />
  );
}
