import { HomeClient } from "@/components/home/HomeClient";
import type { CatalogCar } from "@/components/catalog/CatalogClient";
import { createClient } from "@/lib/supabase/server";
import { getKrwRate } from "@/lib/get-krw-rate";

export default async function Home() {
  const supabase = createClient();
  const krwRate = await getKrwRate();

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
      krwRate={krwRate}
    />
  );
}
