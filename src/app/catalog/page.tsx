import { CatalogClient, type CatalogCar } from "@/components/catalog/CatalogClient";
import { createClient } from "@/lib/supabase/server";

export default async function CatalogPage(props: {
  searchParams?: Promise<{ brand?: string }>;
}) {
  const searchParams = await props.searchParams;
  const supabase = createClient();

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

  return <CatalogClient cars={catalogCars} initialBrand={searchParams?.brand ?? ""} />;
}
