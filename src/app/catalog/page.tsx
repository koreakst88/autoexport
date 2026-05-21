import { CatalogClient, type CatalogCar } from "@/components/catalog/CatalogClient";
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

export default async function CatalogPage(props: {
  searchParams?: Promise<{ brand?: string }>;
}) {
  const searchParams = await props.searchParams;
  const supabase = createClient();
  const krwRateRub = await getKrwRateRub();

  const { data: cars, error } = await supabase
    .from("cars")
    .select("*")
    .eq("is_available", true)
    .order("registered_at_encar", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Supabase cars query error:", error.message);
  }

  const catalogCars = (cars ?? []) as CatalogCar[];
  console.log(`Supabase cars returned: ${catalogCars.length}`);

  return (
    <CatalogClient
      cars={catalogCars}
      initialBrand={searchParams?.brand ?? ""}
      krwRateRub={krwRateRub ?? undefined}
    />
  );
}
